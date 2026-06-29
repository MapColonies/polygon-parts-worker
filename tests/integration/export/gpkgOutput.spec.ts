import os from 'os';
import path from 'path';
import fs from 'fs';
import ogr2ogr from 'ogr2ogr';
import gdal from 'gdal-async';
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { manipulateFeatures } from '../../../src/utils/utils';
import type { FindPolygonPartsResponse } from '../../../src/common/interfaces';

const LAYER = 'layer_features';

const EXPECTED_COLUMNS = [
  'id',
  'description',
  'sensors',
  'product_id',
  'product_type',
  'product_version',
  'imaging_time_begin_utc',
  'imaging_time_end_utc',
  'ingestion_date_utc',
  'resolution_deg',
  'resolution_meter',
  'horizontal_accuracy_ce90',
  'countries',
  'source_name',
  'cities',
];

const PART_ID = '35444846-507b-4de4-b7f3-d0e434b01b21';
const REQUEST_FEATURE_ID = 'req-feature-1';

const buildRoi = (): RoiFeatureCollection =>
  ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: REQUEST_FEATURE_ID,
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: { maxResolutionDeg: 0.703125, minResolutionDeg: 0.703125 },
      },
    ],
  }) as unknown as RoiFeatureCollection;

const buildFindResponse = (): FindPolygonPartsResponse =>
  ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [34.85, 32.3],
              [34.85, 32.29],
              [34.86, 32.29],
              [34.86, 32.3],
              [34.85, 32.3],
            ],
          ],
        },
        properties: {
          id: PART_ID,
          description: 'a description',
          sensors: ['SENSOR_A', 'SENSOR_B'],
          productId: 'SOME_NAME',
          productType: 'Orthophoto',
          productVersion: '1.0',
          imagingTimeBeginUTC: '2024-01-28T13:47:43.427Z',
          imagingTimeEndUTC: '2024-01-28T13:47:43.427Z',
          ingestionDateUTC: '2025-01-02T11:51:12.710Z',
          resolutionDegree: 0.703125,
          resolutionMeter: 78271.52,
          horizontalAccuracyCE90: 10,
          countries: ['CountryA', 'CountryB'],
          sourceName: 'source-name',
          cities: ['CityA'],
          // extras that must not reach the gpkg
          jobType: 'Ingestion_New',
          catalogId: 'catalog-uuid',
          partId: 'part-id',
          sourceId: 'source-id',
          sourceResolutionMeter: 8000,
          requestFeatureId: REQUEST_FEATURE_ID,
        },
      },
    ],
  }) as unknown as FindPolygonPartsResponse;

describe('GeoPackage Layer Parts output', () => {
  let tmpDir: string;
  let gpkgPath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpkg-layer-parts-'));
    gpkgPath = path.join(tmpDir, 'out.gpkg');

    const exported = manipulateFeatures(buildFindResponse(), buildRoi());
    await ogr2ogr(exported as unknown as Record<string, unknown>, {
      format: 'GPKG',
      destination: gpkgPath,
      options: ['-nln', LAYER, '-overwrite'],
    });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes the layer with exactly the spec\'d attribute columns', () => {
    const ds = gdal.open(gpkgPath);
    try {
      const layer = ds.layers.get(LAYER);
      const fieldNames = layer.fields.map((field) => field.name);
      expect([...fieldNames].sort()).toStrictEqual([...EXPECTED_COLUMNS].sort());
    } finally {
      ds.close();
    }
  });

  it('exposes both fid (generated integer PK) and id (UUID) as distinct values', () => {
    const ds = gdal.open(gpkgPath);
    try {
      const layer = ds.layers.get(LAYER);
      const feature = layer.features.first();

      // fid is the GeoPackage-generated integer primary key; it is not an attribute field.
      expect(layer.fields.map((field) => field.name)).not.toContain('fid');
      expect(typeof feature?.fid).toBe('number');

      // id is the per-part UUID carried as an attribute, distinct from the integer fid.
      const idValue = feature?.fields.get('id');
      expect(idValue).toBe(PART_ID);
      expect(idValue).not.toBe(feature?.fid);
    } finally {
      ds.close();
    }
  });

  it('serializes the array fields (sensors/countries/cities) into a single string column preserving all members', () => {
    // GDAL has no native list type in GeoPackage; it encodes a StringList into one text column.
    // On GDAL 3.4.1 the encoding is "(N:a,b)". We assert the stable contract: a string column that
    // contains every member, rather than the exact GDAL-version-specific delimiter format.
    const ds = gdal.open(gpkgPath);
    try {
      const layer = ds.layers.get(LAYER);
      const feature = layer.features.first();

      const sensors = feature?.fields.get('sensors');
      expect(typeof sensors).toBe('string');
      expect(sensors).toContain('SENSOR_A');
      expect(sensors).toContain('SENSOR_B');

      const countries = feature?.fields.get('countries');
      expect(typeof countries).toBe('string');
      expect(countries).toContain('CountryA');
      expect(countries).toContain('CountryB');
    } finally {
      ds.close();
    }
  });
});

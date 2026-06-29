import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { addFeatureIds, calculateResMeterFromDegree, manipulateFeatures } from '../../../src/utils/utils';
import type { FindPolygonPartsResponse } from '../../../src/common/interfaces';
import { exportJobResponseMock } from '../mocks/jobsMocks';

const EXPECTED_EXPORT_COLUMNS = [
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

const buildRoi = (featureId: string, maxResolutionDeg: number): RoiFeatureCollection =>
  ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: featureId,
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: { maxResolutionDeg, minResolutionDeg: maxResolutionDeg },
      },
    ],
  }) as unknown as RoiFeatureCollection;

// A find-response feature carrying the spec'd source fields PLUS extras that must be dropped.
const buildFindResponse = (requestFeatureId: string, overrides: Record<string, unknown> = {}): FindPolygonPartsResponse =>
  ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: {
          // spec'd fields
          id: 'part-uuid',
          description: 'a description',
          sensors: ['SENSOR_A'],
          productId: 'PRODUCT',
          productType: 'Orthophoto',
          productVersion: '1.0',
          imagingTimeBeginUTC: '2024-01-01T00:00:00.000Z',
          imagingTimeEndUTC: '2024-01-02T00:00:00.000Z',
          ingestionDateUTC: '2025-01-02T11:51:12.710Z',
          resolutionDegree: 0.1,
          resolutionMeter: 12,
          horizontalAccuracyCE90: 10,
          countries: ['CountryA'],
          sourceName: 'source-name',
          cities: ['CityA'],
          // extras that must NOT reach the GPKG
          jobType: 'Ingestion_New',
          catalogId: 'catalog-uuid',
          partId: 'part-id',
          sourceId: 'source-id',
          sourceResolutionMeter: 8000,
          requestFeatureId,
          ...overrides,
        },
      },
    ],
  }) as unknown as FindPolygonPartsResponse;

describe('utils', () => {
  describe('addFeatureIds', () => {
    it('should add unique IDs to all features', () => {
      const roi: RoiFeatureCollection = exportJobResponseMock.parameters.exportInputParams.roi;
      const result = addFeatureIds(roi);
      expect(result.features[0].id).toBeDefined();
    });
  });

  describe('manipulateFeatures', () => {
    const requestFeatureId = 'req-feature-1';

    it('emits exactly the spec\'d export columns and drops all other source fields', () => {
      const result = manipulateFeatures(buildFindResponse(requestFeatureId), buildRoi(requestFeatureId, 0.5));

      const keys = Object.keys(result.features[0].properties);
      expect(keys.sort()).toStrictEqual([...EXPECTED_EXPORT_COLUMNS].sort());
    });

    it('renames camelCase source keys to their snake_case export names', () => {
      const props = manipulateFeatures(buildFindResponse(requestFeatureId), buildRoi(requestFeatureId, 0.5)).features[0]
        .properties as unknown as Record<string, unknown>;

      expect(props.source_name).toBe('source-name');
      expect(props.product_id).toBe('PRODUCT');
      expect(props.product_version).toBe('1.0');
      expect(props.horizontal_accuracy_ce90).toBe(10);
      expect(props.imaging_time_begin_utc).toBe('2024-01-01T00:00:00.000Z');
      expect(props.imaging_time_end_utc).toBe('2024-01-02T00:00:00.000Z');
      expect(props.ingestion_date_utc).toBe('2025-01-02T11:51:12.710Z');
    });

    it('writes the recalculated resolution into resolution_deg (override) and resolution_meter', () => {
      // maxResolutionDeg (0.5) > feature resolutionDegree (0.1) -> recalculated value is 0.5
      const props = manipulateFeatures(buildFindResponse(requestFeatureId), buildRoi(requestFeatureId, 0.5)).features[0]
        .properties as unknown as Record<string, unknown>;

      expect(props.resolution_deg).toBe(0.5);
      expect(props.resolution_meter).toBe(calculateResMeterFromDegree(0.5));
      expect(props).not.toHaveProperty('resolution_degree');
    });

    it('guarantees a fixed schema: missing optional fields become null columns', () => {
      const response = buildFindResponse(requestFeatureId, { description: undefined, countries: undefined, cities: undefined });
      const props = manipulateFeatures(response, buildRoi(requestFeatureId, 0.5)).features[0].properties as unknown as Record<string, unknown>;

      expect(Object.keys(props).sort()).toStrictEqual([...EXPECTED_EXPORT_COLUMNS].sort());
      expect(props.description).toBeNull();
      expect(props.countries).toBeNull();
      expect(props.cities).toBeNull();
    });

    it('does not leak the dropped source fields', () => {
      const props = manipulateFeatures(buildFindResponse(requestFeatureId), buildRoi(requestFeatureId, 0.5)).features[0]
        .properties as unknown as Record<string, unknown>;

      for (const dropped of ['jobType', 'catalogId', 'partId', 'sourceId', 'sourceResolutionMeter', 'requestFeatureId', 'source_resolution_meter']) {
        expect(props).not.toHaveProperty(dropped);
      }
    });

    it('throws when a find-response feature is not present in the requested roi', () => {
      expect(() => manipulateFeatures(buildFindResponse('unknown-feature'), buildRoi(requestFeatureId, 0.5))).toThrow();
    });
  });
});

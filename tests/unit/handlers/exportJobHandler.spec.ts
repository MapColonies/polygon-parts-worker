import path from 'path';
import nock from 'nock';
import ogr2ogr from 'ogr2ogr';
import fsMock from 'mock-fs';
import { ExportJobHandler } from '../../../src/models/exportJobHandler';
import { exportJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, init } from '../mocks/configMock';
import { mockGeoJsonFeature } from '../mocks/jobProcessorResponseMock';
import { exportJobResponseMock, nonExistingGpkgExportJobMock } from '../mocks/jobsMocks';

jest.mock('ogr2ogr');

describe('ExportJobHandler', () => {
  const gpkgLocation = configMock.get<string>('gpkgsLocation');
  const geoserverUrl = configMock.get<string>('geoserver.baseUrl');
  const geoserverGetFeaturesPath = `/geoserver/wfs`;
  const geoserverGetFeaturesParams = (layer: string) => {
    return { service: 'wfs', version: '2.0.0', request: 'GetFeature', typeNames: `polygonParts:${layer}`, outputFormat: 'json' };
  };

  let exportJobHandler: ExportJobHandler;

  beforeEach(() => {
    // Mock the file system and create a mock gpkg file inside
    fsMock({
      [path.join(gpkgLocation, exportJobResponseMock.parameters.additionalParams.packageRelativePath)]: 'test',
    });
    init();
    exportJobHandler = exportJobHandlerInstance();
    jest.clearAllMocks();
    // Mock the ogr2ogr method to return a predefined value
    (ogr2ogr as unknown as jest.Mock).mockImplementation(() => ({
      promise: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
    fsMock.restore();
  });

  describe('processJob', () => {
    it('should successfully process job and merge features into gpkg', async () => {
      const geoserverGetFeaturesNock = nock(geoserverUrl)
        .get(geoserverGetFeaturesPath)
        .query(geoserverGetFeaturesParams(`${exportJobResponseMock.resourceId}-${exportJobResponseMock.productType}`))
        .reply(200, mockGeoJsonFeature);

      await exportJobHandler.processJob(exportJobResponseMock);

      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
      expect(ogr2ogr).toHaveBeenCalledTimes(1);
      expect(ogr2ogr).toHaveBeenCalledWith(mockGeoJsonFeature, {
        format: 'GPKG',
        destination: `${gpkgLocation}/${exportJobResponseMock.parameters.additionalParams.packageRelativePath}`,
        options: ['-nln', `${exportJobResponseMock.resourceId}-${exportJobResponseMock.productType}_features`, '-append'],
      });
      expect.assertions(3);
    });

    it('should fail on gpkg does not exist when given a path to a gpkg that does not exist', async () => {
      const geoserverGetFeaturesNock = nock(geoserverUrl)
        .get(geoserverGetFeaturesPath)
        .query(geoserverGetFeaturesParams(`${nonExistingGpkgExportJobMock.resourceId}-${nonExistingGpkgExportJobMock.productType}`))
        .reply(200, mockGeoJsonFeature);

      const action = async () => {
        await exportJobHandler.processJob(nonExistingGpkgExportJobMock);
      };

      await expect(action()).rejects.toThrow();
      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
    });
  });
});

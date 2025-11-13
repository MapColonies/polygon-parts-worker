import path from 'path';
import nock from 'nock';
import ogr2ogr from 'ogr2ogr';
import fsMock from 'mock-fs';
import { v4 as uuidv4 } from 'uuid';
import { ProductType } from '@map-colonies/mc-model-types';
import { ExportJobHandler } from '../../../src/models/export/exportJobHandler';
import { exportJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, init } from '../mocks/configMock';
import { mockGeoJsonFeature, modifiedGeoJsonFeature } from '../mocks/jobProcessorResponseMock';
import { exportJobResponseMock, nonExistingGpkgExportJobMock } from '../mocks/jobsMocks';
import { addFeatureIds } from '../../../src/utils/utils';

jest.mock('ogr2ogr');
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('ExportJobHandler', () => {
  const gpkgLocation = configMock.get<string>('gpkgsLocation');
  const polygonPartsUrl = configMock.get<string>('polygonPartsManager.baseUrl');

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
    jest.resetAllMocks();
    nock.cleanAll();
    fsMock.restore();
  });

  describe('processJob', () => {
    it('should successfully process job and merge features into gpkg', async () => {
      const productType = exportJobResponseMock.productType as ProductType;
      const resourceId = exportJobResponseMock.resourceId;
      (uuidv4 as jest.Mock).mockReturnValue(mockGeoJsonFeature.features[0].properties.requestFeatureId);
      const roi = addFeatureIds(exportJobResponseMock.parameters.exportInputParams.roi);
      const findPartsUrl = `/polygonParts/${resourceId.toLowerCase()}_${productType.toLowerCase()}/find?shouldClip=true`;
      const geoserverGetFeaturesNock = nock(polygonPartsUrl)
        .post(findPartsUrl, JSON.stringify({ filter: roi }))
        .reply(200, mockGeoJsonFeature);

      await exportJobHandler.processJob(exportJobResponseMock);

      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
      expect(ogr2ogr).toHaveBeenCalledTimes(1);
      expect(ogr2ogr).toHaveBeenCalledWith(modifiedGeoJsonFeature, {
        format: 'GPKG',
        destination: `${gpkgLocation}/${exportJobResponseMock.parameters.additionalParams.packageRelativePath}`,
        options: ['-nln', `${exportJobResponseMock.resourceId}-${exportJobResponseMock.productType}_features`, '-overwrite'],
      });
      expect.assertions(3);
    });

    it('should throw error when there is a requestFeatureId in the find response that was not in the requested roi', async () => {
      const productType = exportJobResponseMock.productType as ProductType;
      const resourceId = exportJobResponseMock.resourceId;
      const roi = addFeatureIds(exportJobResponseMock.parameters.exportInputParams.roi);
      const findPartsUrl = `/polygonParts/${resourceId.toLowerCase()}_${productType.toLowerCase()}/find?shouldClip=true`;
      const geoserverGetFeaturesNock = nock(polygonPartsUrl)
        .post(findPartsUrl, JSON.stringify({ filter: roi }))
        .reply(200, mockGeoJsonFeature);

      const action = async () => exportJobHandler.processJob(exportJobResponseMock);
      await expect(action()).rejects.toThrow(Error);

      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
      expect(ogr2ogr).toHaveBeenCalledTimes(0);
      expect.assertions(3);
    });

    it('should fail on gpkg does not exist when given a path to a gpkg that does not exist', async () => {
      const action = async () => {
        await exportJobHandler.processJob(nonExistingGpkgExportJobMock);
      };

      await expect(action()).rejects.toThrow();
    });
  });
});

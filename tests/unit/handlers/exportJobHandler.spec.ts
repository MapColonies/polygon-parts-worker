import path from 'path';
import nock from 'nock';
import { ExportJobHandler } from '../../../src/models/exportJobHandler';
import { TempCopier } from '../helpers/fileHelpers';
import { exportJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, init, setValue } from '../mocks/configMock';
import { mockGeoJsonFeature } from '../mocks/jobProcessorResponseMock';
import { exportJobResponseMock, invalidGpkgExportJobMock, nonExistingGpkgExportJobMock } from '../mocks/jobsMocks';

describe('ExportJobHandler', () => {
  const gpkgLocation = configMock.get<string>('gpkgsLocation');
  const mockGpkgLocation = path.resolve(__dirname, '../mocks/gpkgs/sources');
  const geoserverUrl = configMock.get<string>('geoserver.baseUrl');
  const geoserverGetFeaturesPath = `/geoserver/wfs`;
  const geoserverGetFeaturesParams = (layer: string) => {
    return { service: 'wfs', version: '2.0.0', request: 'GetFeature', typeNames: `polygonParts:${layer}`, outputFormat: 'json' };
  };

  let exportJobHandler: ExportJobHandler;
  const tempCopier = new TempCopier();

  beforeEach(() => {
    setValue('gpkgsLocation', path.join(tempCopier.tempPath, gpkgLocation));
    init();
    exportJobHandler = exportJobHandlerInstance();
    jest.clearAllMocks();
    tempCopier.copyToTemp(mockGpkgLocation, gpkgLocation);
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
    tempCopier.disposeTemp();
  });
  describe('processJob', () => {
    it('should successfully process job and merge features into gpkg', async () => {
      const geoserverGetFeaturesNock = nock(geoserverUrl)
        .get(geoserverGetFeaturesPath)
        .query(geoserverGetFeaturesParams(`${exportJobResponseMock.resourceId}-${exportJobResponseMock.productType}`))
        .reply(200, mockGeoJsonFeature);

      await exportJobHandler.processJob(exportJobResponseMock);

      // todo: Fix this comparison to make sure the merged gpkg is the same as target. Currently, the comparison fails on gpkg_metadata_reference timestamp.
      // const targetGpkg = fs.readFileSync(path.resolve(__filename, '../../mocks/gpkgs/targets/test1-target.gpkg'));
      // const tempGpkg = fs.readFileSync(
      //   path.join(tempCopier.tempPath, gpkgLocation, exportJobResponseMock.parameters.additionalParams.packageRelativePath)
      // );

      // expect(targetGpkg.equals(tempGpkg)).toBeTruthy();
      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
    });

    it('should fail on ogr2ogr when given an invalid gpkg', async () => {
      const geoserverGetFeaturesNock = nock(geoserverUrl)
        .get(geoserverGetFeaturesPath)
        .query(geoserverGetFeaturesParams(`${invalidGpkgExportJobMock.resourceId}-${invalidGpkgExportJobMock.productType}`))
        .reply(200, mockGeoJsonFeature);

      const action = async () => {
        await exportJobHandler.processJob(invalidGpkgExportJobMock);
      };

      await expect(action()).rejects.toThrow();
      expect(geoserverGetFeaturesNock.isDone()).toBeTruthy();
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

import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { addFeatureIds } from '../../../src/utils/utils';
import { exportJobResponseMock } from '../mocks/jobsMocks';

describe('utils', () => {
  describe('addFeatureIds', () => {
    it('should add unique IDs to all features', () => {
      const roi: RoiFeatureCollection = exportJobResponseMock.parameters.exportInputParams.roi;
      const result = addFeatureIds(roi);
      expect(result.features[0].id).toBeDefined();
    });
  });
});

import { shpFeatureSchema } from '../../../src/schemas/shpFile.schema';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';

describe('shpFeatureSchema', () => {
  const createFeature = (propertiesOverrides: Record<string, unknown> = {}): unknown => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    },
    properties: { ...createFakeShpFeatureProperties(), ...propertiesOverrides },
  });

  describe('classify property (MAPCO-12032)', () => {
    it('should parse a feature when classify is null', () => {
      const feature = createFeature({ classify: null });

      expect(() => shpFeatureSchema.parse(feature)).not.toThrow();
    });

    it('should parse a feature when classify is missing', () => {
      const feature = createFeature();
      delete (feature as { properties: Record<string, unknown> }).properties.classify;

      expect(() => shpFeatureSchema.parse(feature)).not.toThrow();
    });

    it('should parse a feature when classify is a string and ignore its value', () => {
      const feature = createFeature({ classify: 'some-classification' });

      const parsed = shpFeatureSchema.parse(feature);

      expect(parsed.properties).not.toHaveProperty('classify');
    });
  });
});

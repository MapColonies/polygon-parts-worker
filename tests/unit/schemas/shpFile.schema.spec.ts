import { shpFeaturePropertiesSchema } from '../../../src/schemas/shpFile.schema';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';

describe('shpFeaturePropertiesSchema', () => {
  describe('imaging dates', () => {
    it('should parse dateStart and dateEnd as dates', () => {
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-01T00:00:00Z', dateEnd: '05/01/2024' };

      const result = shpFeaturePropertiesSchema.parse(properties);

      expect(result.dateStart).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.dateEnd).toEqual(new Date('2024-01-05'));
    });

    it('should accept dateStart equal to dateEnd', () => {
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-01', dateEnd: '2024-01-01' };

      const result = shpFeaturePropertiesSchema.safeParse(properties);

      expect(result.success).toBe(true);
    });

    it('should reject dateStart later than dateEnd', () => {
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-10', dateEnd: '2024-01-05' };

      const result = shpFeaturePropertiesSchema.safeParse(properties);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['dateEnd'], message: 'dateStart must be earlier than or equal to dateEnd' }),
      ]);
    });

    it.each([
      { field: 'dateStart', description: 'missing', value: undefined },
      { field: 'dateStart', description: 'null', value: null },
      { field: 'dateStart', description: 'empty', value: '' },
      { field: 'dateEnd', description: 'missing', value: undefined },
      { field: 'dateEnd', description: 'null', value: null },
      { field: 'dateEnd', description: 'empty', value: '' },
    ])('should reject a $description $field', ({ field, value }) => {
      const properties = { ...createFakeShpFeatureProperties(), [field]: value };

      const result = shpFeaturePropertiesSchema.safeParse(properties);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message: 'Required' })]);
    });

    it('should reject an invalid dateStart', () => {
      const properties = { ...createFakeShpFeatureProperties(), dateStart: 'not-a-date' };

      const result = shpFeaturePropertiesSchema.safeParse(properties);

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['dateStart'], message: 'Expected a valid date format (ISO 8601 or DD/MM/YYYY)' }),
      ]);
    });
  });
});

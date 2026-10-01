import { shpFeaturePropertiesSchema } from '../../../src/schemas/shpFile.schema';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';

describe('shpFeaturePropertiesSchema', () => {
  describe('imaging dates', () => {
    it('should parse dateStart and dateEnd as dates', () => {
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-01T00:00:00Z', dateEnd: '05/01/2024' };

      // Act
      const result = shpFeaturePropertiesSchema.parse(properties);

      // Assert
      expect(result.dateStart).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.dateEnd).toEqual(new Date('2024-01-05'));
    });

    it('should accept dateStart equal to dateEnd', () => {
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-01', dateEnd: '2024-01-01' };

      // Act
      const result = shpFeaturePropertiesSchema.safeParse(properties);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject dateStart later than dateEnd', () => {
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-10', dateEnd: '2024-01-05' };

      // Act
      const result = shpFeaturePropertiesSchema.safeParse(properties);

      // Assert
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
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), [field]: value };

      // Act
      const result = shpFeaturePropertiesSchema.safeParse(properties);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([expect.objectContaining({ path: [field], message: 'Required (replaces the legacy updateDate column)' })]);
    });

    it('should reject an invalid dateStart', () => {
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), dateStart: 'not-a-date' };

      // Act
      const result = shpFeaturePropertiesSchema.safeParse(properties);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({ path: ['dateStart'], message: 'Expected a valid date format (ISO 8601 or DD/MM/YYYY)' }),
      ]);
    });

    it('should reject a legacy row that has only updateDate', () => {
      // Arrange
      const { dateStart, dateEnd, ...rest } = createFakeShpFeatureProperties();
      const legacyProperties = { ...rest, updateDate: dateEnd };

      // Act
      const result = shpFeaturePropertiesSchema.safeParse(legacyProperties);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([['dateStart'], ['dateEnd']]);
    });

    it('should ignore updateDate when it is sent alongside dateStart and dateEnd', () => {
      // Arrange
      const properties = { ...createFakeShpFeatureProperties(), dateStart: '2024-01-01', dateEnd: '2024-01-05', updateDate: '2030-01-01' };

      // Act
      const result = shpFeaturePropertiesSchema.parse(properties);

      // Assert
      expect(result).not.toHaveProperty('updateDate');
      expect(result.dateStart).toEqual(new Date('2024-01-01'));
      expect(result.dateEnd).toEqual(new Date('2024-01-05'));
    });
  });
});

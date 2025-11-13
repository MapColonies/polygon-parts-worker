/* eslint-disable @typescript-eslint/no-magic-numbers */

export const validShapefileChunkMock = {
  id: 1,
  verticesCount: 100,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {
        id: 'test-id',
        sourceId: 'source-1',
        sourceName: 'Test Source',
        ep90: 5.0,
        updateDate: '2024-01-01T00:00:00Z',
        sourceRes: 10.0,
        sensors: ['sensor-1'],
        desc: 'Test description',
        cities: ['Test City'],
        countries: ['Test Country'],
      },
    },
  ],
  skippedFeatures: [],
};

export const invalidShapefileChunkMock = {
  id: 1,
  verticesCount: 100,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: {
        // Missing required fields like sourceId, sourceName, etc.
        id: 'test-id',
      },
    },
  ],
  skippedFeatures: [],
};

export const mockProcessingState = {
  progress: { percentage: 50, processedRecords: 50, totalRecords: 100 },
  lastProcessedIndex: 49,
};

import { OGR2OGR_SHP_REPORT_OPTIONS } from '../../../../src/models/ingestion/constants';

export const writeChunkTestCases = [
  {
    description: 'create a new shapefile when writing first chunk',
    chunkId: 1,
    featureCount: 3,
    reportShapefileExists: false,
    expectedOptions: OGR2OGR_SHP_REPORT_OPTIONS,
  },
  {
    description: 'append to existing shapefile when writing subsequent chunks',
    chunkId: 2,
    featureCount: 5,
    reportShapefileExists: true,
    expectedOptions: [...OGR2OGR_SHP_REPORT_OPTIONS, '-append', '-addfields'],
  },
  {
    description: 'handle empty features array',
    chunkId: 1,
    featureCount: 0,
    reportShapefileExists: false,
    expectedOptions: OGR2OGR_SHP_REPORT_OPTIONS,
  },
];

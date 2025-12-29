/* eslint-disable @typescript-eslint/naming-convention */
import { SHAPEFILE_EXTENSIONS_LIST, ValidationAggregatedErrors, ValidationErrorType } from '@map-colonies/raster-shared';
import { ErrorsCount } from './types';

export const UNKNOWN_ID = 'UNKNOWN_ID';

export const SHAPEFILE_REPORT_FILE_NAME = 'report.shp';

export const METADATA_ERROR_SEPARATOR = '; ';

export const VALIDATION_ERROR_TYPE_FORMATS = {
  [ValidationErrorType.VERTICES]: { columnName: 'e_vertices', countKey: 'vertices' },
  [ValidationErrorType.METADATA]: { columnName: 'e_metadata', countKey: 'metadata' },
  [ValidationErrorType.GEOMETRY_VALIDITY]: { columnName: 'e_validity', countKey: 'geometryValidity' },
  [ValidationErrorType.RESOLUTION]: { columnName: 'e_res', countKey: 'resolution' },
  [ValidationErrorType.SMALL_GEOMETRY]: { columnName: 'e_sm_geom', countKey: 'smallGeometries' },
  [ValidationErrorType.SMALL_HOLES]: { columnName: 'e_sm_holes', countKey: 'smallHoles' },
  [ValidationErrorType.UNKNOWN]: { columnName: 'e_unknown', countKey: 'unknown' },
} as const satisfies Record<ValidationErrorType, { columnName: string; countKey: keyof ErrorsCount }>;

export const OGR2OGR_SHP_REPORT_OPTIONS = ['-lco', 'ENCODING=UTF-8', '-nln', 'report'];

export const SHAPEFILE_REPORT_EXTENSIONS_LIST = [...SHAPEFILE_EXTENSIONS_LIST, '.qmd'];

export const QMD_ERROR_LABELS: Record<keyof ErrorsCount, string> = {
  vertices: 'Vertices limit error count',
  metadata: 'Metadata error count',
  geometryValidity: 'Geometry error count',
  resolution: 'Resolution error count',
  smallGeometries: 'Small geometries error count',
  smallHoles: 'Small holes error count',
  unknown: 'Unknown error count',
};

export const QMD_THRESHOLD_LABELS: { key: keyof ValidationAggregatedErrors['thresholds']; label: string }[] = [
  { key: 'smallGeometries', label: 'Small geometries validation' },
  { key: 'smallHoles', label: 'Small holes validation' },
];

export const QMD_REPORT_FILE_NAME = 'report.qmd';

/* eslint-disable @typescript-eslint/naming-convention */
export const THRESHOLD_VALIDATION_STATUS = {
  PASSED: 'Passed',
  FAILED: 'Failed',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export const ShpWritingMode = {
  Create: 'CREATE',
  Append: 'APPEND',
} as const;

export type ShpWritingMode = (typeof ShpWritingMode)[keyof typeof ShpWritingMode];
/* eslint-enable @typescript-eslint/naming-convention */

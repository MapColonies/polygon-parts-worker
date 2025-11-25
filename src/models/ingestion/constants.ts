import { ValidationErrorType } from '@map-colonies/raster-shared';
import { ErrorsCount } from './types';

export const UNKNOWN_ID = 'UNKNOWN_ID';

export const METADATA_ERROR_SEPARATOR = '; ';

export const VALIDATION_ERROR_TYPE_FORMATS = {
  [ValidationErrorType.VERTICES]: { columnName: 'e_vertices', countKey: 'vertices' },
  [ValidationErrorType.METADATA]: { columnName: 'e_metadata', countKey: 'metadata' },
  [ValidationErrorType.GEOMETRY_VALIDITY]: { columnName: 'e_validity', countKey: 'geometryValidity' },
  [ValidationErrorType.RESOLUTION]: { columnName: 'e_res', countKey: 'resolution' },
  [ValidationErrorType.SMALL_GEOMETRY]: { columnName: 'e_sm_geom', countKey: 'smallGeometries' },
  [ValidationErrorType.SMALL_HOLES]: { columnName: 'e_sm_holes', countKey: 'smallHoles' },
} as const satisfies Record<ValidationErrorType, { columnName: string; countKey: keyof ErrorsCount }>;

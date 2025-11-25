import { ValidationErrorType } from '@map-colonies/raster-shared';
import { ErrorsCount } from './types';

export const UNKNOWN_ID = 'UNKNOWN_ID';

export const METADATA_ERROR_SEPARATOR = '; ';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ErrorTypeToColumnName: Record<ValidationErrorType, string> = {
  [ValidationErrorType.VERTICES]: 'e_vertices',
  [ValidationErrorType.METADATA]: 'e_metadata',
  [ValidationErrorType.GEOMETRY_VALIDITY]: 'e_validity',
  [ValidationErrorType.RESOLUTION]: 'e_res',
  [ValidationErrorType.SMALL_GEOMETRY]: 'e_sm_geom',
  [ValidationErrorType.SMALL_HOLES]: 'e_sm_holes',
};

export const errorCountMapping: Record<ValidationErrorType, keyof ErrorsCount> = {
  [ValidationErrorType.GEOMETRY_VALIDITY]: 'geometryValidity',
  [ValidationErrorType.RESOLUTION]: 'resolution',
  [ValidationErrorType.METADATA]: 'metadata',
  [ValidationErrorType.VERTICES]: 'vertices',
  [ValidationErrorType.SMALL_GEOMETRY]: 'smallGeometries',
  [ValidationErrorType.SMALL_HOLES]: 'smallHoles',
};

import { z } from 'zod';
import { METADATA_ERROR_SEPARATOR } from '../models/ingestion/constants';

export const commaSeparatedStringSchema = z
  .string()
  .nullable()
  .transform((val) => {
    if (val === null || val === '') {
      return [];
    }
    return val
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  .pipe(z.array(z.string()));

// A preprocessing schema to handle flexible date formats, including "DD/MM/YYYY"
export const flexibleDateCoerce = z.preprocess((val) => {
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [day, month, year] = val.split('/');
    return `${year}-${month}-${day}`;
  }
  return val;
}, z.coerce.date({ errorMap: () => ({ message: 'Expected a valid date format (ISO 8601 or DD/MM/YYYY)' }) }));

export const formatZodIssues = (issues: z.ZodIssue[]): string => {
  return issues.map((issue) => `${issue.path.join('.')}: ${issue.message} (code: ${issue.code})`).join(METADATA_ERROR_SEPARATOR);
};

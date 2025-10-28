import { z } from 'zod';

export const commaSeparatedStringSchema = z
  .union([z.null(), z.string()])
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
}, z.coerce.date());

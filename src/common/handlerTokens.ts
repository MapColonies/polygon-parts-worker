import type { ConfigType } from './config';

/* Job handler DI tokens use SCREAMING_SNAKE-style keys to match handler registration. */
/* eslint-disable @typescript-eslint/naming-convention */
interface JobDefinitionsJobs {
  new: { type: string };
  update: { type: string };
  swapUpdate: { type: string };
  export: { type: string };
}

const DEFAULT_JOB_HANDLER_TYPES = {
  NEW: 'Ingestion_New',
  UPDATE: 'Ingestion_Update',
  SWAP: 'Ingestion_Swap_Update',
  EXPORT: 'Export',
} as const;

function getHandlerTokens(config: ConfigType): {
  NEW: string;
  UPDATE: string;
  SWAP: string;
  EXPORT: string;
} {
  const jobs = config.get<JobDefinitionsJobs>('jobDefinitions.jobs');
  return {
    NEW: jobs.new.type,
    UPDATE: jobs.update.type,
    SWAP: jobs.swapUpdate.type,
    EXPORT: jobs.export.type,
  };
}

export { DEFAULT_JOB_HANDLER_TYPES, getHandlerTokens };
/* eslint-enable @typescript-eslint/naming-convention */

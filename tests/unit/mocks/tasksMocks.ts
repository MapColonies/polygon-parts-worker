import { ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';

//copied from Ingestion-Trigger, should be moved to a shared library (Mc-Models)
export interface IPollingTaskParameters {
  blockDuplication?: boolean;
}

export const initTaskForIngestionNew: ITaskResponse<IPollingTaskParameters> = {
  id: '4a5486bd-6269-4898-b9b1-647fe56d6ae2',
  type: 'polygonParts',
  description: 'polygonParts task',
  parameters: {
    blockDuplication: true,
  },
  status: OperationStatus.IN_PROGRESS,
  percentage: 0,
  reason: '',
  attempts: 0,
  jobId: '321d495f-e6e4-45cc-b301-4ebc4e894f03',
  resettable: true,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created: '2024-07-21T10:59:23.510Z',
  updated: '2024-07-24T07:43:10.528Z',
};

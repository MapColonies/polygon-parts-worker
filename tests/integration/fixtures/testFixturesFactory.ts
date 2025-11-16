/* eslint-disable @typescript-eslint/no-magic-numbers */
import { randomUUID } from 'crypto';
import { IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ProductType } from '@map-colonies/mc-model-types';
import { IngestionJobParams, ValidationTaskParameters } from '../../../src/common/interfaces';
import { HANDLERS } from '../../../src/common/constants';

export interface CreateJobOptions {
  jobId?: string;
  type?: string;
  resourceId?: string;
  version?: string;
  productType?: string;
  shapefilePath?: string;
  ingestionResolution?: number;
}

export interface CreateTaskOptions {
  taskId?: string;
  jobId?: string;
  type?: string;
  checkSum?: string;
  processingState?: ValidationTaskParameters['processingState'];
  status?: OperationStatus;
  attempts?: number;
}

export function createIngestionJob(options: CreateJobOptions = {}): IJobResponse<IngestionJobParams, unknown> {
  const jobId = options.jobId ?? randomUUID();
  const type = options.type ?? HANDLERS.NEW;
  const resourceId = options.resourceId ?? 'test_product_id';
  const version = options.version ?? '1.0';
  const productType = options.productType ?? ProductType.ORTHOPHOTO;
  const shapefilePath = options.shapefilePath ?? '/tmp/ShapeMetadata.shp';
  const ingestionResolution = options.ingestionResolution ?? 0.0006866455078125;

  return {
    id: jobId,
    resourceId,
    version,
    type: type,
    description: 'Integration test ingestion job',
    parameters: {
      ingestionResolution,
      inputFiles: {
        gpkgFilesPath: ['/tmp/gpkgFiles/file1.gpkg'],
        metadataShapefilePath: shapefilePath,
        productShapefilePath: '/tmp/productShapefile.shp',
      },
      additionalParams: {
        jobTrackerServiceURL: 'http://job-tracker-service',
      },
    },
    status: OperationStatus.IN_PROGRESS,
    percentage: 0,
    reason: '',
    domain: 'test-domain',
    isCleaned: false,
    priority: 0,
    expirationDate: new Date('2025-12-31T23:59:59Z'),
    internalId: 'internal-test-id',
    producerName: 'test-producer',
    productName: 'test-product',
    productType,
    additionalIdentifiers: '',
    taskCount: 1,
    completedTasks: 0,
    failedTasks: 0,
    expiredTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 1,
    abortedTasks: 0,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

export function createTask(options: CreateTaskOptions = {}): ITaskResponse<ValidationTaskParameters> {
  const taskId = options.taskId ?? randomUUID();
  const type = options.type ?? 'validation';
  const jobId = options.jobId ?? randomUUID();
  const processingState = options.processingState ?? null;
  const status = options.status ?? OperationStatus.IN_PROGRESS;
  const attempts = options.attempts ?? 0;

  return {
    id: taskId,
    attempts,
    type: type,
    description: 'Integration test validation task',
    parameters: {
      processingState,
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    status,
    percentage: 0,
    reason: '',
    jobId,
    resettable: true,
  };
}

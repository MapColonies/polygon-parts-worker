import nock from 'nock';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { StatusCodes } from 'http-status-codes';
import { jobTypes } from '../fixtures/testFixturesFactory';
import { configMock } from '../../unit/mocks/configMock';

export interface MockHttpUrls {
  polygonPartsManagerUrl: string;
  jobManagerUrl: string;
  jobTrackerUrl: string;
  heartbeatUrl: string;
}

export const mockUrls: MockHttpUrls = {
  polygonPartsManagerUrl: configMock.get('polygonPartsManager.baseUrl') as unknown as string,
  jobManagerUrl: configMock.get('jobManagement.config.jobManagerBaseUrl') as unknown as string,
  jobTrackerUrl: configMock.get('jobManagement.config.jobTracker.baseUrl') as unknown as string,
  heartbeatUrl: configMock.get('jobManagement.config.heartbeat.baseUrl') as unknown as string,
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpMockHelper {
  public static mockPolygonPartsValidate(validationResult: PolygonPartsChunkValidationResult | PolygonPartsChunkValidationResult[]): nock.Scope {
    if (Array.isArray(validationResult)) {
      let scope = nock(mockUrls.polygonPartsManagerUrl);

      for (const result of validationResult) {
        scope = scope.post('/polygonParts/validate').reply(StatusCodes.OK, result);
      }
      return scope;
    }
    return nock(mockUrls.polygonPartsManagerUrl).post('/polygonParts/validate').reply(StatusCodes.OK, validationResult).persist();
  }

  public static mockJobManagerUpdateTask(jobId: string, taskId: string): nock.Scope {
    return nock(mockUrls.jobManagerUrl).put(`/jobs/${jobId}/tasks/${taskId}`).reply(StatusCodes.OK).persist();
  }

  public static mockJobManagerUpdateJob(
    jobId: string,
    body: Omit<Partial<IJobResponse<unknown, unknown>>, 'parameters' | 'tasks' | 'expirationDate'>
  ): nock.Scope {
    return nock(mockUrls.jobManagerUrl).put(`/jobs/${jobId}`, body).reply(StatusCodes.OK).persist();
  }

  public static mockJobManagerGetJob(jobId: string, job: IJobResponse<unknown, unknown>, shouldReturnTasks: boolean = false): nock.Scope {
    return nock(mockUrls.jobManagerUrl).get(`/jobs/${jobId}?shouldReturnTasks=${shouldReturnTasks}`).reply(StatusCodes.OK, job);
  }

  public static mockJobManagerSearchTasks(jobType: string, taskTypes: string[], task: ITaskResponse<unknown>): void {
    for (const currentJobType of Object.values(jobTypes)) {
      for (const taskType of taskTypes) {
        nock(mockUrls.jobManagerUrl)
          .post(`/tasks/${currentJobType}/${taskType}/startPending`)
          .reply(StatusCodes.OK, jobType === currentJobType ? task : undefined);
      }
    }
  }

  public static mockJobManagerGetTaskById(jobId: string, taskId: string, task: ITaskResponse<unknown>): nock.Scope {
    return nock(mockUrls.jobManagerUrl).get(`/jobs/${jobId}/tasks/${taskId}`).reply(StatusCodes.OK, task);
  }

  public static mockJobManagerRejectTask(jobId: string, task: ITaskResponse<unknown>): nock.Scope {
    nock(mockUrls.jobManagerUrl).get(`/jobs/${jobId}/tasks/${task.id}`).reply(StatusCodes.OK, task);
    return nock(mockUrls.jobManagerUrl).put(`/jobs/${jobId}/tasks/${task.id}`).reply(StatusCodes.OK);
  }

  public static mockJobTrackerFinishTask(taskId: string): nock.Scope {
    return nock(mockUrls.jobTrackerUrl).post(`/tasks/${taskId}/notify`).reply(StatusCodes.OK);
  }

  public static mockCallbackClientSend(status: StatusCodes, callbackUrls?: string[]): void {
    if (!callbackUrls) {
      return;
    }
    for (const callbackUrl of callbackUrls) {
      nock(callbackUrl).post('').reply(status);
    }
  }

  public static mockHeartbeat(taskId: string): nock.Scope {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return nock(mockUrls.heartbeatUrl).post(`/heartbeat/${taskId}`).reply(200, 'ok').persist();
  }
}

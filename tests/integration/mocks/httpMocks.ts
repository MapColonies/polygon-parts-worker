/* eslint-disable import-x/exports-last */
import nock from 'nock';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { StatusCodes } from 'http-status-codes';
import { getHandlers } from '../../../src/common/constants';
import { getConfig } from '../../../src/common/config';

export interface MockHttpUrls {
  polygonPartsManagerUrl: string;
  jobManagerUrl: string;
  jobTrackerUrl: string;
  heartbeatUrl: string;
}

const getMockUrls = (): MockHttpUrls => {
  const config = getConfig();
  return {
    polygonPartsManagerUrl: config.get('polygonPartsManager.baseUrl') as unknown as string,
    jobManagerUrl: config.get('jobManagement.config.jobManagerBaseUrl') as unknown as string,
    jobTrackerUrl: config.get('jobManagement.config.jobTracker.baseUrl') as unknown as string,
    heartbeatUrl: config.get('jobManagement.config.heartbeat.baseUrl') as unknown as string,
  };
};

export class HttpMockHelper {
  private readonly mockUrls: MockHttpUrls;

  public constructor() {
    this.mockUrls = getMockUrls();
  }

  public mockPolygonPartsValidate(validationResult: PolygonPartsChunkValidationResult | PolygonPartsChunkValidationResult[]): nock.Scope {
    const { polygonPartsManagerUrl } = this.mockUrls;
    if (Array.isArray(validationResult)) {
      let scope = nock(polygonPartsManagerUrl);

      for (const result of validationResult) {
        scope = scope.post('/polygonParts/validate').reply(StatusCodes.OK, result);
      }
      return scope;
    }
    return nock(polygonPartsManagerUrl).post('/polygonParts/validate').reply(StatusCodes.OK, validationResult).persist();
  }

  public mockJobManagerUpdateTask(jobId: string, taskId: string): nock.Scope {
    return nock(this.mockUrls.jobManagerUrl).put(`/jobs/${jobId}/tasks/${taskId}`).reply(StatusCodes.OK).persist();
  }

  public mockJobManagerUpdateJob(
    jobId: string,
    body: Omit<Partial<IJobResponse<unknown, unknown>>, 'parameters' | 'tasks' | 'expirationDate'>
  ): nock.Scope {
    return nock(this.mockUrls.jobManagerUrl).put(`/jobs/${jobId}`, body).reply(StatusCodes.OK).persist();
  }

  public mockJobManagerGetJob(jobId: string, job: IJobResponse<unknown, unknown>, shouldReturnTasks: boolean = false): nock.Scope {
    return nock(this.mockUrls.jobManagerUrl).get(`/jobs/${jobId}?shouldReturnTasks=${shouldReturnTasks}`).reply(StatusCodes.OK, job);
  }

  public mockJobManagerSearchTasks(jobType: string, taskTypes: string[], task: ITaskResponse<unknown>): void {
    const { jobManagerUrl } = this.mockUrls;
    for (const handler of Object.values(getHandlers())) {
      for (const taskType of taskTypes) {
        nock(jobManagerUrl)
          .post(`/tasks/${handler}/${taskType}/startPending`)
          .reply(StatusCodes.OK, jobType === handler ? task : undefined);
      }
    }
  }

  public mockJobManagerGetTaskById(jobId: string, taskId: string, task: ITaskResponse<unknown>): nock.Scope {
    return nock(this.mockUrls.jobManagerUrl).get(`/jobs/${jobId}/tasks/${taskId}`).reply(StatusCodes.OK, task);
  }

  public mockJobManagerRejectTask(jobId: string, task: ITaskResponse<unknown>): nock.Scope {
    const { jobManagerUrl } = this.mockUrls;
    nock(jobManagerUrl).get(`/jobs/${jobId}/tasks/${task.id}`).reply(StatusCodes.OK, task);
    return nock(jobManagerUrl).put(`/jobs/${jobId}/tasks/${task.id}`).reply(StatusCodes.OK);
  }

  public mockJobTrackerFinishTask(taskId: string): nock.Scope {
    return nock(this.mockUrls.jobTrackerUrl).post(`/tasks/${taskId}/notify`).reply(StatusCodes.OK);
  }

  public mockCallbackClientSend(status: StatusCodes, callbackUrls?: string[]): void {
    if (!callbackUrls) {
      return;
    }
    for (const callbackUrl of callbackUrls) {
      nock(callbackUrl).post('').reply(status);
    }
  }

  public mockHeartbeat(taskId: string): nock.Scope {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return nock(this.mockUrls.heartbeatUrl).post(`/heartbeat/${taskId}`).reply(200, 'ok').persist();
  }

  public mockStopHeartbeat(taskId: string): nock.Scope {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return nock(this.mockUrls.heartbeatUrl).post(`/heartbeat/remove/${taskId}`, [taskId]).reply(200, 'ok').persist();
  }
}

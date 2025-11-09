import nock from 'nock';
import { PolygonPartsPayload } from '@map-colonies/raster-shared';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import { StatusCodes } from 'http-status-codes';
import { HANDLERS } from '../../../src/common/constants';

export interface MockHttpUrls {
  polygonPartsManagerUrl: string;
  jobManagerUrl: string;
  jobTrackerUrl: string;
  heartbeatUrl: string;
}

export const mockUrls: MockHttpUrls = {
  polygonPartsManagerUrl: 'http://polygon-parts-manager-test',
  jobManagerUrl: 'http://job-manager-test',
  jobTrackerUrl: 'http://job-tracker-test',
  heartbeatUrl: 'http://heart-beat-test',
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpMockHelper {
  public static mockPolygonPartsValidateSuccess(): nock.Scope {
    return nock(mockUrls.polygonPartsManagerUrl).post('/polygonParts/validate').reply(StatusCodes.OK).persist();
  }

  public static mockJobManagerUpdateTask(jobId: string, taskId: string): nock.Scope {
    return nock(mockUrls.jobManagerUrl).put(`/jobs/${jobId}/tasks/${taskId}`).reply(StatusCodes.OK).persist();
  }

  public static mockJobManagerGetJob(jobId: string, job: IJobResponse<unknown, unknown>, shouldReturnTasks: boolean = false): nock.Scope {
    return nock(mockUrls.jobManagerUrl).get(`/jobs/${jobId}?shouldReturnTasks=${shouldReturnTasks}`).reply(StatusCodes.OK, job);
  }

  public static mockJobManagerSearchTask(jobType: string, taskType: string, task: ITaskResponse<unknown>): nock.Scope {
    nock(mockUrls.jobManagerUrl)
      .post(`/tasks/${HANDLERS.NEW}/${taskType}/startPending`)
      .reply(StatusCodes.OK, jobType === HANDLERS.NEW ? task : undefined);
    nock(mockUrls.jobManagerUrl)
      .post(`/tasks/${HANDLERS.UPDATE}/${taskType}/startPending`)
      .reply(StatusCodes.OK, jobType === HANDLERS.UPDATE ? task : undefined);
    return nock(mockUrls.jobManagerUrl)
      .post(`/tasks/${HANDLERS.SWAP}/${taskType}/startPending`)
      .reply(StatusCodes.OK, jobType === HANDLERS.SWAP ? task : undefined);
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
}

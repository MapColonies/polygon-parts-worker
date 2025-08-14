import { StatusCodes } from 'http-status-codes';
import nock from 'nock';
import { ZodError } from 'zod';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { getUpdatedJobParams, polygonPartsEntity } from '../mocks/jobProcessorResponseMock';
import { newJobResponseMock } from '../mocks/jobsMocks';

describe('NewJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerCreatePath = `/polygonParts`;
  const polygonPartsManagerExistsPath = `/polygonParts/exists`;
  const jobManagerUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
  let newJobHandler: NewJobHandler;

  beforeEach(() => {
    newJobHandler = newJobHandlerInstance();
    jest.clearAllMocks();
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
  });

  describe('#processJob', () => {
    it('should successfully process job', async () => {
      const updatedParams = getUpdatedJobParams(newJobResponseMock, polygonPartsEntity);
      nock(polygonPartsManagerUrl).post(polygonPartsManagerExistsPath).reply(StatusCodes.NOT_FOUND);
      nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.OK, polygonPartsEntity);
      const updateJobNock = nock(jobManagerUrl).put(`/jobs/${newJobResponseMock.id}`, JSON.stringify(updatedParams)).reply(StatusCodes.OK);

      const action = async () => {
        await newJobHandler.processJob(newJobResponseMock);
      };

      await expect(action()).resolves.not.toThrow(Error);
      expect(updateJobNock.isDone()).toBeTruthy();
      expect.assertions(2);
    });

    it('should throw an error on validation when invalid productType', async () => {
      const invalidJobResponseMock = { ...newJobResponseMock, productType: 'invalidType' };

      const action = async () => {
        await newJobHandler.processJob(invalidJobResponseMock);
      };

      await expect(action()).rejects.toThrow(ZodError);
      expect.assertions(1);
    });

    it('should throw an error on exists polygon parts manager throws an error', async () => {
      nock(polygonPartsManagerUrl).post(polygonPartsManagerExistsPath).reply(StatusCodes.INTERNAL_SERVER_ERROR, polygonPartsEntity);

      const action = async () => {
        await newJobHandler.processJob(newJobResponseMock);
      };

      await expect(action()).rejects.toThrow(Error);
      expect.assertions(1);
    });

    it('should throw an error on create polygon parts manager throws an error', async () => {
      nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.INTERNAL_SERVER_ERROR, polygonPartsEntity);

      const action = async () => {
        await newJobHandler.processJob(newJobResponseMock);
      };

      await expect(action()).rejects.toThrow(Error);
      expect.assertions(1);
    });

    it('should throw an error on job manager throws an error', async () => {
      const updatedParams = getUpdatedJobParams(newJobResponseMock, polygonPartsEntity);
      nock(polygonPartsManagerUrl).post(polygonPartsManagerExistsPath).reply(StatusCodes.NOT_FOUND);
      nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.OK, polygonPartsEntity);
      const updateJobNock = nock(jobManagerUrl)
        .put(`/jobs/${newJobResponseMock.id}`, JSON.stringify(updatedParams))
        .reply(StatusCodes.INTERNAL_SERVER_ERROR);

      const action = async () => {
        await newJobHandler.processJob(newJobResponseMock);
      };

      await expect(action()).rejects.toThrow(Error);
      expect(updateJobNock.isDone()).toBeTruthy();
      expect.assertions(2);
    });

    describe('#retry-task', () => {
      it('should successfully process job on create polygon parts throws error when entity already exists (conflict) and polygonPartsEntityName is already in additionalParams (retried task)', async () => {
        const newJobParameters = {
          parameters: {
            ...newJobResponseMock.parameters,
            additionalParams: { ...newJobResponseMock.parameters.additionalParams, polygonPartsEntityName: 'polygon_parts_entity_name_orthophoto' },
          },
        };
        const job = {
          ...newJobResponseMock,
          ...newJobParameters,
        };
        nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.CONFLICT, 'error message');
        const updateJobNock = nock(jobManagerUrl).put(`/jobs/${job.id}`, JSON.stringify(newJobParameters)).reply(StatusCodes.OK);

        const action = async () => {
          await newJobHandler.processJob(job);
        };

        await expect(action()).resolves.not.toThrow(Error);
        expect(updateJobNock.isDone()).toBeTruthy();
        expect.assertions(2);
      });

      it('should throw an error on create polygon parts when entity already exists (conflict) and job parameters are invalid', async () => {
        const invalidPolygonPartsEntityName = '';
        const newJobParameters = {
          parameters: {
            ...newJobResponseMock.parameters,
            additionalParams: { ...newJobResponseMock.parameters.additionalParams, polygonPartsEntityName: invalidPolygonPartsEntityName },
          },
        };
        const job = {
          ...newJobResponseMock,
          ...newJobParameters,
        };
        nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.CONFLICT, 'error message');

        const action = async () => {
          await newJobHandler.processJob(job);
        };

        await expect(action()).rejects.toThrow(ZodError);
        expect.assertions(1);
      });

      it('should throw an error on create polygon parts when entity already exists (conflict) and job parameters does not have polygonPartsEntityName in additionalParams', async () => {
        const newJobParameters = {
          parameters: {
            ...newJobResponseMock.parameters,
            additionalParams: { ...newJobResponseMock.parameters.additionalParams },
          },
        };
        const job = {
          ...newJobResponseMock,
          ...newJobParameters,
        };
        nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.CONFLICT, 'error message');

        const action = async () => {
          await newJobHandler.processJob(job);
        };

        await expect(action()).rejects.toThrow(new Error('polygonPartsEntityName is missing from additionalParams'));
        expect.assertions(1);
      });

      it('should throw an error on create polygon parts when polygon parts manager throws non-conflict error', async () => {
        const newJobParameters = {
          parameters: {
            ...newJobResponseMock.parameters,
            additionalParams: { ...newJobResponseMock.parameters.additionalParams, polygonPartsEntityName: 'polygon_parts_entity_name_orthophoto' },
          },
        };
        const job = {
          ...newJobResponseMock,
          ...newJobParameters,
        };
        nock(polygonPartsManagerUrl).post(polygonPartsManagerCreatePath).reply(StatusCodes.INTERNAL_SERVER_ERROR, 'error message');

        const action = async () => {
          await newJobHandler.processJob(job);
        };

        await expect(action()).rejects.toThrow(Error);
        expect.assertions(1);
      });
    });
  });
});

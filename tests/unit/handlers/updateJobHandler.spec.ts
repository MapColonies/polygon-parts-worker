import { BadRequestError } from '@map-colonies/error-types';
import nock from 'nock';
import { ZodError } from 'zod';
import { UpdateJobHandler } from '../../../src/models/updateJobHandler';
import { updateJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { getUpdatedJobParams, polygonPartsEntity } from '../mocks/jobProcessorResponseMock';
import { newJobResponseMock } from '../mocks/jobsMocks';

describe('UpdateJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerPutPath = `/polygonParts`;
  const jobManagerUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
  let updateJobHandler: UpdateJobHandler;

  beforeEach(() => {
    updateJobHandler = updateJobHandlerInstance();
    jest.clearAllMocks();
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
  });

  describe('processJob', () => {
    const isSwap = false;
    const updateJobResponseMock = { ...newJobResponseMock, type: configMock.get<string>('jobDefinitions.jobs.update.type') };
    it('should successfully process job', async () => {
      const updatedParams = getUpdatedJobParams(newJobResponseMock, polygonPartsEntity);
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200, polygonPartsEntity).persist();
      const updateJobNock = nock(jobManagerUrl).put(`/jobs/${newJobResponseMock.id}`, JSON.stringify(updatedParams)).reply(200);

      await updateJobHandler.processJob(updateJobResponseMock);

      expect(updateJobNock.isDone()).toBeTruthy();
      expect.assertions(1);
    });

    it('should fail on validation due to invalid productType and throw error', async () => {
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200).persist();
      const invalidJobResponseMock = { ...updateJobResponseMock, productType: 'invalidType' };

      const action = async () => {
        await updateJobHandler.processJob(invalidJobResponseMock);
      };

      await expect(action()).rejects.toThrow(ZodError);
    });

    it('should fail isSwap is not defined', async () => {
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200).persist();
      const invalidJobResponseMock = { ...updateJobResponseMock, type: 'invalidType' };

      const action = async () => {
        await updateJobHandler.processJob(invalidJobResponseMock);
      };

      await expect(action()).rejects.toThrow(BadRequestError);
    });
  });
});

describe('UpdateSwapJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerPutPath = `/polygonParts`;
  const isSwap = true;
  const updateSwapJobResponseMock = { ...newJobResponseMock, type: configMock.get<string>('jobDefinitions.jobs.swapUpdate.type') };
  const jobManagerUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
  let updateJobHandler: UpdateJobHandler;

  beforeEach(() => {
    updateJobHandler = updateJobHandlerInstance();
    jest.clearAllMocks();
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
  });

  describe('processJob', () => {
    it('should successfully process job', async () => {
      const updatedParams = getUpdatedJobParams(newJobResponseMock, polygonPartsEntity);
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200, polygonPartsEntity).persist();
      const updateJobNock = nock(jobManagerUrl).put(`/jobs/${newJobResponseMock.id}`, JSON.stringify(updatedParams)).reply(200);

      await updateJobHandler.processJob(updateSwapJobResponseMock);

      expect(updateJobNock.isDone()).toBeTruthy();
      expect.assertions(1);
    });

    it('should fail on validation due to invalid productType and throw error', async () => {
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200).persist();
      const invalidJobResponseMock = { ...updateSwapJobResponseMock, productType: 'invalidType' };

      const action = async () => {
        await updateJobHandler.processJob(invalidJobResponseMock);
      };

      await expect(action()).rejects.toThrow(ZodError);
    });
  });
});

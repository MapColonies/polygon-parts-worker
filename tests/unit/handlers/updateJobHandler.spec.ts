import nock from 'nock';
import { ZodError } from 'zod';
import { BadRequestError } from '@map-colonies/error-types';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { updateJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
import { IJobHandler } from '../../../src/common/interfaces';
import { polygonPartsEntity } from '../mocks/jobProcessorResponseMock';

describe('UpdateJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerPutPath = `/polygonParts`;
  let updateJobHandler: IJobHandler;

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
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200, polygonPartsEntity).persist();

      const response = await updateJobHandler.processJob(updateJobResponseMock);

      expect(response).toStrictEqual(polygonPartsEntity);
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
  let updateJobHandler: IJobHandler;

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
      nock(polygonPartsManagerUrl).put(polygonPartsManagerPutPath).query({ isSwap }).reply(200, polygonPartsEntity).persist();

      const response = await updateJobHandler.processJob(updateSwapJobResponseMock);

      expect(response).toStrictEqual(polygonPartsEntity);
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

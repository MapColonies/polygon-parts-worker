import nock from 'nock';
import { ZodError } from 'zod';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { getUpdatedJobParams, polygonPartsEntity } from '../mocks/jobProcessorResponseMock';
import { newJobResponseMock } from '../mocks/jobsMocks';

describe('NewJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerPostPath = `/polygonParts`;
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

  describe('processJob', () => {
    it('should successfully process job', async () => {
      const updatedParams = getUpdatedJobParams(newJobResponseMock, polygonPartsEntity);
      nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200, polygonPartsEntity).persist();
      const updateJobNock = nock(jobManagerUrl).put(`/jobs/${newJobResponseMock.id}`, JSON.stringify(updatedParams)).reply(200);

      await newJobHandler.processJob(newJobResponseMock);

      expect(updateJobNock.isDone()).toBeTruthy();
      expect.assertions(1);
    });

    it('should fail on validation due to invalid productType and throw error', async () => {
      nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200).persist();
      const invalidJobResponseMock = { ...newJobResponseMock, productType: 'invalidType' };

      const action = async () => {
        await newJobHandler.processJob(invalidJobResponseMock);
      };

      await expect(action()).rejects.toThrow(ZodError);
    });
  });
});

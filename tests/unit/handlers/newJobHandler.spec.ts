import nock from 'nock';
import { ZodError } from 'zod';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
import { IJobHandler } from '../../../src/common/interfaces';
import { polygonPartsEntity } from '../mocks/jobProcessorResponseMock';

describe('NewJobHandler', () => {
  const polygonPartsManagerUrl = configMock.get<string>('polygonPartsManager.baseUrl');
  const polygonPartsManagerPostPath = `/polygonParts`;
  let newJobHandler: IJobHandler;

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
      nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200, polygonPartsEntity).persist();

      const response = await newJobHandler.processJob(newJobResponseMock);

      expect(response).toStrictEqual(polygonPartsEntity);
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

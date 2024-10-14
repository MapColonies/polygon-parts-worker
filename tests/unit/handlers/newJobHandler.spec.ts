import nock from 'nock';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { invalidJobResponseMock, newJobResponseMock } from '../mocks/jobsMocks';
import { IJobHandler } from '../../../src/common/interfaces';

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
      nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200).persist();

      const result = await newJobHandler.processJob(newJobResponseMock);

      expect(result).toBeUndefined();
      expect.assertions(1);
    });

    it('should fail on validation and throw error', async () => {
      nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200).persist();

      const result = newJobHandler.processJob(invalidJobResponseMock);

      await expect(result).rejects.toThrow();
    });
  });
});

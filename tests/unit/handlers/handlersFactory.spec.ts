import * as fs from 'fs';
import { BadRequestError } from '@map-colonies/error-types';
import { SERVICES } from '../../../src/common/constants';
import { initJobHandler } from '../../../src/models/handlerFactory';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { registerExternalValues } from '../../../src/containerConfig';
import { ingestionJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { loggerMock } from '../mocks/telemetryMock';
import { getHandlerTokens } from '../../../src/common/handlerTokens';
import { initConfig } from '../../../src/common/config';

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    accessSync: jest.fn(),
  };
});

describe('HandlerFactory', () => {
  const ingestionNew = configMock.get<string>('jobDefinitions.jobs.new.type');
  const ingestionUpdate = configMock.get<string>('jobDefinitions.jobs.update.type');
  const ingestionSwapUpdate = configMock.get<string>('jobDefinitions.jobs.swapUpdate.type');
  const exportJob = configMock.get<string>('jobDefinitions.jobs.export.type');
  const jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate, exportJob };

  beforeAll(async () => {
    await initConfig(true);
  });

  beforeEach(async () => {
    (fs.accessSync as jest.Mock).mockImplementation(() => undefined);
    registerDefaultConfig();
    const handlers = getHandlerTokens(configMock);
    await registerExternalValues({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: loggerMock } },
        { token: handlers.NEW, provider: { useValue: ingestionJobHandlerInstance() } },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initJobHandler', () => {
    it('should successfully return new job handler for new type', () => {
      const handlerResult = initJobHandler(ingestionNew, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should successfully return update job handler for update type', () => {
      const handlerResult = initJobHandler(ingestionUpdate, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should successfully return update job handler for swap type', () => {
      const handlerResult = initJobHandler(ingestionSwapUpdate, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should fail on validation and throw error', () => {
      const action = () => {
        initJobHandler('falseType', jobTypesToProcess);
      };

      expect(action).toThrow(BadRequestError);
    });
  });
});

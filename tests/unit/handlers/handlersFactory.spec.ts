import * as fs from 'fs';
import { BadRequestError } from '@map-colonies/error-types';
import { getHandlers, SERVICES } from '@src/common/constants';
import { getApp } from '@src/app';
import { ConfigType, getConfig, initConfig } from '@src/common/config';
import { initJobHandler } from '../../../src/models/handlerFactory';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { ExportJobHandler } from '../../../src/models/export/exportJobHandler';
import { configMock } from '../mocks/configMock';
import { IJobHandler, IPermittedJobTypes } from '../../../src/common/interfaces';
import { loggerMock } from '../mocks/telemetryMock';
import { ingestionJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof fs>('fs'),
  accessSync: jest.fn(),
}));

describe('HandlerFactory', () => {
  const ingestionNew = configMock.get('jobDefinitions.jobs.new.type') as unknown as string;
  const ingestionUpdate = configMock.get('jobDefinitions.jobs.update.type') as unknown as string;
  const ingestionSwapUpdate = configMock.get('jobDefinitions.jobs.swapUpdate.type') as unknown as string;
  const exportJob = configMock.get('jobDefinitions.jobs.export.type') as unknown as string;
  const jobTypesToProcess: IPermittedJobTypes = { ingestionNew, ingestionUpdate, ingestionSwapUpdate, exportJob };

  let testConfig: ConfigType;
  let initHandlers: (jobHandlerType: string, permittedTypes: IPermittedJobTypes) => IJobHandler;
  let HANDLERS: ReturnType<typeof getHandlers>;

  beforeAll(async () => {
    await initConfig(true);
    testConfig = getConfig();
    HANDLERS = getHandlers();
    jest.spyOn(fs, 'accessSync').mockImplementation(() => undefined); // simulate directories exist
  });

  beforeEach(async () => {
    const [, container] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: loggerMock } },
        { token: SERVICES.CONFIG, provider: { useValue: testConfig } },
        { token: HANDLERS.NEW, provider: { useValue: ingestionJobHandlerInstance() } },
      ],
      useChild: true,
    });

    initHandlers = initJobHandler(container);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initJobHandler', () => {
    it('should successfully return new job handler for new type', () => {
      const handlerResult = initHandlers(ingestionNew, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should successfully return update job handler for update type', () => {
      const handlerResult = initHandlers(ingestionUpdate, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should successfully return update job handler for swap type', () => {
      const handlerResult = initHandlers(ingestionSwapUpdate, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(IngestionJobHandler);
    });

    it('should successfully return export job handler for export type', () => {
      const handlerResult = initHandlers(exportJob, jobTypesToProcess);

      expect(handlerResult).toBeInstanceOf(ExportJobHandler);
    });

    it('should fail on validation and throw error', () => {
      const action = (): void => {
        initHandlers('falseType', jobTypesToProcess);
      };

      expect(action).toThrow(BadRequestError);
    });
  });
});

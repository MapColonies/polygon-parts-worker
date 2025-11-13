import { BadRequestError } from '@map-colonies/error-types';
import { HANDLERS } from '../../../src/common/constants';
import { initJobHandler } from '../../../src/models/handlerFactory';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { configMock } from '../mocks/configMock';
import { registerExternalValues } from '../../../src/containerConfig';
import { ingestionJobJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';

describe('HandlerFactory', () => {
  const ingestionNew = configMock.get<string>('jobDefinitions.jobs.new.type');
  const ingestionUpdate = configMock.get<string>('jobDefinitions.jobs.update.type');
  const ingestionSwapUpdate = configMock.get<string>('jobDefinitions.jobs.swapUpdate.type');
  const exportJob = configMock.get<string>('jobDefinitions.jobs.export.type');
  const jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate, exportJob };

  beforeEach(() => {
    registerExternalValues({
      override: [{ token: HANDLERS.NEW, provider: { useValue: ingestionJobJobHandlerInstance() } }],
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

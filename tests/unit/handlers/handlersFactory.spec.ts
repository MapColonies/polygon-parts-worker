import { BadRequestError } from '@map-colonies/error-types';
import { HANDLERS } from '../../../src/common/constants';
import { initJobHandler } from '../../../src/models/handlersFactory';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { configMock } from '../mocks/configMock';
import { registerExternalValues } from '../../../src/containerConfig';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';

describe('HandlersFactory', () => {
    const ingestionNew = configMock.get<string>('jobDefinitions.jobs.new.type');
    const ingestionUpdate = configMock.get<string>('jobDefinitions.jobs.update.type');
    const ingestionSwapUpdate = configMock.get<string>('jobDefinitions.jobs.swapUpdate.type');
    const jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate };

    beforeEach(() => {
        registerExternalValues({
            override: [{ token: HANDLERS.NEW, provider: { useValue: newJobHandlerInstance() } }],
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initJobHandler', () => {
        it('should successfully return new job handler', () => {
            const handlerResult = initJobHandler(ingestionNew, jobTypesToProcess);

            expect(handlerResult).toBeInstanceOf(NewJobHandler);
        });

        it('should fail on validation and throw error', () => {
            const action = () => {
                initJobHandler('falseType', jobTypesToProcess);
            }

            expect(action).toThrow(BadRequestError);
        });
    });
});

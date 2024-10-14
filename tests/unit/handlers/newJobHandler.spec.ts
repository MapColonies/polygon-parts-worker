import nock from 'nock';
import { ZodError } from 'zod';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
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

            const result = newJobHandler.processJob(newJobResponseMock);
            const awaitedResult = await result;

            expect(awaitedResult).toBeUndefined();
            await expect(result).resolves.not.toThrow();
            expect.assertions(2);
        });

        it('should fail on validation due to invalid productType and throw error', async () => {
            nock(polygonPartsManagerUrl).post(polygonPartsManagerPostPath).reply(200).persist();
            const invalidJobResponseMock = {...newJobResponseMock, productType:'invalidType' }

            const result = newJobHandler.processJob(invalidJobResponseMock);

            await expect(result).rejects.toThrow(ZodError);
        });
    });
});

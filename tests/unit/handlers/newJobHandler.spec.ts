import nock from 'nock';
import { registerDefaultConfig } from '../mocks/configMock';
import { newJobHandlerInstace } from '../jobProcessor/jobProcessorSetup';
import { invalidJobResponseMock, newJobResponseMock } from '../mocks/jobsMocks';
import { JobHandler } from '../../../src/common/interfaces';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';

jest.mock<typeof import('../../../src/clients/polygonPartsManagerClient')>('../../../src/clients/polygonPartsManagerClient', () => {
    const originalModule: PolygonPartsManagerClient = jest.requireActual('../../../src/clients/polygonPartsManagerClient');

    return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        PolygonPartsManagerClient: jest.fn().mockImplementation(() => {
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                __esModule: true,
                ...originalModule,
                createNewPolyParts: jest.fn().mockResolvedValueOnce(undefined)
            };
        }),
    }
});


describe('NewJobHandler', () => {
    let newJobHander: JobHandler;

    beforeEach(() => {
        newJobHander = newJobHandlerInstace();
        jest.clearAllMocks();
        registerDefaultConfig();
    });

    afterEach(() => {
        jest.clearAllTimers();
        nock.cleanAll();
    });

    describe('processJob', () => {
        it('should successfully process job', async () => {
            const processJobSpy = jest.spyOn(newJobHander, 'processJob');
            await newJobHander.processJob(newJobResponseMock);

            expect(processJobSpy).toHaveBeenCalledTimes(1);
        });

        it('should fail on validation and throw error', async () => {
            const result = newJobHander.processJob(invalidJobResponseMock);

            await expect(result).rejects.toThrow();
        });
    });
});
import nock from 'nock';
import { registerDefaultConfig } from '../mocks/configMock';
import { newJobHandlerInstance } from '../jobProcessor/jobProcessorSetup';
import { invalidJobResponseMock, newJobResponseMock } from '../mocks/jobsMocks';
import { IJobHandler } from '../../../src/common/interfaces';
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
                createPolygonParts: jest.fn().mockResolvedValueOnce(undefined)
            };
        }),
    }
});


describe('NewJobHandler', () => {
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
            const result = await newJobHandler.processJob(newJobResponseMock);

            expect(result).toBeUndefined();
            expect.assertions(1);
        });

        it('should fail on validation and throw error', async () => {
            const result = newJobHandler.processJob(invalidJobResponseMock);

            await expect(result).rejects.toThrow();
        });
    });
});
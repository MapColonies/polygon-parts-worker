// import nock from 'nock';
// import { JobProcessor } from '../../../src/models/jobProcessor';
// import { configMock, registerDefaultConfig } from '../mocks/configMock';
// import { jobProcessorInstace, mockQueueClient } from '../jobProcessor/jobProcessorSetup';
// import { initTaskForIngestionNew } from '../mocks/tasksMocks';
// import { initJobHandler } from '../../../src/models/handlersFactory';
// import { newPolyPartsJobMock } from '../mocks/jobsMocks';

// describe('JobProcessor', () => {
//   let jobProcessor: JobProcessor;

//   beforeEach(() => {
//     jobProcessor = jobProcessorInstace();
//     jest.clearAllMocks();
//     registerDefaultConfig();
//   });

//   afterEach(() => {
//     jest.clearAllTimers();
//     nock.cleanAll();
//   });

//   describe('start', () => {
//     const jobManagerBaseUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
//     const heartbeatBaseUrl = configMock.get<string>('jobManagement.config.heartbeat.baseUrl');
//     const taskType = configMock.get<string>('jobManagement.taskTypeToProcess');

//     it.only('should successfully fetch new poly parts task and process it', async () => {
//       const jobType = 'Ingestion_New';
//       const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;
//       const jobManagerGetJobPath = `/jobs/${initTaskForIngestionNew.jobId}`;
//       const heartbeatPath = `/heartbeat/${initTaskForIngestionNew.id}`;
//       const jobHandler = initJobHandler(jobType);

//       nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(200, initTaskForIngestionNew).persist();
//       nock(jobManagerBaseUrl).post(jobManagerGetJobPath).reply(200, newPolyPartsJobMock).persist();
//       nock(heartbeatBaseUrl).post(heartbeatPath).reply(200, 'ok').persist();

//       const processJobSpy = jest.spyOn(jobHandler, 'processJob').mockResolvedValue(Promise.resolve());

//       const resultPromise = jobProcessor.start();
//       jobProcessor.stop();
//       await resultPromise;

//       expect(processJobSpy).toHaveBeenCalledWith(newPolyPartsJobMock);
//       await mockQueueClient.heartbeatClient.stop(initTaskForIngestionNew.id);
//     });

//     it('should fail to fetch task', async () => {
//       const jobType = 'Ingestion_New';
//       const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

//       nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(502).persist();

//       const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

//       const resultPromise = jobProcessor.start();
//       jobProcessor.stop();
//       await resultPromise;

//       expect(processTaskSpy).not.toHaveBeenCalled();
//     });

//     it('should not find  task', async () => {
//       const jobType = 'Ingestion_New';
//       const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

//       nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(404).persist();

//       const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

//       const resultPromise = jobProcessor.start();
//       jobProcessor.stop();
//       const result = await resultPromise;

//       expect(processTaskSpy).not.toHaveBeenCalled();
//       expect(result).toBeUndefined();
//     });
//   });
// });

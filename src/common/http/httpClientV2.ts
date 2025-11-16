// import axios, { AxiosBasicCredentials, AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
// import axiosRetry, { exponentialDelay, IAxiosRetryConfig } from 'axios-retry';
// import { Logger } from '@map-colonies/js-logger';

// export interface IHttpRetryConfig {
//   attempts: number;
//   delay: number | 'exponential';
//   shouldResetTimeout: boolean;
// }

// export type AxiosHeaderValue = string | string[] | number | boolean | null;

// export class HttpClientV2 {
//   protected axiosOptions: AxiosRequestConfig = {};
//   private readonly axiosClient: AxiosInstance;

//   public constructor(
//     protected readonly logger: Logger,
//     protected baseUrl: string,
//     protected readonly targetService = '',
//     protected retryConfig?: IHttpRetryConfig,
//     protected readonly disableDebugLogs = false
//   ) {
//     this.axiosClient = axios.create();
//     this.axiosOptions.baseURL = baseUrl;

//     const axiosRetryConfig: IAxiosRetryConfig = retryConfig ? this.parseRetryConfig(retryConfig) : { retries: 0 };

//     if (axiosRetryConfig.retryDelay) {
//       const originalDelay = axiosRetryConfig.retryDelay;
//       axiosRetryConfig.retryDelay = (retryCount: number, error: AxiosError): number => {
//         this.logger.error({
//           err: error,
//           retries: retryCount,
//           targetService: this.targetService,
//           msg: `Error from ${this.targetService}`,
//           msgError: error.message,
//         });
//         return originalDelay(retryCount, error);
//       };
//     }

//     axiosRetry(this.axiosClient, axiosRetryConfig);
//   }

//   public async get<T>(
//     url: string,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('GET', url, config);
//     const response = await this.axiosClient.get<T>(url, config);
//     return response;
//   }

//   public async post<T>(
//     url: string,
//     body?: unknown,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('POST', url, config, body);
//     const response = await this.axiosClient.post<T>(url, body, config);
//     return response;
//   }

//   public async put<T>(
//     url: string,
//     body?: unknown,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('PUT', url, config, body);
//     const response = await this.axiosClient.put<T>(url, body, config);
//     return response;
//   }

//   public async delete<T>(
//     url: string,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('DELETE', url, config);
//     const response = await this.axiosClient.delete<T>(url, config);
//     return response;
//   }

//   public async head<T>(
//     url: string,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('HEAD', url, config);
//     const response = await this.axiosClient.head<T>(url, config);
//     return response;
//   }

//   public async patch<T>(
//     url: string,
//     body?: unknown,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('PATCH', url, config, body);
//     const response = await this.axiosClient.patch<T>(url, body, config);
//     return response;
//   }

//   protected async options<T>(
//     url: string,
//     queryParams?: Record<string, unknown>,
//     retryConfig?: IAxiosRetryConfig,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): Promise<AxiosResponse<T>> {
//     const config = this.buildRequestConfig(retryConfig, queryParams, auth, headers);
//     this.logRequest('OPTIONS', url, config);
//     const response = await this.axiosClient.options<T>(url, config);
//     return response;
//   }

//   private buildRequestConfig(
//     retryConfig?: IAxiosRetryConfig,
//     queryParams?: Record<string, unknown>,
//     auth?: AxiosBasicCredentials,
//     headers?: Record<string, AxiosHeaderValue>
//   ): AxiosRequestConfig {
//     const config: AxiosRequestConfig = { ...this.axiosOptions };

//     if (retryConfig) {
//       config['axios-retry'] = retryConfig;
//     }

//     if (queryParams) {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       config.params = { ...config.params, ...queryParams };
//     }

//     if (auth) {
//       config.auth = auth;
//     }

//     if (headers) {
//       config.headers = { ...config.headers, ...headers };
//     }

//     return config;
//   }

//   private logRequest(method: string, url: string, config: AxiosRequestConfig, body?: unknown): void {
//     if (!this.disableDebugLogs) {
//       this.logger.debug({
//         method,
//         url,
//         config,
//         body,
//         targetService: this.targetService,
//         msg: `Send ${method} request to ${this.targetService}`,
//       });
//     }
//   }

//   private parseRetryConfig(config: IHttpRetryConfig): IAxiosRetryConfig {
//     const retries = config.attempts - 1;

//     if (retries < 0) {
//       throw new Error('Invalid retry configuration: attempts must be positive');
//     }

//     let retryDelay: (attempt: number) => number;

//     if (config.delay === 'exponential') {
//       retryDelay = exponentialDelay;
//     } else if (typeof config.delay === 'number') {
//       retryDelay = (): number => config.delay as number;
//     } else {
//       throw new Error('Invalid retry configuration: delay must be "exponential" or number');
//     }

//     return {
//       retries,
//       retryDelay,
//       shouldResetTimeout: config.shouldResetTimeout,
//     };
//   }
// }

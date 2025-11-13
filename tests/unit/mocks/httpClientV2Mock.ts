import { AxiosResponse } from 'axios';
import { HttpClientV2 } from '../../../src/common/http/httpClientV2';

export const createHttpClientV2Mock = (): Partial<HttpClientV2> => {
  return {
    get: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
    post: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
    put: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
    delete: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
    head: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
    patch: jest.fn().mockResolvedValue({ data: {}, status: 200 } as AxiosResponse),
  };
};

export type HttpClientV2Mock = ReturnType<typeof createHttpClientV2Mock>;

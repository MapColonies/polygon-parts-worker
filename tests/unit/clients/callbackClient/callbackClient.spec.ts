import jsLogger from '@map-colonies/js-logger';
import { faker } from '@faker-js/faker';
import nock from 'nock';
import { tracerMock } from '../../mocks/telemetryMock';
import { configMock, registerDefaultConfig } from '../../mocks/configMock';
import { CallbackClient } from '../../../../src/clients/callbackClient';
import { callbackResponse } from './callbackClient.data';

describe('callbackClient', () => {
  let callbackClient: CallbackClient;
  const basePath = 'https://callback.example.com';
  const uri = '/api/callback';

  beforeEach(() => {
    registerDefaultConfig();
    callbackClient = new CallbackClient(configMock, jsLogger({ enabled: false }), tracerMock);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.resetAllMocks();
  });

  describe('send', () => {
    it('should successfully send callback response to the specified URL', async () => {
      // Arrange
      const callbackUrls = [`${basePath}${uri}`];
      const scope = nock(basePath).post(uri, JSON.stringify(callbackResponse)).reply(200);

      // Act
      await callbackClient.send(callbackUrls, callbackResponse);

      // Assert
      expect(scope.isDone()).toBe(true);
    });

    it('should handle multiple callback URLs', async () => {
      const callbackUrls = [`${basePath}${uri}`, `${basePath}${uri}/2`];
      const scope1 = nock(basePath).post(uri, JSON.stringify(callbackResponse)).reply(200);
      const scope2 = nock(basePath).post(`${uri}/2`, JSON.stringify(callbackResponse)).reply(200);

      await callbackClient.send(callbackUrls, callbackResponse);

      expect(scope1.isDone()).toBe(true);
      expect(scope2.isDone()).toBe(true);
    });

    it('should handle callback request failures without throwing', async () => {
      const callbackUrl = `${basePath}${uri}`;

      // Mock a failed HTTP request
      const scope = nock(basePath).post(uri).reply(500, { error: 'Internal server error' });

      // Should not throw - errors are caught and logged internally
      await expect(callbackClient.send([callbackUrl], callbackResponse)).resolves.not.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const callbackUrl = `https://non-existent-domain.com${uri}`;

      // Mock a network error
      const scope = nock('https://non-existent-domain.com').post(uri).replyWithError('Connection refused');

      // Should not throw - errors are caught and logged internally
      await expect(callbackClient.send([callbackUrl], callbackResponse)).resolves.not.toThrow();
      expect(scope.isDone()).toBe(true);
    });
  });
});

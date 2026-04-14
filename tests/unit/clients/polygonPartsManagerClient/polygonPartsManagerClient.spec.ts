import nock from 'nock';
import { jsLogger, type Logger } from '@map-colonies/js-logger';
import { PolygonPartsPayload, PolygonPartsChunkValidationResult, ValidationErrorType } from '@map-colonies/raster-shared';
import { tracerMock } from '../../mocks/telemetryMock';
import { configMock, registerDefaultConfig } from '../../mocks/configMock';
import { PolygonPartsManagerClient } from '../../../../src/clients/polygonPartsManagerClient';
import { createFakePolygonPartsPayload } from './polygonPartsManagerClient.data';

describe('PolygonPartsManagerClient', () => {
  let polygonPartsManagerClient: PolygonPartsManagerClient;
  let baseUrl: string;
  let validateEndpoint: string;
  let mockLogger: Logger;

  beforeAll(async () => {
    mockLogger = await jsLogger({ enabled: false });
  });

  beforeEach(() => {
    registerDefaultConfig();
    baseUrl = configMock.get('polygonPartsManager.baseUrl') as unknown as string;
    validateEndpoint = '/polygonParts/validate';
    polygonPartsManagerClient = new PolygonPartsManagerClient(mockLogger, configMock, tracerMock);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.resetAllMocks();
  });

  describe('validate', () => {
    it('should successfully validate polygon parts payload', async () => {
      // Arrange
      const requestBody = createFakePolygonPartsPayload(2);

      const expectedResponse: PolygonPartsChunkValidationResult = {
        parts: [],
        smallHolesCount: 0,
      };

      const scope = nock(baseUrl).post(validateEndpoint).reply(200, expectedResponse);

      // Act
      const result = await polygonPartsManagerClient.validate(requestBody);

      // Assert
      expect(scope.isDone()).toBe(true);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const requestBody: PolygonPartsPayload = createFakePolygonPartsPayload(1);

      const expectedResponse: PolygonPartsChunkValidationResult = {
        parts: [{ id: requestBody.partsData.features[0]!.properties.id, errors: [ValidationErrorType.GEOMETRY_VALIDITY] }],
        smallHolesCount: 0,
      };

      const scope = nock(baseUrl).post(validateEndpoint).reply(200, expectedResponse);

      // Act
      const result = await polygonPartsManagerClient.validate(requestBody);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle server errors during validation', async () => {
      // Arrange
      const requestBody: PolygonPartsPayload = createFakePolygonPartsPayload(1);
      const scope = nock(baseUrl).post(validateEndpoint).reply(500, { error: 'Internal server error' });

      // Act & Assert
      await expect(polygonPartsManagerClient.validate(requestBody)).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors during validation', async () => {
      // Arrange
      const requestBody: PolygonPartsPayload = createFakePolygonPartsPayload(1);
      const scope = nock(baseUrl).post(validateEndpoint).replyWithError('Connection refused');

      // Act & Assert
      await expect(polygonPartsManagerClient.validate(requestBody)).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });
  });
});

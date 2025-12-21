import { IS3Config } from '../../../src/common/storage/s3Service';

export const mockS3Config: IS3Config = {
  accessKeyId: 'accessKeyId',
  secretAccessKey: 'secretAccessKey',
  endpointUrl: 'http://localhost:9000',
  bucket: 'bucket',
  objectKey: 'objectKey',
  sslEnabled: false,
};

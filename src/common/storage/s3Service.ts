/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from 'fs';
import * as path from 'path';
import { inject, injectable } from 'tsyringe';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@map-colonies/js-logger';
import { context, trace, Tracer, SpanStatusCode } from '@opentelemetry/api';
import { SERVICES } from '../../common/constants';
import { S3Error } from '../../common/errors';

export interface UploadFile {
  filePath: string;
  s3Key: string;
  contentType?: string;
}

export interface IS3Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpointUrl: string;
  bucket: string;
  sslEnabled: boolean;
}

@injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly s3Config: IS3Config;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.S3CONFIG) s3Config: IS3Config,
    @inject(SERVICES.TRACER) private readonly tracer: Tracer
  ) {
    this.s3Config = s3Config;
    const { accessKeyId, secretAccessKey, endpointUrl } = this.s3Config;
    this.client = new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint: endpointUrl,
      region: 'us-east-1', //For MinIo the region has no significance but it is required for the S3Client
      forcePathStyle: true,
    });
  }

  public async uploadFiles(files: UploadFile[], options: { deleteAfterUpload?: boolean } = {}): Promise<string[]> {
    return context.with(trace.setSpan(context.active(), this.tracer.startSpan(`${S3Service.name}.${this.uploadFiles.name}`)), async () => {
      const activeSpan = trace.getActiveSpan();
      const { bucket, endpointUrl } = this.s3Config;
      const { deleteAfterUpload = false } = options;
      const logger = this.logger.child({ bucket, endpointUrl });
      try {
        activeSpan?.setAttributes({
          endpointUrl,
          bucket,
          fileCount: files.length,
          deleteAfterUpload,
        });

        logger.info({ msg: `Uploading ${files.length} files to S3`, deleteAfterUpload });

        // eslint-disable-next-line @typescript-eslint/promise-function-async
        const uploadPromises = files.map((file) => {
          const { filePath, s3Key, contentType } = file;

          logger.info({ msg: 'Uploading file to S3', filePath, s3Key, contentType });

          activeSpan?.addEvent('s3.upload.start', {
            filePath,
            s3Key,
            contentType: contentType ?? 'unknown',
          });

          const upload = new Upload({
            client: this.client,
            params: {
              Key: s3Key,
              Bucket: bucket,
              ContentType: contentType,
              Body: fs.createReadStream(filePath),
            },
          });

          return upload.done();
        });

        const results = await Promise.all(uploadPromises);
        activeSpan?.addEvent('s3.upload.complete.all');

        const urls = results.map((result) => `${endpointUrl}/${result.Bucket}/${result.Key}`);
        logger.info({ msg: 'Files uploaded to S3', urls });
        activeSpan?.setAttributes({ s3UrlCount: urls.length });

        if (deleteAfterUpload) {
          const filePaths = files.map((file) => file.filePath);
          await this.deleteFilesFromFilesystem(filePaths);
        }

        return urls;
      } catch (err) {
        const error = new S3Error(err, 'Failed to upload files to S3');

        logger.error({ msg: error.message, error });
        activeSpan?.recordException(error);
        activeSpan?.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });

        throw error;
      } finally {
        activeSpan?.end();
      }
    });
  }

  private async deleteFilesFromFilesystem(filePaths: string[]): Promise<void> {
    const activeSpan = trace.getActiveSpan();

    this.logger.info({ msg: 'Deleting uploaded files from filesystem' });
    activeSpan?.addEvent('fs.delete.start');

    const parentDirs = new Set<string>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          await fs.promises.unlink(filePath);
          this.logger.debug({ msg: 'Deleted file from filesystem', filePath });
          parentDirs.add(path.dirname(filePath));
        } catch (unlinkError) {
          this.logger.warn({ msg: 'Failed to delete file from filesystem', filePath, error: unlinkError });
        }
      })
    );

    activeSpan?.addEvent('fs.delete.files.complete');

    // Delete parent directories
    await Promise.all(
      [...parentDirs].map(async (dir) => {
        try {
          await fs.promises.rmdir(dir);
          this.logger.debug({ msg: 'Deleted parent directory from filesystem', dir });
        } catch (rmdirError) {
          this.logger.warn({ msg: 'Failed to delete parent directory from filesystem', dir, error: rmdirError });
        }
      })
    );

    activeSpan?.addEvent('fs.delete.complete');
  }
}

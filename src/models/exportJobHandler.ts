import { inject, injectable } from 'tsyringe';
import ogr2ogr from 'ogr2ogr';
import { Logger } from '@map-colonies/js-logger';
import { IJobHandler, JobResponse } from '../common/interfaces';
import { GeoserverClient } from '../clients/geoserverApiClient';
import { SERVICES } from '../common/constants';

@injectable()
export class ExportJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(GeoserverClient) private readonly geoserverClient: GeoserverClient
  ) {}

  public async processJob(job: JobResponse): Promise<void> {
    try {
      const layer = `${job.resourceId}-${job.productType}`;
      const features = await this.geoserverClient.getFeatures(layer);
      this.logger.info('using ogr2ogr');
      ogr2ogr(features, {
        format: 'GPKG',
        destination: '/home/nitzanm5/Documents/repo/polygon-parts-worker/src/clients/blueMarble.gpkg',
        options: ['-append'],
      }).exec((err, output) => this.logger.info(`finished merging ${layer} features into gpkg`));
      return;
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }
}

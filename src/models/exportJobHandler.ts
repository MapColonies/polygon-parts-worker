import fs from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import ogr2ogr from 'ogr2ogr';
import { inject, injectable } from 'tsyringe';
import { ExportJobParameters } from '@map-colonies/raster-shared';
import { GeoserverClient } from '../clients/geoserverClient';
import { SERVICES } from '../common/constants';
import { IConfig, IJobHandler } from '../common/interfaces';

@injectable()
export class ExportJobHandler implements IJobHandler<ExportJobParameters> {
  private readonly gpkgsLocation: string;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(GeoserverClient) private readonly geoserverClient: GeoserverClient
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
  }

  public async processJob(job: IJobResponse<ExportJobParameters, unknown>): Promise<void> {
    try {
      const layer = `${job.resourceId}-${job.productType}`;
      const features = await this.geoserverClient.getFeatures(layer);
      const relativePath = job.parameters.additionalParams.packageRelativePath;
      const packageLocation = this.getGpkgFullPath(relativePath, this.gpkgsLocation);
      if (!this.isGpkgExists(packageLocation)) {
        throw new Error(`gpkg file does not exist at ${packageLocation}`);
      }

      await ogr2ogr(features, {
        format: 'GPKG',
        destination: packageLocation,
        options: ['-nln', `${layer}_features`, '-append'],
      });

      this.logger.info(`finished merging ${layer} features into gpkg`);
      return;
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private readonly getGpkgFullPath = (relativePath: string, gpkgsLocation: string): string => {
    return `${gpkgsLocation}/${relativePath}`;
  };

  private readonly isGpkgExists = (gpkgFullPath: string): boolean => {
    return fs.existsSync(gpkgFullPath);
  };
}

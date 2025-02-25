import fs from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import ogr2ogr from 'ogr2ogr';
import { inject, injectable } from 'tsyringe';
import { ExportJobParameters } from '@map-colonies/raster-shared';
import { ProductType } from '@map-colonies/mc-model-types';
import { SERVICES } from '../common/constants';
import { IConfig, IJobHandler } from '../common/interfaces';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';

@injectable()
export class ExportJobHandler implements IJobHandler<ExportJobParameters> {
  private readonly gpkgsLocation: string;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManagerClient: PolygonPartsManagerClient
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
  }

  public async processJob(job: IJobResponse<ExportJobParameters, unknown>): Promise<void> {
    try {
      const relativePath = job.parameters.additionalParams.packageRelativePath;
      const packageLocation = this.getGpkgFullPath(relativePath, this.gpkgsLocation);
      if (!this.isGpkgExists(packageLocation)) {
        throw new Error(`gpkg file does not exist at ${packageLocation}`);
      }

      const layer = `${job.resourceId}-${job.productType}`;
      const roi = job.parameters.exportInputParams.roi;
      const features = await this.polygonPartsManagerClient.findPolygonParts(job.resourceId, job.productType as ProductType, roi);

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

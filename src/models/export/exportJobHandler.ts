import fs from 'fs';
import { type Logger } from '@map-colonies/js-logger';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import ogr2ogr from 'ogr2ogr';
import { inject, injectable } from 'tsyringe';
import { ExportJobParameters } from '@map-colonies/raster-shared';
import { OgrFormat, SERVICES } from '../../common/constants';
import { IJobHandler } from '../../common/interfaces';
import type { ConfigType } from '../../common/config';
import { PolygonPartsManagerClient } from '../../clients/polygonPartsManagerClient';
import { addFeatureIds, manipulateFeatures } from '../../utils/utils';

@injectable()
export class ExportJobHandler implements IJobHandler<ExportJobParameters> {
  private readonly gpkgsLocation: string;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManagerClient: PolygonPartsManagerClient
  ) {
    this.gpkgsLocation = config.get('gpkgsLocation') as string;
  }

  public async processJob(job: IJobResponse<ExportJobParameters, unknown>): Promise<void> {
    try {
      const relativePath = job.parameters.additionalParams.packageRelativePath;
      const packageLocation = this.getGpkgFullPath(relativePath, this.gpkgsLocation);
      if (!this.isGpkgExists(packageLocation)) {
        throw new Error(`gpkg file does not exist at ${packageLocation}`);
      }

      const layer = `${job.resourceId}-${job.productType}`;
      const roi = addFeatureIds(job.parameters.exportInputParams.roi);
      const polygonPartsEntityName = job.parameters.additionalParams.polygonPartsEntityName;

      const features = await this.polygonPartsManagerClient.findPolygonParts(polygonPartsEntityName, roi);
      const modifiedFeature = manipulateFeatures(features, roi) as unknown as Record<string, unknown>;

      this.logger.debug({ msg: `retrieved features: `, features });
      await ogr2ogr(modifiedFeature, {
        format: OgrFormat.GPKG,
        destination: packageLocation,
        options: ['-nln', `${layer}_features`, '-overwrite'],
      });

      this.logger.info(`finished merging ${layer} features into gpkg`);
      return;
    } catch (err) {
      this.logger.error({ msg: 'error while processing job', err });
      throw err;
    }
  }

  private readonly getGpkgFullPath = (relativePath: string, gpkgsLocation: string): string => {
    return `${gpkgsLocation}/${relativePath}`;
  };

  private readonly isGpkgExists = (gpkgFullPath: string): boolean => {
    return fs.existsSync(gpkgFullPath);
  };
}

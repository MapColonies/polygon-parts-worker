import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { inject, injectable } from 'tsyringe';
import { create } from 'xmlbuilder2';
import { getEntityName, rasterProductTypeSchema, resourceIdSchema } from '@map-colonies/raster-shared';
import { Logger } from '@map-colonies/js-logger';
import ogr2ogr from 'ogr2ogr';
import archiver from 'archiver';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import type { Feature, Geometry } from 'geojson';
import { SERVICES } from '../../common/constants';
import { IConfig, IngestionJobParams, ValidationTaskParameters } from '../../common/interfaces';
import {
  OGR2OGR_SHP_REPORT_OPTIONS,
  QMD_ERROR_LABELS,
  QMD_REPORT_FILE_NAME,
  QMD_THRESHOLD_LABELS,
  SHAPEFILE_REPORT_EXTENSIONS_LIST,
  ShpWritingMode,
  THRESHOLD_VALIDATION_STATUS,
} from './constants';
import { ErrorsCount, QmdFileParams, QmdMetadata, QmdMetadataKeyword, Report, ShapefileFinalizationParams } from './types';

interface Ogr2OgrOptions {
  command?: string;
  format?: string;
  options?: string[];
  destination?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
}

/**
 * Handles writing features with validation errors to an ESRI Shapefile incrementally.
 * Uses ogr2ogr to create and append to shapefiles for each chunk of processed data.
 */
@injectable()
export class ShapefileReportWriter {
  private readonly shapefileReportBasePath: string;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.CONFIG) private readonly config: IConfig) {
    this.shapefileReportBasePath = this.config.get<string>('reportsPath');
  }

  /**
   * Writes features with errors to the shapefile.
   * For the first chunk, creates a new shapefile. For subsequent chunks, appends to the existing one.
   *
   * @param features - Array of GeoJSON features with error properties
   * @param jobId - Job identifier for creating job-specific shapefile
   * @param chunkId - Current chunk identifier for logging
   */
  public async writeChunk(features: Feature<Geometry, Record<string, unknown>>[], jobId: string, chunkId: number): Promise<void> {
    const outputPath = this.getJobShapefilePath(jobId);

    try {
      const shapefileExists = await this.shapefileExists(outputPath);
      const mode = shapefileExists ? ShpWritingMode.Append : ShpWritingMode.Create;

      this.logger.info({
        msg: `Writing error features to shapefile (${mode} mode)`,
        chunkId,
        featuresCount: features.length,
        outputPath,
      });

      await this.writeFeaturesToShapefile(features, outputPath, mode);

      this.logger.info({
        msg: 'Successfully wrote error features to shapefile',
        chunkId,
        featuresCount: features.length,
        mode,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Failed to write features to shapefile',
        chunkId,
        outputPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Finalizes the shapefile writing process and returns the path to the completed zip file.
   * Can be called after all chunks have been processed.
   * Creates a .qmd metadata file with error summary and zips all files together.
   *
   * @param jobId - Job identifier
   * @param taskId - Task identifier
   * @param errorSummary - Validation error summary containing counts and threshold flags
   * @param hasCriticalErrors - Flag indicating if there are critical errors to report
   * @returns Path to the completed zip file or null if no file was created
   */
  public async finalize(params: ShapefileFinalizationParams): Promise<Report | null> {
    const outputPath = this.getJobShapefilePath(params.job.id);
    try {
      const exists = await this.shapefileExists(outputPath);

      if (!exists) {
        this.logger.info({
          msg: 'No shapefile to finalize (no errors found)',
          jobId: params.job.id,
          outputPath,
        });
        return null;
      }

      if (!params.hasCriticalErrors) {
        await this.cleanupShapefileComponents(outputPath);
        this.logger.info({
          msg: 'Deleted shapefile report due to absence of critical errors',
          jobId: params.job.id,
          outputPath,
        });
        return null;
      }

      const report = await this.createFinalReport(params, outputPath);
      return report;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to finalize shapefile',
        jobId: params.job.id,
        error,
      });
      throw error;
    }
  }

  private async createFinalReport(finalizationParams: ShapefileFinalizationParams, outputPath: string): Promise<Report> {
    const { job, taskId, errorSummary } = finalizationParams;
    const reportTitle = this.getReportTitle(job);

    // Create .qmd metadata file
    await this.createQmdFile({
      jobId: job.id,
      taskId: taskId,
      reportTitle,
      jobType: job.type,
      errorSummary,
    });

    // Create zip file containing all shapefiles and .qmd
    const report = await this.createZipArchive(job.id, reportTitle);

    this.logger.info({
      msg: 'Error shapefile finalized and zipped',
      jobId: job.id,
      outputPath,
      zipPath: report.path,
    });
    return report;
  }

  private async createQmdFile(params: QmdFileParams): Promise<void> {
    const outputDir = this.getJobShapefilePath(params.jobId);
    const qmdPath = path.join(outputDir, QMD_REPORT_FILE_NAME);

    const metadata = this.createQmdMetadata(params);
    const qmdContent = this.buildQmdXmlContent(metadata);

    await fs.writeFile(qmdPath, qmdContent, 'utf-8');

    this.logger.info({
      msg: 'QMD metadata file created',
      jobId: params.jobId,
      qmdPath,
    });
  }

  private createQmdMetadata(params: QmdFileParams): QmdMetadata {
    const keywords: QmdMetadataKeyword[] = [];
    const { jobId, jobType, taskId, reportTitle, errorSummary } = params;

    Object.entries(errorSummary.errorsCount).forEach(([key, count]) => {
      const typedKey = key as keyof ErrorsCount;
      keywords.push({
        vocabulary: QMD_ERROR_LABELS[typedKey],
        items: [String(count)],
      });
    });

    QMD_THRESHOLD_LABELS.forEach(({ key, label }) => {
      keywords.push({
        vocabulary: label,
        items: [errorSummary.thresholds[key].exceeded ? THRESHOLD_VALIDATION_STATUS.FAILED : THRESHOLD_VALIDATION_STATUS.PASSED],
      });
    });

    return {
      identifier: taskId,
      parentIdentifier: jobId,
      title: reportTitle,
      type: jobType,
      abstract: 'Validation errors summary report',
      keywords,
    };
  }

  private buildQmdXmlContent(metadata: QmdMetadata): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('qgis')
      .ele('identifier')
      .txt(metadata.identifier)
      .up()
      .ele('parentidentifier')
      .txt(metadata.parentIdentifier)
      .up()
      .ele('type')
      .txt(metadata.type)
      .up()
      .ele('title')
      .txt(metadata.title)
      .up()
      .ele('abstract')
      .txt(metadata.abstract)
      .up();

    // Add keywords dynamically
    for (const kw of metadata.keywords) {
      const keywordsEle = doc.ele('keywords').att('vocabulary', kw.vocabulary);
      for (const item of kw.items) {
        keywordsEle.ele('keyword').txt(item).up();
      }
      keywordsEle.up();
    }

    const qmdContent = doc.end({ prettyPrint: true });
    return qmdContent;
  }

  private async createZipArchive(jobId: string, reportTitle: string): Promise<Report> {
    const outputDir = this.getJobShapefilePath(jobId);
    const reportFileName = this.getReportFileName(reportTitle);
    const zipPath = path.join(outputDir, reportFileName);

    try {
      const fileSize = await this.createZipFile(zipPath, outputDir);

      this.logger.info({
        msg: 'Zip archive created successfully',
        jobId,
        zipPath,
      });

      await this.cleanupShapefileComponents(outputDir);

      this.logger.info({
        msg: 'Cleaned up shapefile components after zipping',
        jobId,
        fileSize,
      });

      return {
        path: zipPath,
        fileName: reportFileName,
        fileSize: fileSize,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create zip archive',
        jobId,
        error,
      });
      throw error;
    }
  }

  //returns file size in bytes
  private async createZipFile(zipPath: string, sourceDir: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(archive.pointer()));
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      archive.glob('report.*', {
        cwd: sourceDir,
        ignore: ['*.zip'],
      });
      void archive.finalize();
    });
  }

  private async cleanupShapefileComponents(outputDir: string): Promise<void> {
    for (const ext of SHAPEFILE_REPORT_EXTENSIONS_LIST) {
      const filePath = path.join(outputDir, `report${ext}`);
      try {
        await fs.unlink(filePath);
        this.logger.debug({
          msg: 'Deleted shapefile component',
          filePath,
        });
      } catch (error) {
        this.logger.debug({
          msg: 'Could not delete file (may not exist)',
          filePath,
          error,
        });
      }
    }
  }

  private async writeFeaturesToShapefile(
    features: Feature<Geometry, Record<string, unknown>>[],
    outputPath: string,
    mode: ShpWritingMode
  ): Promise<void> {
    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    const options = [...OGR2OGR_SHP_REPORT_OPTIONS, ...(mode === ShpWritingMode.Append ? ['-append'] : [])];

    const opts: Ogr2OgrOptions = {
      format: 'ESRI Shapefile',
      destination: outputPath,
      options,
    };

    try {
      const result = await ogr2ogr(geojson, opts);
      this.logger.info({
        msg: 'ogr2ogr conversion completed',
        command: result.cmd,
        outputPath,
        mode,
      });
    } catch (error) {
      this.logger.error({
        msg: 'ogr2ogr conversion failed',
        error,
        outputPath,
        mode,
      });
      throw error;
    }
  }

  private async shapefileExists(basePath: string): Promise<boolean> {
    const shpPath = `${basePath}/report.shp`;
    try {
      await fs.access(shpPath);
      return true;
    } catch {
      return false;
    }
  }

  private getJobShapefilePath(jobId: string): string {
    return path.join(this.shapefileReportBasePath, jobId);
  }

  private getReportFileName(reportTitle: string): string {
    const fileCreationDate = new Date().toISOString();
    const reportFileName = `${reportTitle}_report_${fileCreationDate}.zip`;
    this.logger.info({
      msg: 'Generated shapefile report file name',
      reportFileName,
    });
    return reportFileName;
  }

  private getReportTitle(job: IJobResponse<IngestionJobParams, ValidationTaskParameters>): string {
    const { productType, resourceId, version } = job;
    const validProductType = rasterProductTypeSchema.parse(productType);
    const validResourceId = resourceIdSchema.parse(resourceId);
    const entityName = getEntityName(validResourceId, validProductType);
    const reportName = `${entityName}_v${version}`;
    this.logger.info({
      msg: 'Generated shapefile report name',
      jobId: job.id,
      reportName,
    });
    return reportName;
  }
}

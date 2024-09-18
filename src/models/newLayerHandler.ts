import { injectable } from "tsyringe";
import { IJobHandler } from "../common/interfaces";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { Logger } from "@map-colonies/js-logger";

@injectable()
export class NewJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
  ) {}
    handleJobFinalize: (job: IJobResponse<any, any>, taskId: string) => Promise<void>;

  public async handleJobInit(job: IJobResponse<NewRasterLayer, unknown>, taskId: string): Promise<void> {}
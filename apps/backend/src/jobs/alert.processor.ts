import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AlertsService } from '../alerts/alerts.service';

export const ALERT_QUEUE = 'alert-check';

@Processor(ALERT_QUEUE)
export class AlertProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertProcessor.name);

  constructor(private alertsService: AlertsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing alert-check job ${job.id}`);
    try {
      const result = await this.alertsService.evaluateAlerts();
      this.logger.log(`Alert evaluation done: ${result.created} new alerts created`);
    } catch (err) {
      this.logger.error('Alert evaluation failed', err);
      throw err;
    }
  }
}

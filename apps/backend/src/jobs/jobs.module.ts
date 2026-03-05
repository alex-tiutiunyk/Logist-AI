import { Injectable, Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { AlertProcessor, ALERT_QUEUE } from './alert.processor';
import { AlertsModule } from '../alerts/alerts.module';

// ── Scheduler ────────────────────────────────────────────────────────────────
// Declared BEFORE JobsModule so TypeScript can resolve it in providers array.

@Injectable()
class JobsScheduler implements OnModuleInit {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(@InjectQueue(ALERT_QUEUE) private alertQueue: Queue) {}

  async onModuleInit() {
    // Clear stale repeatable jobs on restart to avoid duplicates
    const repeatableJobs = await this.alertQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.alertQueue.removeRepeatableByKey(job.key);
    }

    // Schedule a repeating job via BullMQ (every 5 minutes)
    await this.alertQueue.add(
      'evaluate',
      {},
      { repeat: { every: 5 * 60 * 1000 } },
    );

    this.logger.log('Alert check job scheduled (every 5 minutes)');

    // Run once immediately on startup so demo data shows alerts right away
    await this.alertQueue.add('evaluate-startup', {});
  }

  // Belt-and-suspenders: also push via @nestjs/schedule in case BullMQ repeats drift
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cronTrigger() {
    await this.alertQueue.add('evaluate-cron', {});
  }
}

// ── Module ───────────────────────────────────────────────────────────────────

@Module({
  imports: [
    BullModule.registerQueue({ name: ALERT_QUEUE }),
    AlertsModule,
  ],
  providers: [AlertProcessor, JobsScheduler],
})
export class JobsModule {}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { IntegrationsService } from './integrations.service.js';

@Injectable()
export class ConnectorSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectorSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Continuous Telemetry Connector Scheduler (polling interval check every 30s)...');
    // Run initial check after 5 seconds, then every 30 seconds
    setTimeout(() => {
      this.checkDueConnectors().catch((err) =>
        this.logger.error(`Initial scheduler check error: ${err.message}`),
      );
    }, 5000);

    this.timer = setInterval(() => {
      this.checkDueConnectors().catch((err) =>
        this.logger.error(`Scheduled connector check error: ${err.message}`),
      );
    }, 30000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkDueConnectors() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      const now = new Date();
      const dueIntegrations = await this.prisma.integration.findMany({
        where: {
          isEnabled: true,
          isScheduleEnabled: true,
          OR: [
            { nextSyncAt: { lte: now } },
            { nextSyncAt: null },
          ],
        },
      });

      if (dueIntegrations.length === 0) {
        return;
      }

      this.logger.log(`Found ${dueIntegrations.length} due connector(s) for continuous telemetry sync.`);

      for (const integration of dueIntegrations) {
        const intervalMinutes = integration.pollingIntervalMinutes || 15;
        const nextSyncAt = new Date(now.getTime() + intervalMinutes * 60 * 1000);

        // Claim integration to avoid race conditions
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: {
            connectorStatus: 'SYNCING',
            nextSyncAt,
          },
        });

        try {
          await this.integrationsService.syncIntegration(
            integration.organizationId,
            integration.id,
            { id: 'scheduler', email: 'scheduler@threatsync.local' },
            'SCHEDULED',
          );
        } catch (err: any) {
          this.logger.error(
            `Failed scheduled sync for connector ${integration.name} (${integration.id}): ${err.message}`,
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

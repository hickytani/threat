import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { IntelligenceModule } from './intelligence/intelligence.module.js';
import { AuditModule } from './audit/audit.module.js';
import { VulnerabilitiesModule } from './vulnerabilities/vulnerabilities.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { EventsModule } from './events/events.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    AssetsModule,
    AlertsModule,
    IncidentsModule,
    IntelligenceModule,
    AuditModule,
    VulnerabilitiesModule,
    QueuesModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers: [RequestIdMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

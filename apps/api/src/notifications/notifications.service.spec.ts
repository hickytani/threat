import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      notificationPolicy: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      notificationDelivery: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    service = new NotificationsService(prismaMock);
  });

  describe('SSRF Protection Guard', () => {
    it('allows valid external HTTPS webhook URL', () => {
      expect(() => service.validateWebhookUrl('https://hooks.slack.com/services/T00/B00/X00')).not.toThrow();
    });

    it('blocks localhost target URL', () => {
      expect(() => service.validateWebhookUrl('http://localhost:3000/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks 127.0.0.1 target URL', () => {
      expect(() => service.validateWebhookUrl('http://127.0.0.1:8080/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks AWS Metadata IP 169.254.169.254', () => {
      expect(() => service.validateWebhookUrl('http://169.254.169.254/latest/meta-data')).toThrow('SSRF Security Guard');
    });

    it('blocks private IP range 10.0.0.1', () => {
      expect(() => service.validateWebhookUrl('http://10.0.1.50/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks private IP range 192.168.1.1', () => {
      expect(() => service.validateWebhookUrl('http://192.168.1.1/webhook')).toThrow('SSRF Security Guard');
    });
  });

  describe('Notification Policy Evaluation', () => {
    it('dispatches queued delivery when alert severity meets or exceeds policy threshold', async () => {
      const mockPolicy = {
        id: 'pol_01',
        organizationId: 'org_01',
        name: 'Critical Alerts Policy',
        isEnabled: true,
        minSeverity: 'HIGH',
        channelType: 'WEBHOOK',
        webhookUrl: 'https://api.example.com/webhooks/security',
      };

      prismaMock.notificationPolicy.findMany.mockResolvedValue([mockPolicy]);
      prismaMock.notificationDelivery.create.mockResolvedValue({
        id: 'del_01',
        organizationId: 'org_01',
        destinationUrl: mockPolicy.webhookUrl,
      });

      const mockAlert = {
        id: 'alt_99',
        severity: 'CRITICAL',
        title: 'Critical Threat Detected',
        category: 'EXPLOIT',
      };

      await service.evaluateAndDispatchAlertNotifications('org_01', mockAlert);

      expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org_01',
          policyId: 'pol_01',
          alertId: 'alt_99',
          status: 'QUEUED',
        }),
      });
    });
  });
});

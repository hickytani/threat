import { NotificationsService } from './notifications.service.js';

describe('NotificationsService — SSRF Protection Guard & Delivery Test', () => {
  let service: NotificationsService;
  let prismaMock: any;

  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'notification-test-key-that-is-long-enough';
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

  afterEach(() => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
  });

  it('encrypts policy secrets and omits them from policy responses', async () => {
    prismaMock.notificationPolicy.create.mockResolvedValue({
      id: 'policy_secure_01',
      organizationId: 'org_01',
      name: 'High severity webhook',
      secretToken: 'enc:v1:stored',
    });

    const result = await service.createPolicy('org_01', {
      name: 'High severity webhook',
      webhookUrl: 'https://hooks.example.test/security',
      secretToken: 'notification-secret',
    });

    const persisted = prismaMock.notificationPolicy.create.mock.calls[0][0].data;
    expect(persisted.secretToken).toMatch(/^enc:v1:/);
    expect(persisted.secretToken).not.toBe('notification-secret');
    expect(result.secretToken).toBeUndefined();
  });

  describe('SSRF Protection Guard (Target URL Host Validation)', () => {
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

    it('blocks GCP Metadata hostname metadata.google.internal', () => {
      expect(() => service.validateWebhookUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow('SSRF Security Guard');
    });

    it('blocks private IP range 10.0.0.1', () => {
      expect(() => service.validateWebhookUrl('http://10.0.1.50/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks private IP range 172.16.0.1', () => {
      expect(() => service.validateWebhookUrl('http://172.16.5.10/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks private IP range 192.168.1.1', () => {
      expect(() => service.validateWebhookUrl('http://192.168.1.1/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks link-local IP range 169.254.10.20', () => {
      expect(() => service.validateWebhookUrl('http://169.254.10.20/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks IPv6 loopback [::1]', () => {
      expect(() => service.validateWebhookUrl('http://[::1]:8080/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks DWORD numeric IP 2130706433 (127.0.0.1)', () => {
      expect(() => service.validateWebhookUrl('http://2130706433/webhook')).toThrow('SSRF Security Guard');
    });

    it('blocks Hex DWORD IP 0x7f000001 (127.0.0.1)', () => {
      expect(() => service.validateWebhookUrl('http://0x7f000001/webhook')).toThrow('SSRF Security Guard');
    });
  });

  describe('SSRF Protection Guard (Redirect Prevention)', () => {
    it('rejects HTTP 302 redirect responses to prevent SSRF redirect bypass', async () => {
      const mockDelivery = {
        id: 'del_redirect_test',
        organizationId: 'org_01',
        destinationUrl: 'https://example.com/redirect-to-private',
        payload: { test: true },
      };

      prismaMock.notificationDelivery.findUnique.mockResolvedValue(mockDelivery);
      prismaMock.notificationDelivery.update.mockResolvedValue(mockDelivery);

      // Mock global fetch to return a 302 redirect response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        status: 302,
        ok: false,
        statusText: 'Found',
        type: 'opaqueredirect',
      }) as any;

      try {
        await service.deliverWebhookNotification('del_redirect_test');

        expect(prismaMock.notificationDelivery.update).toHaveBeenCalledWith({
          where: { id: 'del_redirect_test' },
          data: expect.objectContaining({
            status: 'FAILED',
            responseMetadata: expect.objectContaining({
              error: expect.stringContaining('SSRF Security Guard: Target URL returned redirect status 302'),
            }),
          }),
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

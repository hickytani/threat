import { AwsCloudTrailConnector } from './aws-cloudtrail.connector.js';

describe('AwsCloudTrailConnector', () => {
  let connector: AwsCloudTrailConnector;

  beforeEach(() => {
    connector = new AwsCloudTrailConnector();
  });

  it('normalizes AWS CloudTrail log envelope (Records array)', () => {
    const rawPayload = {
      Records: [
        {
          eventVersion: '1.08',
          userIdentity: {
            type: 'IAMUser',
            userName: 'alice',
            arn: 'arn:aws:iam::123456789012:user/alice',
          },
          eventTime: '2026-09-17T12:00:00Z',
          eventSource: 's3.amazonaws.com',
          eventName: 'DeleteBucket',
          awsRegion: 'us-east-1',
          sourceIPAddress: '198.51.100.22',
          requestParameters: {
            bucketName: 'sensitive-financial-audit-logs',
          },
        },
      ],
    };

    const normalized = connector.normalize(rawPayload, {}, 'AWS CloudTrail Prod');

    expect(normalized).toHaveLength(1);
    expect(normalized[0].eventType).toBe('DeleteBucket');
    expect(normalized[0].source).toBe('s3.amazonaws.com');
    expect(normalized[0].severity).toBe('HIGH');
    expect(normalized[0].hostname).toBe('sensitive-financial-audit-logs');
    expect(normalized[0].metadata?.userIdentity).toBe('alice');
  });

  it('parses error codes and elevates severity for failed CloudTrail events', () => {
    const rawRecord = {
      eventName: 'PutGroupPolicy',
      eventSource: 'iam.amazonaws.com',
      errorCode: 'AccessDenied',
      errorMessage: 'User alice is not authorized to perform PutGroupPolicy',
      sourceIPAddress: '203.0.113.50',
      userIdentity: {
        userName: 'attacker',
      },
    };

    const normalized = connector.normalize(rawRecord);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].outcome).toBe('FAILURE');
    expect(normalized[0].severity).toBe('CRITICAL');
  });
});

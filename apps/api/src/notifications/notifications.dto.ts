export class CreateNotificationPolicyDto {
  name!: string;
  description?: string;
  isEnabled?: boolean;
  minSeverity?: string; // INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL
  channelType?: string; // WEBHOOK
  webhookUrl!: string;
  secretToken?: string;
}

export class UpdateNotificationPolicyDto {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  minSeverity?: string;
  channelType?: string;
  webhookUrl?: string;
  secretToken?: string;
}

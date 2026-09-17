export class CreateIntegrationDto {
  name!: string;
  type!: string;
  isEnabled?: boolean;
  configuration?: {
    fieldMap?: Record<string, string>;
    vendor?: string;
    customHeaders?: Record<string, string>;
    roleArn?: string;
    s3BucketName?: string;
  };
}

export class UpdateIntegrationDto {
  name?: string;
  type?: string;
  isEnabled?: boolean;
  status?: string;
  configuration?: {
    fieldMap?: Record<string, string>;
    vendor?: string;
    customHeaders?: Record<string, string>;
    roleArn?: string;
    s3BucketName?: string;
  };
}

export class TestEventDto {
  payload?: Record<string, any>;
}

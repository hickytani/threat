import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  configuration?: {
    url?: string;
    secret?: string;
    events?: string[];
    fieldMap?: Record<string, string>;
    vendor?: string;
    customHeaders?: Record<string, string>;
    roleArn?: string;
    s3BucketName?: string;
  };

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  configuration?: {
    url?: string;
    secret?: string;
    events?: string[];
    fieldMap?: Record<string, string>;
    vendor?: string;
    customHeaders?: Record<string, string>;
    roleArn?: string;
    s3BucketName?: string;
  };

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class TestEventDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

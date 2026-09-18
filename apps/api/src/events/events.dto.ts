import { IsInt, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class IngestEventDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  eventCategory?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  message?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsInt()
  sourcePort?: number;

  @IsOptional()
  @IsInt()
  destinationPort?: number;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsOptional()
  @IsString()
  userIdentity?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  rawJson?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  rawEvent?: Record<string, any>;
}

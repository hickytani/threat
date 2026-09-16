import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIngestionCredentialDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

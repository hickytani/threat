import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  organizationName!: string;

  @IsOptional()
  @IsString()
  orgSize?: string;

  @IsOptional()
  @IsString()
  organizationSize?: string;

  @IsOptional()
  @IsString()
  organizationIndustry?: string;

  @IsOptional()
  @IsString()
  organizationCountry?: string;

  @IsOptional()
  @IsString()
  organizationTimeZone?: string;

  @IsOptional()
  @IsString()
  securityGoal?: string;

}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const transformed = plainToInstance(EnvironmentVariables, {
    ...config,
    PORT: config.PORT === undefined ? 4000 : Number(config.PORT),
  });
  const errors = validateSync(transformed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const fields = errors.map((error) => error.property).join(', ');
    throw new Error(`Invalid environment configuration for: ${fields}`);
  }
  if (transformed.NODE_ENV !== 'test' && !transformed.DATABASE_URL) {
    throw new Error('DATABASE_URL is required outside the test environment');
  }
  return { ...config, PORT: transformed.PORT };
}
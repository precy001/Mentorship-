import { validateEnvironment } from '../src/config/env.validation';

const validJwtSecret = 'test-secret-with-at-least-32-characters';

describe('validateEnvironment', () => {
  it('applies safe local defaults in the test environment', () => {
    const result = validateEnvironment({
      NODE_ENV: 'test',
      PORT: '4000',
      JWT_ACCESS_SECRET: validJwtSecret,
    });

    expect(result.PORT).toBe(4000);
  });

  it('rejects invalid port values', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        PORT: '70000',
        JWT_ACCESS_SECRET: validJwtSecret,
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('requires a database URL outside tests', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        PORT: '4000',
        JWT_ACCESS_SECRET: validJwtSecret,
      }),
    ).toThrow('DATABASE_URL is required');
  });

  it('requires Brevo configuration in production, not SMTP credentials', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: '4000',
        DATABASE_URL: 'postgresql://example:example@localhost:5432/example',
        JWT_ACCESS_SECRET: validJwtSecret,
        EMAIL_FROM: 'Mentorship+ <sender@example.com>',
      }),
    ).toThrow('BREVO_API_KEY and EMAIL_FROM are required in production');

    const result = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '4000',
      DATABASE_URL: 'postgresql://example:example@localhost:5432/example',
      JWT_ACCESS_SECRET: validJwtSecret,
      BREVO_API_KEY: 'test-brevo-key',
      EMAIL_FROM: 'Mentorship+ <sender@example.com>',
    });

    expect(result.PORT).toBe(4000);
  });
});

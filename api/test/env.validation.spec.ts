import { validateEnvironment } from '../src/config/env.validation';

describe('validateEnvironment', () => {
  it('applies safe local defaults and accepts a configured database URL', () => {
    const result = validateEnvironment({ NODE_ENV: 'test', PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });

  it('rejects invalid port values', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test', PORT: '70000' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('requires a database URL outside tests', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development', PORT: '4000' })).toThrow(
      'DATABASE_URL is required',
    );
  });
});
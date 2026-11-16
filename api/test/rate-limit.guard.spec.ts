import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitGuard } from '../src/common/guards/rate-limit.guard';

function contextFor(ip: string, options?: { limit: number; windowMs: number }): ExecutionContext {
  const handler = () => undefined;
  if (options) Reflect.defineMetadata(RATE_LIMIT_KEY, options, handler);
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ ip, method: 'POST', path: '/auth/login', route: { path: '/auth/login' } }) }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows calls up to the limit and then answers 429', () => {
    const guard = new RateLimitGuard(new Reflector());
    const options = { limit: 3, windowMs: 60_000 };
    const handlerContext = contextFor('1.1.1.1', options);
    expect(guard.canActivate(handlerContext)).toBe(true);
    expect(guard.canActivate(handlerContext)).toBe(true);
    expect(guard.canActivate(handlerContext)).toBe(true);
    try {
      guard.canActivate(handlerContext);
      throw new Error('expected the fourth call to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('counts each client address separately', () => {
    const guard = new RateLimitGuard(new Reflector());
    const options = { limit: 1, windowMs: 60_000 };
    const handler = () => undefined;
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, handler);
    const make = (ip: string) => ({ getHandler: () => handler, switchToHttp: () => ({ getRequest: () => ({ ip, method: 'POST', path: '/x', route: { path: '/x' } }) }) }) as unknown as ExecutionContext;
    expect(guard.canActivate(make('2.2.2.2'))).toBe(true);
    expect(guard.canActivate(make('3.3.3.3'))).toBe(true);
    expect(() => guard.canActivate(make('2.2.2.2'))).toThrow(HttpException);
  });

  it('does nothing for handlers without a limit', () => {
    const guard = new RateLimitGuard(new Reflector());
    const context = contextFor('4.4.4.4');
    for (let i = 0; i < 50; i += 1) expect(guard.canActivate(context)).toBe(true);
  });
});

import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export const RATE_LIMIT_KEY = 'mentorship:rate-limit';
export type RateLimitOptions = { limit: number; windowMs: number };

/** Limits how often one client address may call a handler, e.g. `@RateLimit(10, 60_000)`. */
export const RateLimit = (limit: number, windowMs: number) => SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitOptions);

/**
 * In-memory sliding-window limiter for brute-force-prone endpoints (login, registration, password reset).
 * It is per API instance, which protects a single Render instance; put a shared store (e.g. Redis)
 * behind it before running several instances. Requires `trust proxy` so `request.ip` is the real client.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    this.sweep(now, options.windowMs);
    const key = `${request.ip ?? 'unknown'}|${request.method}|${request.route?.path ?? request.path}`;
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < options.windowMs);
    if (recent.length >= options.limit) {
      const retryAfter = Math.max(1, Math.ceil((options.windowMs - (now - recent[0])) / 1000));
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `Too many attempts. Please wait ${retryAfter} seconds and try again.` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  private sweep(now: number, windowMs: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      if (!times.some((time) => now - time < windowMs)) this.hits.delete(key);
    }
  }
}

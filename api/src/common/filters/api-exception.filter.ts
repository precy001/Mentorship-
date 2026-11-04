import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!isHttp || status >= 500) {
      const detail = exception instanceof Error ? `${exception.name}: ${exception.message}\n${exception.stack ?? ''}` : String(exception);
      this.logger.error(`${request.method} ${request.path} failed (${status})`, detail);
    }
    let message = 'Something went wrong. Please try again.';
    if (isHttp && status < 500) {
      const payload = exception.getResponse();
      const raw = typeof payload === 'string' ? payload : (payload as { message?: unknown }).message;
      message = Array.isArray(raw) ? raw.map(String).join(' ') : typeof raw === 'string' ? raw : message;
    }
    response.status(status).json({ statusCode: status, message, error: message, timestamp: new Date().toISOString(), path: request.path });
  }
}

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
    // Two people changing the same record at once makes a Serializable transaction fail with P2034.
    // That is a retryable conflict, not a server fault.
    const prismaCode = !isHttp && typeof exception === 'object' && exception !== null ? (exception as { code?: unknown }).code : undefined;
    if (prismaCode === 'P2034') {
      response.status(HttpStatus.CONFLICT).json({ statusCode: HttpStatus.CONFLICT, message: 'That item was just updated by someone else. Please try again.', error: 'Conflict', timestamp: new Date().toISOString(), path: request.path });
      return;
    }
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!isHttp || status >= 500) {
      const detail = exception instanceof Error ? `${exception.name}: ${exception.message}\n${exception.stack ?? ''}` : String(exception);
      this.logger.error(`${request.method} ${request.path} failed (${status})`, detail);
    }
    let message = 'Something went wrong. Please try again.';
    if (isHttp && status < 500) {
      const payload = exception.getResponse();
      const raw = typeof payload === 'string' ? payload : (payload as { message?: unknown }).message;
      message = Array.isArray(raw) ? raw.map(String).join('\n') : typeof raw === 'string' ? raw : message;
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) message = 'The uploaded file is too large. Images must be 5 MB or smaller.';
    }
    response.status(status).json({ statusCode: status, message, error: message, timestamp: new Date().toISOString(), path: request.path });
  }
}

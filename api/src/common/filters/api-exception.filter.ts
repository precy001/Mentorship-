import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttpException || status >= 500) {
      // Avoid logging exception payloads or query strings that may contain private data.
      this.logger.error(`${request.method} ${request.path} failed (${status})`);
    }

    const publicMessage = status >= 500
      ? 'An unexpected error occurred.'
      : isHttpException
        ? exception.getResponse()
        : 'An unexpected error occurred.';

    response.status(status).json({
      statusCode: status,
      error: publicMessage,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
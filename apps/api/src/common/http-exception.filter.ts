import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    const requestId = request.requestId || 'req_unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred on the server.';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as any;
        message = resObj.message || message;
        code = resObj.error || 'BAD_REQUEST';
        if (Array.isArray(resObj.message)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          details = resObj.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (exception.constructor.name.includes('Prisma')) {
        status = HttpStatus.BAD_REQUEST;
        code = 'DATABASE_ERROR';
        // Hide stack details or specific Prisma SQL queries from production logs
        message = 'A database operation failed validation.';
      }
    }

    // Map common HTTP statuses to clean uppercase error strings
    if (code === 'BAD_REQUEST' || code === 'INTERNAL_SERVER_ERROR' || code === 'DATABASE_ERROR') {
      switch (status) {
        case 400: code = 'BAD_REQUEST'; break;
        case 401: code = 'UNAUTHORIZED'; break;
        case 403: code = 'FORBIDDEN'; break;
        case 404: code = 'NOT_FOUND'; break;
        case 409: code = 'CONFLICT'; break;
        case 429: code = 'RATE_LIMITED'; break;
        default: code = 'SERVER_ERROR';
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
        requestId,
        details,
      },
    });
  }
}

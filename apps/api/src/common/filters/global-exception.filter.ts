import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

// ─── Standard error response shape ────────────────────────────────────────────
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.resolveException(exception);

    // Log server errors with full stack; log client errors at warn level only
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    const body: ErrorResponse = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
  } {
    // ── NestJS HttpException (covers ValidationPipe 400s, Guards 401/403, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { status, message: res, error: exception.name };
      }
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        return {
          status,
          message: (r.message as string | string[]) ?? exception.message,
          error: (r.error as string) ?? exception.name,
        };
      }
    }

    // ── Prisma known request errors (e.g. unique constraint, record not found)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    // ── Prisma validation errors (bad query shape — programming error)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error('Prisma validation error — likely a bad query shape', exception.message);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An internal error occurred',
        error: 'InternalServerError',
      };
    }

    // ── Unknown/unhandled errors — never leak stack traces in production
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction
        ? 'An unexpected error occurred'
        : (exception instanceof Error ? exception.message : String(exception)),
      error: 'InternalServerError',
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (exception.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`,
          error: 'Conflict',
        };
      }
      case 'P2024':
        // Connection pool exhaustion — the pool timed out waiting for a free
        // connection.  Return 503 (Service Unavailable) rather than 500 so
        // load balancers / uptime monitors distinguish this from a code error.
        // Root causes: event-emitter connection leak, pool too small, or
        // unbounded concurrent writes (e.g. ActivityMiddleware without debounce).
        this.logger.error(
          'P2024 — database connection pool exhausted. ' +
          'Check: (1) no emit:event loggers without $on listeners, ' +
          '(2) ActivityMiddleware has Redis debounce, ' +
          '(3) DATABASE_URL includes connection_limit & pool_timeout params.',
          exception.message,
        );
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'The service is temporarily unavailable. Please try again in a moment.',
          error: 'ServiceUnavailable',
        };
      case 'P2025':
        // Record not found (e.g. update/delete on non-existent ID)
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFound',
        };
      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          error: 'BadRequest',
        };
      case 'P2014':
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation in request',
          error: 'BadRequest',
        };
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}`, exception.message);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
          error: 'InternalServerError',
        };
    }
  }
}

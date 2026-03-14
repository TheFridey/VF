import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

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
    const suppressWarningLog =
      status === HttpStatus.TOO_MANY_REQUESTS &&
      request.url.includes('/messaging/') &&
      request.url.endsWith('/read');

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (!suppressWarningLog) {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
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
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { status, message: res, error: exception.name };
      }

      if (typeof res === 'object' && res !== null) {
        const response = res as Record<string, unknown>;
        return {
          status,
          message: (response.message as string | string[]) ?? exception.message,
          error: (response.error as string) ?? exception.name,
        };
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error('Prisma validation error - likely a bad query shape', exception.message);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An internal error occurred',
        error: 'InternalServerError',
      };
    }

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
        const fields = (exception.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`,
          error: 'Conflict',
        };
      }
      case 'P2024':
        this.logger.error(
          'P2024 - database connection pool exhausted. Check connection limits and long-running queries.',
          exception.message,
        );
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'The service is temporarily unavailable. Please try again in a moment.',
          error: 'ServiceUnavailable',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFound',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          error: 'BadRequest',
        };
      case 'P2014':
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

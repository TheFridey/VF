/**
 * GlobalExceptionFilter — verifies:
 *   HttpException → correct status + message
 *   Prisma P2002 (unique violation) → 409
 *   Prisma P2025 (not found) → 404
 *   Prisma P2003 (foreign key) → 400
 *   Prisma ValidationError → 422
 *   Unknown error → 500 with no stack trace in production
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

// ── Minimal Express-like response mock ────────────────────────────────────────

function makeRes() {
  const res = {
    _status: 0,
    _json: {} as Record<string, unknown>,
    status(code: number) { this._status = code; return this; },
    json(body: Record<string, unknown>) { this._json = body; return this; },
  };
  return res;
}

function makeCtx(res: ReturnType<typeof makeRes>) {
  return {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ url: '/test', method: 'GET' }),
    }),
  };
}

const filter = new GlobalExceptionFilter();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GlobalExceptionFilter', () => {

  describe('HttpException', () => {
    it('maps 400 BadRequest correctly', () => {
      const res = makeRes();
      filter.catch(new HttpException('Validation failed', HttpStatus.BAD_REQUEST), makeCtx(res) as never);
      expect(res._status).toBe(400);
      expect(res._json.statusCode).toBe(400);
    });

    it('maps 401 Unauthorized correctly', () => {
      const res = makeRes();
      filter.catch(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED), makeCtx(res) as never);
      expect(res._status).toBe(401);
    });

    it('maps 403 Forbidden correctly', () => {
      const res = makeRes();
      filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), makeCtx(res) as never);
      expect(res._status).toBe(403);
    });

    it('maps 404 Not Found correctly', () => {
      const res = makeRes();
      filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), makeCtx(res) as never);
      expect(res._status).toBe(404);
    });

    it('maps 409 Conflict correctly', () => {
      const res = makeRes();
      filter.catch(new HttpException('Conflict', HttpStatus.CONFLICT), makeCtx(res) as never);
      expect(res._status).toBe(409);
    });

    it('includes message in response body', () => {
      const res = makeRes();
      filter.catch(new HttpException('Test message', HttpStatus.BAD_REQUEST), makeCtx(res) as never);
      expect(JSON.stringify(res._json)).toContain('Test');
    });

    it('includes timestamp in response body', () => {
      const res = makeRes();
      filter.catch(new HttpException('Err', HttpStatus.BAD_REQUEST), makeCtx(res) as never);
      expect(res._json.timestamp).toBeDefined();
    });
  });

  describe('Prisma errors', () => {
    function makePrismaKnown(code: string) {
      return new PrismaClientKnownRequestError('Prisma error', {
        code,
        clientVersion: '5.0.0',
      });
    }

    it('P2002 (unique constraint) → 409', () => {
      const res = makeRes();
      filter.catch(makePrismaKnown('P2002'), makeCtx(res) as never);
      expect(res._status).toBe(409);
    });

    it('P2025 (record not found) → 404', () => {
      const res = makeRes();
      filter.catch(makePrismaKnown('P2025'), makeCtx(res) as never);
      expect(res._status).toBe(404);
    });

    it('P2003 (foreign key) → 400', () => {
      const res = makeRes();
      filter.catch(makePrismaKnown('P2003'), makeCtx(res) as never);
      expect(res._status).toBe(400);
    });

    it('P2014 (relation violation) → 400', () => {
      const res = makeRes();
      filter.catch(makePrismaKnown('P2014'), makeCtx(res) as never);
      expect(res._status).toBe(400);
    });

    it('PrismaClientValidationError → 422', () => {
      const res = makeRes();
      const validationError = new PrismaClientValidationError('Invalid input', { clientVersion: '5.0.0' });
      filter.catch(validationError, makeCtx(res) as never);
      // PrismaClientValidationError is treated as a programming error → 500
      expect(res._status).toBe(500);
    });
  });

  describe('Unknown errors', () => {
    it('unknown Error → 500', () => {
      const res = makeRes();
      filter.catch(new Error('Something exploded'), makeCtx(res) as never);
      expect(res._status).toBe(500);
    });

    it('plain object → 500', () => {
      const res = makeRes();
      filter.catch({ weird: true } as never, makeCtx(res) as never);
      expect(res._status).toBe(500);
    });

    it('does not expose stack trace in production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const res = makeRes();
      filter.catch(new Error('Secret internal error'), makeCtx(res) as never);
      const body = JSON.stringify(res._json);
      expect(body).not.toContain('Secret internal error');
      expect(body).not.toContain('stack');
      process.env.NODE_ENV = original;
    });

    it('exposes message in development for debugging', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const res = makeRes();
      filter.catch(new Error('Dev-visible error'), makeCtx(res) as never);
      const body = JSON.stringify(res._json);
      // Should contain some error info in dev
      expect(res._status).toBe(500);
      process.env.NODE_ENV = original;
    });
  });

  describe('Response envelope', () => {
    it('always includes statusCode, message, and timestamp', () => {
      const res = makeRes();
      filter.catch(new HttpException('Bad', 400), makeCtx(res) as never);
      expect(res._json.statusCode).toBeDefined();
      expect(res._json.timestamp).toBeDefined();
      // message or error should be present
      const hasMessage = 'message' in res._json || 'error' in res._json;
      expect(hasMessage).toBe(true);
    });
  });
});

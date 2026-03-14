/**
 * TransformInterceptor — verifies that all successful responses
 * are wrapped in the { data, timestamp } envelope.
 */
import { of } from 'rxjs';
import { TransformInterceptor } from '../transform.interceptor';

function makeCallHandler(returnValue: unknown) {
  return {
    handle: () => of(returnValue),
  };
}

function makeCtx() {
  return {} as never;
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps primitive in data envelope', (done) => {
    interceptor.intercept(makeCtx(), makeCallHandler('hello')).subscribe((result) => {
      expect(result.data).toBe('hello');
      done();
    });
  });

  it('wraps object in data envelope', (done) => {
    const payload = { id: '1', name: 'Alice' };
    interceptor.intercept(makeCtx(), makeCallHandler(payload)).subscribe((result) => {
      expect(result.data).toEqual(payload);
      done();
    });
  });

  it('wraps array in data envelope', (done) => {
    const payload = [1, 2, 3];
    interceptor.intercept(makeCtx(), makeCallHandler(payload)).subscribe((result) => {
      expect(result.data).toEqual([1, 2, 3]);
      done();
    });
  });

  it('wraps null in data envelope', (done) => {
    interceptor.intercept(makeCtx(), makeCallHandler(null)).subscribe((result) => {
      expect(result.data).toBeNull();
      done();
    });
  });

  it('includes a timestamp ISO string', (done) => {
    interceptor.intercept(makeCtx(), makeCallHandler({})).subscribe((result) => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      done();
    });
  });

  it('timestamp is close to current time', (done) => {
    const before = new Date().toISOString();
    interceptor.intercept(makeCtx(), makeCallHandler({})).subscribe((result) => {
      const after = new Date().toISOString();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
      done();
    });
  });

  it('does not mutate the original data', (done) => {
    const original = { a: 1 };
    interceptor.intercept(makeCtx(), makeCallHandler(original)).subscribe((result) => {
      expect(result.data).toBe(original); // same reference
      done();
    });
  });
});

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '../domain/errors';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function ok<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

export function created<T>(body: T): NextResponse<T> {
  return NextResponse.json(body, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

function errorBody(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/**
 * The only place that turns a thrown value into a status code. Zod failures
 * become 400 with per-field detail, AppError subclasses carry their own status,
 * and anything else is a 500 whose internals are logged but never returned.
 */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      errorBody(
        'invalid_request',
        'The request body or query string failed validation',
        error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(errorBody(error.code, error.message, error.details), {
      status: error.status,
    });
  }

  console.error('[api] unhandled error', error);
  return NextResponse.json(errorBody('internal_error', 'Internal Server Error'), { status: 500 });
}

/** Wraps a route handler so no handler has to repeat the try/catch. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

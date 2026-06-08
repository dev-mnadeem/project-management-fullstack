/** Errors the service layer throws. Route handlers translate them into status
 *  codes in one place (lib/http/respond.ts) so no handler hand-rolls a 404. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} ${id} was not found`, 404, 'not_found');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'invalid_request', details);
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, 'configuration_error');
  }
}

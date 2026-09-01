export class EchoApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'EchoApiError';
  }
}

export class AuthenticationError extends EchoApiError {
  constructor(message = 'Echo authentication has expired.') {
    super(message, 'AUTHENTICATION_EXPIRED');
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends EchoApiError {
  constructor(message = 'Unable to reach Echo.') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class HttpError extends EchoApiError {
  constructor(
    readonly status: number,
    message = `Echo returned HTTP ${status}.`,
  ) {
    super(message, 'HTTP_ERROR');
    this.name = 'HttpError';
  }
}

export class InvalidResponseError extends EchoApiError {
  constructor(
    message = 'Echo returned an unexpected response.',
    readonly issues: unknown = undefined,
  ) {
    super(message, 'INVALID_RESPONSE');
    this.name = 'InvalidResponseError';
  }
}

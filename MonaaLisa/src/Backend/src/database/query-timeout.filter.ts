import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

/** Postgres error code of a query cancelled by statement_timeout */
const QUERY_CANCELED = '57014';

/**
 * A query that ran into the statement timeout (see DatabaseService) answers
 * 503 with a short reason instead of a bare 500, the request was valid but
 * too expensive. Every other error gets Nest's default handling.
 * Registered with APP_FILTER, which hands BaseExceptionFilter the adapter.
 */
@Catch()
export class QueryTimeoutFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if ((exception as { code?: string } | null)?.code !== QUERY_CANCELED) {
      return super.catch(exception, host);
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'The query took too long. Try more specific search words.',
      });
  }
}

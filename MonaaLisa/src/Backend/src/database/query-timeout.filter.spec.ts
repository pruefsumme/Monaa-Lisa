import { ArgumentsHost } from '@nestjs/common';
import { QueryTimeoutFilter } from './query-timeout.filter';

describe('QueryTimeoutFilter', () => {
  const respond = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    const host = {
      switchToHttp: () => ({ getResponse: () => res }),
    } as unknown as ArgumentsHost;
    return { res, host };
  };

  it('answers 503 for a query cancelled by the statement timeout', () => {
    const { res, host } = respond();
    new QueryTimeoutFilter().catch({ code: '57014' }, host);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 503 }),
    );
  });

  it('leaves every other error to the default handling', () => {
    const { res, host } = respond();
    const filter = new QueryTimeoutFilter();
    const fallback = jest
      .spyOn(Object.getPrototypeOf(QueryTimeoutFilter.prototype), 'catch')
      .mockImplementation(() => undefined);
    const error = new Error('boom');
    filter.catch(error, host);
    expect(fallback).toHaveBeenCalledWith(error, host);
    expect(res.status).not.toHaveBeenCalled();
    fallback.mockRestore();
  });
});

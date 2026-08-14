import { CsrfMiddleware } from './csrf.middleware';
import { AppConfigService } from '../../config/app-config.service';

function makeReqRes(overrides: { cookies?: Record<string, string>; method?: string } = {}) {
  const req = { cookies: overrides.cookies ?? {}, method: overrides.method ?? 'POST', header: jest.fn() } as any;
  const res = { cookie: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  return { req, res };
}

describe('CsrfMiddleware', () => {
  const config = { isProduction: false } as unknown as AppConfigService;
  const middleware = new CsrfMiddleware(config);

  it('does not enforce CSRF for unauthenticated requests (no session cookie)', () => {
    const { req, res } = makeReqRes({ cookies: {} });
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not enforce CSRF for safe methods even with a session', () => {
    const { req, res } = makeReqRes({ cookies: { access_token: 'x' }, method: 'GET' });
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('blocks a mutating authenticated request with a missing CSRF header', () => {
    const { req, res } = makeReqRes({ cookies: { access_token: 'x', csrf_token: 'abc123' } });
    req.header.mockReturnValue(undefined);
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks a mutating authenticated request when the header does not match the cookie', () => {
    const { req, res } = makeReqRes({ cookies: { access_token: 'x', csrf_token: 'abc123' } });
    req.header.mockReturnValue('does-not-match');
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a mutating authenticated request when the header matches the cookie (double-submit)', () => {
    const { req, res } = makeReqRes({ cookies: { access_token: 'x', csrf_token: 'abc123' } });
    req.header.mockReturnValue('abc123');
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

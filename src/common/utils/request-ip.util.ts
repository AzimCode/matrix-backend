import { Request } from 'express';

/**
 * Resolves the client IP the way Express already does.
 *
 * Deliberately does NOT read X-Forwarded-For directly: that header is
 * attacker-controlled unless a trusted proxy set it, so parsing it
 * unconditionally lets anyone forge the IP that abuse controls key on.
 * With `trust proxy` configured (see TRUST_PROXY), Express validates the
 * hop count and puts the real client address in req.ip; without it, req.ip
 * is the direct peer, which is the correct answer when there is no proxy.
 */
export function extractClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

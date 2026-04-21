import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/** Safe HTTP methods that don't need CSRF protection */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 * On every request, ensures a csrf_token cookie exists (sets one if missing).
 * For state-changing requests (POST/PUT/DELETE/PATCH) verifies that the
 * X-CSRF-Token header matches the cookie value.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Issue a CSRF token cookie if not present
  let token: string = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by JS
      sameSite: 'lax',
      secure: false,
    });
  }

  // For mutating requests, validate the header
  if (!SAFE_METHODS.has(req.method)) {
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;
    const tokensMatch = (() => {
      try {
        if (!headerToken || headerToken.length !== token.length) return false;
        return crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(token));
      } catch {
        return false;
      }
    })();
    if (!tokensMatch) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }
  }

  next();
}

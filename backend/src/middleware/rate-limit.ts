import { Request, Response, NextFunction } from 'express';

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message || 'Too many requests, please try again later.';
  
  const hits = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    // Priority: specific playerId, then IP.
    const key = (req as any).playerId ? `user:${(req as any).playerId}` : `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`;
    const now = Date.now();
    
    let record = hits.get(key);
    if (!record || record.resetTime < now) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
      next();
    } else {
      record.count++;
      if (record.count > max) {
        res.status(429).json({ error: message });
      } else {
        next();
      }
    }
    
    // Simple garbage collection
    if (Math.random() < 0.05) {
      for (const [k, v] of hits.entries()) {
        if (v.resetTime < now) {
          hits.delete(k);
        }
      }
    }
  };
}

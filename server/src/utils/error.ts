import { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export class BadRequest extends HttpError { constructor(m = 'Bad Request') { super(400, m); } }
export class Unauthorized extends HttpError { constructor(m = 'Unauthorized') { super(401, m); } }
export class Forbidden extends HttpError { constructor(m = 'Forbidden') { super(403, m); } }
export class NotFound extends HttpError { constructor(m = 'Not Found') { super(404, m); } }

export function notFound(_req: Request, _res: Response, next: NextFunction){
  next(new NotFound());
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction){
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(status).json({ message });
}
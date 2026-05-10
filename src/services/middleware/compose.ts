import type { Middleware } from '../types.js';

export function composeMiddleware(middlewares: Middleware[]): Middleware {
  if (middlewares.length === 0) {
    return async (_request, next) => next(_request);
  }
  if (middlewares.length === 1) {
    return middlewares[0];
  }
  return async (request, next) => {
    let index = 0;
    const composedNext = async (req: unknown): Promise<unknown> => {
      if (index >= middlewares.length) {
        return next(req);
      }
      const mw = middlewares[index++];
      return mw(req, composedNext);
    };
    return composedNext(request);
  };
}

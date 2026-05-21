import { RequestContext } from '@/infra/framework/context/request-context';

declare module 'express-serve-static-core' {
  interface Request {
    context: RequestContext
  }
}

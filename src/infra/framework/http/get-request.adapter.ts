import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export function getRequestAdapter(context: ExecutionContext) {
  return context.switchToHttp().getRequest<Request>();
}

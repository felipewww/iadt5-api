import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const Context = createParamDecorator(
  (data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().context,
);

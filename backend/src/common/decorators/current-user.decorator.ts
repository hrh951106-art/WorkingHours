import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

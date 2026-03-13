import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// 功能权限装饰器
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// 数据权限装饰器
export const RequireDataScope = (scope: 'ALL' | 'DEPT' | 'DEPT_ONLY' | 'SELF') =>
  SetMetadata('dataScope', scope);

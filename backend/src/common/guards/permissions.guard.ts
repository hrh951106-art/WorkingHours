import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由所需的权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置权限要求，则允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 获取请求用户
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // admin用户拥有所有权限
    if (user.username === 'admin') {
      return true;
    }

    // 检查用户是否有通配符权限
    const userPermissions = this.getUserPermissions(user);
    if (userPermissions.includes('*')) {
      return true;
    }

    // 检查用户是否拥有所需的所有权限
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }

  private getUserPermissions(user: any): string[] {
    // 从用户的角色中提取所有权限
    const permissions: string[] = [];

    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role: any) => {
        if (role.functionalPermissions) {
          let functionalPermissions: string[];
          if (typeof role.functionalPermissions === 'string') {
            try {
              functionalPermissions = JSON.parse(role.functionalPermissions);
            } catch {
              functionalPermissions = [];
            }
          } else {
            functionalPermissions = role.functionalPermissions;
          }
          permissions.push(...functionalPermissions);
        }
      });
    }

    return [...new Set(permissions)]; // 去重
  }
}

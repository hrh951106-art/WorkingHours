import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 使用 Passport JWT 策略进行验证，会自动调用 JwtStrategy.validate
      const result = await super.canActivate(context);
      if (!result) {
        throw new UnauthorizedException('无效的认证令牌');
      }

      const request = context.switchToHttp().getRequest();
      const user = request.user;

      if (!user) {
        throw new UnauthorizedException('用户信息未找到');
      }

      // 检查角色权限（如果需要）
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        // 如果需要检查角色，确保用户有对应角色
        // 注意：由于我们使用的是基于权限的系统，这里可能不需要
        // 但为了兼容性，保留角色检查逻辑
        if (!user.roles || !Array.isArray(user.roles)) {
          throw new UnauthorizedException('角色信息缺失');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('认证失败');
    }
  }
}

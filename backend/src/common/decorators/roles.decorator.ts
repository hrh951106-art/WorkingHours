import { SetMetadata } from '@nestjs/common';

// 角色类型定义
export type UserRole = 'ADMIN' | 'HR_ADMIN' | 'ATTENDANCE_ADMIN' | 'DEPT_MANAGER' | 'EMPLOYEE';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

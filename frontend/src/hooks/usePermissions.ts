import { useAuthStore } from '../stores/authStore';

/**
 * 获取用户的所有功能权限列表
 */
export const usePermissions = () => {
  const { user } = useAuthStore();

  const permissions: string[] = [];

  if (user?.roles && Array.isArray(user.roles)) {
    user.roles.forEach((role) => {
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
};

/**
 * 检查用户是否拥有指定权限
 * @param permission 需要检查的权限
 * @returns 是否拥有权限
 */
export const useHasPermission = (permission: string): boolean => {
  const permissions = usePermissions();

  // 如果拥有通配符权限，返回true
  if (permissions.includes('*')) {
    return true;
  }

  return permissions.includes(permission);
};

/**
 * 检查用户是否拥有指定权限中的任意一个
 * @param permissionList 需要检查的权限列表
 * @returns 是否拥有任一权限
 */
export const useHasAnyPermission = (permissionList: string[]): boolean => {
  const permissions = usePermissions();

  // 如果拥有通配符权限，返回true
  if (permissions.includes('*')) {
    return true;
  }

  return permissionList.some((permission) => permissions.includes(permission));
};

/**
 * 检查用户是否拥有指定权限中的所有
 * @param permissionList 需要检查的权限列表
 * @returns 是否拥有所有权限
 */
export const useHasAllPermissions = (permissionList: string[]): boolean => {
  const permissions = usePermissions();

  // 如果拥有通配符权限，返回true
  if (permissions.includes('*')) {
    return true;
  }

  return permissionList.every((permission) => permissions.includes(permission));
};

/**
 * 获取用户的数据权限范围
 * @returns 数据权限范围
 */
export const useDataScope = (): 'ALL' | 'DEPT' | 'DEPT_ONLY' | 'SELF' => {
  const { user } = useAuthStore();

  if (!user?.roles || user.roles.length === 0) {
    return 'SELF';
  }

  // 获取最小数据权限范围（多个角色取最小范围）
  const scopePriority: Record<string, number> = { ALL: 0, DEPT: 1, DEPT_ONLY: 2, SELF: 3 };

  let minScope: 'ALL' | 'DEPT' | 'DEPT_ONLY' | 'SELF' = 'ALL';
  let minScopePriority = 0;

  user.roles.forEach((role) => {
    if (role.dataScopeType) {
      const validScopes = ['ALL', 'DEPT', 'DEPT_ONLY', 'SELF'];
      const scope = validScopes.includes(role.dataScopeType) ? role.dataScopeType : 'SELF';
      const roleScopePriority = scopePriority[scope] || 0;
      if (roleScopePriority > minScopePriority) {
        minScope = scope as 'ALL' | 'DEPT' | 'DEPT_ONLY' | 'SELF';
        minScopePriority = roleScopePriority;
      }
    }
  });

  return minScope;
};

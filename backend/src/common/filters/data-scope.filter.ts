import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * 数据权限服务
 * 用于根据用户角色获取数据权限范围
 */
@Injectable()
export class DataScopeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户的数据权限范围
   * @param user 当前用户
   * @returns 数据权限范围配置
   */
  getDataScope(user: any) {
    // 获取用户的最小数据权限范围（多个角色取最小范围）
    let minScope = 'ALL';

    if (user.roles && Array.isArray(user.roles)) {
      const scopes = ['ALL', 'DEPT', 'DEPT_ONLY', 'SELF'];
      const scopePriority = { ALL: 0, DEPT: 1, DEPT_ONLY: 2, SELF: 3 };

      user.roles.forEach((role: any) => {
        if (role.dataScopeType) {
          const roleScopePriority = scopePriority[role.dataScopeType] || 0;
          const minScopePriority = scopePriority[minScope] || 0;

          if (roleScopePriority > minScopePriority) {
            minScope = role.dataScopeType;
          }
        }
      });
    }

    return minScope;
  }

  /**
   * 根据数据权限范围过滤员工查询条件
   * @param user 当前用户
   * @param userOrgId 用户所属组织ID
   * @returns Prisma 查询条件
   */
  async getEmployeeFilter(user: any, userOrgId?: number) {
    const dataScope = this.getDataScope(user);

    switch (dataScope) {
      case 'ALL':
        // 全部数据：不过滤
        return {};

      case 'DEPT':
        // 本部门及子部门：需要获取所有子部门ID
        if (!userOrgId) {
          return { id: -1 }; // 没有组织信息，返回空结果
        }
        const deptAndChildren = await this.getDeptAndChildren(userOrgId);
        return { orgId: { in: deptAndChildren } };

      case 'DEPT_ONLY':
        // 仅本部门
        if (!userOrgId) {
          return { id: -1 };
        }
        return { orgId: userOrgId };

      case 'SELF':
        // 仅本人
        return { employeeNo: user.username };

      default:
        return {};
    }
  }

  /**
   * 获取部门及其所有子部门的ID列表
   * @param orgId 部门ID
   * @returns 部门ID列表
   */
  private async getDeptAndChildren(orgId: number): Promise<number[]> {
    const orgIds: number[] = [orgId];

    // 递归获取所有子部门
    const children = await this.prisma.organization.findMany({
      where: { parentId: orgId },
      select: { id: true },
    });

    for (const child of children) {
      orgIds.push(...(await this.getDeptAndChildren(child.id)));
    }

    return orgIds;
  }

  /**
   * 根据数据权限范围获取打卡记录过滤条件
   * @param user 当前用户
   * @param userOrgId 用户所属组织ID
   * @returns Prisma 查询条件
   */
  async getPunchRecordFilter(user: any, userOrgId?: number) {
    const dataScope = this.getDataScope(user);

    switch (dataScope) {
      case 'ALL':
        return {};

      case 'DEPT':
      case 'DEPT_ONLY':
        if (!userOrgId) {
          return { id: -1 };
        }

        // 获取有权限的员工号列表
        const employeeFilter = await this.getEmployeeFilter(user, userOrgId);
        const employees = await this.prisma.employee.findMany({
          where: employeeFilter,
          select: { employeeNo: true },
        });

        const employeeNos = employees.map((e) => e.employeeNo);
        return { employeeNo: { in: employeeNos } };

      case 'SELF':
        return { employeeNo: user.username };

      default:
        return {};
    }
  }

  /**
   * 根据数据权限范围获取排班过滤条件
   * @param user 当前用户
   * @param userOrgId 用户所属组织ID
   * @returns Prisma 查询条件
   */
  async getScheduleFilter(user: any, userOrgId?: number) {
    const dataScope = this.getDataScope(user);

    switch (dataScope) {
      case 'ALL':
        return {};

      case 'DEPT':
      case 'DEPT_ONLY':
        if (!userOrgId) {
          return { id: -1 };
        }

        // 获取有权限的员工号列表
        const employeeFilter = await this.getEmployeeFilter(user, userOrgId);
        const employees = await this.prisma.employee.findMany({
          where: employeeFilter,
          select: { employeeNo: true },
        });

        const employeeNos = employees.map((e) => e.employeeNo);
        return { employeeNo: { in: employeeNos } };

      case 'SELF':
        return { employeeNo: user.username };

      default:
        return {};
    }
  }

  /**
   * 根据数据权限范围获取计算结果过滤条件
   * @param user 当前用户
   * @param userOrgId 用户所属组织ID
   * @returns Prisma 查询条件
   */
  async getResultFilter(user: any, userOrgId?: number) {
    const dataScope = this.getDataScope(user);

    switch (dataScope) {
      case 'ALL':
        return {};

      case 'DEPT':
      case 'DEPT_ONLY':
        if (!userOrgId) {
          return { id: -1 };
        }

        // 获取有权限的员工号列表
        const employeeFilter = await this.getEmployeeFilter(user, userOrgId);
        const employees = await this.prisma.employee.findMany({
          where: employeeFilter,
          select: { employeeNo: true },
        });

        const employeeNos = employees.map((e) => e.employeeNo);
        return { employeeNo: { in: employeeNos } };

      case 'SELF':
        return { employeeNo: user.username };

      default:
        return {};
    }
  }
}

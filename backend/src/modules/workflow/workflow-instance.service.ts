import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkflowInstanceDto, SubmitApprovalDto, GetInstancesDto, InstanceStatus } from './dto/workflow-instance.dto';

@Injectable()
export class WorkflowInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成实例编号
   */
  private generateInstanceNo(category: string): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const categoryPrefix = category.replace(/_/g, '');
    return `${categoryPrefix}${timestamp}${random}`;
  }

  /**
   * 启动工作流实例
   */
  async createInstance(dto: CreateWorkflowInstanceDto) {
    console.log('=== 创建工作流实例 ===');
    console.log('DTO:', dto);

    // 1. 获取工作流定义
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: {
        id: dto.workflowId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      include: {
        nodes: {
          where: {
            nodeType: 'approval',
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    console.log('工作流定义:', workflow);
    console.log('工作流节点:', workflow?.nodes);

    if (!workflow) {
      throw new NotFoundException('工作流定义不存在或未发布');
    }

    // 2. 生成实例编号
    const instanceNo = this.generateInstanceNo(dto.category);

    // 3. 获取第一个审批节点
    const firstNode = workflow.nodes.find(n => n.sortOrder === 0 || workflow.nodes[0]?.id === n.id);
    const currentNodes = firstNode ? [firstNode.id] : [];

    // 4. 创建工作流实例
    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId: workflow.id,
        instanceNo,
        title: dto.title,
        category: dto.category,
        status: InstanceStatus.RUNNING,
        initiatorId: dto.initiatorId,
        initiatorName: dto.initiatorName,
        initiatorOrgId: dto.initiatorOrgId,
        initiatorOrgName: dto.initiatorOrgName,
        currentStep: firstNode?.nodeName || null,
        data: dto.data || '{}',
        initiatedAt: new Date(),
        startTime: new Date(),
      },
    });

    // 5. 为所有审批节点创建审批记录
    const approvals = await Promise.all(
      workflow.nodes.map(async (node) => {
        // 解析审批人策略
        let approverStrategy: any = {};
        try {
          approverStrategy = node.approverStrategy ? JSON.parse(node.approverStrategy) : {};
        } catch {
          approverStrategy = {};
        }

        // 获取审批人列表
        const approvers = await this.getApprovers(approverStrategy, dto);

        // 如果没有审批人，创建待审批记录并标记为无审批人
        if (!approvers || approvers.length === 0) {
          console.log(`[createInstance] 节点 ${node.nodeName} 无审批人，创建待审批记录`);
          return this.prisma.workflowApproval.create({
            data: {
              instanceId: instance.id,
              instanceNo: instanceNo,
              nodeId: node.id,
              nodeCode: node.nodeCode || `NODE_${node.id}`,
              nodeName: node.nodeName,
              step: node.sortOrder?.toString() || '0',
              approverId: 0,
              approverName: '无审批人',
              approvers: JSON.stringify([]),
              needAllApprove: node.needAllApprove || false,
              action: '',
              status: 'PENDING',
            },
          });
        }

        // 创建审批记录
        return this.prisma.workflowApproval.create({
          data: {
            instanceId: instance.id,
            instanceNo: instanceNo,
            nodeId: node.id,
            nodeCode: node.nodeCode || `NODE_${node.id}`,
            nodeName: node.nodeName,
            step: node.sortOrder?.toString() || '0',
            approverId: approvers[0]?.id || 1,
            approverName: approvers[0]?.name || '待分配',
            approvers: JSON.stringify(approvers),
            needAllApprove: node.needAllApprove || false,
            action: '',
            status: 'PENDING',
          },
        });
      }),
    );

    // 6. 检查是否有节点需要自动通过（无审批人的节点自动跳过）
    await this.checkAndAutoApproveNodes(instance.id, workflow.nodes);

    // 7. 返回完整的实例信息
    const result = await this.prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        definition: {
          include: {
            nodes: {
              where: {
                nodeType: 'approval',
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
        approvals: {
          orderBy: {
            step: 'asc',
          },
        },
      },
    });

    return {
      success: true,
      message: '工作流实例创建成功',
      data: result,
    };
  }

  /**
   * 获取审批人列表
   */
  private async getApprovers(strategy: any, context: CreateWorkflowInstanceDto): Promise<any[]> {
    const approvers: any[] = [];

    // 如果没有配置策略，返回空（将显示无审批人）
    if (!strategy) {
      console.log('[getApprovers] 未配置审批人策略');
      return approvers;
    }

    console.log('[getApprovers] 审批人策略:', JSON.stringify(strategy));

    // 兼容旧格式：策略是数组，直接是角色ID列表
    if (Array.isArray(strategy)) {
      console.log('[getApprovers] 检测到旧格式策略（角色ID数组）:', strategy);
      for (const roleId of strategy) {
        const userRoles = await this.prisma.userRole.findMany({
          where: { roleId },
          include: { user: true },
        });
        const activeUserRoles = userRoles.filter(ur => ur.user.status === 'ACTIVE');
        approvers.push(...activeUserRoles.map(ur => ({ id: ur.user.id, name: ur.user.name })));
      }
      console.log('[getApprovers] 旧格式找到审批人:', approvers.length);
      return approvers;
    }

    // 新格式：策略是对象，根据type字段判断
    if (!strategy.type) {
      console.log('[getApprovers] 策略格式未知，不是数组也没有type字段');
      return approvers;
    }

    // 根据策略类型获取审批人
    if (strategy.type === 'specific_user') {
      // 指定用户
      if (strategy.userIds && Array.isArray(strategy.userIds)) {
        console.log('[getApprovers] 查找指定用户, IDs:', strategy.userIds);
        const users = await this.prisma.user.findMany({
          where: {
            id: { in: strategy.userIds },
            status: 'ACTIVE',
          },
        });
        console.log('[getApprovers] 找到用户:', users);
        approvers.push(...users.map(u => ({ id: u.id, name: u.name })));
      }
    } else if (strategy.type === 'role') {
      // 角色审批
      if (strategy.roleId) {
        console.log('[getApprovers] 查找角色审批, roleId:', strategy.roleId);
        const userRoles = await this.prisma.userRole.findMany({
          where: {
            roleId: strategy.roleId,
          },
          include: {
            user: true,
          },
        });
        console.log('[getApprovers] 找到角色用户关系:', userRoles.length);
        // 只返回状态为ACTIVE的用户
        const activeUserRoles = userRoles.filter(ur => ur.user.status === 'ACTIVE');
        console.log('[getApprovers] 活跃用户:', activeUserRoles.length);
        approvers.push(...activeUserRoles.map(ur => ({ id: ur.user.id, name: ur.user.name })));
      }
    } else if (strategy.type === 'org_leader') {
      // 部门主管
      console.log('[getApprovers] 查找部门主管, orgId:', context.initiatorOrgId);
      if (context.initiatorOrgId) {
        const org = await this.prisma.organization.findUnique({
          where: { id: context.initiatorOrgId },
        });
        console.log('[getApprovers] 组织信息:', org);
        if (org?.leaderId) {
          // 注意：Organization.leaderId存储的是Employee ID，不是User ID
          // 需要通过Employee找到对应的User
          const employee = await this.prisma.employee.findUnique({
            where: { id: org.leaderId },
            select: {
              id: true,
              name: true,
              // 假设Employee有userId字段关联到User
              // 如果没有，需要根据业务逻辑调整
            },
          });
          console.log('[getApprovers] 组织主管员工信息:', employee);
          if (employee) {
            // 如果Employee有userId字段，使用它；否则使用employee.id
            // 这里需要根据实际业务逻辑调整
            approvers.push({ id: employee.id, name: employee.name || '未知' });
          }
        }
      }
    } else if (strategy.type === 'initiator_leader') {
      // 发起人主管
      console.log('[getApprovers] 查找发起人主管');
      // 可以根据实际业务逻辑实现
      // 暂时返回第一个活跃用户
      const defaultUser = await this.prisma.user.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (defaultUser) {
        approvers.push({ id: defaultUser.id, name: defaultUser.name });
      }
    }

    console.log('[getApprovers] 最终审批人列表:', approvers);
    return approvers;
  }

  /**
   * 检查并自动通过没有审批人的节点
   */
  private async checkAndAutoApproveNodes(instanceId: number, nodes: any[]) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        approvals: true,
      },
    });

    if (!instance || instance.status !== InstanceStatus.RUNNING) {
      return;
    }

    // 找到第一个节点
    const firstNode = nodes.sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (!firstNode) {
      return;
    }

    // 检查第一个节点的审批记录
    const firstNodeApprovals = instance.approvals.filter(a => a.nodeId === firstNode.id);

    // 如果第一个节点的所有审批记录都是自动通过的（无审批人），则流转到下一节点
    // 注意：moveToNextNode 会重新加载实例，所以不需要在这里加载 definition
    if (firstNodeApprovals.length > 0 && firstNodeApprovals.every(a => a.action === 'APPROVED' && a.approverId === 0)) {
      await this.moveToNextNode(instance, firstNode.id, false);
    }
  }

  /**
   * 提交审批
   */
  async submitApproval(dto: SubmitApprovalDto, userId: number, userName: string) {
    // 1. 获取工作流实例
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: dto.instanceId },
      include: {
        approvals: {
          orderBy: {
            step: 'asc',
          },
        },
        definition: {
          include: {
            nodes: {
              where: {
                nodeType: 'approval',
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('工作流实例不存在');
    }

    if (!instance.definition) {
      throw new NotFoundException('工作流定义不存在');
    }

    if (instance.status !== InstanceStatus.RUNNING) {
      throw new BadRequestException('工作流已结束，无法审批');
    }

    // 2. 解析当前节点
    const currentNodes = JSON.parse(instance.currentStep || '[]');
    if (currentNodes.length === 0) {
      throw new BadRequestException('当前没有待审批节点');
    }

    // 3. 查找当前节点的审批记录
    const currentApprovals = instance.approvals.filter(a =>
      currentNodes.includes(a.nodeId) && !a.action,
    );

    if (currentApprovals.length === 0) {
      throw new BadRequestException('未找到待审批记录');
    }

    // 4. 验证审批权限
    const userApproval = currentApprovals.find(a => a.approverId === userId);
    if (!userApproval) {
      throw new BadRequestException('您没有权限审批此节点');
    }

    // 5. 更新审批记录
    await this.prisma.workflowApproval.update({
      where: { id: userApproval.id },
      data: {
        action: dto.action,
        comment: dto.comment || '',
        approvedAt: new Date(),
        status: dto.action === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      },
    });

    // 6. 判断节点是否完成
    const nodeApprovals = instance.approvals.filter(a => a.nodeId === userApproval.nodeId);
    const allApproved = nodeApprovals.every(a => a.action === 'APPROVED');
    const anyRejected = nodeApprovals.some(a => a.action === 'REJECTED');

    if (anyRejected || (allApproved && nodeApprovals.length === 1)) {
      // 节点完成，流转到下一节点
      await this.moveToNextNode(instance, userApproval.nodeId, anyRejected);
    }

    return {
      success: true,
      message: dto.action === 'APPROVED' ? '审批通过' : '已退回',
    };
  }

  /**
   * 流转到下一节点
   */
  private async moveToNextNode(instance: any, completedNodeId: number, isRejected: boolean) {
    // 重新加载实例以确保包含完整的定义信息
    const reloadedInstance = await this.prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: {
        definition: {
          include: {
            nodes: {
              where: {
                nodeType: 'approval',
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });

    if (!reloadedInstance) {
      throw new BadRequestException('工作流实例不存在');
    }

    if (!reloadedInstance.definition || !reloadedInstance.definition.nodes) {
      throw new BadRequestException('工作流定义信息不完整');
    }

    const nodes = reloadedInstance.definition.nodes
      .filter((n: any) => n.nodeType === 'approval')
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const completedNode = nodes.find((n: any) => n.id === completedNodeId);
    const currentIndex = completedNode?.sortOrder || 0;

    if (isRejected) {
      // 驳回，结束流程
      await this.prisma.workflowInstance.update({
        where: { id: reloadedInstance.id },
        data: {
          status: InstanceStatus.REJECTED,
          currentStep: null,
          finishedAt: new Date(),
          endTime: new Date(),
        },
      });
      return;
    }

    // 查找下一个节点
    const nextNode = nodes.find((n: any) => n.sortOrder > currentIndex);

    if (nextNode) {
      // 流转到下一节点
      await this.prisma.workflowInstance.update({
        where: { id: reloadedInstance.id },
        data: {
          currentStep: nextNode.nodeName,
        },
      });

      // 检查下一个节点是否需要自动通过（无审批人的节点自动跳过）
      await this.checkAndAutoApproveNextNode(reloadedInstance.id, nextNode);
    } else {
      // 所有节点完成，流程结束
      await this.prisma.workflowInstance.update({
        where: { id: reloadedInstance.id },
        data: {
          status: InstanceStatus.COMPLETED,
          currentStep: null,
          finishedAt: new Date(),
          endTime: new Date(),
        },
      });
    }
  }

  /**
   * 检查下一个节点是否需要自动通过
   */
  private async checkAndAutoApproveNextNode(instanceId: number, nextNode: any) {
    const approvals = await this.prisma.workflowApproval.findMany({
      where: {
        instanceId,
        nodeId: nextNode.id,
      },
    });

    // 如果该节点的所有审批记录都是自动通过（无审批人），继续流转
    if (approvals.length > 0 && approvals.every(a => a.action === 'APPROVED' && a.approverId === 0)) {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          definition: {
            include: {
              nodes: {
                where: {
                  nodeType: 'approval',
                },
              },
            },
          },
        },
      });

      if (instance && instance.definition && instance.status === InstanceStatus.RUNNING) {
        await this.moveToNextNode(instance, nextNode.id, false);
      }
    }
  }

  /**
   * 获取实例详情
   */
  async getInstance(id: number) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        definition: {
          include: {
            nodes: {
              where: {
                nodeType: 'approval',
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
        approvals: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('工作流实例不存在');
    }

    return {
      success: true,
      data: instance,
    };
  }

  /**
   * 获取实例列表
   */
  async getInstances(query: GetInstancesDto) {
    const { status, category, page = 1, pageSize = 10 } = query;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [total, items] = await Promise.all([
      this.prisma.workflowInstance.count({ where }),
      this.prisma.workflowInstance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { initiatedAt: 'desc' },
        include: {
          definition: true,
          approvals: true,
        },
      }),
    ]);

    // 格式化返回数据
    const formattedItems = items.map(item => ({
      ...item,
      workflowName: item.definition.name,
    }));

    return {
      success: true,
      data: {
        total,
        items: formattedItems,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 管理员强制跳过节点（用于处理无审批人的情况）
   */
  async forceSkipNode(instanceId: number, nodeId: number, adminId: number, adminName: string) {
    console.log(`[forceSkipNode] 管理员 ${adminName} 强制跳过节点 ${nodeId}`);

    // 1. 获取工作流实例
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        approvals: {
          orderBy: {
            step: 'asc',
          },
        },
        definition: {
          include: {
            nodes: {
              where: {
                nodeType: 'approval',
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('工作流实例不存在');
    }

    if (instance.status !== InstanceStatus.RUNNING) {
      throw new BadRequestException('工作流已结束，无法跳过节点');
    }

    // 2. 查找目标节点的审批记录
    const nodeApprovals = instance.approvals.filter(a => a.nodeId === nodeId);

    if (nodeApprovals.length === 0) {
      throw new NotFoundException('未找到该节点的审批记录');
    }

    // 3. 更新所有该节点的审批记录为管理员强制通过
    await Promise.all(
      nodeApprovals.map(approval =>
        this.prisma.workflowApproval.update({
          where: { id: approval.id },
          data: {
            action: 'APPROVED',
            comment: `[管理员 ${adminName} 强制通过：原因为无审批人]`,
            approvedAt: new Date(),
            status: 'APPROVED',
          },
        })
      )
    );

    // 4. 流转到下一节点
    await this.moveToNextNode(instance, nodeId, false);

    return {
      success: true,
      message: '已强制跳过该节点',
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWorkflowInstanceDto,
  SubmitApprovalDto,
  GetInstancesDto,
  ForceApprovalDto,
  InstanceStatus,
} from './dto/workflow-instance.dto';
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class WorkflowInstanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amountCalculateService: AmountCalculateService,
  ) {}

  /**
   * 生成实例编号
   */
  private generateInstanceNo(category: string): string {
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
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
    const firstNode = workflow.nodes.find(
      (n) => n.sortOrder === 0 || workflow.nodes[0]?.id === n.id,
    );
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

    // 新格式：策略是数组，元素可能是参与人配置code（如 'A001', 'A002'）
    if (Array.isArray(strategy)) {
      console.log('[getApprovers] 检测到数组格式策略:', strategy);

      // 检查是否是参与人配置code（字符串，如 'A001', 'A002'）
      const isParticipantCodes = strategy.length > 0 && typeof strategy[0] === 'string';

      if (isParticipantCodes) {
        console.log('[getApprovers] 检测到参与人配置code列表，解析参与人配置');
        // 遍历每个参与人配置code
        for (const code of strategy) {
          const participantApprovers = await this.getApproversByParticipantCode(code, context);
          approvers.push(...participantApprovers);
        }
        console.log('[getApprovers] 参与人配置找到审批人:', approvers.length);
        return approvers;
      } else {
        // 兼容旧格式：策略是数组，直接是角色ID列表
        console.log('[getApprovers] 检测到旧格式策略（角色ID数组）:', strategy);
        for (const roleId of strategy) {
          const userRoles = await this.prisma.userRole.findMany({
            where: { roleId },
            include: { user: true },
          });
          const activeUserRoles = userRoles.filter((ur) => ur.user.status === 'ACTIVE');
          approvers.push(...activeUserRoles.map((ur) => ({ id: ur.user.id, name: ur.user.name })));
        }
        console.log('[getApprovers] 旧格式找到审批人:', approvers.length);
        return approvers;
      }
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
        approvers.push(...users.map((u) => ({ id: u.id, name: u.name })));
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
        const activeUserRoles = userRoles.filter((ur) => ur.user.status === 'ACTIVE');
        console.log('[getApprovers] 活跃用户:', activeUserRoles.length);
        approvers.push(...activeUserRoles.map((ur) => ({ id: ur.user.id, name: ur.user.name })));
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
    const firstNodeApprovals = instance.approvals.filter((a) => a.nodeId === firstNode.id);

    // 如果第一个节点的所有审批记录都是自动通过的（无审批人），则流转到下一节点
    // 注意：moveToNextNode 会重新加载实例，所以不需要在这里加载 definition
    if (
      firstNodeApprovals.length > 0 &&
      firstNodeApprovals.every((a) => a.action === 'APPROVED' && a.approverId === 0)
    ) {
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
    const currentApprovals = instance.approvals.filter(
      (a) => currentNodes.includes(a.nodeId) && !a.action,
    );

    if (currentApprovals.length === 0) {
      throw new BadRequestException('未找到待审批记录');
    }

    // 4. 验证审批权限
    const userApproval = currentApprovals.find((a) => a.approverId === userId);
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
    const nodeApprovals = instance.approvals.filter((a) => a.nodeId === userApproval.nodeId);
    const allApproved = nodeApprovals.every((a) => a.action === 'APPROVED');
    const anyRejected = nodeApprovals.some((a) => a.action === 'REJECTED');

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

      // 处理工时报工流程完成的业务逻辑
      await this.handleLaborHourReportCompleted(reloadedInstance.id);
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
    if (
      approvals.length > 0 &&
      approvals.every((a) => a.action === 'APPROVED' && a.approverId === 0)
    ) {
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
        laborHourReports: {
          select: {
            id: true,
            requestNo: true,
          },
          take: 1,
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
    console.log('=== getInstances called ===');
    console.log('Query params:', query);
    const { status, category, startDate, endDate, keyword, page = 1, pageSize = 10 } = query;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    // 日期范围查询
    if (startDate || endDate) {
      where.initiatedAt = {};
      if (startDate) {
        where.initiatedAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 结束日期需要包含当天的所有时间，所以设置为结束日期的23:59:59
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.initiatedAt.lte = endDateTime;
      }
    }

    console.log('Where clause:', where);

    // 转换为整数
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);

    // 先查询所有符合基本条件的数据
    const [total, items] = await Promise.all([
      this.prisma.workflowInstance.count({ where }),
      this.prisma.workflowInstance.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { initiatedAt: 'desc' },
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
            // 获取所有审批记录，不限制状态
          },
          laborHourReports: {
            select: {
              id: true,
              requestNo: true,
            },
            take: 1,
          },
        },
      }),
    ]);

    console.log('Total count:', total);
    console.log('Items count:', items.length);
    console.log('First item category:', items[0]?.category);

    // 关键词搜索（在内存中过滤，因为涉及到解析JSON数据）
    let filteredItems = items;
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filteredItems = items.filter((item) => {
        // 搜索发起人姓名
        if (item.initiatorName && item.initiatorName.toLowerCase().includes(keywordLower)) {
          return true;
        }

        // 搜索表单数据中的申请人信息
        try {
          const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          if (item.category === 'LABOR_HOUR_REPORT') {
            // 工时报工：搜索员工姓名或工号
            if (data.employeeName && data.employeeName.toLowerCase().includes(keywordLower)) {
              return true;
            }
            if (data.employeeNo && data.employeeNo.toLowerCase().includes(keywordLower)) {
              return true;
            }
          } else if (item.category === 'SUPPORT_REQUEST') {
            // 支援申请：搜索发起人或支援人员
            if (
              data.supportEmployeeName &&
              data.supportEmployeeName.toLowerCase().includes(keywordLower)
            ) {
              return true;
            }
            if (
              data.supportEmployeeNo &&
              data.supportEmployeeNo.toLowerCase().includes(keywordLower)
            ) {
              return true;
            }
          }
        } catch (e) {
          console.error('Error parsing data:', e);
        }

        return false;
      });
    }

    // 格式化返回数据
    const formattedItems = filteredItems.map((item) => {
      // 获取当前节点信息
      const currentStep = item.currentStep;
      const currentNodes = item.definition.nodes.filter((node) => node.nodeName === currentStep);

      return {
        ...item,
        workflowName: item.definition.name,
        currentNodes: currentNodes.map((node) => ({
          id: node.id,
          name: node.nodeName,
          code: node.nodeCode,
        })),
      };
    });

    const result = {
      total: keyword ? filteredItems.length : total,
      items: formattedItems,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil((keyword ? filteredItems.length : total) / pageSizeNum),
    };

    console.log('Returning result:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
    return result;
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
    const nodeApprovals = instance.approvals.filter((a) => a.nodeId === nodeId);

    if (nodeApprovals.length === 0) {
      throw new NotFoundException('未找到该节点的审批记录');
    }

    // 3. 更新所有该节点的审批记录为管理员强制通过
    await Promise.all(
      nodeApprovals.map((approval) =>
        this.prisma.workflowApproval.update({
          where: { id: approval.id },
          data: {
            action: 'APPROVED',
            comment: `[管理员 ${adminName} 强制通过：原因为无审批人]`,
            approvedAt: new Date(),
            status: 'APPROVED',
          },
        }),
      ),
    );

    // 4. 流转到下一节点
    await this.moveToNextNode(instance, nodeId, false);

    return {
      success: true,
      message: '已强制跳过该节点',
    };
  }

  /**
   * 根据参与人配置code获取审批人列表
   */
  private async getApproversByParticipantCode(
    code: string,
    context: CreateWorkflowInstanceDto,
  ): Promise<any[]> {
    const approvers: any[] = [];

    console.log('[getApproversByParticipantCode] 查询参与人配置:', code);

    // 查询参与人配置
    const participantConfig = await this.prisma.participantConfig.findUnique({
      where: { code },
    });

    if (!participantConfig) {
      console.log(`[getApproversByParticipantCode] 未找到参与人配置: ${code}`);
      return approvers;
    }

    if (participantConfig.status !== 'ACTIVE') {
      console.log(`[getApproversByParticipantCode] 参与人配置未激活: ${code}`);
      return approvers;
    }

    console.log(
      `[getApproversByParticipantCode] 找到参与人配置: ${participantConfig.name}, 类型: ${participantConfig.type}`,
    );

    // 解析配置
    let config: any = {};
    try {
      config = participantConfig.config ? JSON.parse(participantConfig.config) : {};
    } catch (e) {
      console.error('[getApproversByParticipantCode] 解析config失败:', e);
    }

    // 解析participants
    let participants: any[] = [];
    try {
      participants = participantConfig.participants
        ? JSON.parse(participantConfig.participants)
        : [];
    } catch (e) {
      console.error('[getApproversByParticipantCode] 解析participants失败:', e);
    }

    // 根据类型获取审批人
    switch (participantConfig.type) {
      case 'FIXED_USER':
        // 固定人员
        console.log('[getApproversByParticipantCode] 处理固定人员类型');
        if (participants.length > 0 && participants[0].type === 'FIXED_USER') {
          const userIds = participants[0].userIds || [];
          console.log('[getApproversByParticipantCode] 固定用户IDs:', userIds);
          const users = await this.prisma.user.findMany({
            where: {
              id: { in: userIds },
              status: 'ACTIVE',
            },
          });
          approvers.push(...users.map((u) => ({ id: u.id, name: u.name })));
        }
        break;

      case 'ORG_MANAGER':
        // 组织主管
        console.log('[getApproversByParticipantCode] 处理组织主管类型');
        if (participants.length > 0 && participants[0].type === 'ORG_MANAGER') {
          const subjectType = participants[0].subjectType;
          const orgLevel = participants[0].orgLevel;

          console.log(
            '[getApproversByParticipantCode] subjectType:',
            subjectType,
            'orgLevel:',
            orgLevel,
          );

          // 如果是SUBMITTER，从context中获取发起人信息
          if (subjectType === 'SUBMITTER' && context.initiatorOrgId) {
            console.log(
              '[getApproversByParticipantCode] 获取提交人所在组��主管, orgId:',
              context.initiatorOrgId,
            );

            // 查询组织信息
            const org = await this.prisma.organization.findUnique({
              where: { id: context.initiatorOrgId },
            });

            if (org?.leaderId) {
              // Organization.leaderId 是 Employee ID
              const employee = await this.prisma.employee.findUnique({
                where: { id: org.leaderId },
                select: {
                  id: true,
                  employeeNo: true,
                  name: true,
                },
              });

              if (employee) {
                // 通过 employeeNo 查找对应的 User
                const user = await this.prisma.user.findFirst({
                  where: {
                    username: employee.employeeNo,
                    status: 'ACTIVE',
                  },
                });

                if (user) {
                  approvers.push({ id: user.id, name: user.name });
                  console.log('[getApproversByParticipantCode] 找到组织主管:', user.name);
                } else {
                  console.log(
                    '[getApproversByParticipantCode] 未找到对应的User, employeeNo:',
                    employee.employeeNo,
                  );
                }
              }
            }
          }
        }
        break;

      case 'ROLE':
        // 角色成员
        console.log('[getApproversByParticipantCode] 处理角色成员类型');
        if (participants.length > 0 && participants[0].type === 'ROLE') {
          const roleIds = participants[0].roleIds || [];
          console.log('[getApproversByParticipantCode] 角色IDs:', roleIds);
          for (const roleId of roleIds) {
            const userRoles = await this.prisma.userRole.findMany({
              where: { roleId },
              include: { user: true },
            });
            const activeUserRoles = userRoles.filter((ur) => ur.user.status === 'ACTIVE');
            approvers.push(
              ...activeUserRoles.map((ur) => ({ id: ur.user.id, name: ur.user.name })),
            );
          }
        }
        break;

      default:
        console.log(`[getApproversByParticipantCode] 未知的参与人类型: ${participantConfig.type}`);
        break;
    }

    console.log(`[getApproversByParticipantCode] ${code} 找到审批人:`, approvers.length);
    return approvers;
  }

  /**
   * 管理员强制审批（强制通过所有剩余节点）
   */
  async forceApproval(dto: ForceApprovalDto, adminId: number, adminName: string) {
    console.log(`[forceApproval] 管理员 ${adminName} 强制审批实例 ${dto.instanceId}`);

    // 1. 获取工作流实例
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: dto.instanceId },
      include: {
        approvals: {
          orderBy: {
            createdAt: 'asc',
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

    // 2. 获取所有审批节点（按排序）
    const nodes = instance.definition.nodes
      .filter((n: any) => n.nodeType === 'approval')
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    // 3. 找到起始节点位置
    const startIndex = nodes.findIndex((n: any) => n.id === dto.nodeId);
    if (startIndex === -1) {
      throw new NotFoundException('起始节点不存在');
    }

    // 4. 获取从起始节点开始的所有剩余节点
    const remainingNodes = nodes.slice(startIndex);

    console.log(`[forceApproval] 剩余节点数量: ${remainingNodes.length}`);
    console.log(
      `[forceApproval] 剩余节点:`,
      remainingNodes.map((n: any) => n.nodeName),
    );

    // 5. 批量强制通过所有剩余节点
    let totalUpdated = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const node of remainingNodes) {
        // ���事务内重新查询该节点的所有待审批记录（确保获取最新数据）
        // Prisma 查询 null 值的正确方式
        const pendingApprovals = await tx.workflowApproval.findMany({
          where: {
            instanceId: dto.instanceId,
            nodeId: node.id,
            status: 'PENDING', // 使用状态字段来查找待审批记录
          },
        });

        console.log(
          `[forceApproval] 节点 ${node.nodeName} 待审批记录数: ${pendingApprovals.length}`,
        );

        if (pendingApprovals.length === 0) {
          // 如果该节点没有待审批记录，检查是否所有记录都已审批
          const allApprovals = await tx.workflowApproval.findMany({
            where: {
              instanceId: dto.instanceId,
              nodeId: node.id,
            },
          });

          console.log(`[forceApproval] 节点 ${node.nodeName} 总审批记录数: ${allApprovals.length}`);

          // 如果所有记录都已审批（status不是PENDING），跳过
          if (allApprovals.length > 0 && allApprovals.every((a) => a.status !== 'PENDING')) {
            console.log(`[forceApproval] 节点 ${node.nodeName} 所有记录已审批，跳过`);
            continue;
          }

          // 如果没有任何审批记录，创建一条强制通过的记录
          if (allApprovals.length === 0) {
            console.log(`[forceApproval] 节点 ${node.nodeName} 没有审批记录，创建强制通过记录`);
            await tx.workflowApproval.create({
              data: {
                instanceId: dto.instanceId,
                instanceNo: instance.instanceNo,
                nodeId: node.id,
                nodeCode: node.nodeCode || `NODE_${node.id}`,
                nodeName: node.nodeName,
                step: node.sortOrder?.toString() || '0',
                approverId: adminId,
                approverName: `${adminName}（强制通过）`,
                approvers: JSON.stringify([{ id: adminId, name: adminName }]),
                needAllApprove: false,
                action: 'APPROVED',
                comment: `[强制通过] ${adminName}: ${dto.comment}`,
                approvedAt: new Date(),
                status: 'APPROVED',
              },
            });
            totalUpdated++;
            continue;
          }
        }

        // 批量更新所有待审批记录
        for (const approval of pendingApprovals) {
          await tx.workflowApproval.update({
            where: { id: approval.id },
            data: {
              action: 'APPROVED',
              comment: `[强制通过] ${adminName}: ${dto.comment}`,
              approvedAt: new Date(),
              status: 'APPROVED',
              approverId: adminId,
              approverName: `${adminName}（强制通过）`,
            },
          });
          totalUpdated++;
        }

        console.log(`[forceApproval] 节点 ${node.nodeName} 强制通过完成`);
      }
    });

    console.log(`[forceApproval] 总共更新 ${totalUpdated} 条审批记录`);

    // 6. 完成流程
    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: InstanceStatus.COMPLETED,
        currentStep: null,
        finishedAt: new Date(),
        endTime: new Date(),
      },
    });

    // 7. 处理工时报工流程完成的业务逻辑
    await this.handleLaborHourReportCompleted(instance.id);

    return {
      success: true,
      message: `已强制通过 ${remainingNodes.length} 个节点，更新 ${totalUpdated} 条审批记录`,
    };
  }

  /**
   * 处理工时报工流程完成的业务逻辑
   * 将工时报工数据写入 WorkHourResult 表
   */
  private async handleLaborHourReportCompleted(instanceId: number) {
    console.log(`[handleLaborHourReportCompleted] 处理工时报工流程完成，instanceId: ${instanceId}`);

    try {
      // 1. 查询流程实例
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        console.log('[handleLaborHourReportCompleted] 流程实例不存在，跳过');
        return;
      }

      // 2. 检查是否为工时报工流程
      if (instance.category !== 'LABOR_HOUR_REPORT') {
        console.log('[handleLaborHourReportCompleted] 非工时报工流程，跳过');
        return;
      }

      // 3. 查询关联的工时报工申请记录
      const laborHourReports = await this.prisma.laborHourReportRequest.findMany({
        where: { instanceId },
      });

      if (laborHourReports.length === 0) {
        console.log('[handleLaborHourReportCompleted] 未找到关联的工时报工申请记录，跳过');
        return;
      }

      console.log(
        `[handleLaborHourReportCompleted] 找到 ${laborHourReports.length} 条工时报工申请记录`,
      );

      // 收集所有创建的 WorkHourResult ID，用于异步金额计算
      const allCreatedWorkHourResultIds: number[] = [];

      // 4. 处理每条工时报工申请记录
      await this.prisma.$transaction(async (tx) => {
        for (const report of laborHourReports) {
          // 更新申请状态为已批准
          await tx.laborHourReportRequest.update({
            where: { id: report.id },
            data: {
              status: 'APPROVED',
              approverId: instance.initiatorId,
              approverName: instance.initiatorName,
              approvedAt: new Date(),
            },
          });

          console.log(
            `[handleLaborHourReportCompleted] 申请 ${report.requestNo} 状态已更新为 APPROVED`,
          );

          // 查询报工员工列表
          const reportEmployees = await tx.laborHourReportEmployee.findMany({
            where: { requestId: report.id },
          });

          console.log(
            `[handleLaborHourReportCompleted] 申请 ${report.requestNo} 包含 ${reportEmployees.length} 个员工`,
          );

          // 根据报工模式处理数据
          if (report.reportMode === 'personal') {
            // 个人报工：只写入主员工数据
            const workHourResultId = await this.createWorkHourResult(
              tx,
              report,
              report.employeeId,
              report.employeeNo,
              report.employeeName,
            );
            if (workHourResultId) {
              allCreatedWorkHourResultIds.push(workHourResultId);
            }
          } else if (report.reportMode === 'team') {
            // 团队报工：写入所有团队成员数据（包含员工独立工时明细）
            for (const employee of reportEmployees) {
              const workHourResultId = await this.createWorkHourResult(
                tx,
                report,
                employee.employeeId,
                employee.employeeNo,
                employee.employeeName,
                {
                  startTime: employee.startTime, // ✅ 传递员工独立开始时间
                  endTime: employee.endTime, // ✅ 传递员工独立结束时间
                  value: employee.value, // ✅ 传递员工独立工时数量
                  description: employee.description, // ✅ 传递员工独立描述
                },
              );
              if (workHourResultId) {
                allCreatedWorkHourResultIds.push(workHourResultId);
              }
            }
          }

          // ✅ WorkHourResult ID 已收集到 allCreatedWorkHourResultIds 数组
          // 事务提交后将进行异步金额计算
        }
      });

      console.log('[handleLaborHourReportCompleted] 工时报表数据处理完成');

      // ✅ 事务提交成功后，异步计算所有创建的 WorkHourResult 的金额
      if (allCreatedWorkHourResultIds && allCreatedWorkHourResultIds.length > 0) {
        console.log(`[异步金额计算] 准备为 ${allCreatedWorkHourResultIds.length} 个 WorkHourResult 计算金额`);

        // 异步计算金额（不阻塞主流程）
        setImmediate(async () => {
          for (const workHourResultId of allCreatedWorkHourResultIds) {
            await this.calculateWorkHourResultAmount(workHourResultId);
          }
          console.log('[异步金额计算] 所有 WorkHourResult 金额计算完成');
        });
      }
    } catch (error) {
      console.error('[handleLaborHourReportCompleted] 处理工时报工数据失败:', error);
      console.error('[handleLaborHourReportCompleted] 错误详情:', error?.message || error);
      console.error('[handleLaborHourReportCompleted] 错误堆栈:', error?.stack || 'No stack trace');

      // ✅ 添加：记录到系统日志表，方便排查问题
      try {
        // await this.prisma.systemLog.create({
        //   data: {
        //     action: 'LABOR_HOUR_REPORT_PUSH_FAILED',
        //     entityType: 'WORKFLOW_INSTANCE',
        //     entityNo: instanceId.toString(),
        //     status: 'FAILED',
        //     message: `工时报表数据推送失败: ${error?.message || 'Unknown error'}`,
        //     details: JSON.stringify({
        //       instanceId,
        //       error: error?.message || error,
        //       stack: error?.stack || 'No stack trace',
        //       timestamp: new Date().toISOString(),
        //     }),
        //     createdAt: new Date(),
        //   },
        // });
        console.log('[handleLaborHourReportCompleted] 工时报表数据推送失败（已跳过系统日志记录）');
      } catch (logError) {
        console.error('[handleLaborHourReportCompleted] 记录失败信息到系统日志表时出错:', logError);
      }

      // 不抛出异常，避免影响流程完成状态
    }
  }

  /**
   * 创建工时结果记录
   */
  private async createWorkHourResult(
    tx: any,
    report: any,
    employeeId: number | null,
    employeeNo: string | null,
    employeeName: string | null,
    employeeDetailData?: {
      startTime?: string;
      endTime?: string;
      value?: number;
      description?: string;
    },
  ) {
    console.log(`[createWorkHourResult] 开始创建工时结果，hourType: ${report.hourType}`);
    console.log(`[createWorkHourResult] 员工独立数据:`, employeeDetailData);

    // ✅ 根据 hourType 查询 DefinitionAttendanceCode
    const definitionAttendanceCode = await tx.definitionAttendanceCode.findFirst({
      where: {
        code: report.hourType,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        calcAttendanceCode: true,
      },
    });

    if (!definitionAttendanceCode) {
      console.error(`[createWorkHourResult] 未找到工时类型 ${report.hourType} 对应的定义出勤代码`);
      throw new Error(`未找到工时类型 ${report.hourType} 对应的定义出勤代码`);
    }

    console.log(`[createWorkHourResult] 查询到定义出勤代码:`, {
      id: definitionAttendanceCode.id,
      code: definitionAttendanceCode.code,
      name: definitionAttendanceCode.name,
      calcAttendanceCode: definitionAttendanceCode.calcAttendanceCode,
    });

    // ✅ 从账户表查询正确的代码路径
    const account = await tx.laborAccount.findUnique({
      where: { id: report.accountId },
      select: {
        id: true,
        code: true,
        name: true,
        path: true, // ✅ 代码路径
        namePath: true, // ✅ 名称路径
      },
    });

    if (!account) {
      console.error(`[createWorkHourResult] 账户 ID ${report.accountId} 不存在`);
      throw new Error(`账户 ID ${report.accountId} 不存在`);
    }

    console.log(`[createWorkHourResult] 查询到的账户信息:`, {
      accountId: account.id,
      code: account.code,
      name: account.name,
      path: account.path,
      namePath: account.namePath,
    });

    // 🔧 优先使用员工的独立数据，否则使用主申请记录的数据
    const effectiveStartTime = employeeDetailData?.startTime || report.startTime;
    const effectiveEndTime = employeeDetailData?.endTime || report.endTime;
    const effectiveValue = employeeDetailData?.value ?? report.value;
    const effectiveDescription = employeeDetailData?.description ?? report.description;

    console.log('[createWorkHourResult] 使用数据:');
    console.log('  员工独立数据存在?', !!employeeDetailData);
    console.log(
      '  开始时间:',
      effectiveStartTime,
      '(来源:',
      employeeDetailData?.startTime ? '员工独立' : '主记录',
      ')',
    );
    console.log(
      '  结束时间:',
      effectiveEndTime,
      '(来源:',
      employeeDetailData?.endTime ? '员工独立' : '主记录',
      ')',
    );
    console.log(
      '  工时数量:',
      effectiveValue,
      '(来源:',
      employeeDetailData?.value !== undefined ? '员工独立' : '主记录',
      ')',
    );
    console.log('  描述:', effectiveDescription);

    // 构建工作时间（使用本地时间）
    const workDate = new Date(report.reportDate);

    // ✅ 检查 startTime 和 endTime 是否存在
    let startTime = null;
    let endTime = null;
    let localStartTimeStr = null;
    let localEndTimeStr = null;

    if (effectiveStartTime && effectiveEndTime) {
      const [startHour, startMinute] = effectiveStartTime.split(':');
      const [endHour, endMinute] = effectiveEndTime.split(':');

      // 创建本地时间的Date对象（会按照本地时区解释）
      startTime = new Date(workDate);
      startTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      endTime = new Date(workDate);
      endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      // 保存原始的本地时间字符串，方便后续使用
      localStartTimeStr = `${new Date(report.reportDate).toISOString().substring(0, 10)} ${effectiveStartTime}`;
      localEndTimeStr = `${new Date(report.reportDate).toISOString().substring(0, 10)} ${effectiveEndTime}`;
    }

    // ✅ 暂时跳过金额计算，避免在事务中调用外部服务导致问题
    const amount = 0;
    const calcAttendanceCode =
      definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code;

    // 写入工时结果表
    const result = await tx.workHourResult.create({
      data: {
        employeeNo: employeeNo || '',
        employeeId: employeeId,
        workDate: workDate,
        calcDate: workDate,
        definitionAttendanceCode: {
          connect: {
            id: definitionAttendanceCode.id
          }
        },
        definitionAttendanceCodeStr: definitionAttendanceCode.code, // 存储代码字符串用于快速查询
        calcAttendanceCode: calcAttendanceCode, // 计算出勤代码
        attendanceCode: report.hourType, // 保留旧字段以兼容
        attendanceCodeName: report.hourTypeName, // 保留旧字段以兼容
        workHours: effectiveValue, // 使用员工独立工时数据
        // 注意：描述信息存储在 customFields 中
        amount: Math.round(amount * 100) / 100, // 计算出的金额
        calculateAmount: Math.round(amount * 100) / 100, // 计算出的金额
        accountId: report.accountId,
        accountName: account.namePath || account.name, // 使用名称路径或名称
        accountPath: account.path, // 使用代码路径
        sourceType: 'LABOR_HOUR_REPORT', // 标记为工时报工填报数据
        sourceId: report.id,
        source: `工时报表申请: ${report.title}`,
        startTime,
        endTime,
        customFields: JSON.stringify({
          isManualInput: true, // 标记为手工填报数据
          requestNo: report.requestNo, // 申请单号
          reportMode: report.reportMode, // 报工模式
          description: effectiveDescription || report.description, // 备注说明
          localStartTime: localStartTimeStr, // 保存本地时间字符串
          localEndTime: localEndTimeStr, // 保存本地时间字符串
        }),
        status: 'PENDING',
      },
    });

    console.log(
      `[createWorkHourResult] 已创建工时结果: 员工=${employeeName}, 工时=${effectiveValue}小时, 类型=${report.hourTypeName}`,
    );

    // 返回创建的记录ID，用于后续异步金额计算
    return result.id;
  }

  /**
   * 异步计算并更新 WorkHourResult 的金额
   */
  private async calculateWorkHourResultAmount(workHourResultId: number) {
    try {
      console.log(`[异步金额计算] 开始计算 WorkHourResult ID: ${workHourResultId}`);

      // 1. 获取 WorkHourResult 记录
      const workHourResult = await this.prisma.workHourResult.findUnique({
        where: { id: workHourResultId },
      });

      if (!workHourResult) {
        console.log(`[异步金额计算] WorkHourResult ID ${workHourResultId} 不存在`);
        return;
      }

      // 2. 调用金额计算服务
      const calculatedAmount = await this.amountCalculateService.calculateAmountByNo({
        employeeNo: workHourResult.employeeNo,
        workHours: workHourResult.workHours,
        attendanceCode: workHourResult.calcAttendanceCode || workHourResult.attendanceCode || '',
        accountPath: workHourResult.accountPath || '',
        calcDate: workHourResult.workDate,
      });

      console.log(
        `[异步金额计算] 员工=${workHourResult.employeeNo}, 工时=${workHourResult.workHours}, 计算金额=${calculatedAmount}`,
      );

      // 3. 更新 WorkHourResult 的金额字段
      await this.prisma.workHourResult.update({
        where: { id: workHourResultId },
        data: {
          amount: calculatedAmount,
          calculateAmount: calculatedAmount,
        },
      });

      console.log(`[异步金额计算] ✅ 已更新 WorkHourResult ID: ${workHourResultId}, 金额=${calculatedAmount}`);
    } catch (error) {
      console.error(`[异步金额计算] ❌ 计算 WorkHourResult ID ${workHourResultId} 失败:`, error.message);
      // 不抛出异常，避免影响其他记录的计算
    }
  }
}

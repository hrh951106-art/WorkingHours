import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
} from './dto/workflow-definition.dto';

@Injectable()
export class WorkflowDefinitionService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    params: { page?: number; pageSize?: number; category?: string; status?: string } = {},
  ) {
    const { page = 1, pageSize = 10, category, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async findOne(id: number) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { sortOrder: 'asc' },
        },
        edges: true,
      },
    });

    if (!definition || definition.deletedAt) {
      throw new NotFoundException('工作流定义不存在');
    }

    // 直接返回定义，flowConfig 中存储的是前端的原始格式
    return definition;
  }

  async create(createDto: CreateWorkflowDefinitionDto) {
    console.log('[WORKFLOW CREATE] Starting creation for code:', createDto.code);
    // 使用事务创建流程定义和节点、边
    const result = await this.prisma.$transaction(async (tx) => {
      // 获取该 code 的最大版本号（包括已删除的记录）
      const maxVersion = await tx.workflowDefinition.findFirst({
        where: {
          code: createDto.code,
        },
        orderBy: {
          version: 'desc',
        },
        select: {
          version: true,
        },
      });

      const nextVersion = (maxVersion?.version || 0) + 1;

      const flowConfig = JSON.parse(createDto.flowConfig);

      // 创建流程定义
      const definition = await tx.workflowDefinition.create({
        data: {
          code: createDto.code,
          name: createDto.name,
          description: createDto.description,
          category: createDto.category || 'GENERAL',
          version: nextVersion,
          versionString: nextVersion.toString(),
          status: createDto.status || 'DRAFT',
          formConfig: createDto.formConfig || '{}',
          flowConfig: createDto.flowConfig,
          createdById: createDto.createdById,
          createdByName: createDto.createdByName,
        },
      });

      // 创建节点
      if (flowConfig.nodes && Array.isArray(flowConfig.nodes)) {
        for (const node of flowConfig.nodes) {
          const nodeData: any = {
            workflowId: definition.id,
            nodeCode: `${definition.id}_${node.id}`, // 使用 workflowId 前缀确保唯一性
            nodeType: node.type,
            nodeName: node.data.label,
            sortOrder: 0,
          };

          // 审批节点
          if (node.type === 'approval') {
            nodeData.needAllApprove = node.data.needAllApprove ?? false;
            nodeData.approverStrategy = JSON.stringify(node.data.approverStrategy || []);
          }

          // 条件节点
          if (node.type === 'condition') {
            nodeData.conditionConfig = JSON.stringify(node.data.conditions || []);
          }

          // 抄送节点
          if (node.type === 'cc') {
            nodeData.ccStrategy = JSON.stringify(node.data.ccStrategy || []);
          }

          await tx.workflowNode.create({ data: nodeData });
        }
      }

      // 创建边（连线）
      if (flowConfig.edges && Array.isArray(flowConfig.edges)) {
        for (const edge of flowConfig.edges) {
          // 查找源节点和目标节点（nodeCode 格式为 ${workflowId}_${nodeId}）
          const sourceNode = await tx.workflowNode.findFirst({
            where: {
              workflowId: definition.id,
              nodeCode: `${definition.id}_${edge.source}`,
            },
          });

          const targetNode = await tx.workflowNode.findFirst({
            where: {
              workflowId: definition.id,
              nodeCode: `${definition.id}_${edge.target}`,
            },
          });

          if (!sourceNode || !targetNode) {
            throw new BadRequestException(
              `边配置错误: 找不到节点 ${edge.source} 或 ${edge.target}`,
            );
          }

          await tx.workflowEdge.create({
            data: {
              workflowId: definition.id,
              sourceNodeId: sourceNode.id,
              targetNodeId: targetNode.id,
              condition: edge.data?.conditionType || 'default',
              label: edge.label || '',
            },
          });
        }
      }

      return definition.id;
    });

    // 事务完成后查询完整数据返回
    return this.findOne(result);
  }

  async update(id: number, updateDto: UpdateWorkflowDefinitionDto) {
    // 检查流程定义是否存在
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('工作流定义不存在');
    }

    // 已发布的流程不允许直接更新
    if (existing.status === 'PUBLISHED') {
      throw new BadRequestException('已发布的流程不允许直接更新，请创建新版本');
    }

    // 准备更新数据
    const updateData: any = {};

    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description;
    }
    if (updateDto.formConfig !== undefined) {
      updateData.formConfig = updateDto.formConfig;
    }
    if (updateDto.flowConfig !== undefined) {
      updateData.flowConfig = updateDto.flowConfig;
    }
    if (updateDto.updatedById !== undefined) {
      updateData.updatedById = updateDto.updatedById;
    }
    if (updateDto.updatedByName !== undefined) {
      updateData.updatedByName = updateDto.updatedByName;
    }

    // 如果更新了流程配置，需要重新创建节点和边
    if (updateDto.flowConfig) {
      const result = await this.prisma.$transaction(async (tx) => {
        // 更新流程定义
        await tx.workflowDefinition.update({
          where: { id },
          data: updateData,
        });

        // 删除旧的节点和边
        await tx.workflowNode.deleteMany({ where: { workflowId: id } });
        await tx.workflowEdge.deleteMany({ where: { workflowId: id } });

        // 创建新的节点和边
        const flowConfig = JSON.parse(updateDto.flowConfig);

        if (flowConfig.nodes && Array.isArray(flowConfig.nodes)) {
          for (const node of flowConfig.nodes) {
            const nodeData: any = {
              workflowId: id,
              nodeCode: `${id}_${node.id}`, // 使用 workflowId 前缀确保唯一性
              nodeType: node.type,
              nodeName: node.data.label,
              sortOrder: 0,
            };

            if (node.type === 'approval') {
              nodeData.needAllApprove = node.data.needAllApprove ?? false;
              nodeData.approverStrategy = JSON.stringify(node.data.approverStrategy || []);
            }

            if (node.type === 'condition') {
              nodeData.conditionConfig = JSON.stringify(node.data.conditions || []);
            }

            if (node.type === 'cc') {
              nodeData.ccStrategy = JSON.stringify(node.data.ccStrategy || []);
            }

            await tx.workflowNode.create({ data: nodeData });
          }
        }

        if (flowConfig.edges && Array.isArray(flowConfig.edges)) {
          for (const edge of flowConfig.edges) {
            // 查找源节点和目标节点（nodeCode 格式为 ${workflowId}_${nodeId}）
            const sourceNode = await tx.workflowNode.findFirst({
              where: {
                workflowId: id,
                nodeCode: `${id}_${edge.source}`,
              },
            });

            const targetNode = await tx.workflowNode.findFirst({
              where: {
                workflowId: id,
                nodeCode: `${id}_${edge.target}`,
              },
            });

            if (!sourceNode || !targetNode) {
              throw new BadRequestException(
                `边配置错误: 找不到节点 ${edge.source} 或 ${edge.target}`,
              );
            }

            await tx.workflowEdge.create({
              data: {
                workflowId: id,
                sourceNodeId: sourceNode.id,
                targetNodeId: targetNode.id,
                condition: edge.data?.conditionType || 'default',
                label: edge.label || '',
              },
            });
          }
        }

        return id;
      });

      // 事务完成后查询完整数据返回
      return this.findOne(result);
    } else {
      // 只更新基本信息
      await this.prisma.workflowDefinition.update({
        where: { id },
        data: updateData,
      });

      return this.findOne(id);
    }
  }

  async createNewVersion(id: number, userId: number, userName: string) {
    // 查找原版本
    const original = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!original || original.deletedAt) {
      throw new NotFoundException('工作流定义不存在');
    }

    // 获取该 code 的最大版本号（包括已删除的记录）
    const maxVersion = await this.prisma.workflowDefinition.findFirst({
      where: {
        code: original.code,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });

    const nextVersion = (maxVersion?.version || 0) + 1;

    // 使用事务创建新版本
    const result = await this.prisma.$transaction(async (tx) => {
      const flowConfig = JSON.parse(original.flowConfig);

      // 创建新版本的流程定义
      const newDefinition = await tx.workflowDefinition.create({
        data: {
          code: original.code,
          name: original.name,
          description: original.description,
          category: original.category,
          version: nextVersion,
          versionString: nextVersion.toString(),
          status: 'DRAFT',
          formConfig: original.formConfig,
          flowConfig: original.flowConfig,
          isSystem: original.isSystem,
          createdById: userId,
          createdByName: userName,
        },
      });

      // 复制节点
      const nodeMapping = new Map<number, number>(); // 旧节点ID -> 新节点ID
      for (const node of original.nodes) {
        const newNodeData: any = {
          workflowId: newDefinition.id,
          nodeCode: `${newDefinition.id}_${node.nodeCode.split('_')[1]}`, // 保留原始节点ID部分
          nodeType: node.nodeType,
          nodeName: node.nodeName,
          sortOrder: node.sortOrder,
        };

        if (node.nodeType === 'approval') {
          newNodeData.needAllApprove = node.needAllApprove;
          newNodeData.approverStrategy = node.approverStrategy;
        }

        if (node.nodeType === 'condition') {
          newNodeData.conditionConfig = node.conditionConfig;
        }

        if (node.nodeType === 'cc') {
          newNodeData.ccStrategy = node.ccStrategy;
        }

        const newNode = await tx.workflowNode.create({ data: newNodeData });
        nodeMapping.set(node.id, newNode.id);
      }

      // 复制边
      for (const edge of original.edges) {
        const newSourceNodeId = nodeMapping.get(edge.sourceNodeId);
        const newTargetNodeId = nodeMapping.get(edge.targetNodeId);

        if (!newSourceNodeId || !newTargetNodeId) {
          throw new BadRequestException('复制边时找不到对应的节点');
        }

        await tx.workflowEdge.create({
          data: {
            workflowId: newDefinition.id,
            sourceNodeId: newSourceNodeId,
            targetNodeId: newTargetNodeId,
            condition: edge.condition,
            label: edge.label,
          },
        });
      }

      return newDefinition.id;
    });

    return this.findOne(result);
  }

  async publish(id: number) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });

    if (!definition || definition.deletedAt) {
      throw new NotFoundException('工作流定义不存在');
    }

    if (definition.status === 'PUBLISHED') {
      throw new BadRequestException('流程已经是发布状态');
    }

    // 使用事务：将同 code 的旧发布版本归档，发布新版本
    await this.prisma.$transaction(async (tx) => {
      // 将同一个 code 的其他 PUBLISHED 版本改为 ARCHIVED
      await tx.workflowDefinition.updateMany({
        where: {
          code: definition.code,
          status: 'PUBLISHED',
          id: { not: id }, // 排除当前要发布的版本
          deletedAt: null,
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      // 发布当前版本
      await tx.workflowDefinition.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });

    if (!definition || definition.deletedAt) {
      throw new NotFoundException('工作流定义不存在');
    }

    // 只允许删除草稿状态的流程
    if (definition.status !== 'DRAFT') {
      throw new BadRequestException('只能删除草稿状态的流程，已发布或已归档的流程不允许删除');
    }

    // 软删除
    await this.prisma.workflowDefinition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '删除成功' };
  }
}

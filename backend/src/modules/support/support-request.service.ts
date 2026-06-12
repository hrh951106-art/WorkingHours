import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupportRequestDto, UpdateSupportRequestDto } from './dto/support-request.dto';

@Injectable()
export class SupportRequestService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { page?: number; pageSize?: number; status?: string } = {}) {
    const { page = 1, pageSize = 10, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.supportRequest.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          instance: {
            include: {
              approvals: true,
            },
          },
        },
      }),
      this.prisma.supportRequest.count({ where }),
    ]);

    // 格式化返回数据以适配前端
    const formattedItems = items.map((item) => ({
      ...item,
      instanceNo: item.requestNo, // 映射 requestNo 到 instanceNo
      // 申请人：表单中选择的员工（支援人员）
      applicantName: item.supportEmployeeName,
      applicantId: item.supportEmployeeId,
      // 发起人：提交表单的人
      initiatorName: item.requesterName,
      initiatorId: item.requesterId,
    }));

    return {
      items: formattedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async findMyRequests(
    params: { page?: number; pageSize?: number; status?: string } = {},
    userId: number,
  ) {
    const { page = 1, pageSize = 10, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
      requesterId: userId,
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.supportRequest.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          instance: {
            include: {
              approvals: true,
            },
          },
        },
      }),
      this.prisma.supportRequest.count({ where }),
    ]);

    // 格式化返回数据以适配前端
    const formattedItems = items.map((item) => ({
      ...item,
      instanceNo: item.requestNo, // 映射 requestNo 到 instanceNo
      // 申请人：表单中选择的员工（支援人员）
      applicantName: item.supportEmployeeName,
      applicantId: item.supportEmployeeId,
      // 发起人：提交表单的人
      initiatorName: item.requesterName,
      initiatorId: item.requesterId,
    }));

    return {
      items: formattedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async findPendingApprovals(params: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
      status: 'PENDING',
    };

    const [items, total] = await Promise.all([
      this.prisma.supportRequest.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          instance: {
            include: {
              approvals: true,
            },
          },
        },
      }),
      this.prisma.supportRequest.count({ where }),
    ]);

    // 格式化返回数据以适配前端
    const formattedItems = items.map((item) => ({
      ...item,
      instanceNo: item.requestNo, // 映射 requestNo 到 instanceNo
      // 申请人：表单中选择的员工（支援人员）
      applicantName: item.supportEmployeeName,
      applicantId: item.supportEmployeeId,
      // 发起人：提交表单的人
      initiatorName: item.requesterName,
      initiatorId: item.requesterId,
    }));

    return {
      items: formattedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async findOne(id: number) {
    const request = await this.prisma.supportRequest.findUnique({
      where: { id },
      include: {
        instance: {
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
        },
      },
    });

    if (!request || request.deletedAt) {
      throw new NotFoundException('支援申请不存在');
    }

    // 解析审批节点的 approverStrategy
    const nodesWithApprovers =
      request.instance?.definition?.nodes?.map((node) => ({
        ...node,
        approverStrategy: node.approverStrategy ? JSON.parse(node.approverStrategy) : [],
      })) || [];

    // 格式化返回数据以适配前端
    return {
      ...request,
      instanceNo: request.requestNo, // 映射 requestNo 到 instanceNo
      // 申请人：表单中选择的员工（支援人员）
      applicantName: request.supportEmployeeName,
      applicantId: request.supportEmployeeId,
      // 发起人：提交表单的人
      initiatorName: request.requesterName,
      initiatorId: request.requesterId,
      // 包含解析后的节点信息
      instance: request.instance
        ? {
            ...request.instance,
            definition: request.instance.definition
              ? {
                  ...request.instance.definition,
                  nodes: nodesWithApprovers,
                }
              : null,
          }
        : null,
    };
  }

  async create(createDto: CreateSupportRequestDto, userId: number, userName: string) {
    // 生成申请单号
    const requestNo = await this.generateRequestNo();

    const request = await this.prisma.supportRequest.create({
      data: {
        requestNo,
        type: 'SUPPORT', // 车间支援类型
        title: `支援申请 - ${createDto.supportAccountName}`,
        description: createDto.description || '',
        priority: 'MEDIUM',
        status: 'PENDING',
        requesterId: userId,
        requesterName: userName,
        // 支援申请特定字段
        supportMode: createDto.supportMode,
        supportEmployeeId: createDto.supportEmployeeId,
        supportEmployeeName: createDto.supportEmployeeName,
        supportEmployeeNo: createDto.supportEmployeeNo,
        supportAccountId: createDto.supportAccountId,
        supportAccountName: createDto.supportAccountName,
        calculatedHours: createDto.calculatedHours,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      },
    });

    return request;
  }

  async update(id: number, updateDto: UpdateSupportRequestDto) {
    const existing = await this.prisma.supportRequest.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('支援申请不存在');
    }

    const updateData: any = {};

    if (updateDto.supportMode !== undefined) updateData.supportMode = updateDto.supportMode;
    if (updateDto.supportEmployeeId !== undefined)
      updateData.supportEmployeeId = updateDto.supportEmployeeId;
    if (updateDto.supportEmployeeName !== undefined)
      updateData.supportEmployeeName = updateDto.supportEmployeeName;
    if (updateDto.supportEmployeeNo !== undefined)
      updateData.supportEmployeeNo = updateDto.supportEmployeeNo;
    if (updateDto.supportAccountId !== undefined)
      updateData.supportAccountId = updateDto.supportAccountId;
    if (updateDto.supportAccountName !== undefined)
      updateData.supportAccountName = updateDto.supportAccountName;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.calculatedHours !== undefined)
      updateData.calculatedHours = updateDto.calculatedHours;
    if (updateDto.startDate !== undefined) updateData.startDate = updateDto.startDate;
    if (updateDto.endDate !== undefined) updateData.endDate = updateDto.endDate;
    if (updateDto.startTime !== undefined) updateData.startTime = updateDto.startTime;
    if (updateDto.endTime !== undefined) updateData.endTime = updateDto.endTime;
    if (updateDto.status !== undefined) updateData.status = updateDto.status;

    const request = await this.prisma.supportRequest.update({
      where: { id },
      data: updateData,
    });

    return request;
  }

  async remove(id: number) {
    const existing = await this.prisma.supportRequest.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('支援申请不存在');
    }

    // 软删除
    await this.prisma.supportRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '删除成功' };
  }

  private async generateRequestNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // 查找今天的最大序号
    const prefix = `SUP${year}${month}${day}`;
    const lastRequest = await this.prisma.supportRequest.findFirst({
      where: {
        requestNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        requestNo: 'desc',
      },
      select: {
        requestNo: true,
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastSequence = parseInt(lastRequest.requestNo.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }
}

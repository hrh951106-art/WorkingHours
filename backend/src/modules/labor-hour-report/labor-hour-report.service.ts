import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLaborHourReportRequestDto } from './dto/create-request.dto';
import { ApproveLaborHourReportRequestDto } from './dto/approve-request.dto';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { ApiResponse } from '../../common/dto/response.dto';

@Injectable()
export class LaborHourReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowInstanceService: WorkflowInstanceService,
  ) {}

  /**
   * 生成请求单号
   * 格式: LABOR + yyyyMMddHHmmss + 4位随机数
   */
  private generateRequestNo(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LABOR${timestamp}${random}`;
  }

  /**
   * 创建工时报表申请
   */
  async createRequest(dto: CreateLaborHourReportRequestDto) {
    try {
      const requestNo = this.generateRequestNo();

      // 准备报工人员数据
      let employeeId: number | undefined;
      let employeeNo: string | undefined;
      let employeeName: string | undefined;
      const employeesData: any[] = [];

      if (dto.reportMode === 'personal') {
        // 个人报工模式
        employeeId = dto.employeeId;
        employeeNo = dto.employeeNo;
        employeeName = dto.employeeName;
      } else if (dto.reportMode === 'team' && dto.employees && dto.employees.length > 0) {
        // 团队报工模式：使用第一个员工作为主员工
        const firstEmployee = dto.employees[0];
        employeeId = firstEmployee.employeeId;
        employeeNo = firstEmployee.employeeNo;
        employeeName = firstEmployee.employeeName;

        // 准备所有员工数据用于关联表
        dto.employees.forEach(emp => {
          employeesData.push({
            employeeId: emp.employeeId,
            employeeNo: emp.employeeNo,
            employeeName: emp.employeeName,
          });
        });
      }

      // 获取工作流定义（选择最新版本的已发布定义）
      const workflow = await this.prisma.workflowDefinition.findFirst({
        where: {
          category: 'LABOR_HOUR_REPORT',
          status: 'PUBLISHED',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc', // 按创建时间降序，选择最新版本
        },
      });

      if (!workflow) {
        throw new BadRequestException('未找到已发布的工时报工工作流定义');
      }

      // 获取发起人的组织信息
      const requester = await this.prisma.employee.findUnique({
        where: { id: dto.requesterId },
        include: { org: true },
      });

      // 启动工作流实例
      const workflowInstance = await this.workflowInstanceService.createInstance({
        workflowId: workflow.id,
        title: dto.title,
        category: 'LABOR_HOUR_REPORT',
        initiatorId: dto.requesterId,
        initiatorName: dto.requesterName,
        initiatorOrgId: requester?.orgId || 1,
        initiatorOrgName: requester?.org?.name || '默认组织',
        businessKey: requestNo,
        data: JSON.stringify({
          requestNo,
          reportMode: dto.reportMode,
          hourType: dto.hourType,
          value: dto.value,
        }),
      });

      const instanceId = workflowInstance.data?.id;

      const request = await this.prisma.laborHourReportRequest.create({
        data: {
          requestNo,
          workflowCode: 'LABOR_HOUR_REPORT',
          title: dto.title,
          reportDate: new Date(dto.reportDate),
          reportMode: dto.reportMode,
          employeeId,
          employeeNo,
          employeeName,
          hourType: dto.hourType,
          hourTypeName: dto.hourTypeName,
          startTime: dto.startTime,
          endTime: dto.endTime,
          value: dto.value,
          unit: dto.unit || '小时',
          description: dto.description,
          accountId: dto.accountId,
          accountCode: dto.accountCode,
          accountName: dto.accountName,
          status: 'PENDING',
          requesterId: dto.requesterId,
          requesterName: dto.requesterName,
          instanceId,
          // 团队报工时创建员工关联记录
          ...(dto.reportMode === 'team' && employeesData.length > 0
            ? { employees: { create: employeesData } }
            : {}
          ),
        },
        // 如果是团队报工，包含员工数据
        ...(dto.reportMode === 'team' ? {
          include: { employees: true }
        } : {})
      });

      return ApiResponse.ok(request, '工时报表申请创建成功');
    } catch (error: any) {
      console.error('创建工时报工申请失败:', error);
      throw new BadRequestException(error.message || '创建工时报工申请失败');
    }
  }

  /**
   * 查询工时报表申请列表
   */
  async getRequests(params: {
    status?: string;
    employeeNo?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, employeeNo, startDate, endDate, page = 1, pageSize = 10 } = params;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (employeeNo) {
      where.employeeNo = employeeNo;
    }

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) {
        where.reportDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.reportDate.lte = new Date(endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.laborHourReportRequest.count({ where }),
      this.prisma.laborHourReportRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { employees: true }
          }
        }
      }),
    ]);

    return ApiResponse.ok({
      total,
      items,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  /**
   * 获取申请详情
   */
  async getRequestDetail(id: number) {
    const request = await this.prisma.laborHourReportRequest.findUnique({
      where: { id },
      include: {
        employees: true,
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

    if (!request) {
      throw new NotFoundException('申请记录不存在');
    }

    // 解析审批节点的 approverStrategy
    const nodesWithApprovers = request.instance?.definition?.nodes?.map(node => ({
      ...node,
      approverStrategy: node.approverStrategy ? JSON.parse(node.approverStrategy) : [],
    })) || [];

    return ApiResponse.ok({
      ...request,
      instance: request.instance ? {
        ...request.instance,
        definition: request.instance.definition ? {
          ...request.instance.definition,
          nodes: nodesWithApprovers,
        } : null,
      } : null,
    });
  }

  /**
   * 获取申请的员工列表
   */
  async getRequestEmployees(id: number) {
    const employees = await this.prisma.laborHourReportEmployee.findMany({
      where: { requestId: id },
    });

    return ApiResponse.ok(employees);
  }

  /**
   * 审批通过 - 将数据同步到工时结果表
   */
  async approveRequest(id: number, dto: ApproveLaborHourReportRequestDto) {
    const request = await this.prisma.laborHourReportRequest.findUnique({
      where: { id },
      include: {
        employees: true, // ✅ 包含团队报工的员工列表
      },
    });

    if (!request) {
      throw new NotFoundException('申请记录不存在');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理');
    }

    // ✅ 根据 hourType 查询 DefinitionAttendanceCode
    console.log('=== 审批工时报工 ===');
    console.log('申请ID:', id);
    console.log('hourType:', request.hourType);
    console.log('hourTypeName:', request.hourTypeName);

    const definitionAttendanceCode = await this.prisma.definitionAttendanceCode.findFirst({
      where: {
        code: request.hourType,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        calcAttendanceCode: true,
      },
    });

    console.log('查询到的定义出勤代码:', definitionAttendanceCode);

    if (!definitionAttendanceCode) {
      console.error('未找到定义出勤代码，hourType:', request.hourType);
      throw new BadRequestException(`未找到工时类型 ${request.hourType} 对应的定义出勤代码`);
    }

    // ✅ 转换时间字符串 (HH:mm) 为完整的 DateTime 对象
    const parseTime = (timeStr: string, date: Date) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const result = new Date(date);
      result.setHours(hours, minutes, 0, 0);
      return result;
    };

    const startTime = parseTime(request.startTime, request.reportDate);
    const endTime = parseTime(request.endTime, request.reportDate);

    // 使用事务更新申请状态并同步到工时结果表
    await this.prisma.$transaction(async (tx) => {
      // 1. 更新申请状态
      await tx.laborHourReportRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: dto.approverId,
          approverName: dto.approverName,
          approvedAt: new Date(),
          approvalComment: dto.approvalComment,
        },
      });

      // 2. 确定要创建工时结果的员工列表
      let employeesToCreate: Array<{ employeeId: number; employeeNo: string; employeeName: string }> = [];

      if (request.reportMode === 'team' && request.employees && request.employees.length > 0) {
        // ✅ 团队报工模式：为每个员工创建记录
        employeesToCreate = request.employees.map(emp => ({
          employeeId: emp.employeeId,
          employeeNo: emp.employeeNo,
          employeeName: emp.employeeName,
        }));
      } else {
        // ✅ 个人报工模式：使用主员工信息
        employeesToCreate = [{
          employeeId: request.employeeId!,
          employeeNo: request.employeeNo!,
          employeeName: request.employeeName!,
        }];
      }

      // 3. 为每个员工创建工时结果记录
      for (const employee of employeesToCreate) {
        console.log('创建工时结果记录，员工:', employee.employeeNo);
        console.log('definitionAttendanceCodeId:', definitionAttendanceCode.id);
        console.log('definitionAttendanceCodeStr:', definitionAttendanceCode.name);
        console.log('calcAttendanceCode:', definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code);

        const workHourResult = await tx.workHourResult.create({
          data: {
            employeeId: employee.employeeId,
            employeeNo: employee.employeeNo,
            accountId: request.accountId,
            accountName: request.accountName,
            accountPath: request.accountCode, // 暂时使用accountCode作为path
            workDate: request.reportDate,
            calcDate: request.reportDate, // ✅ 添加 calcDate 字段
            startTime: startTime, // ✅ 添加 startTime 字段
            endTime: endTime, // ✅ 添加 endTime 字段
            definitionAttendanceCodeId: definitionAttendanceCode.id, // ✅ 使用新字段
            definitionAttendanceCodeStr: definitionAttendanceCode.name, // ✅ 使用新字段
            calcAttendanceCode: definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code, // ✅ 添加 calcAttendanceCode
            attendanceCode: request.hourType, // 保留旧字段以兼容
            attendanceCodeName: request.hourTypeName, // 保留旧字段以兼容
            workHours: request.value,
            sourceType: 'LABOR_HOUR_REPORT',
            sourceId: request.id,
            source: `工时报表申请: ${request.title}`,
            status: 'ACTIVE',
          },
        });

        console.log('工时结果记录创建成功，ID:', workHourResult.id);
      }
    });

    return ApiResponse.ok(null, '审批通过，数据已同步到工时结果表');
  }

  /**
   * 审批拒绝
   */
  async rejectRequest(id: number, dto: ApproveLaborHourReportRequestDto) {
    const request = await this.prisma.laborHourReportRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('申请记录不存在');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理');
    }

    await this.prisma.laborHourReportRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId: dto.approverId,
        approverName: dto.approverName,
        approvedAt: new Date(),
        approvalComment: dto.approvalComment,
      },
    });

    return ApiResponse.ok(null, '申请已拒绝');
  }

  /**
   * 删除申请（仅PENDING状态可删除）
   */
  async deleteRequest(id: number) {
    const request = await this.prisma.laborHourReportRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('申请记录不存在');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('只能删除待审批的申请');
    }

    await this.prisma.laborHourReportRequest.delete({
      where: { id },
    });

    return ApiResponse.ok(null, '申请已删除');
  }
}

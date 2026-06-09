import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLaborHourReportRequestDto, ReportEmployeeDto } from './dto/create-request.dto';
import { ApproveLaborHourReportRequestDto } from './dto/approve-request.dto';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { ApiResponse } from '../../common/dto/response.dto';
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class LaborHourReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowInstanceService: WorkflowInstanceService,
    private readonly amountCalculateService: AmountCalculateService,
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

        // 准备所有员工数据用于关联表（包含独立报工数据）
        dto.employees.forEach(emp => {
          employeesData.push({
            employeeId: emp.employeeId,
            employeeNo: emp.employeeNo,
            employeeName: emp.employeeName,
            startTime: emp.startTime,   // 员工独立开始时间
            endTime: emp.endTime,       // 员工独立结束时间
            value: emp.value,           // 员工独立工时数量
            description: emp.description, // 员工独立描述
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

      // 🔍 实时检查数据库表结构
      console.log('=== 🔍 实时检查数据库表结构 ===');
      try {
        const tableInfo = await this.prisma.$queryRaw`PRAGMA table_info(LaborHourReportRequest)`;
        console.log('表结构查询结果:', JSON.stringify(tableInfo, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2));
        const hasValue = (tableInfo as any[]).find((col: any) => col.name === 'value');
        console.log('Value 列存在?', !!hasValue);
        if (!hasValue) {
          console.error('❌❌❌ 致命错误：数据库中没有 value 列！❌❌❌');
        }
      } catch (e) {
        console.error('查询表结构失败:', e);
      }
      console.log('===============================');

      // 🔧 使用原始SQL绕过Prisma查询构建器的缓存问题
      console.log('使用原始SQL创建记录...');

      // 使用原始SQL插入主记录
      const now = new Date();
      const insertResult = await this.prisma.$queryRaw`
        INSERT INTO LaborHourReportRequest (
          requestNo, workflowCode, title, reportDate, reportMode,
          employeeId, employeeNo, employeeName, hourType, hourTypeName,
          startTime, endTime, value, unit, description,
          accountId, accountCode, accountPath, accountName,
          status, requesterId, requesterName, instanceId,
          createdAt, updatedAt
        ) VALUES (
          ${requestNo}, 'LABOR_HOUR_REPORT', ${dto.title}, ${new Date(dto.reportDate)}, ${dto.reportMode},
          ${employeeId}, ${employeeNo}, ${employeeName}, ${dto.hourType}, ${dto.hourTypeName},
          ${dto.startTime}, ${dto.endTime}, ${dto.value}, ${dto.unit || '小时'}, ${dto.description},
          ${dto.accountId}, ${dto.accountCode}, ${dto.accountPath}, ${dto.accountName},
          'PENDING', ${dto.requesterId}, ${dto.requesterName}, ${instanceId},
          ${now}, ${now}
        ) RETURNING *
      `;

      const request = (insertResult as any)[0];
      console.log('主记录创建成功，ID:', request.id);

      // 如果是团队报工，创建员工关联记录
      if (dto.reportMode === 'team' && employeesData.length > 0) {
        console.log('创建员工关联记录，数量:', employeesData.length);
        const now = new Date();
        for (const emp of employeesData) {
          await this.prisma.$queryRaw`
            INSERT INTO LaborHourReportEmployee (
              requestId, employeeId, employeeNo, employeeName,
              startTime, endTime, value, description, createdAt
            ) VALUES (
              ${request.id}, ${emp.employeeId}, ${emp.employeeNo}, ${emp.employeeName},
              ${emp.startTime}, ${emp.endTime}, ${emp.value}, ${emp.description}, ${now}
            )
          `;
        }
        console.log('员工关联记录创建完成');

        // 查询完整的申请信息（包含员工）
        const fullRequest = await this.prisma.$queryRaw`
          SELECT * FROM LaborHourReportRequest WHERE id = ${request.id}
        ` as any[];

        const employees = await this.prisma.$queryRaw`
          SELECT * FROM LaborHourReportEmployee WHERE requestId = ${request.id}
        ` as any[];

        (fullRequest[0] as any).employees = employees;
        return ApiResponse.ok(fullRequest[0], '工时报表申请创建成功');
      }
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
    const parseTime = (timeStr: string | null | undefined, date: Date) => {
      if (!timeStr) {
        return null; // 如果没有时间，返回 null
      }
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

      // 2. 从账户表查询正确的代码路径
      const account = await tx.laborAccount.findUnique({
        where: { id: request.accountId },
        select: {
          id: true,
          code: true,
          name: true,
          path: true, // ✅ 代码路径
          namePath: true, // ✅ 名称路径
        },
      });

      if (!account) {
        throw new BadRequestException(`账户 ID ${request.accountId} 不存在`);
      }

      console.log('查询到的账户信息:', {
        accountId: account.id,
        code: account.code,
        name: account.name,
        path: account.path,
        namePath: account.namePath,
      });

      // 🔍 调试：检查员工数据
      console.log('=== 员工数据检查 ===');
      console.log('request.reportMode:', request.reportMode);
      console.log('request.employees:', JSON.stringify(request.employees, null, 2));
      console.log('=====================');

      // 3. 确定要创建工时结果的员工列表
      let employeesToCreate: Array<{
        employeeId: number;
        employeeNo: string;
        employeeName: string;
        startTime?: string;
        endTime?: string;
        value?: number;
        description?: string;
      }> = [];

      if (request.reportMode === 'team' && request.employees && request.employees.length > 0) {
        // ✅ 团队报工模式：为每个员工创建记录（包含所有独立数据）
        employeesToCreate = request.employees.map(emp => ({
          employeeId: emp.employeeId,
          employeeNo: emp.employeeNo,
          employeeName: emp.employeeName,
          startTime: emp.startTime,
          endTime: emp.endTime,
          value: emp.value,
          description: emp.description,
        }));
        console.log('团队报工员工数据（包含独立字段）:', employeesToCreate);
      } else {
        // ✅ 个人报工模式：使用主员工信息
        employeesToCreate = [{
          employeeId: request.employeeId!,
          employeeNo: request.employeeNo!,
          employeeName: request.employeeName!,
          startTime: request.startTime,
          endTime: request.endTime,
          value: request.value,
          description: request.description,
        }];
        console.log('个人报工员工数据:', employeesToCreate);
      }

      // 4. 为每个员工创建工时结果记录
      for (const employee of employeesToCreate) {
        // 直接使用员工数据，不需要再次查找
        const empStartTime = employee.startTime ? parseTime(employee.startTime, request.reportDate) : startTime;
        const empEndTime = employee.endTime ? parseTime(employee.endTime, request.reportDate) : endTime;
        const empWorkHours = employee.value ?? request.value;
        const empDescription = employee.description ?? request.description;

        console.log('创建工时结果记录，员工:', employee.employeeNo);
        console.log('definitionAttendanceCodeId:', definitionAttendanceCode.id);
        console.log('definitionAttendanceCodeStr (code):', definitionAttendanceCode.code);
        console.log('calcAttendanceCode:', definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code);
        console.log('accountPath (代码路径):', account.path);
        console.log('员工数据 - 工时:', empWorkHours, '开始时间:', empStartTime, '结束时间:', empEndTime);
        console.log('是否使用独立工时数据:', !!employee.value, '独立值:', employee.value);

        // ✅ 计算金额
        // 根据申报时选择的出勤代码（hourType）到 DefinitionAttendanceCode 表找到对应的计算代码
        // 结合个人的金额规则计算出金额
        let amount = 0;
        const calcAttendanceCode = definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code;

        try {
          console.log('开始计算金额，员工:', employee.employeeNo);
          console.log('计算出勤代码:', calcAttendanceCode);
          console.log('工时数:', empWorkHours);
          console.log('账户路径:', account.path);
          console.log('计算日期:', request.reportDate);

          // 调用金额计算服务
          amount = await this.amountCalculateService.calculateAmountByNo({
            employeeNo: employee.employeeNo,
            workHours: empWorkHours,
            attendanceCode: calcAttendanceCode, // 使用计算代码
            accountPath: account.path,
            calcDate: request.reportDate,
          });

          console.log('金额计算成功，金额:', amount);
        } catch (error) {
          console.error('金额计算失败:', error);
          // 金额计算失败时，设置为0并继续处理
          amount = 0;
        }

        const workHourResult = await tx.workHourResult.create({
          data: {
            employeeId: employee.employeeId,
            employeeNo: employee.employeeNo,
            accountId: request.accountId,
            accountName: account.namePath || account.name, // ✅ 使用名称路径或名称
            accountPath: account.path, // ✅ 使用代码路径
            workDate: request.reportDate,
            calcDate: request.reportDate, // ✅ 添加 calcDate 字段
            startTime: empStartTime, // ✅ 使用员工独立开始时间
            endTime: empEndTime, // ✅ 使用员工独立结束时间
            definitionAttendanceCodeId: definitionAttendanceCode.id, // ✅ 使用新字段
            definitionAttendanceCodeStr: definitionAttendanceCode.code, // ✅ 修复：存储代码而非名称
            calcAttendanceCode: calcAttendanceCode, // ✅ 添加 calcAttendanceCode
            attendanceCode: request.hourType, // 保留旧字段以兼容
            attendanceCodeName: request.hourTypeName, // 保留旧字段以兼容
            workHours: empWorkHours, // ✅ 使用员工独立工时数量
            amount: Math.round(amount * 100) / 100, // ✅ 添加计算出的金额
            calculateAmount: Math.round(amount * 100) / 100, // ✅ 添加计算出的金额
            sourceType: 'LABOR_HOUR_REPORT',
            sourceId: request.id,
            source: `工时报表申请: ${employee.employeeName} - ${request.hourTypeName} - ${new Date(request.reportDate).toLocaleDateString('zh-CN')}`, // ✅ 动态生成描述
            status: 'ACTIVE',
          },
        });

        console.log('工时结果记录创建成功，ID:', workHourResult.id, '金额:', amount);
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

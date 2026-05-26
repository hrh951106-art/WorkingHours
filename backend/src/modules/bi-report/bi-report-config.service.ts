import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataModelService } from './data-model.service';

@Injectable()
export class BiReportConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataModelService: DataModelService,
  ) {}

  /**
   * 创建报表
   */
  async createReport(data: {
    name: string;
    code: string;
    modelId: number;
    type: string;
    category?: string;
    description?: string;
    config: any;
    queryConfig?: any;
    style?: any;
    userId: number;
  }) {
    // 检查代码是否已存在
    const existing = await this.prisma.biReport.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('报表代码已存在');
    }

    const report = await this.prisma.biReport.create({
      data: {
        name: data.name,
        code: data.code,
        modelId: data.modelId,
        category: data.category,
        description: data.description,
        status: 'DRAFT',
        createdById: data.userId,
        createdByName: 'System', // You may want to pass this in
      },
      include: {
        model: {
          include: {
            fields: true,
          },
        },
      },
    });

    return report;
  }

  /**
   * 获取报表列表
   */
  async getReportList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    type?: string;
    category?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, keyword, type, category, status } = params;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.biReport.count({ where }),
      this.prisma.biReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          model: {
            include: {
              fields: true,
            },
          },
          widgets: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取报表详情
   */
  async getReportDetail(id: number) {
    const report = await this.prisma.biReport.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            fields: {
              orderBy: { sortNo: 'asc' },
            },
            relations: true,
          },
        },
        widgets: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('报表不存在');
    }

    return report;
  }

  /**
   * 更新报表
   */
  async updateReport(id: number, data: any) {
    const updateData: any = {
      name: data.name,
      category: data.category,
      description: data.description,
    };

    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }

    if (data.queryConfig !== undefined) {
      updateData.queryConfig = JSON.stringify(data.queryConfig);
    }

    if (data.style !== undefined) {
      updateData.style = JSON.stringify(data.style);
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const report = await this.prisma.biReport.update({
      where: { id },
      data: updateData,
      include: {
        model: {
          include: {
            fields: true,
          },
        },
      },
    });

    return report;
  }

  /**
   * 删除报表
   */
  async deleteReport(id: number) {
    await this.prisma.biReport.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * 复制报表
   */
  async duplicateReport(id: number, userId: number) {
    const original = await this.prisma.biReport.findUnique({
      where: { id },
      include: {
        widgets: true,
      },
    });

    if (!original) {
      throw new NotFoundException('报表不存在');
    }

    const newReport = await this.prisma.biReport.create({
      data: {
        name: `${original.name} (副本)`,
        code: `${original.code}_copy_${Date.now()}`,
        modelId: original.modelId,
        category: original.category,
        description: original.description,
        status: 'DRAFT',
        createdById: userId,
        createdByName: 'System',
      },
      include: {
        model: true,
        widgets: true,
      },
    });

    return newReport;
  }

  /**
   * 发布报表
   */
  async publishReport(id: number) {
    const report = await this.prisma.biReport.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
      },
    });

    return report;
  }

  /**
   * 归档报表
   */
  async archiveReport(id: number) {
    const report = await this.prisma.biReport.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });

    return report;
  }

  /**
   * 添加报表组件
   */
  async addWidget(reportId: number, data: {
    name: string;
    type: string;
    title?: string;
    dataSource: any;
    config: any;
    position?: any;
  }) {
    const widget = await this.prisma.biReportWidget.create({
      data: {
        report: {
          connect: { id: reportId },
        },
        code: data.name,
        name: data.name,
        title: data.title,
        widgetType: data.type,
        dataSource: JSON.stringify(data.dataSource),
        config: JSON.stringify(data.config),
        position: JSON.stringify(data.position || {}),
      },
    });

    return widget;
  }

  /**
   * 更新报表组件
   */
  async updateWidget(widgetId: number, data: any) {
    const updateData: any = {
      name: data.name,
      title: data.title,
    };

    if (data.dataSource !== undefined) {
      updateData.dataSource = JSON.stringify(data.dataSource);
    }

    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }

    if (data.position !== undefined) {
      updateData.position = JSON.stringify(data.position);
    }

    const widget = await this.prisma.biReportWidget.update({
      where: { id: widgetId },
      data: updateData,
    });

    return widget;
  }

  /**
   * 删除报表组件
   */
  async deleteWidget(widgetId: number) {
    await this.prisma.biReportWidget.delete({
      where: { id: widgetId },
    });

    return { success: true };
  }

  /**
   * 查询报表数据
   */
  async queryReportData(reportId: number, params: any = {}) {
    // TODO: Implement query execution with proper schema
    return {
      success: false,
      message: 'Query execution not yet implemented for this schema',
    };
  }

  /**
   * 添加报表参数
   */
  async addReportParameter(reportId: number, data: {
    name: string;
    code: string;
    type: string;
    config?: any;
    required?: boolean;
    defaultValue?: string;
    description?: string;
    sortNo?: number;
  }) {
    const parameter = await this.prisma.biReportParameter.create({
      data: {
        report: {
          connect: { id: reportId },
        },
        name: data.name,
        code: data.code,
        parameterType: data.type,
        config: JSON.stringify(data.config || {}),
        required: data.required || false,
        defaultValue: data.defaultValue,
        description: data.description,
        sortNo: data.sortNo || 0,
      },
    });

    return parameter;
  }

  /**
   * 获取报表参数列表
   */
  async getReportParameters(reportId: number) {
    const parameters = await this.prisma.biReportParameter.findMany({
      where: { reportId },
      orderBy: { sortNo: 'asc' },
    });

    return parameters.map(p => ({
      ...p,
      config: JSON.parse(p.config || '{}'),
    }));
  }

  /**
   * 更新报表参数
   */
  async updateReportParameter(parameterId: number, data: any) {
    const updateData: any = {
      name: data.name,
      type: data.type,
      required: data.required,
      defaultValue: data.defaultValue,
      description: data.description,
      sortNo: data.sortNo,
    };

    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }

    const parameter = await this.prisma.biReportParameter.update({
      where: { id: parameterId },
      data: updateData,
    });

    return parameter;
  }

  /**
   * 删除报表参数
   */
  async deleteReportParameter(parameterId: number) {
    await this.prisma.biReportParameter.delete({
      where: { id: parameterId },
    });

    return { success: true };
  }

  /**
   * 记录报表访问日志
   */
  async logAccess(reportId: number, userId: number, userName: string, accessType: string) {
    await this.prisma.biReportAccessLog.create({
      data: {
        report: {
          connect: { id: reportId },
        },
        userId,
        userName,
        accessType,
      },
    });
  }

  /**
   * 获取报表统计信息
   */
  async getReportStatistics(reportId: number, params: {
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {
      reportId,
    };

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    const [viewCount, exportCount] = await Promise.all([
      this.prisma.biReportAccessLog.count({
        where: { ...where, accessType: 'view' },
      }),
      this.prisma.biReportAccessLog.count({
        where: { ...where, accessType: 'export' },
      }),
    ]);

    return {
      viewCount,
      exportCount,
      avgDuration: 0, // TODO: Duration tracking not in schema
    };
  }

  /**
   * 获取热门报表排行
   */
  async getPopularReports(limit: number = 10, params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where: any = {
      accessType: 'view',
    };

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    const reports = await this.prisma.biReportAccessLog.groupBy({
      by: ['reportId'],
      where,
      _count: {
        reportId: true,
      },
      orderBy: {
        _count: {
          reportId: 'desc',
        },
      },
      take: limit,
    });

    // 获取报表详情
    const reportIds = reports.map(r => r.reportId);
    const reportDetails = await this.prisma.biReport.findMany({
      where: {
        id: { in: reportIds },
      },
      select: {
        id: true,
        name: true,
        code: true,
        category: true,
      },
    });

    return reports.map(r => {
      const report = reportDetails.find(rd => rd.id === r.reportId);
      return {
        ...report,
        viewCount: r._count.reportId,
      };
    });
  }
}

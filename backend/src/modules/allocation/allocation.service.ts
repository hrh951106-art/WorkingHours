import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AllocationService {
  constructor(private prisma: PrismaService) {}

  // ============ 产品管理 ============

  async getProducts(query: any) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        productStandardHours: {
          where: { deletedAt: null },
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    return product;
  }

  async createProduct(dto: any) {
    const { code, name, specification, unit, standardHours, conversionFactor, description, createdById, createdByName } = dto;

    const existing = await this.prisma.product.findUnique({
      where: { code, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('产品编码已存在');
    }

    return this.prisma.product.create({
      data: {
        code,
        name,
        specification,
        unit: unit || '件',
        standardHours: standardHours || 0,
        conversionFactor: conversionFactor || 1.0,
        description,
        status: 'ACTIVE',
        createdById,
        createdByName,
      },
    });
  }

  async updateProduct(id: number, dto: any) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    const { name, specification, unit, standardHours, conversionFactor, status, description, updatedById, updatedByName } = dto;

    const updateData: any = {
      name,
      specification,
      unit,
      standardHours,
      conversionFactor,
      status,
      description,
    };

    if (updatedById) {
      updateData.updatedById = updatedById;
      updateData.updatedByName = updatedByName;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============ 通用配置管理 ============

  async getGeneralConfig() {
    let config = await this.prisma.allocationGeneralConfig.findFirst();

    // 如果配置不存在，创建默认配置
    if (!config) {
      config = await this.prisma.allocationGeneralConfig.create({
        data: {
          actualHoursAllocationCode: '',
          indirectHoursAllocationCode: '',
        },
      });
    }

    return config;
  }

  async updateGeneralConfig(dto: any) {
    const { actualHoursAllocationCode, indirectHoursAllocationCode, description, updatedById, updatedByName } = dto;

    let config = await this.prisma.allocationGeneralConfig.findFirst();

    if (config) {
      // 更新现有配置
      return this.prisma.allocationGeneralConfig.update({
        where: { id: config.id },
        data: {
          actualHoursAllocationCode,
          indirectHoursAllocationCode,
          description,
          updatedById,
          updatedByName,
        },
      });
    } else {
      // 创建新配置
      return this.prisma.allocationGeneralConfig.create({
        data: {
          actualHoursAllocationCode,
          indirectHoursAllocationCode,
          description,
          updatedById,
          updatedByName,
        },
      });
    }
  }

  // ============ 产线管理 ============

  async getProductionLines(query: any) {
    const { page = 1, pageSize = 10, keyword, orgId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    if (orgId) {
      where.orgId = +orgId;
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.productionLine.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productionLine.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getProductionLine(id: number) {
    const line = await this.prisma.productionLine.findUnique({
      where: { id, deletedAt: null },
      include: {
        lineShifts: {
          where: { deletedAt: null },
          orderBy: { scheduleDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!line) {
      throw new NotFoundException('产线不存在');
    }

    return line;
  }

  async createProductionLine(dto: any) {
    const { code, name, orgId, orgName, workshopId, workshopName, type, capacity, description, createdById, createdByName } = dto;

    const existing = await this.prisma.productionLine.findUnique({
      where: { code, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('产线编码已存在');
    }

    return this.prisma.productionLine.create({
      data: {
        code,
        name,
        orgId,
        orgName,
        workshopId,
        workshopName,
        type,
        capacity,
        description,
        status: 'ACTIVE',
        createdById,
        createdByName,
      },
    });
  }

  async updateProductionLine(id: number, dto: any) {
    const line = await this.prisma.productionLine.findUnique({
      where: { id, deletedAt: null },
    });

    if (!line) {
      throw new NotFoundException('产线不存在');
    }

    const { name, workshopId, workshopName, type, capacity, status, description, updatedById, updatedByName } = dto;

    const updateData: any = {
      name,
      workshopId,
      workshopName,
      type,
      capacity,
      status,
      description,
    };

    if (updatedById) {
      updateData.updatedById = updatedById;
      updateData.updatedByName = updatedByName;
    }

    return this.prisma.productionLine.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProductionLine(id: number) {
    const line = await this.prisma.productionLine.findUnique({
      where: { id, deletedAt: null },
    });

    if (!line) {
      throw new NotFoundException('产线不存在');
    }

    return this.prisma.productionLine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============ 产线班次管理 ============

  async getLineShifts(query: any) {
    const { page = 1, pageSize = 10, orgId, lineId, scheduleDate, shiftId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (orgId) where.orgId = +orgId;
    if (lineId) where.lineId = +lineId;
    if (shiftId) where.shiftId = +shiftId;
    if (scheduleDate) {
      const date = new Date(scheduleDate);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      where.scheduleDate = { gte: date, lt: nextDate };
    }

    const [items, total] = await Promise.all([
      this.prisma.lineShift.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { scheduleDate: 'desc' },
      }),
      this.prisma.lineShift.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async createLineShift(dto: any) {
    const { orgId, orgName, lineId, shiftId, shiftName, scheduleDate, startTime, endTime, plannedProducts, participateInAllocation, description } = dto;

    // 如果没有提供 lineId，尝试根据 orgId 查找对应的产线
    let finalLineId = lineId;
    if (!finalLineId && orgId) {
      const productionLine = await this.prisma.productionLine.findFirst({
        where: {
          orgId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (productionLine) {
        finalLineId = productionLine.id;
      }
    }

    const existing = await this.prisma.lineShift.findFirst({
      where: {
        orgId,
        shiftId,
        scheduleDate: new Date(scheduleDate),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('该组织在该日期的该班次已存在');
    }

    return this.prisma.lineShift.create({
      data: {
        orgId,
        orgName,
        lineId: finalLineId,
        shiftId,
        shiftName,
        scheduleDate: new Date(scheduleDate),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        plannedProducts: plannedProducts ? JSON.stringify(plannedProducts) : '[]',
        participateInAllocation: participateInAllocation ?? true,
        description,
        status: 'ACTIVE',
      },
    });
  }

  async updateLineShift(id: number, dto: any) {
    const shift = await this.prisma.lineShift.findUnique({
      where: { id, deletedAt: null },
    });

    if (!shift) {
      throw new NotFoundException('产线班次不存在');
    }

    const { startTime, endTime, plannedProducts, participateInAllocation, status, description } = dto;

    return this.prisma.lineShift.update({
      where: { id },
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        plannedProducts: plannedProducts ? JSON.stringify(plannedProducts) : '[]',
        participateInAllocation: participateInAllocation ?? true,
        status,
        description,
      },
    });
  }

  async deleteLineShift(id: number) {
    const shift = await this.prisma.lineShift.findUnique({
      where: { id, deletedAt: null },
    });

    if (!shift) {
      throw new NotFoundException('产线班次不存在');
    }

    return this.prisma.lineShift.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============ 产量记录管理 ============

  async getProductionRecords(query: any) {
    const { page = 1, pageSize = 10, startDate, endDate, orgId, shiftId, productId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (startDate) where.recordDate = { gte: new Date(startDate) };
    if (endDate) where.recordDate = { ...where.recordDate, lte: new Date(endDate) };
    if (orgId) where.orgId = +orgId;
    if (shiftId) where.shiftId = +shiftId;
    if (productId) where.productId = +productId;

    const [items, total] = await Promise.all([
      this.prisma.productionRecord.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { recordDate: 'desc' },
        include: {
          product: {
            select: {
              conversionFactor: true,
            },
          },
        },
      }),
      this.prisma.productionRecord.count({ where }),
    ]);

    // 添加计算字段
    const itemsWithCalculations = items.map((item: any) => ({
      ...item,
      conversionFactor: item.product?.conversionFactor || 1.0,
      convertedQty: (item.actualQty || 0) * (item.product?.conversionFactor || 1.0),
    }));

    return {
      items: itemsWithCalculations,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getProductionRecord(id: number) {
    const record = await this.prisma.productionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('产量记录不存在');
    }

    return record;
  }

  async createProductionRecord(dto: any) {
    const { recordDate, orgId, orgName, lineId, lineName, shiftId, shiftName, productId, productCode, productName, plannedQty, actualQty, qualifiedQty, unqualifiedQty, standardHours, workHours, source, recorderId, recorderName, description } = dto;

    const existing = await this.prisma.productionRecord.findFirst({
      where: {
        recordDate: new Date(recordDate),
        orgId,
        shiftId,
        productId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('该组织该班次该产品的产量记录已存在');
    }

    const totalStdHours = (actualQty || 0) * (standardHours || 0);

    return this.prisma.productionRecord.create({
      data: {
        recordDate: new Date(recordDate),
        orgId,
        orgName,
        lineId,
        lineName,
        shiftId,
        shiftName,
        productId,
        productCode,
        productName,
        plannedQty: plannedQty || 0,
        actualQty: actualQty || 0,
        qualifiedQty: qualifiedQty || 0,
        unqualifiedQty: unqualifiedQty || 0,
        standardHours: standardHours || 0,
        totalStdHours,
        workHours,
        source: source || 'MANUAL',
        recorderId,
        recorderName,
        description,
      },
    });
  }

  async updateProductionRecord(id: number, dto: any) {
    const record = await this.prisma.productionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('产量记录不存在');
    }

    const { plannedQty, actualQty, qualifiedQty, unqualifiedQty, standardHours, workHours, description } = dto;

    const totalStdHours = (actualQty || 0) * (standardHours || record.standardHours);

    return this.prisma.productionRecord.update({
      where: { id },
      data: {
        plannedQty,
        actualQty,
        qualifiedQty,
        unqualifiedQty,
        standardHours: standardHours || record.standardHours,
        totalStdHours,
        workHours,
        description,
      },
    });
  }

  async deleteProductionRecord(id: number) {
    const record = await this.prisma.productionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('产量记录不存在');
    }

    return this.prisma.productionRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async batchImportProductionRecords(dto: any) {
    const { records } = dto;

    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('记录列表不能为空');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const record of records) {
      try {
        await this.createProductionRecord(record);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          record,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ============ 分摊配置管理 ============

  /**
   * 获取分摊配置列表
   */
  async getAllocationConfigs(query: any) {
    const { page = 1, pageSize = 10, keyword, orgId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };

    if (keyword) {
      where.OR = [
        { configCode: { contains: keyword } },
        { configName: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (orgId) where.orgId = +orgId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.allocationConfig.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceConfig: true,
          rules: {
            where: { deletedAt: null },
            include: {
              targets: true,
            },
            orderBy: [{ sortOrder: 'asc' }],
          },
          _count: {
            select: { rules: true, results: true },
          },
        },
      }),
      this.prisma.allocationConfig.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  /**
   * 获取分摊配置详情
   */
  async getAllocationConfig(id: number) {
    const config = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null },
          include: {
            targets: true,
          },
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
    });

    if (!config) {
      throw new NotFoundException('分摊配置不存在');
    }

    // 解析JSON字段
    return {
      ...config,
      sourceConfig: config.sourceConfig ? {
        ...config.sourceConfig,
        employeeFilter: JSON.parse(config.sourceConfig.employeeFilter || '{}'),
        accountFilter: JSON.parse(config.sourceConfig.accountFilter || '{}'),
        attendanceCodes: JSON.parse(config.sourceConfig.attendanceCodes || '[]'),
      } : null,
      rules: config.rules.map(rule => ({
        ...rule,
        basisFilter: JSON.parse(rule.basisFilter || '{}'),
        allocationAttendanceCodes: JSON.parse(rule.allocationAttendanceCodes || '[]'),
        allocationHierarchyLevels: JSON.parse(rule.allocationHierarchyLevels || '[]'),
      })),
    };
  }

  /**
   * 创建分摊配置
   */
  async createAllocationConfig(dto: any) {
    const {
      configCode,
      configName,
      orgId,
      orgName,
      orgPath,
      effectiveStartTime,
      effectiveEndTime,
      description,
      createdById,
      createdByName,
      sourceConfig,
      rules,
    } = dto;

    const existing = await this.prisma.allocationConfig.findUnique({
      where: { configCode, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('配置编码已存在');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 创建主配置
      const config = await tx.allocationConfig.create({
        data: {
          configCode,
          configName,
          orgId,
          orgPath,
          effectiveStartTime: new Date(effectiveStartTime),
          effectiveEndTime: effectiveEndTime ? new Date(effectiveEndTime) : null,
          status: 'DRAFT',
          description,
          createdById,
          createdByName,
        },
      });

      // 创建分摊源配置
      if (sourceConfig) {
        await tx.allocationSourceConfig.create({
          data: {
            configId: config.id,
            sourceType: sourceConfig.sourceType || 'EMPLOYEE_HOURS',
            employeeFilter: JSON.stringify(sourceConfig.employeeFilter || {}),
            accountFilter: JSON.stringify(sourceConfig.accountFilter || {}),
            attendanceCodes: JSON.stringify(sourceConfig.attendanceCodes || []),
            description: sourceConfig.description,
          },
        });
      }

      // 创建分摊规则
      if (rules && Array.isArray(rules)) {
        for (const rule of rules) {
          const ruleRecord = await tx.allocationRuleConfig.create({
            data: {
              configId: config.id,
              ruleName: rule.ruleName,
              ruleType: rule.ruleType,
              allocationBasis: rule.allocationBasis,
              allocationAttendanceCodes: JSON.stringify(rule.allocationAttendanceCodes || []),
              allocationHierarchyLevels: JSON.stringify(rule.allocationHierarchyLevels || []),
              allocationScopeId: rule.allocationScopeId || null,
              basisFilter: JSON.stringify(rule.basisFilter || {}),
              sortOrder: rule.sortOrder || 0,
              status: rule.status || 'ACTIVE',
              description: rule.description,
              effectiveStartTime: rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null,
              effectiveEndTime: rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null,
            },
          });

          // 创建分摊目标（向后兼容）
          if (rule.targets && Array.isArray(rule.targets)) {
            for (const target of rule.targets) {
              await tx.allocationRuleTarget.create({
                data: {
                  ruleId: ruleRecord.id,
                  targetType: target.targetType,
                  targetId: target.targetId,
                  targetName: target.targetName,
                  targetCode: target.targetCode,
                  weight: target.weight || 0,
                  targetAccountId: target.targetAccountId,
                  targetAccountName: target.targetAccountName,
                },
              });
            }
          }
        }
      }

      return config;
    });

    return this.getAllocationConfig(result.id);
  }

  /**
   * 更新分摊配置
   */
  async updateAllocationConfig(id: number, dto: any) {
    const config = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException('分摊配置不存在');
    }

    if (config.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的配置才能修改');
    }

    const {
      configName,
      effectiveStartTime,
      effectiveEndTime,
      description,
      updatedById,
      updatedByName,
      sourceConfig,
      rules,
    } = dto;

    await this.prisma.$transaction(async (tx) => {
      // 更新主配置
      const updateData: any = {
        configName,
        description,
      };

      if (effectiveStartTime) updateData.effectiveStartTime = new Date(effectiveStartTime);
      if (effectiveEndTime !== undefined) {
        updateData.effectiveEndTime = effectiveEndTime ? new Date(effectiveEndTime) : null;
      }

      if (updatedById) {
        updateData.updatedById = updatedById;
        updateData.updatedByName = updatedByName;
      }

      await tx.allocationConfig.update({
        where: { id },
        data: updateData,
      });

      // 更新或创建分摊源配置
      if (sourceConfig) {
        const existing = await tx.allocationSourceConfig.findUnique({
          where: { configId: id },
        });

        const sourceData = {
          sourceType: sourceConfig.sourceType || 'EMPLOYEE_HOURS',
          employeeFilter: JSON.stringify(sourceConfig.employeeFilter || {}),
          accountFilter: JSON.stringify(sourceConfig.accountFilter || {}),
          attendanceCodes: JSON.stringify(sourceConfig.attendanceCodes || []),
          description: sourceConfig.description,
        };

        if (existing) {
          await tx.allocationSourceConfig.update({
            where: { configId: id },
            data: sourceData,
          });
        } else {
          await tx.allocationSourceConfig.create({
            data: {
              configId: id,
              ...sourceData,
            },
          });
        }
      }

      // 更新分摊规则
      if (rules && Array.isArray(rules)) {
        // 删除旧规则
        await tx.allocationRuleConfig.deleteMany({
          where: { configId: id },
        });

        // 创建新规则
        for (const rule of rules) {
          const ruleRecord = await tx.allocationRuleConfig.create({
            data: {
              configId: id,
              ruleName: rule.ruleName,
              ruleType: rule.ruleType,
              allocationBasis: rule.allocationBasis,
              allocationAttendanceCodes: JSON.stringify(rule.allocationAttendanceCodes || []),
              allocationHierarchyLevels: JSON.stringify(rule.allocationHierarchyLevels || []),
              allocationScopeId: rule.allocationScopeId || null,
              basisFilter: JSON.stringify(rule.basisFilter || {}),
              sortOrder: rule.sortOrder || 0,
              status: rule.status || 'ACTIVE',
              description: rule.description,
              effectiveStartTime: rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null,
              effectiveEndTime: rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null,
            },
          });

          // 创建分摊目标（向后兼容）
          if (rule.targets && Array.isArray(rule.targets)) {
            for (const target of rule.targets) {
              await tx.allocationRuleTarget.create({
                data: {
                  ruleId: ruleRecord.id,
                  targetType: target.targetType,
                  targetId: target.targetId,
                  targetName: target.targetName,
                  targetCode: target.targetCode,
                  weight: target.weight || 0,
                  targetAccountId: target.targetAccountId,
                  targetAccountName: target.targetAccountName,
                },
              });
            }
          }
        }
      }
    });

    return this.getAllocationConfig(id);
  }

  /**
   * 删除分摊配置
   */
  async deleteAllocationConfig(id: number) {
    const config = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException('分摊配置不存在');
    }

    if (config.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的配置才能删除');
    }

    await this.prisma.$transaction(async (tx) => {
      // 软删除规则目标
      await tx.allocationRuleTarget.deleteMany({
        where: {
          rule: {
            configId: id,
          },
        },
      });

      // 软删除规则
      await tx.allocationRuleConfig.deleteMany({
        where: { configId: id },
      });

      // 删除源配置
      await tx.allocationSourceConfig.deleteMany({
        where: { configId: id },
      });

      // 软删除配置
      await tx.allocationConfig.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    return { message: '删除成功' };
  }

  /**
   * 启用分摊配置
   */
  async activateAllocationConfig(id: number, dto: any) {
    const config = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
      include: {
        sourceConfig: true,
        rules: {
          include: {
            targets: true,
          },
        },
      },
    });

    if (!config) {
      throw new NotFoundException('分摊配置不存在');
    }

    if (config.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的配置才能启用');
    }

    if (!config.sourceConfig) {
      throw new BadRequestException('请先配置分摊源');
    }

    if (config.rules.length === 0) {
      throw new BadRequestException('请先添加分摊规则');
    }

    const { approvedById, approvedByName } = dto;

    await this.prisma.allocationConfig.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById,
        approvedByName,
        approvedAt: new Date(),
      },
    });

    return { message: '启用成功' };
  }

  /**
   * 归档分摊配置
   */
  async archiveAllocationConfig(id: number) {
    const config = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException('分摊配置不存在');
    }

    if (config.status !== 'ACTIVE') {
      throw new BadRequestException('只有生效状态的配置才能归档');
    }

    await this.prisma.allocationConfig.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return { message: '归档成功' };
  }

  /**
   * 复制分摊配置
   */
  async copyAllocationConfig(id: number, dto: any) {
    const { configName, createdById, createdByName } = dto;

    const originalConfig = await this.prisma.allocationConfig.findUnique({
      where: { id, deletedAt: null },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null },
          include: {
            targets: true,
          },
        },
      },
    });

    if (!originalConfig) {
      throw new NotFoundException('分摊配置不存在');
    }

    // 生成新的配置编码（在原编码后添加 _COPY）
    const newConfigCode = `${originalConfig.configCode}_COPY_${Date.now()}`;
    const newConfigName = configName || `${originalConfig.configName}_副本`;

    const result = await this.prisma.$transaction(async (tx) => {
      // 创建新配置
      const newConfig = await tx.allocationConfig.create({
        data: {
          configCode: newConfigCode,
          configName: newConfigName,
          orgId: originalConfig.orgId,
          orgPath: originalConfig.orgPath,
          effectiveStartTime: originalConfig.effectiveStartTime,
          effectiveEndTime: originalConfig.effectiveEndTime,
          status: 'DRAFT',
          description: originalConfig.description,
          createdById: createdById || originalConfig.createdById,
          createdByName: createdByName || originalConfig.createdByName,
        },
      });

      // 复制分摊源配置
      if (originalConfig.sourceConfig) {
        await tx.allocationSourceConfig.create({
          data: {
            configId: newConfig.id,
            sourceType: originalConfig.sourceConfig.sourceType,
            employeeFilter: originalConfig.sourceConfig.employeeFilter,
            accountFilter: originalConfig.sourceConfig.accountFilter,
            attendanceCodes: originalConfig.sourceConfig.attendanceCodes,
            description: originalConfig.sourceConfig.description,
          },
        });
      }

      // 复制分摊规则
      for (const rule of originalConfig.rules) {
        const newRule = await tx.allocationRuleConfig.create({
          data: {
            configId: newConfig.id,
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            allocationBasis: rule.allocationBasis,
            allocationAttendanceCodes: rule.allocationAttendanceCodes,
            allocationHierarchyLevels: rule.allocationHierarchyLevels,
            allocationScopeId: rule.allocationScopeId,
            basisFilter: rule.basisFilter,
            sortOrder: rule.sortOrder,
            status: rule.status,
            description: rule.description,
            effectiveStartTime: rule.effectiveStartTime,
            effectiveEndTime: rule.effectiveEndTime,
          },
        });

        // 复制分摊目标
        if (rule.targets && rule.targets.length > 0) {
          for (const target of rule.targets) {
            await tx.allocationRuleTarget.create({
              data: {
                ruleId: newRule.id,
                targetType: target.targetType,
                targetId: target.targetId,
                targetName: target.targetName,
                targetCode: target.targetCode,
                weight: target.weight,
                targetAccountId: target.targetAccountId,
                targetAccountName: target.targetAccountName,
              },
            });
          }
        }
      }

      return newConfig;
    });

    return this.getAllocationConfig(result.id);
  }

  /**
   * 获取可用的出勤代码列表
   */
  async getAttendanceCodesForAllocation() {
    const attendanceCodes = await this.prisma.attendanceCode.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [{ type: 'asc' }, { priority: 'desc' }],
    });

    return attendanceCodes;
  }

  /**
   * 获取可用的劳动力账户列表
   */
  async getLaborAccountsForAllocation(query: any) {
    const { orgId, keyword } = query;

    const where: any = {};

    if (orgId) where.orgId = +orgId;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    return this.prisma.laborAccount.findMany({
      where,
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });
  }

  // ============ 分摊计算 ============

  /**
   * 执行分摊计算
   */
  async calculateAllocation(dto: any) {
    const { configId, startDate, endDate, executeById, executeByName } = dto;

    console.log(`[分摊计算] 开始执行计算，configId: ${configId}, 日期范围: ${startDate} ~ ${endDate}`);

    const config = await this.prisma.allocationConfig.findUnique({
      where: { id: configId, deletedAt: null },
      include: {
        sourceConfig: true,
        rules: {
          where: { deletedAt: null, status: 'ACTIVE' },
          include: {
            targets: true,
          },
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
    });

    if (!config) {
      console.error(`[分摊计算] 配置不存在，configId: ${configId}`);
      throw new NotFoundException('分摊配置不存在');
    }

    console.log(`[分摊计算] 找到配置: ${config.configName} (${config.configCode}), 状态: ${config.status}`);

    if (config.status !== 'ACTIVE') {
      console.error(`[分摊计算] 配置状态不是ACTIVE，当前状态: ${config.status}`);
      throw new BadRequestException('只有生效状态的配置才能执行计算');
    }

    if (!config.sourceConfig) {
      console.error(`[分摊计算] 配置缺少分摊源配置`);
      throw new BadRequestException('配置不完整，缺少分摊源配置');
    }

    console.log(`[分摊计算] 分摊源配置: ${JSON.stringify(config.sourceConfig)}`);

    if (config.rules.length === 0) {
      console.error(`[分摊计算] 配置缺少分摊规则`);
      throw new BadRequestException('配置不完整，缺少分摊规则');
    }

    console.log(`[分摊计算] 找到 ${config.rules.length} 条分摊规则`);

    // 生成批次号
    const batchNo = this.generateBatchNo();
    const calcTime = new Date();

    // 解析分摊源配置
    const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || '{}');
    const accountFilter = JSON.parse(config.sourceConfig.accountFilter || '{}');
    const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');

    console.log(`[分摊计算] 解析分摊源配置:`);
    console.log(`  - 员工筛选: ${JSON.stringify(employeeFilter)}`);
    console.log(`  - 账户筛选: ${JSON.stringify(accountFilter)}`);
    console.log(`  - 出勤代码: ${JSON.stringify(attendanceCodes)}`);

    // 获取出勤代码映射
    const attendanceCodeMap = await this.prisma.attendanceCode.findMany({
      where: { code: { in: attendanceCodes } },
    });
    const attendanceCodeIds = attendanceCodeMap.map((ac) => ac.id);

    console.log(`[分摊计算] 找到 ${attendanceCodeIds.length} 个出勤代码，IDs: ${attendanceCodeIds.join(', ')}`);

    // 获取通用配置
    const generalConfig = await this.prisma.allocationGeneralConfig.findFirst();
    if (!generalConfig || !generalConfig.actualHoursAllocationCode || !generalConfig.indirectHoursAllocationCode) {
      console.error(`[分摊计算] 通用配置未设置，generalConfig:`, generalConfig);
      throw new BadRequestException('请先配置通用配置中的直接工时和间接工时代码');
    }

    console.log(`[分摊计算] 通用配置 - 直接工时代码: ${generalConfig.actualHoursAllocationCode}, 间接工时代码: ${generalConfig.indirectHoursAllocationCode}`);

    // 获取直接工时出勤代码
    const actualHoursCode = await this.prisma.attendanceCode.findUnique({
      where: { code: generalConfig.actualHoursAllocationCode },
    });
    if (!actualHoursCode) {
      console.error(`[分摊计算] 未找到直接工时出勤代码: ${generalConfig.actualHoursAllocationCode}`);
      throw new BadRequestException(`未找到直接工时出勤代码: ${generalConfig.actualHoursAllocationCode}`);
    }

    // 获取间接工时出勤代码
    const indirectHoursCode = await this.prisma.attendanceCode.findUnique({
      where: { code: generalConfig.indirectHoursAllocationCode },
    });
    if (!indirectHoursCode) {
      console.error(`[分摊计算] 未找到间接工时出勤代码: ${generalConfig.indirectHoursAllocationCode}`);
      throw new BadRequestException(`未找到间接工时出勤代码: ${generalConfig.indirectHoursAllocationCode}`);
    }

    // 查询待分摊的工时记录
    console.log(`[分摊计算] 开始查询待分摊的工时记录...`);
    const calcResults = await this.getFilteredCalcResults({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      employeeFilter,
      accountFilter,
      attendanceCodeIds,
    });

    console.log(`[分摊计算] 查询到 ${calcResults.length} 条待分摊工时记录`);

    if (calcResults.length === 0) {
      console.error(`[分摊计算] 未找到符合条件的待分摊工时记录`);
      console.error(`  日期范围: ${startDate} ~ ${endDate}`);
      console.error(`  出勤代码IDs: ${attendanceCodeIds.join(', ') || '无'}`);
      console.error(`  账户筛选: ${JSON.stringify(accountFilter)}`);
      console.error(`  员工筛选: ${JSON.stringify(employeeFilter)}`);

      // 提供更详细的诊断信息
      throw new BadRequestException(
        `未找到符合条件的待分摊工时记录。` +
        `日期范围: ${startDate} ~ ${endDate}。` +
        `请检查：1) 该日期范围内是否有工时记录；2) 分摊源配置中的出勤代码是否正确；3) 员工和账户筛选条件是否过于严格。`
      );
    }

    // 执行分摊计算
    const resultCount = await this.executeAllocationCalculationV2({
      batchNo,
      config,
      calcResults,
      calcTime,
      actualHoursAttendanceCodeId: actualHoursCode.id,
      indirectHoursAttendanceCodeId: indirectHoursCode.id,
      executeById: executeById || 0,
      executeByName: executeByName || 'System',
    });

    // 记录审计日志
    await this.prisma.auditLog.create({
      data: {
        module: 'ALLOCATION',
        operationType: 'EXECUTE',
        operationDesc: `执行间接工时分摊计算，批次号：${batchNo}，配置：${config.configName}`,
        targetId: config.id,
        targetType: 'AllocationConfig',
        newValue: JSON.stringify({
          batchNo,
          startDate,
          endDate,
          resultCount,
        }),
        operatorId: executeById || 0,
        operatorName: executeByName || 'System',
        result: 'SUCCESS',
      },
    });

    return {
      batchNo,
      resultCount,
      message: '分摊计算完成',
    };
  }

  /**
   * 执行分摊计算 V2 - 支持按实际工时和实际产量比例分摊
   */
  private async executeAllocationCalculationV2(params: any): Promise<number> {
    const {
      batchNo,
      config,
      calcResults,
      calcTime,
      actualHoursAttendanceCodeId,
      indirectHoursAttendanceCodeId,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 按日期分组处理
    const groupedByDate = this.groupCalcResultsByDate(calcResults);

    // 清理旧数据：删除同一配置的旧分摊结果（AllocationResult）
    // 注意：只删除分摊关系记录，不删除任何工时记录（CalcResult）
    // - 源数据（被分摊的原始工时）必须保留
    // - 目标数据（分摊产生的工时）也保留，作为历史记录
    const uniqueDates = Object.keys(groupedByDate);
    for (const dateKey of uniqueDates) {
      const calcDate = new Date(dateKey);

      // 删除该配置在该日期的所有旧分摊结果
      const deletedResults = await this.prisma.allocationResult.deleteMany({
        where: {
          configId: config.id,
          recordDate: calcDate,
        },
      });

      if (deletedResults.count > 0) {
        console.log(`清理 ${dateKey} 的旧分摊数据: ${deletedResults.count} 条分摊结果`);
      }
    }

    for (const dateKey in groupedByDate) {
      const dailyResults = groupedByDate[dateKey];
      const calcDate = new Date(dateKey);

      // 获取当天所有班次所开的产线（只包含参与分摊的）
      const activeLines = await this.getActiveLinesForDate(calcDate);

      // 获取产线到车间的映射
      const lineToWorkshop = this.getLineToWorkshopMapping(activeLines);

      // 先汇总：按员工和出勤代码汇总工时
      const aggregatedResults = this.aggregateCalcResultsByEmployeeAndCode(dailyResults);

      // 对汇总后的工时记录进行分摊
      for (const aggregatedResult of aggregatedResults) {
        // 获取员工当天的班次和排班信息
        const schedule = await this.prisma.schedule.findFirst({
          where: {
            employeeId: aggregatedResult.employee.id,
            scheduleDate: calcDate,
          },
          include: {
            shift: true,
          },
        });

        if (!schedule) {
          console.log(`员工 ${aggregatedResult.employeeNo} 在 ${dateKey} 没有排班，跳过`);
          continue;
        }

        // 获取该班次当天开的产线列表
        const shiftLines = activeLines.filter((line) => line.shiftId === schedule.shiftId);

        if (shiftLines.length === 0) {
          console.log(`班次 ${schedule.shift.name} 在 ${dateKey} 没有开线，跳过`);
          continue;
        }

        // 对每个分摊规则进行分摊
        for (const rule of config.rules) {
          // 根据分摊依据类型进行分摊
          if (rule.allocationBasis === 'ACTUAL_HOURS') {
            // 按实际工时比例分摊
            const hoursResult = await this.executeActualHoursAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              schedule,
              shiftLines,
              lineToWorkshop,
              actualHoursAttendanceCodeId,
              indirectHoursAttendanceCodeId,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += hoursResult;
          } else if (rule.allocationBasis === 'ACTUAL_YIELDS') {
            // 按实际产量比例分摊
            const yieldResult = await this.executeActualYieldAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              schedule,
              shiftLines,
              lineToWorkshop,
              indirectHoursAttendanceCodeId,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += yieldResult;
          } else if (rule.allocationBasis === 'EQUIVALENT_YIELDS') {
            // 按同效产量比例分摊（标准产量 = 实际产量 × 转换系数）
            const equivalentYieldResult = await this.executeEquivalentYieldAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              schedule,
              shiftLines,
              lineToWorkshop,
              indirectHoursAttendanceCodeId,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += equivalentYieldResult;
          } else if (rule.allocationBasis === 'STANDARD_HOURS') {
            // 按标准工时比例分摊（标准工时 = 实际产量 × 产品标准工时）
            const standardHoursResult = await this.executeStandardHoursAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              schedule,
              shiftLines,
              lineToWorkshop,
              indirectHoursAttendanceCodeId,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += standardHoursResult;
          }
        }
      }
    }

    return resultCount;
  }

  /**
   * 按实际工时比例分摊
   */
  private async executeActualHoursAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      schedule,
      shiftLines,
      lineToWorkshop,
      actualHoursAttendanceCodeId,
      indirectHoursAttendanceCodeId,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 获取当天所有班次的直接工时数据（按产线汇总）
    const directHoursByLine = await this.getDirectHoursByLine({
      calcDate,
      actualHoursAttendanceCodeId,
    });

    // 获取分摊范围配置
    let allocationScopeConfig: any = null;
    let allocationScopeLevel = 1; // 默认为工厂级别

    if (rule.allocationScopeId) {
      allocationScopeConfig = await this.prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      allocationScopeLevel = allocationScopeConfig?.level || 1;
    }

    // 确定源账户所属的层级（工厂、车间或产线）
    let sourceScopeId: number | null = null;

    if (calcResult.accountId) {
      // 通过账户ID获取层级信息
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
      });

      if (sourceAccount) {
        // 尝试从hierarchyValues中获取对应层级的ID
        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '[]');

          // hierarchyValues是一个数组，根据分摊范围的level来查找对应层级
          if (Array.isArray(hierarchyValues)) {
            // 根据分摊范围的level确定对应的levelId: 1=工厂(28), 2=车间(29), 3=线体(30)
            const targetLevelId = allocationScopeLevel === 1 ? 28 : allocationScopeLevel === 2 ? 29 : 30;

            const scopeLevel = hierarchyValues.find((hv: any) => hv.levelId === targetLevelId);
            if (scopeLevel && scopeLevel.selectedValue && scopeLevel.selectedValue.id) {
              sourceScopeId = scopeLevel.selectedValue.id;
              console.log(`从hierarchyValues解析出层级ID (${allocationScopeConfig?.name || '层级'}): ${sourceScopeId}`);
            } else {
              console.log(`未找到levelId=${targetLevelId}的层级配置，hierarchyValues:`, hierarchyValues.map(hv => ({ levelId: hv.levelId, name: hv.name })));
            }
          }
        } catch (e) {
          // 解析失败
          console.log(`解析hierarchyValues失败: ${e}`);
        }
      }
    }

    if (!sourceScopeId) {
      console.log(`无法确定源账户 ${calcResult.accountName} 所属的${allocationScopeConfig?.name || '层级'}，跳过分摊`);
      return 0;
    }

    console.log(`源账户: ${calcResult.accountName}，所属${allocationScopeConfig?.name || '层级'}ID: ${sourceScopeId}`);

    // 根据分摊范围配置获取映射
    let lineToScope: Record<number, number>;
    let scopeName = '层级';

    if (rule.allocationScopeId) {
      // 使用配置的层级
      scopeName = allocationScopeConfig?.name || '层级';
      lineToScope = await this.getLineToHierarchyMapping(shiftLines, rule.allocationScopeId);
    } else {
      // 默认使用车间级别
      lineToScope = lineToWorkshop;
      scopeName = '车间';
    }

    // 过滤shiftLines，只保留属于源账户所在层级的产线
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      if (!lineShift.line) return false;
      const lineScopeId = lineToScope[lineShift.line.id];
      return lineScopeId === sourceScopeId;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到属于${allocationScopeConfig?.name || '工厂'} ${sourceScopeId} 的产线，跳过分摊`);
      return 0;
    }

    // 计算分摊范围的总工时（只计算有直接工时的产线）
    const scopeTotalHours: Record<number, number> = {};
    for (const lineId in lineToScope) {
      const scopeId = lineToScope[lineId];
      // 只统计属于源层级的产线
      if (scopeId === sourceScopeId) {
        if (!scopeTotalHours[scopeId]) {
          scopeTotalHours[scopeId] = 0;
        }
      }
    }
    for (const lineId in directHoursByLine) {
      const scopeId = lineToScope[lineId];
      // 只统计属于源层级的产线
      if (scopeId === sourceScopeId && scopeTotalHours[scopeId] !== undefined) {
        scopeTotalHours[scopeId] += directHoursByLine[lineId];
      }
    }

    const scopeDirectHours = scopeTotalHours[sourceScopeId] || 0;

    if (scopeDirectHours === 0) {
      console.log(`车间 ${sourceScopeId} 的直接工时为0，跳过分摊`);
      return 0;
    }

    console.log(`车间 ${sourceScopeId} 的总直接工时: ${scopeDirectHours}`);

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到有直接工时的产线）
    for (const lineShift of filteredShiftLines) {
      const line = lineShift.line;

      if (!line) {
        continue;
      }

      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(line, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户
      const targetAccount = await this.getLineIndirectAccount(line);

      if (!targetAccount) {
        console.log(`产线 ${line.name} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊
      const lineDirectHours = directHoursByLine[line.id] || 0;

      // 如果产线没有直接工时，跳过
      if (lineDirectHours === 0) {
        console.log(`产线 ${line.name} 没有直接工时，跳过分摊`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = lineDirectHours / scopeDirectHours;
      const allocatedHours = calcResult.actualHours * allocationRatio;

      console.log(`产线 ${line.name}: 直接工时=${lineDirectHours}, 系数=${allocationRatio.toFixed(4)}, 分摊工时=${allocatedHours.toFixed(2)}`);

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 创建分摊结果记录
        await this.prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: config.id,
            configVersion: config.version,
            ruleId: rule.id,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee.name,
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineDirectHours,
            weightValue: scopeDirectHours,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（CalcResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.prisma.calcResult.create({
          data: {
            employeeNo: calcResult.employeeNo,
            calcDate: calcDate,
            shiftId: schedule.shiftId,
            shiftName: schedule.shift.name,
            attendanceCodeId: indirectHoursAttendanceCodeId,
            standardHours: 0, // 间接工时没有标准工时
            actualHours: allocatedHours,
            overtimeHours: 0,
            leaveHours: 0,
            absenceHours: 0,
            accountHours: JSON.stringify([{
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              hours: allocatedHours,
            }]),
            accountId: targetAccount.id,
            accountName: targetAccount.name,
            exceptions: '[]',
            status: 'PENDING',
          },
        });

        resultCount++;
      }
    }

    return resultCount;
  }

  /**
   * 按实际产量比例分摊
   */
  private async executeActualYieldAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      schedule,
      shiftLines,
      lineToWorkshop,
      indirectHoursAttendanceCodeId,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 获取分摊范围配置
    let allocationScopeConfig: any = null;
    let allocationScopeLevel = 1; // 默认为工厂级别

    if (rule.allocationScopeId) {
      allocationScopeConfig = await this.prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      allocationScopeLevel = allocationScopeConfig?.level || 1;
    }

    // 确定源账户所属的层级（工厂、车间或产线）
    let sourceScopeId: number | null = null;

    if (calcResult.accountId) {
      // 通过账户ID获取层级信息
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
      });

      if (sourceAccount) {
        // 尝试从hierarchyValues中获取对应层级的ID
        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '[]');

          // hierarchyValues是一个数组，根据分摊范围的level来查找对应层级
          if (Array.isArray(hierarchyValues)) {
            // 根据分摊范围的level确定对应的levelId: 1=工厂(28), 2=车间(29), 3=线体(30)
            const targetLevelId = allocationScopeLevel === 1 ? 28 : allocationScopeLevel === 2 ? 29 : 30;

            const scopeLevel = hierarchyValues.find((hv: any) => hv.levelId === targetLevelId);
            if (scopeLevel && scopeLevel.selectedValue && scopeLevel.selectedValue.id) {
              sourceScopeId = scopeLevel.selectedValue.id;
              console.log(`从hierarchyValues解析出层级ID (${allocationScopeConfig?.name || '层级'}): ${sourceScopeId}`);
            } else {
              console.log(`未找到levelId=${targetLevelId}的层级配置，hierarchyValues:`, hierarchyValues.map(hv => ({ levelId: hv.levelId, name: hv.name })));
            }
          }
        } catch (e) {
          // 解析失败
          console.log(`解析hierarchyValues失败: ${e}`);
        }
      }
    }

    if (!sourceScopeId) {
      console.log(`无法确定源账户 ${calcResult.accountName} 所属的${allocationScopeConfig?.name || '层级'}，跳过分摊`);
      return 0;
    }

    console.log(`源账户: ${calcResult.accountName}，所属${allocationScopeConfig?.name || '层级'}ID: ${sourceScopeId}`);

    // 获取当天各产线的实际产量数据
    const productionByLine = await this.getProductionByLine({
      calcDate,
    });

    // 根据分摊范围配置获取映射
    let lineToScope: Record<number, number>;
    let scopeName = '层级';

    if (rule.allocationScopeId) {
      // 使用配置的层级
      scopeName = allocationScopeConfig?.name || '层级';
      lineToScope = await this.getLineToHierarchyMapping(shiftLines, rule.allocationScopeId);
    } else {
      // 默认使用车间级别
      lineToScope = lineToWorkshop;
      scopeName = '车间';
    }

    // 过滤shiftLines，只保留属于源账户所在层级的产线
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      if (!lineShift.line) return false;
      const lineScopeId = lineToScope[lineShift.line.id];
      return lineScopeId === sourceScopeId;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到属于车间 ${sourceScopeId} 的产线，跳过分摊`);
      return 0;
    }

    // 计算分摊范围的总产量（只计算属于源车间的产线）
    const scopeTotalProduction: Record<string, number> = {};
    for (const key in productionByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const scopeId = lineToScope[lineId];
      // 只统计属于源车间的产线
      if (scopeId === sourceScopeId) {
        const scopeKey = `${scopeId}-${shiftId}`;
        if (!scopeTotalProduction[scopeKey]) {
          scopeTotalProduction[scopeKey] = 0;
        }
        scopeTotalProduction[scopeKey] += productionByLine[key];
      }
    }

    const scopeProduction = scopeTotalProduction[`${sourceScopeId}-${schedule.shiftId}`] || 0;

    if (scopeProduction === 0) {
      console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的实际产量为0，跳过分摊`);
      return 0;
    }

    console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的总实际产量: ${scopeProduction}`);

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      const line = lineShift.line;

      if (!line) {
        continue;
      }

      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(line, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户
      const targetAccount = await this.getLineIndirectAccount(line);

      if (!targetAccount) {
        console.log(`产线 ${line.name} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的产量数据
      const lineProductionKey = `${line.id}-${schedule.shiftId}`;
      const lineProduction = productionByLine[lineProductionKey] || 0;

      if (lineProduction === 0) {
        console.log(`产线 ${line.name} 班次 ${schedule.shift.name} 的实际产量为0，跳过`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = lineProduction / scopeProduction;
      const allocatedHours = calcResult.actualHours * allocationRatio;

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 创建分摊结果记录
        await this.prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: config.id,
            configVersion: config.version,
            ruleId: rule.id,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee.name,
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineProduction,
            weightValue: scopeProduction,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（CalcResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.prisma.calcResult.create({
          data: {
            employeeNo: calcResult.employeeNo,
            calcDate: calcDate,
            shiftId: schedule.shiftId,
            shiftName: schedule.shift.name,
            attendanceCodeId: indirectHoursAttendanceCodeId,
            standardHours: 0, // 间接工时没有标准工时
            actualHours: allocatedHours,
            overtimeHours: 0,
            leaveHours: 0,
            absenceHours: 0,
            accountHours: JSON.stringify([{
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              hours: allocatedHours,
            }]),
            accountId: targetAccount.id,
            accountName: targetAccount.name,
            exceptions: '[]',
            status: 'PENDING',
          },
        });

        resultCount++;
      }
    }

    return resultCount;
  }

  /**
   * 按同效产量比例分摊（标准产量 = 实际产量 × 转换系数）
   */
  private async executeEquivalentYieldAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      schedule,
      shiftLines,
      lineToWorkshop,
      indirectHoursAttendanceCodeId,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 获取分摊范围配置
    let allocationScopeConfig: any = null;
    let allocationScopeLevel = 1; // 默认为工厂级别

    if (rule.allocationScopeId) {
      allocationScopeConfig = await this.prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      allocationScopeLevel = allocationScopeConfig?.level || 1;
    }

    // 确定源账户所属的层级（工厂、车间或产线）
    let sourceScopeId: number | null = null;

    if (calcResult.accountId) {
      // 通过账户ID获取层级信息
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
      });

      if (sourceAccount) {
        // 尝试从hierarchyValues中获取对应层级的ID
        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '[]');

          // hierarchyValues是一个数组，根据分摊范围的level来查找对应层级
          if (Array.isArray(hierarchyValues)) {
            // 根据分摊范围的level确定对应的levelId: 1=工厂(28), 2=车间(29), 3=线体(30)
            const targetLevelId = allocationScopeLevel === 1 ? 28 : allocationScopeLevel === 2 ? 29 : 30;

            const scopeLevel = hierarchyValues.find((hv: any) => hv.levelId === targetLevelId);
            if (scopeLevel && scopeLevel.selectedValue && scopeLevel.selectedValue.id) {
              sourceScopeId = scopeLevel.selectedValue.id;
              console.log(`从hierarchyValues解析出层级ID (${allocationScopeConfig?.name || '层级'}): ${sourceScopeId}`);
            } else {
              console.log(`未找到levelId=${targetLevelId}的层级配置，hierarchyValues:`, hierarchyValues.map(hv => ({ levelId: hv.levelId, name: hv.name })));
            }
          }
        } catch (e) {
          // 解析失败
          console.log(`解析hierarchyValues失败: ${e}`);
        }
      }
    }

    if (!sourceScopeId) {
      console.log(`无法确定源账户 ${calcResult.accountName} 所属的${allocationScopeConfig?.name || '层级'}，跳过分摊`);
      return 0;
    }

    console.log(`源账户: ${calcResult.accountName}，所属${allocationScopeConfig?.name || '层级'}ID: ${sourceScopeId}`);

    // 获取当天各产线的标准产量数据（实际产量 × 转换系数）
    const equivalentProductionByLine = await this.getEquivalentProductionByLine({
      calcDate,
    });

    // 根据分摊范围配置获取映射
    let lineToScope: Record<number, number>;
    let scopeName = '层级';

    if (rule.allocationScopeId) {
      // 使用配置的层级
      scopeName = allocationScopeConfig?.name || '层级';
      lineToScope = await this.getLineToHierarchyMapping(shiftLines, rule.allocationScopeId);
    } else {
      // 默认使用车间级别
      lineToScope = lineToWorkshop;
      scopeName = '车间';
    }

    // 过滤shiftLines，只保留属于源账户所在层级的产线
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      if (!lineShift.line) return false;
      const lineScopeId = lineToScope[lineShift.line.id];
      return lineScopeId === sourceScopeId;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到属于${allocationScopeConfig?.name || '工厂'} ${sourceScopeId} 的产线，跳过分摊`);
      return 0;
    }

    // 计算分摊范围的总标准产量（只计算属于源层级的产线）
    const scopeTotalEquivalentProduction: Record<string, number> = {};
    for (const key in equivalentProductionByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const scopeId = lineToScope[lineId];
      // 只统计属于源层级的产线
      if (scopeId === sourceScopeId) {
        const scopeKey = `${scopeId}-${shiftId}`;
        if (!scopeTotalEquivalentProduction[scopeKey]) {
          scopeTotalEquivalentProduction[scopeKey] = 0;
        }
        scopeTotalEquivalentProduction[scopeKey] += equivalentProductionByLine[key];
      }
    }

    const scopeEquivalentProduction = scopeTotalEquivalentProduction[`${sourceScopeId}-${schedule.shiftId}`] || 0;

    if (scopeEquivalentProduction === 0) {
      console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的标准产量为0，跳过分摊`);
      return 0;
    }

    console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的总标准产量: ${scopeEquivalentProduction}`);

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      const line = lineShift.line;

      if (!line) {
        continue;
      }

      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(line, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户
      const targetAccount = await this.getLineIndirectAccount(line);

      if (!targetAccount) {
        console.log(`产线 ${line.name} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的标准产量数据
      const lineProductionKey = `${line.id}-${schedule.shiftId}`;
      const lineEquivalentProduction = equivalentProductionByLine[lineProductionKey] || 0;

      if (lineEquivalentProduction === 0) {
        console.log(`产线 ${line.name} 班次 ${schedule.shift.name} 的标准产量为0，跳过`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = lineEquivalentProduction / scopeEquivalentProduction;
      const allocatedHours = calcResult.actualHours * allocationRatio;

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 创建分摊结果记录
        await this.prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: config.id,
            configVersion: config.version,
            ruleId: rule.id,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee.name,
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineEquivalentProduction,
            weightValue: scopeEquivalentProduction,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（CalcResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.prisma.calcResult.create({
          data: {
            employeeNo: calcResult.employeeNo,
            calcDate: calcDate,
            shiftId: schedule.shiftId,
            shiftName: schedule.shift.name,
            attendanceCodeId: indirectHoursAttendanceCodeId,
            standardHours: 0, // 间接工时没有标准工时
            actualHours: allocatedHours,
            overtimeHours: 0,
            leaveHours: 0,
            absenceHours: 0,
            accountHours: JSON.stringify([{
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              hours: allocatedHours,
            }]),
            accountId: targetAccount.id,
            accountName: targetAccount.name,
            exceptions: '[]',
            status: 'PENDING',
          },
        });

        resultCount++;
      }
    }

    return resultCount;
  }

  /**
   * 按标准工时比例分摊（标准工时 = 实际产量 × 产品标准工时）
   */
  private async executeStandardHoursAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      schedule,
      shiftLines,
      lineToWorkshop,
      indirectHoursAttendanceCodeId,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 获取分摊范围配置
    let allocationScopeConfig: any = null;
    let allocationScopeLevel = 1; // 默认为工厂级别

    if (rule.allocationScopeId) {
      allocationScopeConfig = await this.prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      allocationScopeLevel = allocationScopeConfig?.level || 1;
    }

    // 确定源账户所属的层级（工厂、车间或产线）
    let sourceScopeId: number | null = null;

    if (calcResult.accountId) {
      // 通过账户ID获取层级信息
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
      });

      if (sourceAccount) {
        // 尝试从hierarchyValues中获取对应层级的ID
        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '[]');

          // hierarchyValues是一个数组，根据分摊范围的level来查找对应层级
          if (Array.isArray(hierarchyValues)) {
            // 根据分摊范围的level确定对应的levelId: 1=工厂(28), 2=车间(29), 3=线体(30)
            const targetLevelId = allocationScopeLevel === 1 ? 28 : allocationScopeLevel === 2 ? 29 : 30;

            const scopeLevel = hierarchyValues.find((hv: any) => hv.levelId === targetLevelId);
            if (scopeLevel && scopeLevel.selectedValue && scopeLevel.selectedValue.id) {
              sourceScopeId = scopeLevel.selectedValue.id;
              console.log(`从hierarchyValues解析出层级ID (${allocationScopeConfig?.name || '层级'}): ${sourceScopeId}`);
            } else {
              console.log(`未找到levelId=${targetLevelId}的层级配置，hierarchyValues:`, hierarchyValues.map(hv => ({ levelId: hv.levelId, name: hv.name })));
            }
          }
        } catch (e) {
          // 解析失败
          console.log(`解析hierarchyValues失败: ${e}`);
        }
      }
    }

    if (!sourceScopeId) {
      console.log(`无法确定源账户 ${calcResult.accountName} 所属的${allocationScopeConfig?.name || '层级'}，跳过分摊`);
      return 0;
    }

    console.log(`源账户: ${calcResult.accountName}，所属${allocationScopeConfig?.name || '层级'}ID: ${sourceScopeId}`);

    // 获取当天各产线的标准工时数据（实际产量 × 产品标准工时）
    const standardHoursByLine = await this.getStandardHoursByLine({
      calcDate,
    });

    // 根据分摊范围配置获取映射
    let lineToScope: Record<number, number>;
    let scopeName = '层级';

    if (rule.allocationScopeId) {
      // 使用配置的层级
      scopeName = allocationScopeConfig?.name || '层级';
      lineToScope = await this.getLineToHierarchyMapping(shiftLines, rule.allocationScopeId);
    } else {
      // 默认使用车间级别
      lineToScope = lineToWorkshop;
      scopeName = '车间';
    }

    // 过滤shiftLines，只保留属于源账户所在层级的产线
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      if (!lineShift.line) return false;
      const lineScopeId = lineToScope[lineShift.line.id];
      return lineScopeId === sourceScopeId;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    // 输出过滤后的产线列表
    console.log(`[executeStandardHoursAllocation] 过滤后的产线列表:`);
    for (const lineShift of filteredShiftLines) {
      console.log(`  - 产线ID: ${lineShift.line?.id}, 产线名称: ${lineShift.line?.name}, 班次ID: ${lineShift.shiftId}`);
    }

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到属于${allocationScopeConfig?.name || '工厂'} ${sourceScopeId} 的产线，跳过分摊`);
      return 0;
    }

    // 计算分摊范围的总标准工时（只计算属于源层级的产线）
    const scopeTotalStandardHours: Record<string, number> = {};
    for (const key in standardHoursByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const scopeId = lineToScope[lineId];
      // 只统计属于源层级的产线
      if (scopeId === sourceScopeId) {
        const scopeKey = `${scopeId}-${shiftId}`;
        if (!scopeTotalStandardHours[scopeKey]) {
          scopeTotalStandardHours[scopeKey] = 0;
        }
        scopeTotalStandardHours[scopeKey] += standardHoursByLine[key];
      }
    }

    const scopeStandardHours = scopeTotalStandardHours[`${sourceScopeId}-${schedule.shiftId}`] || 0;

    if (scopeStandardHours === 0) {
      console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的标准工时为0，跳过分摊`);
      return 0;
    }

    console.log(`车间 ${sourceScopeId} 班次 ${schedule.shift.name} 的总标准工时: ${scopeStandardHours}`);

    // 输出所有标准工时数据用于调试
    console.log(`[executeStandardHoursAllocation] 所有标准工时数据:`);
    for (const key in standardHoursByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const scopeId = lineToScope[lineId];
      console.log(`  产线 ${lineId} (车间 ${scopeId}) 班次 ${shiftId}: ${standardHoursByLine[key]}`);
    }

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      const line = lineShift.line;

      if (!line) {
        continue;
      }

      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(line, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户
      const targetAccount = await this.getLineIndirectAccount(line);

      if (!targetAccount) {
        console.log(`产线 ${line.name} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的标准工时数据
      const lineProductionKey = `${line.id}-${schedule.shiftId}`;
      const lineStandardHours = standardHoursByLine[lineProductionKey] || 0;

      if (lineStandardHours === 0) {
        console.log(`产线 ${line.name} 班次 ${schedule.shift.name} 的标准工时为0，跳过`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = lineStandardHours / scopeStandardHours;
      const allocatedHours = calcResult.actualHours * allocationRatio;

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 创建分摊结果记录
        await this.prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: config.id,
            configVersion: config.version,
            ruleId: rule.id,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee.name,
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineStandardHours,
            weightValue: scopeStandardHours,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（CalcResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.prisma.calcResult.create({
          data: {
            employeeNo: calcResult.employeeNo,
            calcDate: calcDate,
            shiftId: schedule.shiftId,
            shiftName: schedule.shift.name,
            attendanceCodeId: indirectHoursAttendanceCodeId,
            standardHours: 0, // 间接工时没有标准工时
            actualHours: allocatedHours,
            overtimeHours: 0,
            leaveHours: 0,
            absenceHours: 0,
            accountHours: JSON.stringify([{
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              hours: allocatedHours,
            }]),
            accountId: targetAccount.id,
            accountName: targetAccount.name,
            exceptions: '[]',
            status: 'PENDING',
          },
        });

        resultCount++;
      }
    }

    return resultCount;
  }

  /**
   * 按日期分组工时结果
   */
  private groupCalcResultsByDate(calcResults: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const result of calcResults) {
      const dateKey = result.calcDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(result);
    }
    return grouped;
  }

  /**
   * 获取指定日期各产线的直接工时
   * 通过劳动力账户路径关联产线，按产线汇总直接工时
   */
  private async getDirectHoursByLine(params: { calcDate: Date; actualHoursAttendanceCodeId: number }): Promise<Record<number, number>> {
    const { calcDate, actualHoursAttendanceCodeId } = params;

    // 获取当天的工时结果（直接工时）
    const directResults = await this.prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursAttendanceCodeId,
        accountId: { not: null }, // 必须有账户ID
      },
    });

    if (directResults.length === 0) {
      return {};
    }

    // 获取所有产线
    const productionLines = await this.prisma.productionLine.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // 建立产线名称匹配模式
    const linePatterns: Record<string, any> = {};
    for (const line of productionLines) {
      linePatterns[line.name] = line;
      // 注意：不使用 line.orgName 作为模式，因为它会被多个产线共享
      // 导致最后的产线覆盖前面的，造成错误的匹配
      // linePatterns[line.orgName] = line;
      // 支持 "L1线体" → "L1产线" 的映射
      const match = line.name.match(/L(\d)产线/);
      if (match) {
        const num = match[1];
        linePatterns[`L${num}线体`] = line;
      }
    }

    // 获取所有涉及的劳动力账户
    const accountIds = [...new Set(directResults.map(r => r.accountId).filter(id => id !== null))];
    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: accountIds as number[] },
      },
    });

    // 建立账户ID到产线的映射
    const accountToLine: Record<number, any> = {};
    for (const account of accounts) {
      // 从账户名称路径中提取产线标识
      // 格式：富阳工厂/W1总装车间/L1线体////直接设备
      const pathParts = account.name.split('/');
      for (const part of pathParts) {
        if (linePatterns[part]) {
          accountToLine[account.id] = linePatterns[part];
          break;
        }
      }
    }

    // 按产线汇总直接工时
    const directHoursByLine: Record<number, number> = {};

    for (const result of directResults) {
      // 通过工时的劳动力账户ID找到对应的产线
      if (result.accountId && accountToLine[result.accountId]) {
        const line = accountToLine[result.accountId];
        if (!directHoursByLine[line.id]) {
          directHoursByLine[line.id] = 0;
        }
        directHoursByLine[line.id] += result.actualHours;
      }
    }

    return directHoursByLine;
  }

  /**
   * 获取指定日期各产线的实际产量
   * 从产量记录表中获取，按产线汇总
   */
  private async getProductionByLine(params: { calcDate: Date }): Promise<Record<string, number>> {
    const { calcDate } = params;

    // 获取当天的产量记录
    const productionRecords = await this.prisma.productionRecord.findMany({
      where: {
        recordDate: calcDate,
        deletedAt: null,
      },
    });

    // 按产线和班次汇总实际产量
    // Key格式: "lineId-shiftId"
    const productionByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (record.lineId && record.shiftId) {
        const key = `${record.lineId}-${record.shiftId}`;
        if (!productionByLineAndShift[key]) {
          productionByLineAndShift[key] = 0;
        }
        // 使用实际产量
        productionByLineAndShift[key] += record.actualQty || 0;
      }
    }

    return productionByLineAndShift;
  }

  /**
   * 获取指定日期各产线的标准产量（同效产量）
   * 标准产量 = 实际产量 × 产品转换系数
   * 从产量记录表中获取，关联产品表获取转换系数，按产线汇总
   */
  private async getEquivalentProductionByLine(params: { calcDate: Date }): Promise<Record<string, number>> {
    const { calcDate } = params;

    // 获取当天的产量记录，包含产品信息
    const productionRecords = await this.prisma.productionRecord.findMany({
      where: {
        recordDate: calcDate,
        deletedAt: null,
      },
      include: {
        product: true, // 包含产品信息以获取转换系数
      },
    });

    // 按产线和班次汇总标准产量
    // Key格式: "lineId-shiftId"
    const equivalentProductionByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (record.lineId && record.shiftId && record.product) {
        const key = `${record.lineId}-${record.shiftId}`;
        if (!equivalentProductionByLineAndShift[key]) {
          equivalentProductionByLineAndShift[key] = 0;
        }
        // 标准产量 = 实际产量 × 转换系数
        const conversionFactor = record.product.conversionFactor || 1.0;
        equivalentProductionByLineAndShift[key] += (record.actualQty || 0) * conversionFactor;
      }
    }

    return equivalentProductionByLineAndShift;
  }

  /**
   * 获取指定日期各产线的标准工时
   * 标准工时 = 实际产量 × 产品标准工时
   * 从产量记录表中获取，关联产品表获取标准工时，按产线汇总
   */
  private async getStandardHoursByLine(params: { calcDate: Date }): Promise<Record<string, number>> {
    const { calcDate } = params;

    console.log(`[getStandardHoursByLine] 开始获取 ${calcDate.toISOString()} 的标准工时数据`);

    // 获取当天的产量记录，包含产品信息
    const productionRecords = await this.prisma.productionRecord.findMany({
      where: {
        recordDate: calcDate,
        deletedAt: null,
      },
      include: {
        product: true, // 包含产品信息以获取标准工时
      },
    });

    console.log(`[getStandardHoursByLine] 查询到 ${productionRecords.length} 条产量记录`);

    // 按产线和班次汇总标准工时
    // Key格式: "lineId-shiftId"
    const standardHoursByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (record.lineId && record.shiftId && record.product) {
        const key = `${record.lineId}-${record.shiftId}`;
        if (!standardHoursByLineAndShift[key]) {
          standardHoursByLineAndShift[key] = 0;
        }
        // 标准工时 = 实际产量 × 产品标准工时
        const productStandardHours = record.product.standardHours || 0;
        const actualQty = record.actualQty || 0;
        const calculatedHours = actualQty * productStandardHours;
        standardHoursByLineAndShift[key] += calculatedHours;

        console.log(`[getStandardHoursByLine] 产线ID: ${record.lineId}, 班次ID: ${record.shiftId}, ` +
                    `产品: ${record.product.name}, 实际产量: ${actualQty}, 产品标准工时: ${productStandardHours}, ` +
                    `计算标准工时: ${calculatedHours}, 累计: ${standardHoursByLineAndShift[key]}`);
      } else {
        if (!record.lineId) {
          console.log(`[getStandardHoursByLine] 产量记录缺少产线ID: ${record.id}`);
        }
        if (!record.shiftId) {
          console.log(`[getStandardHoursByLine] 产量记录缺少班次ID: ${record.id}`);
        }
        if (!record.product) {
          console.log(`[getStandardHoursByLine] 产量记录 ${record.id} 缺少产品信息`);
        }
      }
    }

    const keys = Object.keys(standardHoursByLineAndShift);
    console.log(`[getStandardHoursByLine] 最终返回 ${keys.length} 个产线-班次组合的标准工时数据`);
    for (const key of keys) {
      console.log(`[getStandardHoursByLine] ${key}: ${standardHoursByLineAndShift[key]}`);
    }

    return standardHoursByLineAndShift;
  }

  /**
   * 获取指定日期的开线情况
   * 只返回参与分摊的产线（participateInAllocation = true）
   */
  private async getActiveLinesForDate(calcDate: Date): Promise<any[]> {
    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        scheduleDate: calcDate,
        status: 'ACTIVE',
        participateInAllocation: true, // 只获取参与分摊的产线
        deletedAt: null,
      },
      include: {
        line: true,
      },
    });

    return lineShifts;
  }

  /**
   * 获取产线到车间的映射
   */
  private getLineToWorkshopMapping(lineShifts: any[]): Record<number, number> {
    const mapping: Record<number, number> = {};

    for (const lineShift of lineShifts) {
      if (lineShift.line) {
        mapping[lineShift.line.id] = lineShift.line.workshopId;
      }
    }

    return mapping;
  }

  /**
   * 计算每条产线所属车间的总直接工时
   */
  private calculateWorkshopTotalHours(
    directHoursByLine: Record<number, number>,
    lineToWorkshop: Record<number, number>
  ): Record<number, number> {
    const workshopTotalHours: Record<number, number> = {};

    // 初始化
    for (const lineId in lineToWorkshop) {
      const workshopId = lineToWorkshop[lineId];
      if (!workshopTotalHours[workshopId]) {
        workshopTotalHours[workshopId] = 0;
      }
    }

    // 汇总
    for (const lineId in directHoursByLine) {
      const workshopId = lineToWorkshop[lineId];
      if (workshopId && workshopTotalHours[workshopId] !== undefined) {
        workshopTotalHours[workshopId] += directHoursByLine[lineId];
      }
    }

    return workshopTotalHours;
  }

  /**
   * 计算每条产线所属车间的总实际产量
   */
  private calculateWorkshopTotalProduction(
    productionByLineAndShift: Record<string, number>,
    lineToWorkshop: Record<number, number>
  ): Record<string, number> {
    const workshopTotalProduction: Record<string, number> = {};

    // 汇总：按车间和班次统计
    // Key格式: "workshopId-shiftId"
    for (const key in productionByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const workshopId = lineToWorkshop[lineId];

      if (workshopId) {
        const workshopKey = `${workshopId}-${shiftId}`;
        if (!workshopTotalProduction[workshopKey]) {
          workshopTotalProduction[workshopKey] = 0;
        }
        workshopTotalProduction[workshopKey] += productionByLineAndShift[key];
      }
    }

    return workshopTotalProduction;
  }

  /**
   * 计算每条产线所属车间的总标准产量（同效产量）
   */
  private calculateWorkshopEquivalentProduction(
    equivalentProductionByLineAndShift: Record<string, number>,
    lineToWorkshop: Record<number, number>
  ): Record<string, number> {
    const workshopTotalEquivalentProduction: Record<string, number> = {};

    // 汇总：按车间和班次统计
    // Key格式: "workshopId-shiftId"
    for (const key in equivalentProductionByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const workshopId = lineToWorkshop[lineId];

      if (workshopId) {
        const workshopKey = `${workshopId}-${shiftId}`;
        if (!workshopTotalEquivalentProduction[workshopKey]) {
          workshopTotalEquivalentProduction[workshopKey] = 0;
        }
        workshopTotalEquivalentProduction[workshopKey] += equivalentProductionByLineAndShift[key];
      }
    }

    return workshopTotalEquivalentProduction;
  }

  /**
   * 计算每条产线所属车间的总标准工时
   */
  private calculateWorkshopTotalStandardHours(
    standardHoursByLineAndShift: Record<string, number>,
    lineToWorkshop: Record<number, number>
  ): Record<string, number> {
    const workshopTotalStandardHours: Record<string, number> = {};

    // 汇总：按车间和班次统计
    // Key格式: "workshopId-shiftId"
    for (const key in standardHoursByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const workshopId = lineToWorkshop[lineId];

      if (workshopId) {
        const workshopKey = `${workshopId}-${shiftId}`;
        if (!workshopTotalStandardHours[workshopKey]) {
          workshopTotalStandardHours[workshopKey] = 0;
        }
        workshopTotalStandardHours[workshopKey] += standardHoursByLineAndShift[key];
      }
    }

    return workshopTotalStandardHours;
  }

  /**
   * 获取产线到工厂的映射
   */
  private getLineToFactoryMapping(lineShifts: any[]): Record<number, number> {
    const mapping: Record<number, number> = {};

    for (const lineShift of lineShifts) {
      if (lineShift.line) {
        mapping[lineShift.line.id] = lineShift.line.orgId;
      }
    }

    return mapping;
  }

  /**
   * 计算每条产线所属工厂的总直接工时
   */
  private calculateFactoryTotalHours(
    directHoursByLine: Record<number, number>,
    lineToFactory: Record<number, number>
  ): Record<number, number> {
    const factoryTotalHours: Record<number, number> = {};

    // 初始化
    for (const lineId in lineToFactory) {
      const factoryId = lineToFactory[lineId];
      if (!factoryTotalHours[factoryId]) {
        factoryTotalHours[factoryId] = 0;
      }
    }

    // 汇总
    for (const lineId in directHoursByLine) {
      const factoryId = lineToFactory[lineId];
      if (factoryId && factoryTotalHours[factoryId] !== undefined) {
        factoryTotalHours[factoryId] += directHoursByLine[lineId];
      }
    }

    return factoryTotalHours;
  }

  /**
   * 计算每条产线所属工厂的总实际产量
   */
  private calculateFactoryTotalProduction(
    productionByLineAndShift: Record<string, number>,
    lineToFactory: Record<number, number>
  ): Record<string, number> {
    const factoryTotalProduction: Record<string, number> = {};

    // 汇总：按工厂和班次统计
    // Key格式: "factoryId-shiftId"
    for (const key in productionByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const factoryId = lineToFactory[lineId];

      if (factoryId) {
        const factoryKey = `${factoryId}-${shiftId}`;
        if (!factoryTotalProduction[factoryKey]) {
          factoryTotalProduction[factoryKey] = 0;
        }
        factoryTotalProduction[factoryKey] += productionByLineAndShift[key];
      }
    }

    return factoryTotalProduction;
  }

  /**
   * 计算每条产线所属工厂的总标准产量（同效产量）
   */
  private calculateFactoryEquivalentProduction(
    equivalentProductionByLineAndShift: Record<string, number>,
    lineToFactory: Record<number, number>
  ): Record<string, number> {
    const factoryTotalEquivalentProduction: Record<string, number> = {};

    // 汇总：按工厂和班次统计
    // Key格式: "factoryId-shiftId"
    for (const key in equivalentProductionByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const factoryId = lineToFactory[lineId];

      if (factoryId) {
        const factoryKey = `${factoryId}-${shiftId}`;
        if (!factoryTotalEquivalentProduction[factoryKey]) {
          factoryTotalEquivalentProduction[factoryKey] = 0;
        }
        factoryTotalEquivalentProduction[factoryKey] += equivalentProductionByLineAndShift[key];
      }
    }

    return factoryTotalEquivalentProduction;
  }

  /**
   * 计算每条产线所属工厂的总标准工时
   */
  private calculateFactoryTotalStandardHours(
    standardHoursByLineAndShift: Record<string, number>,
    lineToFactory: Record<number, number>
  ): Record<string, number> {
    const factoryTotalStandardHours: Record<string, number> = {};

    // 汇总：按工厂和班次统计
    // Key格式: "factoryId-shiftId"
    for (const key in standardHoursByLineAndShift) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const factoryId = lineToFactory[lineId];

      if (factoryId) {
        const factoryKey = `${factoryId}-${shiftId}`;
        if (!factoryTotalStandardHours[factoryKey]) {
          factoryTotalStandardHours[factoryKey] = 0;
        }
        factoryTotalStandardHours[factoryKey] += standardHoursByLineAndShift[key];
      }
    }

    return factoryTotalStandardHours;
  }

  /**
   * 根据层级配置获取产线到层级的映射
   * @param lineShifts 产线班次列表
   * @param hierarchyLevelId 层级配置ID
   * @returns 产线ID到层级ID的映射
   */
  private async getLineToHierarchyMapping(
    lineShifts: any[],
    hierarchyLevelId: number
  ): Promise<Record<number, number>> {
    // 获取层级配置
    const hierarchyConfig = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id: hierarchyLevelId },
    });

    if (!hierarchyConfig) {
      console.warn(`层级配置 ${hierarchyLevelId} 不存在，使用车间级别`);
      return this.getLineToWorkshopMapping(lineShifts);
    }

    const mapping: Record<number, number> = {};
    const mappingType = hierarchyConfig.mappingType;
    const mappingValue = hierarchyConfig.mappingValue;

    // 根据映射类型和映射值确定使用哪个字段
    for (const lineShift of lineShifts) {
      if (!lineShift.line) continue;

      const line = lineShift.line;
      let scopeId: number | undefined;

      if (mappingType === 'ORG_TYPE' && mappingValue) {
        // 根据组织类型映射
        // 当前 ProductionLine 有 orgId（工厂）和 workshopId（车间）
        // 我们可以根据 mappingValue 来判断使用哪个字段
        const orgType = mappingValue.toUpperCase();

        if (orgType.includes('COMPANY') || orgType.includes('FACTORY') || orgType.includes('ORG') || orgType.includes('工厂') || orgType.includes('组织')) {
          // 工厂级别，使用 orgId
          scopeId = line.orgId;
        } else if (orgType.includes('DEPARTMENT') || orgType.includes('WORKSHOP') || orgType.includes('车间')) {
          // 车间级别，使用 workshopId
          scopeId = line.workshopId;
        } else if (orgType.includes('TEAM') || orgType.includes('LINE') || orgType.includes('产线') || orgType.includes('线体')) {
          // 产线级别，使用产线自身ID
          scopeId = line.id;
        } else {
          // 其他类型，默认使用车间级别
          console.warn(`未知的组织类型映射: ${mappingValue}，使用车间级别`);
          scopeId = line.workshopId;
        }
      } else {
        // 默认使用车间级别
        scopeId = line.workshopId;
      }

      if (scopeId !== undefined && scopeId !== null) {
        mapping[line.id] = scopeId;
      }
    }

    return mapping;
  }

  /**
   * 检查产线是否在指定的层级中
   * @param line 产线对象
   * @param hierarchyLevels 层级ID列表（来自AccountHierarchyConfig）
   * @returns 是否参与分摊
   */
  private isLineInHierarchyLevels(line: any, hierarchyLevels: any[]): boolean {
    // 如果没有配置层级，则所有产线都参与分摊
    if (!hierarchyLevels || hierarchyLevels.length === 0) {
      return true;
    }

    // 获取所有配置的层级定义
    // hierarchyLevels 数组中的每一项应该包含层级信息
    // 例如: [{ level: 1, name: '组织层', mappingType: 'ORG', ... }]
    // 这里我们简化处理：如果配置了层级，则检查产线是否匹配

    // 当前实现：所有产线都参与分摊
    // 如果需要更精细的控制，可以在这里添加逻辑
    // 例如：
    // 1. 查询 AccountHierarchyConfig 获取层级配置
    // 2. 判断产线所属的组织/车间是否在配置的层级中
    // 3. 根据层级配置的 mappingType 和 mappingValue 来判断

    return true;
  }

  /**
   * 按员工和出勤代码汇总工时记录
   * 将同一员工、同一出勤代码的多条工时记录汇总成一条，避免重复分摊
   *
   * @param calcResults 工时记录列表
   * @returns 汇总后的工时记录列表
   */
  private aggregateCalcResultsByEmployeeAndCode(calcResults: any[]): any[] {
    const aggregatedMap = new Map<string, any>();

    calcResults.forEach(result => {
      // 使用员工编号和出勤代码ID作为唯一键
      const key = `${result.employeeNo}-${result.attendanceCodeId}`;

      if (aggregatedMap.has(key)) {
        // 如果已存在，累加工时
        const existing = aggregatedMap.get(key);
        existing.actualHours += result.actualHours;
        existing.standardHours += result.standardHours || 0;
        existing.overtimeHours += result.overtimeHours || 0;
        existing.leaveHours += result.leaveHours || 0;
        existing.absenceHours += result.absenceHours || 0;
        // 保存原始记录ID列表，用于追踪
        if (!existing.sourceIds) {
          existing.sourceIds = [];
        }
        existing.sourceIds.push(result.id);
      } else {
        // 如果不存在，创建新记录
        aggregatedMap.set(key, {
          ...result,
          sourceIds: [result.id],
        });
      }
    });

    return Array.from(aggregatedMap.values());
  }

  /**
   * 获取产线的间接设备账户
   * 根据产线名称查找对应的间接设备账户
   * 账户名称格式：富阳工厂/{车间名称}/{产线名称}////间接设备
   * 如果账户不存在，自动创建
   *
   * @param line 产线对象
   * @returns 间接设备账户对象，如果创建失败返回null
   */
  private async getLineIndirectAccount(line: any): Promise<any> {
    // 账户名称格式：富阳工厂/{车间名称}/{产线名称}////间接设备
    // 从组织管理中通过 workshopId 获取车间名称，确保数据一致性
    let workshopName = line.workshopName;
    let workshopId = line.workshopId;
    let orgId = 1; // 默认组织ID

    // 如果产线有 workshopId，优先从组织管理中查询车间名称和组织ID
    if (line.workshopId) {
      const workshop = await this.prisma.organization.findUnique({
        where: { id: line.workshopId },
        select: { name: true, parentId: true },
      });
      if (workshop) {
        workshopName = workshop.name;
        // 获取组织ID（工厂的父组织）
        orgId = workshop.parentId || 1;
      }
    }

    // 如果仍然没有车间名称，使用字段中的值
    if (!workshopName) {
      workshopName = line.workshopName;
    }

    const accountName = `富阳工厂/${workshopName}/${line.name}////间接设备`;

    // 先查找账户是否存在
    let account = await this.prisma.laborAccount.findFirst({
      where: {
        name: accountName,
        status: 'ACTIVE',
      },
    });

    // 如果账户不存在，自动创建
    if (!account) {
      console.log(`产线 ${line.name} 的间接设备账户不存在，自动创建: ${accountName}`);

      try {
        // 查找车间级别的账户作为父账户
        const parentAccountName = `富阳工厂/${workshopName}/////间接设备`;
        let parentAccount = await this.prisma.laborAccount.findFirst({
          where: {
            name: parentAccountName,
            status: 'ACTIVE',
          },
        });

        // 如果车间账户也不存在，先创建车间账户
        if (!parentAccount) {
          console.log(`车间间接设备账户不存在，先创建: ${parentAccountName}`);
          parentAccount = await this.prisma.laborAccount.create({
            data: {
              name: parentAccountName,
              code: `WORKSHOP_INDIRECT_${workshopId || 'UNKNOWN'}`,
              type: 'WORKSHOP',
              level: 2,
              path: `/富阳工厂/${workshopName}/////间接设备`,
              namePath: `/富阳工厂/${workshopName}/////间接设备`,
              hierarchyValues: JSON.stringify({
                orgId: orgId,
                workshopId: workshopId,
              }),
              status: 'ACTIVE',
              effectiveDate: new Date('2020-01-01'),
              usageType: 'SHIFT',
            },
          });
          console.log(`✓ 成功创建车间间接设备账户: ${parentAccount.name} (ID: ${parentAccount.id})`);
        }

        // 创建产线间接设备账户
        account = await this.prisma.laborAccount.create({
          data: {
            name: accountName,
            code: `LINE_INDIRECT_${line.code || line.id}`,
            type: 'LINE',
            level: 3,
            parentId: parentAccount.id,
            path: `${parentAccount.path}/${line.name}`,
            namePath: `${parentAccount.namePath}/${line.name}`,
            hierarchyValues: JSON.stringify({
              orgId: orgId,
              workshopId: workshopId,
              lineId: line.id,
            }),
            status: 'ACTIVE',
            effectiveDate: new Date('2020-01-01'),
            usageType: 'SHIFT',
          },
        });

        console.log(`✓ 成功创建产线间接设备账户: ${account.name} (ID: ${account.id})`);
      } catch (error: any) {
        console.error(`✗ 创建产线间接设备账户失败: ${error.message}`);
        return null;
      }
    }

    return account;
  }

  /**
   * 获取或创建产线的间接工时账户
   * 用于存储分摊后的间接工时
   *
   * 劳动力账户层级结构：
   * - 组织层级（ORG）
   *   - 车间层级（WORKSHOP）
   *     - 产线层级（LINE）- 间接工时账户在这里
   *
   * 层级值（hierarchyValues）保留完整的路径信息：
   * {
   *   orgId: 组织ID,
   *   orgName: 组织名称,
   *   workshopId: 车间ID,
   *   workshopName: 车间名称,
   *   lineId: 产线ID,
   *   lineCode: 产线编码,
   *   lineName: 产线名称
   * }
   */
  private async getOrCreateLineAccount(
    line: any,
    indirectHoursAttendanceCodeId: number,
    executeById: number,
    executeByName: string
  ): Promise<any> {
    // 账户编码：产线编码_INDIRECT
    const accountCode = `${line.code}_INDIRECT`;

    // 查找是否已存在该产线的间接工时账户
    let account = await this.prisma.laborAccount.findFirst({
      where: {
        code: accountCode,
        status: 'ACTIVE',
      },
    });

    if (!account) {
      // 需要创建产线的间接工时账户
      // 首先确保上级账户存在（组织 -> 车间 -> 产线）

      // 1. 查找或创建组织账户
      let orgAccount = await this.prisma.laborAccount.findFirst({
        where: {
          type: 'ORG',
          code: `ORG_${line.orgId}`,
          status: 'ACTIVE',
        },
      });

      if (!orgAccount) {
        orgAccount = await this.prisma.laborAccount.create({
          data: {
            code: `ORG_${line.orgId}`,
            name: line.orgName || `组织_${line.orgId}`,
            type: 'ORG',
            level: 1,
            path: `${line.orgId}`,
            namePath: line.orgName || `组织_${line.orgId}`,
            hierarchyValues: JSON.stringify({
              orgId: line.orgId,
              orgName: line.orgName,
            }),
            usageType: 'ALLOCATED',
            effectiveDate: new Date(),
            status: 'ACTIVE',
          },
        });
      }

      // 2. 查找或创建车间账户
      let workshopAccount = null;
      if (line.workshopId) {
        workshopAccount = await this.prisma.laborAccount.findFirst({
          where: {
            type: 'WORKSHOP',
            code: `WORKSHOP_${line.workshopId}`,
            status: 'ACTIVE',
          },
        });

        if (!workshopAccount) {
          workshopAccount = await this.prisma.laborAccount.create({
            data: {
              code: `WORKSHOP_${line.workshopId}`,
              name: line.workshopName || `车间_${line.workshopId}`,
              type: 'WORKSHOP',
              level: orgAccount.level + 1,
              path: `${orgAccount.path}/${line.workshopId}`,
              namePath: `${orgAccount.namePath}/${line.workshopName || `车间_${line.workshopId}`}`,
              hierarchyValues: JSON.stringify({
                orgId: line.orgId,
                orgName: line.orgName,
                workshopId: line.workshopId,
                workshopName: line.workshopName,
              }),
              parentId: orgAccount.id,
              usageType: 'ALLOCATED',
              effectiveDate: new Date(),
              status: 'ACTIVE',
            },
          });
        }
      }

      // 3. 创建产线间接工时账户
      const parentAccount = workshopAccount || orgAccount;

      account = await this.prisma.laborAccount.create({
        data: {
          code: accountCode,
          name: `${line.name}_间接工时`,
          type: 'LINE',
          level: parentAccount.level + 1,
          path: `${parentAccount.path}/${line.id}`,
          namePath: `${parentAccount.namePath}/${line.name}_间接工时`,
          hierarchyValues: JSON.stringify({
            lineId: line.id,
            lineCode: line.code,
            lineName: line.name,
            workshopId: line.workshopId,
            workshopName: line.workshopName,
            orgId: line.orgId,
            orgName: line.orgName,
          }),
          usageType: 'ALLOCATED', // 标记为分摊工时账户
          parentId: parentAccount.id,
          effectiveDate: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    return account;
  }

  /**
   * 根据筛选条件获取工时记录
   */
  private async getFilteredCalcResults(params: any): Promise<any[]> {
    const { startDate, endDate, employeeFilter, accountFilter, attendanceCodeIds } = params;

    const nextDate = new Date(endDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const where: any = {
      calcDate: {
        gte: startDate,
        lt: nextDate,
      },
      status: {
        in: ['PENDING', 'APPROVED', 'COMPLETED'], // 包含COMPLETED状态，因为分摊计算需要处理的工时记录
      },
    };

    // 出勤代码筛选
    if (attendanceCodeIds && attendanceCodeIds.length > 0) {
      where.attendanceCodeId = { in: attendanceCodeIds };
    }

    // 劳动力账户筛选
    let accountIds: number[] = [];

    if (accountFilter) {
      // 方式1: 直接使用账户ID列表
      if (accountFilter.accountIds && accountFilter.accountIds.length > 0) {
        accountIds = accountFilter.accountIds;
      }
      // 方式2: 根据层级筛选条件查找账户
      else if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
        console.log(`[分摊计算] 根据层级筛选条件查找账户...`);
        const matchedAccounts = await this.getAccountsByHierarchySelections(accountFilter.hierarchySelections);
        accountIds = matchedAccounts.map((a) => a.id);
        console.log(`[分摊计算] 层级筛选找到 ${accountIds.length} 个匹配账户`);
      }

      if (accountIds.length > 0) {
        where.accountId = { in: accountIds };
        console.log(`[分摊计算] 应用账户筛选: ${accountIds.length} 个账户`);
      }
    }

    const results = await this.prisma.calcResult.findMany({
      where,
      include: {
        employee: {
          include: {
            org: true,
          },
        },
      },
    });

    // 人员筛选（在查询后处理）
    let filteredResults = results;

    if (employeeFilter && Object.keys(employeeFilter).length > 0) {
      filteredResults = results.filter((result) => {
        const employee = result.employee;

        // 组织筛选
        if (employeeFilter.orgIds && employeeFilter.orgIds.length > 0) {
          if (!employeeFilter.orgIds.includes(employee.orgId)) {
            return false;
          }
        }

        // 人事字段筛选
        if (employeeFilter.customFields) {
          for (const [fieldKey, fieldValue] of Object.entries(employeeFilter.customFields)) {
            const employeeFieldValue = employee.customFields?.[fieldKey];
            if (employeeFieldValue !== fieldValue) return false;
          }
        }

        return true;
      });
    }

    return filteredResults;
  }

  /**
   * 执行分摊计算
   */
  private async executeAllocationCalculation(params: any): Promise<number> {
    const { batchNo, config, calcResults, calcTime } = params;
    let resultCount = 0;

    // 对每条工时记录进行分摊
    for (const calcResult of calcResults) {
      // 对每个规则进行分摊
      for (const rule of config.rules) {
        if (rule.targets.length === 0) continue;

        // 计算分摊依据的值
        const basisValues = await this.getBasisValues({
          rule,
          recordDate: calcResult.calcDate,
        });

        // 计算总权重和总依据值
        const totalWeight = rule.targets.reduce((sum, target) => sum + (target.weight || 0), 0);

        // 对每个目标进行分摊
        for (const target of rule.targets) {
          let allocationRatio = 0;

          // 根据规则类型计算分摊比例
          switch (rule.ruleType) {
            case 'PROPORTIONAL':
              // 按比例分摊
              if (totalWeight > 0) {
                const weight = target.weight || 0;
                allocationRatio = weight / totalWeight;
              }
              break;
            case 'EQUAL':
              // 平均分摊
              allocationRatio = 1 / rule.targets.length;
              break;
            case 'FIXED':
              // 固定值（按权重的绝对值）
              allocationRatio = (target.weight || 0) / calcResult.actualHours;
              break;
            default:
              allocationRatio = target.weight || 0;
          }

          const allocatedHours = calcResult.actualHours * allocationRatio;

          // 保存分摊结果
          if (allocatedHours > 0) {
            await this.prisma.allocationResult.create({
              data: {
                batchNo,
                recordDate: calcResult.calcDate,
                calcResultId: calcResult.id,
                configId: config.id,
                configVersion: config.version,
                ruleId: rule.id,
                sourceEmployeeNo: calcResult.employeeNo,
                sourceEmployeeName: calcResult.employee?.name,
                sourceAccountId: calcResult.accountId,
                sourceAccountName: calcResult.accountName,
                attendanceCodeId: calcResult.attendanceCodeId,
                attendanceCode: calcResult.attendanceCode,
                sourceHours: calcResult.actualHours,
                targetType: target.targetType,
                targetId: target.targetId,
                targetName: target.targetName,
                targetAccountId: target.targetAccountId,
                allocationBasis: rule.allocationBasis,
                basisValue: basisValues[target.targetId] || 0,
                weightValue: target.weight || 0,
                allocationRatio,
                allocatedHours,
                calcTime,
              },
            });

            resultCount++;
          }
        }
      }
    }

    return resultCount;
  }

  /**
   * 获取分摊依据的值
   */
  private async getBasisValues(params: any): Promise<Record<number, number>> {
    const { rule, recordDate } = params;
    const basisFilter = JSON.parse(rule.basisFilter || '{}');
    const values: Record<number, number> = {};

    switch (rule.allocationBasis) {
      case 'ACTUAL_HOURS':
        // 实际工时
        for (const target of rule.targets) {
          const hours = await this.prisma.calcResult.aggregate({
            where: {
              calcDate: recordDate,
              accountId: basisFilter.accountId,
            },
            _sum: {
              actualHours: true,
            },
          });
          values[target.targetId] = hours._sum.actualHours || 0;
        }
        break;

      case 'STD_HOURS':
        // 标准工时
        for (const target of rule.targets) {
          const hours = await this.prisma.calcResult.aggregate({
            where: {
              calcDate: recordDate,
              accountId: basisFilter.accountId,
            },
            _sum: {
              standardHours: true,
            },
          });
          values[target.targetId] = hours._sum.standardHours || 0;
        }
        break;

      case 'ACTUAL_YIELD':
        // 实际产量
        for (const target of rule.targets) {
          const yieldData = await this.prisma.productionRecord.aggregate({
            where: {
              recordDate,
              lineId: target.targetId,
            },
            _sum: {
              actualQty: true,
            },
          });
          values[target.targetId] = yieldData._sum.actualQty || 0;
        }
        break;

      case 'PRODUCT_STD_HOURS':
        // 产品标准工时
        for (const target of rule.targets) {
          const hours = await this.prisma.productionRecord.aggregate({
            where: {
              recordDate,
              lineId: target.targetId,
            },
            _sum: {
              totalStdHours: true,
            },
          });
          values[target.targetId] = hours._sum.totalStdHours || 0;
        }
        break;

      default:
        // 默认返回权重值
        for (const target of rule.targets) {
          values[target.targetId] = target.weight || 0;
        }
    }

    return values;
  }

  /**
   * 生成批次号
   */
  private generateBatchNo(): string {
    const now = new Date();
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ALC${timestamp}${random}`;
  }

  /**
   * 查询计算进度
   */
  async getCalculationProgress(batchNo: string) {
    const results = await this.prisma.allocationResult.findMany({
      where: { batchNo },
    });

    if (results.length === 0) {
      throw new NotFoundException('批次不存在');
    }

    return {
      batchNo,
      totalRecords: results.length,
      status: 'COMPLETED',
    };
  }

  /**
   * 查询分摊结果
   */
  async getAllocationResults(query: any) {
    const { page = 1, pageSize = 10, batchNo, recordDate, startDate, endDate, configId, targetType, targetId, employeeNo } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };

    if (batchNo) where.batchNo = batchNo;

    // 支持日期范围查询（优先级高于单个日期）
    if (startDate && endDate) {
      where.recordDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (recordDate) {
      const date = new Date(recordDate);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      where.recordDate = { gte: date, lt: nextDate };
    }

    if (configId) where.configId = +configId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = +targetId;
    if (employeeNo) where.sourceEmployeeNo = employeeNo;

    const [items, total] = await Promise.all([
      this.prisma.allocationResult.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { calcTime: 'desc' },
        include: {
          config: true,
        },
      }),
      this.prisma.allocationResult.count({ where }),
    ]);

    // 获取所有相关的源工时记录详细信息
    const calcResultIds = items.map(item => item.calcResultId);
    const calcResults = await this.prisma.calcResult.findMany({
      where: {
        id: { in: calcResultIds },
      },
      select: {
        id: true,
        shiftId: true,
        shiftName: true,
        calcDate: true,
      },
    });

    // 建立源工时记录的映射
    const calcResultMap: Record<number, any> = {};
    calcResults.forEach(cr => {
      calcResultMap[cr.id] = cr;
    });

    // 获取所有目标账户信息
    const targetAccountIds = items.map(item => item.targetAccountId).filter(id => id !== null);
    const targetAccounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: targetAccountIds as number[] },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    // 建立目标账户的映射
    const targetAccountMap: Record<number, any> = {};
    targetAccounts.forEach(acc => {
      targetAccountMap[acc.id] = acc;
    });

    // 为每条结果添加源工时记录和目标账户的详细信息
    const enrichedItems = items.map(item => ({
      ...item,
      sourceCalcResult: calcResultMap[item.calcResultId] || null,
      targetAccountName: item.targetAccountId ? (targetAccountMap[item.targetAccountId]?.name || null) : null,
    }));

    return {
      items: enrichedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  /**
   * 查询分摊结果汇总
   */
  async getAllocationResultsSummary(query: any) {
    const { batchNo, startDate, endDate, configId, employeeNo } = query;

    const where: any = { deletedAt: null };

    if (batchNo) where.batchNo = batchNo;
    if (configId) where.configId = +configId;
    if (employeeNo) where.sourceEmployeeNo = employeeNo;
    if (startDate && endDate) {
      where.recordDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // 按目标对象汇总
    const byTarget = await this.prisma.allocationResult.groupBy({
      by: ['targetType', 'targetId', 'targetName'],
      where,
      _sum: {
        sourceHours: true,
        allocatedHours: true,
      },
    });

    // 按日期汇总
    const byDate = await this.prisma.allocationResult.groupBy({
      by: ['recordDate'],
      where,
      _sum: {
        sourceHours: true,
        allocatedHours: true,
      },
    });

    // 按工时类型汇总
    const byHourType = await this.prisma.allocationResult.groupBy({
      by: ['attendanceCode'],
      where,
      _sum: {
        sourceHours: true,
        allocatedHours: true,
      },
    });

    // 按员工汇总（新增）
    const byEmployee = await this.prisma.allocationResult.groupBy({
      by: ['sourceEmployeeNo', 'sourceEmployeeName'],
      where,
      _sum: {
        sourceHours: true,
        allocatedHours: true,
      },
      _count: true,
    });

    // 总计
    const total = await this.prisma.allocationResult.aggregate({
      where,
      _sum: {
        sourceHours: true,
        allocatedHours: true,
      },
      _count: true,
    });

    return {
      byTarget,
      byDate,
      byHourType,
      byEmployee,
      total: {
        sourceHours: total._sum.sourceHours || 0,
        allocatedHours: total._sum.allocatedHours || 0,
        recordCount: total._count,
      },
    };
  }

  /**
   * 根据层级筛选条件查找账户
   */
  private async getAccountsByHierarchySelections(hierarchySelections: any[]): Promise<any[]> {
    console.log(`[层级筛选] 开始查找账户，层级条件数: ${hierarchySelections.length}`);

    // 获取所有有层级值的账户
    const allAccounts = await this.prisma.laborAccount.findMany({
      where: {
        status: 'ACTIVE',
        hierarchyValues: {
          not: null,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        hierarchyValues: true,
      },
    });

    console.log(`[层级筛选] 找到 ${allAccounts.length} 个有层级值的账户`);

    // 筛选符合条件的账户
    const matchedAccounts: any[] = [];

    for (const account of allAccounts) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');

        // 检查hierarchyValues是否是数组
        if (!Array.isArray(hierarchyValues)) {
          console.log(`[层级筛选] 跳过账户 ${account.name} (${account.code}): hierarchyValues不是数组`);
          continue;
        }

        // 检查账户是否满足所有层级筛选条件
        let matchesAll = true;

        for (const selection of hierarchySelections) {
          const { levelId, levelName, valueIds } = selection;

          // 查找账户在该层级的值
          const levelValue = hierarchyValues.find((hv: any) => hv.levelId === levelId);

          if (!levelValue || !levelValue.selectedValue) {
            matchesAll = false;
            break;
          }

          const accountValueId = levelValue.selectedValue.id;

          // 检查账户的层级值是否在筛选条件的valueIds中
          if (!valueIds.includes(accountValueId) && !valueIds.includes(String(accountValueId))) {
            matchesAll = false;
            break;
          }
        }

        if (matchesAll) {
          matchedAccounts.push(account);
          console.log(`[层级筛选] ✓ 匹配账户: ${account.name} (${account.code})`);
        }
      } catch (e) {
        console.error(`[层级筛选] 解析账户 ${account.code} 的层级值失败:`, e);
      }
    }

    console.log(`[层级筛选] 最终匹配 ${matchedAccounts.length} 个账户`);
    return matchedAccounts;
  }
}

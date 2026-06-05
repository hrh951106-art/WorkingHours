import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AllocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据劳动力账户路径和配置的层级，生成匹配用的路径
   * @param namePath 劳动力账户的名称路径（如 "///大桶/焊接"）
   * @param hierarchyLevelsToRemove 要踢除的层级配置（如 "产品,工序" 或 "4,5"）
   * @returns 踢除指定层级后的路径（如 "///" 或 ""��
   */
  /**
   * 根据劳动力账户路径和配置的层级，提取出指定层级的值（返回数组）
   * @param namePath 劳动力账户的名称路径（如 "///大桶/焊接"）
   * @param hierarchyLevelsToExtract 要提取的层级配置（支持多种格式）
   *   - levelId格式: "6,8" (表示提取levelId为6和8的层级)
   *   - 层级名称格式: "产线,工序" (表示提取产线和工序层级)
   *   - 层级序号格式: "3,5" (表示提取第3层和第5层)
   * @returns 提取出来的层级值数组（如 ["大桶", "焊接"]）
   */
  private extractMatchValues(namePath: string, hierarchyLevelsToExtract: string): string[] {
    if (!namePath || !hierarchyLevelsToExtract) {
      return [];
    }

    // 解析层级配置（支持 "产品,工序" 或 "4,5" 或 "6,8" 格式）
    const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());

    // 将层级名称转换为层级编号（序号）
    const levelNameMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
    };

    // levelId到层级序号的映射关系（根据系统的层级配置）
    const levelIdToLevelNumberMap: Record<number, number> = {
      4: 1,  // levelId 4 -> 第1层 (工厂)
      5: 2,  // levelId 5 -> 第2层 (车间)
      6: 3,  // levelId 6 -> 第3层 (产线)
      7: 4,  // levelId 7 -> 第4层 (产品)
      8: 5,  // levelId 8 -> 第5层 (工序)
    };

    const levelsToExtractNumbers = levelsToExtract.map(l => {
      const num = parseInt(l);
      if (isNaN(num)) {
        // 如果不是数字，尝试从层级名称映射
        return levelNameMap[l] || 0;
      } else {
        // 如果是数字，检查是否为levelId（4-8范围）
        if (num >= 4 && num <= 8) {
          // 这是levelId，需要转换为层级序号
          return levelIdToLevelNumberMap[num] || 0;
        } else {
          // 这是层级序号，直接使用
          return num;
        }
      }
    }).filter(n => n > 0).sort((a, b) => a - b); // 升序排序

    console.log(`[标准工时匹配] 原始路径: ${namePath}`);
    console.log(`[标准工时匹配] 提取层级配置: ${hierarchyLevelsToExtract}`);
    console.log(`[标准工时匹配] 转换后的层级序号: [${levelsToExtractNumbers.join(', ')}]`);

    // 将路径按 "/" 分割
    const pathParts = namePath.split('/');

    // 提取指定层级的值
    const extractedValues: string[] = [];
    for (const levelNum of levelsToExtractNumbers) {
      // 层级编号从1开始，数组索引从0开始
      const indexToExtract = levelNum - 1;
      if (indexToExtract >= 0 && indexToExtract < pathParts.length) {
        const value = pathParts[indexToExtract];
        if (value && value.trim()) {
          extractedValues.push(value.trim());
        }
      }
    }

    console.log(`[标准工时匹配] 提取的值: [${extractedValues.join(', ')}]`);

    return extractedValues;
  }


  /**
   * 生成所有可能的路径组合（用于标准工时匹配）
   * 按照从精确到粗粒度的顺序生成组合路径
   * @param values 提取的层级值数组
   * @returns 所有可能的路径组合，按优先级排序
   * @example
   * 输入: ["A", "B", "C"]
   * 输出: ["A/B/C", "A/B", "B/C", "A", "B", "C"]
   */
  private generatePathCombinations(values: string[]): string[] {
    const combinations: string[] = [];
    const n = values.length;

    // 从最精确（所有层级）到最粗粒度（单个层级）
    // 按层数从大到小生成组合
    for (let len = n; len >= 1; len--) {
      if (len === 1) {
        // 单个层级，直接添加所有值
        combinations.push(...values);
      } else {
        // 多个层级，生成所有连续的组合
        // 例如: values=[A,B,C], len=2 -> [A/B, B/C]
        for (let i = 0; i <= n - len; i++) {
          const combination = values.slice(i, i + len).join('/');
          combinations.push(combination);
        }
      }
    }

    return combinations;
  }


  /**
   * 查找匹配的产品标准工时配置
   * @param productId 产品ID
   * @param orgId 劳动力账户ID
   * @param orgName 劳动力账户名称路径
   * @param targetDate 目标日期
   * @returns 匹配的标准工时配置，如果没有匹配则返回 null
   */
  private async findMatchingStandardHourConfig(
    productId: number,
    orgId: number,
    orgName: string,
    targetDate: Date
  ) {
    // 1. 获取配置的提取层级
    const hierarchyConfig = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'standardHoursHierarchyLevels' },
    });

    const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
    console.log(`[标准工时匹配] 配置的提取层级: ${hierarchyLevelsToExtract || '(无配置)'}`);

    // 2. 提取匹配值（返回数组）
    const extractedValues = this.extractMatchValues(orgName, hierarchyLevelsToExtract);

    if (extractedValues.length === 0) {
      console.log(`[标准工时匹配] 提取的值为空，跳过匹配`);
      return null;
    }

    // 3. 生成所有可能的路径组合（从精确到粗粒度）
    const pathCombinations = this.generatePathCombinations(extractedValues);
    console.log(`[标准工时匹配] 生成的路径组合: [${pathCombinations.join(', ')}]`);

    // 4. 按优先级匹配：先查询有明确日期区间的标准配置
    for (const path of pathCombinations) {
      const standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
        where: {
          productId,
          deletedAt: null,
          status: 'ACTIVE',
          effectiveDate: { lte: targetDate },
          expiryDate: { gte: targetDate },
          accountPath: path,
        },
      });

      if (standardHourConfig) {
        console.log(`[标准工时匹配] ✓ 找到匹配的标准配置 (有日期区间): accountPath=${standardHourConfig.accountPath}, standardHours=${standardHourConfig.standardHours}`);
        return standardHourConfig;
      }
    }

    // 5. 如果没有找到有日期区间的配置，查询永久标准
    for (const path of pathCombinations) {
      const standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
        where: {
          productId,
          deletedAt: null,
          status: 'ACTIVE',
          effectiveDate: { lte: targetDate },
          expiryDate: null,
          accountPath: path,
        },
      });

      if (standardHourConfig) {
        console.log(`[标准工时匹配] ✓ 找到匹配的标准配置 (永久): accountPath=${standardHourConfig.accountPath}, standardHours=${standardHourConfig.standardHours}`);
        return standardHourConfig;
      }
    }

    // 5. 如果没有匹配到指定层级的标准，查找全局配置标准（accountPath 为空、"-" 或 null）
    console.log(`[标准工时匹配] 未找到匹配的标准配置，查找全局配置标准...`);

    let standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: { gte: targetDate },
        OR: [
          { accountPath: '' },
          { accountPath: null },
          { accountPath: '-' },
        ],
      },
    });

    if (standardHourConfig) {
      console.log(`[标准工时匹配] ✓ 找到全局配置标准 (有日期区间): standardHours=${standardHourConfig.standardHours}`);
      return standardHourConfig;
    }

    // 6. 最后查找全局配置的永久标准
    standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: null,
        OR: [
          { accountPath: '' },
          { accountPath: null },
          { accountPath: '-' },
        ],
      },
    });

    if (standardHourConfig) {
      console.log(`[标准工时匹配] ✓ 找到全局配置标准 (永久): standardHours=${standardHourConfig.standardHours}`);
      return standardHourConfig;
    }

    console.log(`[标准工时匹配] ✗ 未找到任何标准配置`);
    return null;
  }

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

    // 转换数据，添加产线账户字段
    const transformedItems = items.map((item: any) => ({
      ...item,
      // 将劳动力账户信息映射到产线账户字段
      lineAccountId: item.accountId,
      lineAccountName: item.accountName,
    }));

    return {
      items: transformedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async createLineShift(dto: any) {
    const { orgId, orgName, accountId, accountName, accountPath, shiftId, shiftName, scheduleDate, startTime, endTime, plannedProducts, participateInAllocation, description } = dto;

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
        accountId: accountId || null,
        accountName: accountName || null,
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
      }),
      this.prisma.productionRecord.count({ where }),
    ]);

    // 添加计算字段
    const itemsWithCalculations = items.map((item: any) => ({
      ...item,
      conversionFactor: 1.0,
      convertedQty: item.actualQty || 0,
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

    // 检查唯一性：劳动力账户 + 日期 + 班次 + 产品
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
      throw new BadRequestException('该劳动力账户在该日期和班次下的该产品产量记录已存在');
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

    const { recordDate, orgId, orgName, lineId, lineName, shiftId, shiftName, productId, productCode, productName, plannedQty, actualQty, qualifiedQty, unqualifiedQty, standardHours, workHours, description } = dto;

    // 如果修改了关键字段（日期、产线、班次、产品），需要验证唯一性
    const newRecordDate = recordDate ? new Date(recordDate) : record.recordDate;
    const newOrgId = orgId !== undefined ? orgId : record.orgId;
    const newShiftId = shiftId !== undefined ? shiftId : record.shiftId;
    const newProductId = productId !== undefined ? productId : record.productId;

    const keyFieldsChanged =
      (recordDate && newRecordDate.getTime() !== new Date(record.recordDate).getTime()) ||
      (orgId !== undefined && newOrgId !== record.orgId) ||
      (shiftId !== undefined && newShiftId !== record.shiftId) ||
      (productId !== undefined && newProductId !== record.productId);

    if (keyFieldsChanged) {
      // 检查唯一性：劳动力账户 + 日期 + 班次 + 产品（排除当前记录）
      const existing = await this.prisma.productionRecord.findFirst({
        where: {
          recordDate: newRecordDate,
          orgId: newOrgId,
          shiftId: newShiftId,
          productId: newProductId,
          deletedAt: null,
          id: { not: id }, // 排除当前记录
        },
      });

      if (existing) {
        throw new BadRequestException('该劳动力账户在该日期和班次下的该产品产量记录已存在');
      }
    }

    const totalStdHours = (actualQty || record.actualQty) * (standardHours || record.standardHours);

    return this.prisma.productionRecord.update({
      where: { id },
      data: {
        recordDate: recordDate ? new Date(recordDate) : record.recordDate,
        orgId: newOrgId,
        orgName: orgName !== undefined ? orgName : record.orgName,
        lineId: lineId !== undefined ? lineId : record.lineId,
        lineName: lineName !== undefined ? lineName : record.lineName,
        shiftId: newShiftId,
        shiftName: shiftName !== undefined ? shiftName : record.shiftName,
        productId: newProductId,
        productCode: productCode !== undefined ? productCode : record.productCode,
        productName: productName !== undefined ? productName : record.productName,
        plannedQty: plannedQty !== undefined ? plannedQty : record.plannedQty,
        actualQty: actualQty !== undefined ? actualQty : record.actualQty,
        qualifiedQty: qualifiedQty !== undefined ? qualifiedQty : record.qualifiedQty,
        unqualifiedQty: unqualifiedQty !== undefined ? unqualifiedQty : record.unqualifiedQty,
        standardHours: standardHours || record.standardHours,
        totalStdHours,
        workHours: workHours !== undefined ? workHours : record.workHours,
        description: description !== undefined ? description : record.description,
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
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const record of records) {
      try {
        const { recordDate, orgId, shiftId, productId } = record;

        // 检查是否已存在相同的记录
        const existing = await this.prisma.productionRecord.findFirst({
          where: {
            recordDate: new Date(recordDate),
            orgId: +orgId,
            shiftId: +shiftId,
            productId: +productId,
            deletedAt: null,
          },
        });

        if (existing) {
          // 存在则更新
          await this.prisma.productionRecord.update({
            where: { id: existing.id },
            data: {
              plannedQty: record.plannedQty || 0,
              actualQty: record.actualQty || 0,
              qualifiedQty: record.qualifiedQty || record.actualQty || 0,
              unqualifiedQty: record.unqualifiedQty || 0,
              standardHours: record.standardHours || 0,
              totalStdHours: (record.actualQty || 0) * (record.standardHours || 0),
              workHours: record.workHours,
              description: record.description,
            },
          });
          results.updated++;
        } else {
          // 不存在则创建
          await this.createProductionRecord(record);
          results.success++;
        }
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

    // 增强每个配置的sourceConfig数据
    const enrichedItems = await Promise.all(
      items.map(async (config) => {
        if (!config.sourceConfig) {
          return config;
        }

        // 解析employeeFilter并增强字段信息
        const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || '{}');

        // 增强employeeFilter中的fieldGroups，添加字段名称和类型信息
        if (employeeFilter.fieldGroups && Array.isArray(employeeFilter.fieldGroups)) {
          // 内置字段映射
          const builtInFieldsMap: Record<string, { name: string; type: string }> = {
            'organization': { name: '产线', type: 'organization' },
            'employeeType': { name: '员工类型', type: 'select' },
            'position': { name: '岗位', type: 'select' },
          };

          // 获取自定义字段配置
          const customFields = await this.prisma.customField.findMany();

          // 构建自定义字段映射
          const customFieldsMap: Record<string, { name: string; type: string }> = {};
          customFields.forEach((field: any) => {
            let fieldType = 'text';
            if (field.type === 'SELECT_SINGLE' || field.type === 'SELECT_MULTI' || field.type === 'LOOKUP') {
              fieldType = 'select';
            } else if (field.type === 'NUMBER') {
              fieldType = 'number';
            }
            customFieldsMap[field.code] = {
              name: field.name,
              type: fieldType,
            };
          });

          // 增强每个条件
          employeeFilter.fieldGroups.forEach((group: any) => {
            if (group.conditions && Array.isArray(group.conditions)) {
              group.conditions = group.conditions.map((condition: any) => {
                const fieldInfo = builtInFieldsMap[condition.fieldCode] || customFieldsMap[condition.fieldCode];
                return {
                  ...condition,
                  fieldName: fieldInfo?.name || condition.fieldCode,
                  fieldType: fieldInfo?.type || 'text',
                };
              });
            }
          });
        }

        // 解析accountFilter并增强hierarchySelections数据
        const accountFilter = JSON.parse(config.sourceConfig.accountFilter || '{}');
        if (accountFilter.hierarchySelections && Array.isArray(accountFilter.hierarchySelections)) {
          // 获取所有相关的层级配置
          const hierarchyLevelIds = accountFilter.hierarchySelections
            .map((s: any) => s.levelId)
            .filter((id: any) => id != null);

          let hierarchyLevels: any[] = [];
          if (hierarchyLevelIds.length > 0) {
            hierarchyLevels = await this.prisma.accountHierarchyConfig.findMany({
              where: { id: { in: hierarchyLevelIds } },
            });
          }

          // 获取所有相关的账户（组织）- 只包含数字ID
          const accountIds = accountFilter.hierarchySelections
            .flatMap((s: any) => s.valueIds || [])
            .filter((id: any) => id != null && typeof id === 'number');

          let accounts: any[] = [];
          if (accountIds.length > 0) {
            accounts = await this.prisma.laborAccount.findMany({
              where: { id: { in: accountIds } },
            });
          }

          // 增强hierarchySelections数据，添加名称信息
          accountFilter.hierarchySelections = accountFilter.hierarchySelections.map((selection: any) => {
            const level = hierarchyLevels.find((l: any) => l.id === selection.levelId);
            const valueAccounts = (selection.valueIds || []).map((valueId: any) => {
              const account = accounts.find((a: any) => a.id === valueId);
              return account ? { id: account.id, name: account.name, code: account.code } : valueId;
            });

            return {
              ...selection,
              levelName: level?.name || selection.levelName,
              level: level?.level || selection.level,
              valueIds: selection.valueIds || [],
              // 添加额外的名称字段，便于前端显示
              valueAccounts,
            };
          });
        }

        // 解析attendanceCodes并增强数据，添加名称信息
        const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');
        const enrichedAttendanceCodes = await Promise.all(
          attendanceCodes.map(async (code: string) => {
            const attendanceCode = await this.prisma.attendanceCode.findFirst({
              where: { code },
            });
            return attendanceCode || { code, name: code };
          })
        );

        return {
          ...config,
          sourceConfig: {
            ...config.sourceConfig,
            employeeFilter,
            accountFilter,
            attendanceCodes: enrichedAttendanceCodes,
          },
          rules: config.rules.map(rule => ({
            ...rule,
            basisFilter: JSON.parse(rule.basisFilter || '{}'),
            allocationAttendanceCodes: JSON.parse(rule.allocationAttendanceCodes || '[]'),
            allocationHierarchyLevels: JSON.parse(rule.allocationHierarchyLevels || '[]'),
          })),
        };
      })
    );

    return {
      items: enrichedItems,
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

    // 解析employeeFilter并增强字段信息
    const employeeFilter = JSON.parse(config.sourceConfig?.employeeFilter || '{}');

    console.log('getAllocationConfig - 原始employeeFilter:', JSON.stringify(employeeFilter, null, 2));
    console.log('getAllocationConfig - fieldGroups:', JSON.stringify(employeeFilter.fieldGroups, null, 2));

    // 增强employeeFilter中的fieldGroups，添加字段名称和类型信息
    if (employeeFilter.fieldGroups && Array.isArray(employeeFilter.fieldGroups)) {
      // 内置字段映射
      const builtInFieldsMap: Record<string, { name: string; type: string }> = {
        'organization': { name: '产线', type: 'organization' },
        'employeeType': { name: '员工类型', type: 'select' },
        'position': { name: '岗位', type: 'select' },
      };

      // 获取自定义字段配置
      const customFields = await this.prisma.customField.findMany();

      // 构建自定义字段映射
      const customFieldsMap: Record<string, { name: string; type: string }> = {};
      customFields.forEach((field: any) => {
        let fieldType = 'text';
        if (field.type === 'SELECT_SINGLE' || field.type === 'SELECT_MULTI' || field.type === 'LOOKUP') {
          fieldType = 'select';
        } else if (field.type === 'NUMBER') {
          fieldType = 'number';
        }
        customFieldsMap[field.code] = {
          name: field.name,
          type: fieldType,
        };
      });

      // 增强每个条件
      employeeFilter.fieldGroups.forEach((group: any) => {
        if (group.conditions && Array.isArray(group.conditions)) {
          group.conditions = group.conditions.map((condition: any) => {
            const fieldInfo = builtInFieldsMap[condition.fieldCode] || customFieldsMap[condition.fieldCode];
            return {
              ...condition,
              fieldName: fieldInfo?.name || condition.fieldCode,
              fieldType: fieldInfo?.type || 'text',
            };
          });
        }
      });
    }

    // 解析accountFilter并增强hierarchySelections数据
    const accountFilter = JSON.parse(config.sourceConfig?.accountFilter || '{}');
    if (accountFilter.hierarchySelections && Array.isArray(accountFilter.hierarchySelections)) {
      // 获取所有相关的层级配置
      const hierarchyLevelIds = accountFilter.hierarchySelections
        .map((s: any) => s.levelId)
        .filter((id: any) => id != null);

      let hierarchyLevels: any[] = [];
      if (hierarchyLevelIds.length > 0) {
        hierarchyLevels = await this.prisma.accountHierarchyConfig.findMany({
          where: { id: { in: hierarchyLevelIds } },
        });
      }

      // 获取所有相关的账户（组织）- 只包含数字ID
      const accountIds = accountFilter.hierarchySelections
        .flatMap((s: any) => s.valueIds || [])
        .filter((id: any) => id != null && typeof id === 'number');

      let accounts: any[] = [];
      if (accountIds.length > 0) {
        accounts = await this.prisma.laborAccount.findMany({
          where: { id: { in: accountIds } },
        });
      }

      // 增强hierarchySelections数据，添加名称信息
      accountFilter.hierarchySelections = accountFilter.hierarchySelections.map((selection: any) => {
        const level = hierarchyLevels.find((l: any) => l.id === selection.levelId);
        const valueAccounts = (selection.valueIds || []).map((valueId: any) => {
          const account = accounts.find((a: any) => a.id === valueId);
          return account ? { id: account.id, name: account.name, code: account.code } : valueId;
        });

        return {
          ...selection,
          levelName: level?.name || selection.levelName,
          level: level?.level || selection.level,
          valueIds: selection.valueIds || [],
          // 添加额外的名称字段，便于前端显示
          valueAccounts,
        };
      });
    }

    // 解析attendanceCodes并增强数据，添加名称信息
    const attendanceCodes = JSON.parse(config.sourceConfig?.attendanceCodes || '[]');
    const enrichedAttendanceCodes = await Promise.all(
      attendanceCodes.map(async (code: string) => {
        const attendanceCode = await this.prisma.attendanceCode.findFirst({
          where: { code },
        });
        return attendanceCode || { code, name: code };
      })
    );

    return {
      ...config,
      sourceConfig: config.sourceConfig ? {
        ...config.sourceConfig,
        employeeFilter,
        accountFilter,
        attendanceCodes: enrichedAttendanceCodes,
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
      // 如果是已启用状态，只允许更新rules
      if (config.status === 'ACTIVE') {
        // 验证只包含rules字段
        const allowedKeys = ['rules', 'updatedById', 'updatedByName'];
        const providedKeys = Object.keys(dto);
        const hasInvalidKeys = providedKeys.some(key => !allowedKeys.includes(key));

        if (hasInvalidKeys) {
          throw new BadRequestException('已启用的配置只能修改规则，不能修改其他字段');
        }

        // 只更新规则
        if (rules && Array.isArray(rules)) {
          // 删除旧规则
          await tx.allocationRuleConfig.deleteMany({
            where: { configId: id },
          });

          // 创建新规则
          for (const rule of rules) {
            await tx.allocationRuleConfig.create({
              data: {
                configId: id,
                ruleName: rule.ruleName,
                ruleType: rule.ruleType,
                allocationBasis: rule.allocationBasis,
                allocationAttendanceCodes: JSON.stringify(rule.allocationAttendanceCodes || []),
                allocationHierarchyLevels: JSON.stringify(rule.allocationHierarchyLevels || []),
                allocationScopeId: rule.allocationScopeId || rule.allocationScope || null,
                basisFilter: JSON.stringify(rule.basisFilter || {}),
                sortOrder: rule.sortOrder || 0,
                status: rule.status || 'ACTIVE',
                description: rule.description,
                effectiveStartTime: rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null,
                effectiveEndTime: rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null,
              },
            });
          }
        }

        // 更新修改人信息
        if (updatedById) {
          await tx.allocationConfig.update({
            where: { id },
            data: {
              updatedById,
              updatedByName,
            },
          });
        }
      } else {
        // 草稿状态可以修改所有字段
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
            await tx.allocationRuleConfig.create({
              data: {
                configId: id,
                ruleName: rule.ruleName,
                ruleType: rule.ruleType,
                allocationBasis: rule.allocationBasis,
                allocationAttendanceCodes: JSON.stringify(rule.allocationAttendanceCodes || []),
                allocationHierarchyLevels: JSON.stringify(rule.allocationHierarchyLevels || []),
                allocationScopeId: rule.allocationScopeId || rule.allocationScope || null,
                basisFilter: JSON.stringify(rule.basisFilter || {}),
                sortOrder: rule.sortOrder || 0,
                status: rule.status || 'ACTIVE',
                description: rule.description,
                effectiveStartTime: rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null,
                effectiveEndTime: rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null,
              },
            });
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
    const attendanceCodes = await this.prisma.definitionAttendanceCode.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [{ id: 'asc' }],
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
    console.log(`[分摊计算] 配置详情:`);
    console.log(`  - 配置ID: ${config.id}`);
    console.log(`  - 配置代码: ${config.configCode}`);
    console.log(`  - 配置名称: ${config.configName}`);
    console.log(`  - 组织ID: ${config.orgId}`);
    console.log(`  - 生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '无限期'}`);
    console.log(`  - 规则数量: ${config.rules?.length || 0}`);
    console.log(`  - 执行日期范围: ${startDate} ~ ${endDate}`);

    // 记录每个规则的配置信息
    if (config.rules && config.rules.length > 0) {
      config.rules.forEach((rule: any, index: number) => {
        console.log(`[分摊计算] 规则${index + 1}: ${rule.ruleName} (ID: ${rule.id})`);
        console.log(`  - 分摊依据: ${rule.allocationBasis}`);
        console.log(`  - 分摊范围ID: ${rule.allocationScopeId}`);
        console.log(`  - 出勤代码过滤: ${rule.allocationAttendanceCodes || '无'}`);
      });
    }

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

    // 获取出勤代码映射（从DefinitionAttendanceCode表查询）
    const attendanceCodeMap = await this.prisma.definitionAttendanceCode.findMany({
      where: { code: { in: attendanceCodes } },
    });
    const attendanceCodeIds = attendanceCodeMap.map((ac) => ac.id);

    console.log(`[分摊计算] 找到 ${attendanceCodeIds.length} 个出勤代码，IDs: ${attendanceCodeIds.join(', ')}`);

    // ✅ 从SystemConfig获取实际工时代码配置
    const actualHoursConfig = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'actualHoursAllocationCode' }
    });

    if (!actualHoursConfig || !actualHoursConfig.configValue) {
      console.error(`[分摊计算] 未找到���际工时代码配置（actualHoursAllocationCode）`);
      throw new BadRequestException('请先在系统配置中设置实际工时代码（actualHoursAllocationCode）');
    }

    console.log(`[分摊计算] 实际工时代码配置 - 出勤代码: ${actualHoursConfig.configValue}`);

    // 获取直接工时出勤代码（从DefinitionAttendanceCode表查询）
    const actualHoursCode = await this.prisma.definitionAttendanceCode.findFirst({
      where: { code: actualHoursConfig.configValue },
    });
    if (!actualHoursCode) {
      console.error(`[分摊计算] 未找到直接工时出勤代码: ${actualHoursConfig.configValue}`);
      throw new BadRequestException(`未找到直接工时出勤代码: ${actualHoursConfig.configValue}`);
    }

    console.log(`[分摊计算] 直接工时出勤代码ID: ${actualHoursCode.id}`);

    // 获取间接工时出勤代码（从DefinitionAttendanceCode表查询）
    // ✅ 从SystemConfig获取间接工时代码配置
    const indirectHoursConfig = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'indirectHoursAllocationCode' }
    });

    if (!indirectHoursConfig || !indirectHoursConfig.configValue) {
      console.error(`[分摊计算] 未找到间接工时代码配置（indirectHoursAllocationCode）`);
      throw new BadRequestException('请先在系统配置中设置间接工时代码（indirectHoursAllocationCode）');
    }

    console.log(`[分摊计算] 间接工时代码配置 - 出勤代码: ${indirectHoursConfig.configValue}`);

    const indirectHoursCode = await this.prisma.definitionAttendanceCode.findFirst({
      where: { code: indirectHoursConfig.configValue },
    });
    if (!indirectHoursCode) {
      console.error(`[分摊计算] 未找到间接工时出勤代码: ${indirectHoursConfig.configValue}`);
      throw new BadRequestException(`未找到间接工时出勤代码: ${indirectHoursConfig.configValue}`);
    }

    console.log(`[分摊计算] 间接工时出勤代码ID: ${indirectHoursCode.id}`);

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
      indirectHoursAttendanceCodeStr: indirectHoursCode.code,
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
      indirectHoursAttendanceCodeStr,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // 按日期分组处理
    const groupedByDate = this.groupCalcResultsByDate(calcResults);

    // ========== 清理旧数据：删除同一配置的旧分摊结果和间接工时记录 ==========
    // 重要：在生成新的分摊结果前，必须先删除旧的分摊结果和相关工时记录
    // 1. 删除分摊结果记录（AllocationResult）
    // 2. 删除间接工时的工时记录（CalcResult）- 这些记录会在工时明细管理页面显示
    // 3. 源数据（被分摊的原始工时）必须保留，不删除
    const uniqueDates = Object.keys(groupedByDate);
    const dateObjects = uniqueDates.map(dateKey => new Date(dateKey));

    console.log(`[分摊计算] 开始清理旧分摊数据...`);
    console.log(`  - 配置ID: ${config.id}`);
    console.log(`  - 日期范围: ${uniqueDates.join(', ')}`);
    console.log(`  - 日期数量: ${uniqueDates.length}`);

    // 1. 删除旧的分摊结果记录（AllocationResult）
    const deletedAllocationResults = await this.prisma.allocationResult.deleteMany({
      where: {
        configId: config.id,
        recordDate: { in: dateObjects },
      },
    });

    console.log(`[分摊计算] 清理分摊结果: 删除 ${deletedAllocationResults.count} 条 AllocationResult 记录`);

    // 2. 删除旧的间接工时记录（WorkHourResult）
    // 这些记录的特征：
    // - calcDate 在指定日期范围内
    // - definitionAttendanceCodeId 是间接工时的出勤代码ID
    // - source 是 3（分摊产生的工时）
    // - sourceType 是 'ALLOCATION'
    const deletedWorkHourResults = await this.prisma.workHourResult.deleteMany({
      where: {
        calcDate: { in: dateObjects },
        definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
        source: '3', // 只删除分摊产生的记录
        sourceType: 'ALLOCATION',
        // 注意：这里不筛选 accountId，因为不同分摊配置可能有不同的目标账户
        // 但只要是间接工时出勤代码 + source=3 + 指定日期，就是分摊产生的记录
      },
    });

    console.log(`[分摊计算] 清理间接工时记录: 删除 ${deletedWorkHourResults.count} 条 WorkHourResult 记录`);

    const totalDeleted = deletedAllocationResults.count + deletedWorkHourResults.count;
    console.log(`[分摊计算] 清理完成: 共删除 ${totalDeleted} 条旧记录（分摊结果 + 间接工时）`);

    if (totalDeleted > 0) {
      console.log(`[分摊计算] 旧数据已清理，将生成新的分摊结果`);
    } else {
      console.log(`[分摊计算] 没有找到旧分摊结果，这是首次分摊`);
    }

    // ========== 开始生成新的分摊结果 ==========
    for (const dateKey in groupedByDate) {
      const dailyResults = groupedByDate[dateKey];
      const calcDate = new Date(dateKey);

      // 获取当天所有班次所开的产线（只包含参与分摊的）
      const activeLines = await this.getActiveLinesForDate(calcDate);

      // ✅ 获取产线到劳动力账户的映射（直接使用账户路径匹配）
      const lineToAccountPath = await this.getLineToAccountPathMapping(activeLines);

      // 先汇总：按员工和出勤代码汇总工时
      const aggregatedResults = this.aggregateCalcResultsByEmployeeAndCode(dailyResults);

      // 对汇总后的工时记录进行分摊
      console.log(`[分摊计算] 汇总后的工时记录数: ${aggregatedResults.length}`);
      for (const aggregatedResult of aggregatedResults) {
        console.log(`[分摊计算] 处理汇总记录: 员工=${aggregatedResult.employeeNo}, 出勤代码ID=${aggregatedResult.attendanceCodeId}, 班次ID=${aggregatedResult.shiftId}, 班次名称=${aggregatedResult.shiftName}, 实际工时=${aggregatedResult.actualHours}`);

        // 获取该班次当天开的产线列表（直接使用工时记录中的班次ID）
        const shiftLines = activeLines.filter((line) => line.shiftId === aggregatedResult.shiftId);

        if (shiftLines.length === 0) {
          console.log(`班次 ${aggregatedResult.shiftName} (ID:${aggregatedResult.shiftId}) 在 ${dateKey} 没有开线，跳过 (员工:${aggregatedResult.employeeNo}, 工时:${aggregatedResult.actualHours})`);
          continue;
        }

        // 对每个分摊规则进行分摊
        for (const rule of config.rules) {
          // ✅ 检查规则的出勤代码过滤是否匹配
          const ruleAttendanceCodeIds = JSON.parse(rule.allocationAttendanceCodes || '[]');
          if (ruleAttendanceCodeIds.length > 0) {
            // 检查当前工时记录的 definitionAttendanceCodeId 是否在规则配置的ID列表中
            if (!aggregatedResult.definitionAttendanceCodeId ||
                !ruleAttendanceCodeIds.includes(aggregatedResult.definitionAttendanceCodeId)) {
              console.log(`[分摊计算] 规则 ${rule.ruleName} 的出勤代码过滤不匹配 ` +
                          `(工时代码ID: ${aggregatedResult.definitionAttendanceCodeId}, ` +
                          `规则配置: [${ruleAttendanceCodeIds.join(', ')}])，跳过该记录`);
              continue;
            }
          }

          // 根据分摊依据类型进行分摊
          if (rule.allocationBasis === 'ACTUAL_HOURS') {
            // 按实际工时比例分摊
            const hoursResult = await this.executeActualHoursAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              shiftId: aggregatedResult.shiftId,
              shiftName: aggregatedResult.shiftName,
              shiftLines,
              lineToAccountPath,
              actualHoursAttendanceCodeId,
              indirectHoursAttendanceCodeId,
              indirectHoursAttendanceCodeStr,
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
              shiftId: aggregatedResult.shiftId,
              shiftName: aggregatedResult.shiftName,
              shiftLines,
              lineToAccountPath,
              indirectHoursAttendanceCodeId,
              indirectHoursAttendanceCodeStr,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += yieldResult;
          }
          else if (rule.allocationBasis === 'EQUIVALENT_YIELDS') {
            // 按同效产量比例分摊（标准产量 = 实际产量 × 转换系数）
            const equivalentYieldResult = await this.executeEquivalentYieldAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              shiftId: aggregatedResult.shiftId,
              shiftName: aggregatedResult.shiftName,
              shiftLines,
              lineToAccountPath,
              indirectHoursAttendanceCodeId,
              indirectHoursAttendanceCodeStr,
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
              shiftId: aggregatedResult.shiftId,
              shiftName: aggregatedResult.shiftName,
              shiftLines,
              lineToAccountPath,
              indirectHoursAttendanceCodeId,
              indirectHoursAttendanceCodeStr,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += standardHoursResult;
          }
          else if (rule.allocationBasis === 'PRODUCTION_LINE_AVERAGE') {
            // 按产线平均分摊
            const averageResult = await this.executeProductionLineAverageAllocation({
              batchNo,
              config,
              rule,
              calcResult: aggregatedResult,
              calcDate,
              shiftId: aggregatedResult.shiftId,
              shiftName: aggregatedResult.shiftName,
              indirectHoursAttendanceCodeId,
              indirectHoursAttendanceCodeStr,
              calcTime,
              executeById,
              executeByName,
            });
            resultCount += averageResult;
          }
        }
      }
    }

    console.log(`[分摊计算] ========== 分摊计算完成 ==========`);
    console.log(`  - 处理日期数: ${uniqueDates.length}`);
    console.log(`  - 生成分摊结果: ${resultCount} 条`);
    console.log(`  - 批次号: ${batchNo}`);
    console.log(`[分摊计算] =====================================`);

    return resultCount;
  }

  /**
   * 按实际工时比例分摊
   */
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
      shiftId,
      shiftName,
      actualHoursAttendanceCodeId,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    console.log(`\n[分摊计算] 开始按实际工时分摊`);
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId}`);

    // ✅ 步骤1: 从待分摊数据的 accountPath 中提取分摊范围层级的值
    if (!calcResult.accountPath) {
      console.log(`❌ 待分摊数据没有 accountPath，跳过分摊`);
      return 0;
    }

    const sourceAccountPath = calcResult.accountPath;
    const pathParts = sourceAccountPath.split('/');
    console.log(`  源账户路径: ${sourceAccountPath}`);
    console.log(`  路径分段: [${pathParts.join(', ')}]`);

    // 获取分摊范围配置，确定层级索引
    // allocationScopeId 指向 Organization 表，代表某个层级的组织
    // 我们需要根据这个组织的层级来确定 accountPath 中的索引
    const scopeLevelConfig = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id: rule.allocationScopeId },
      select: { id: true, code: true, name: true, level: true }
    });

    if (!scopeLevelConfig) {
      console.log(`❌ 分摊范围层级配置不存在 (ID=${rule.allocationScopeId})，跳过分摊`);
      return 0;
    }

    console.log(`  分摊范围层级: ${scopeLevelConfig.name} (ID: ${scopeLevelConfig.id}, Level: ${scopeLevelConfig.level})`);


    // ✅ 使用���级 level 字段确定 accountPath 中的索引
    // 账户路径结构: DH/DH01/DH01001/A01
    // 索引0: DH(工厂,level=1), 索引1: DH01(车间,level=2), 索引2: DH0101(产线,level=3), 索引3: A01(产品,level=4)
    const scopeLevelIndex = scopeLevelConfig.level - 1; // level从1开始，数组索引从0开始

    if (scopeLevelIndex < 0 || scopeLevelIndex >= pathParts.length) {
      console.log(`❌ 层级索引 ${scopeLevelIndex} 超出路径范围，跳过分摊`);
      return 0;
    }

    const scopeValue = pathParts[scopeLevelIndex];
    console.log(`  分摊范围层级索引: ${scopeLevelIndex}`);
    console.log(`  提取的层级值: ${scopeValue}`);

    // ✅ 步骤2: 用日期+班次匹配开线计划表
    console.log(`\n[分摊计算] 步骤2: 匹配开线计划表`);
    console.log(`  匹配条件: 日期=${calcDate.toISOString().split('T')[0]}, 班次ID=${shiftId}`);

    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        scheduleDate: calcDate,
        shiftId: shiftId,
      }
    });

    console.log(`  找到 ${lineShifts.length} 条开线计划记录`);

    if (lineShifts.length === 0) {
      console.log(`❌ 没有找到匹配的开线计划记录，跳过分摊`);
      return 0;
    }

    // ✅ 步骤3: 从开线记录的 accountPath 中提取分摊目标值
    console.log(`\n[分摊计算] 步骤3: 从开线计划提取分摊目标`);

    // 获取WH1001配置，确定开线计划产线对应的劳动力账户层级
    const wh1001Config = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'WH1001' }
    });

    if (!wh1001Config) {
      console.log(`❌ 未找到WH1001配置，无法确定开线计划产线层级`);
      return 0;
    }

    const lineShiftLevelIndex = parseInt(wh1001Config.configValue) - 1; // WH1001的值是3，表示第3层（索引2）
    console.log(`  WH1001配置值: ${wh1001Config.configValue} (层级索引: ${lineShiftLevelIndex})`);

    // 使用Map存储分摊目标，key为分摊目标值（从accountPath提取的层级值）
    const matchedTargetsMap = new Map<string, {
      lineShiftId: number;
      orgId: number;
      orgName: string;
      accountId: number | null;
      targetValue: string; // 从accountPath提取的层级值，作为分摊目标
    }>();

    for (const lineShift of lineShifts) {
      console.log(`\n  开线记录 ID=${lineShift.id}:`);
      console.log(`    组织ID: ${lineShift.orgId}`);
      console.log(`    账户ID: ${lineShift.accountId || 'N/A'}`);

      let targetValue: string | null = null;
      let lineScopeValue: string | null = null; // 产线所属的车间值

      if (lineShift.accountId) {
        // 从劳动力账户路径中提取WH1001配置的层级值作为分摊目标
        const account = await this.prisma.laborAccount.findUnique({
          where: { id: lineShift.accountId },
          select: { path: true, namePath: true }
        });

        if (account && account.path) {
          const accountParts = account.path.split('/');
          targetValue = accountParts[lineShiftLevelIndex]; // 产线层级值（如DH01001）
          lineScopeValue = accountParts[scopeLevelIndex]; // 车间层级值（如DH01）
          console.log(`    账户路径: ${account.path}`);
          console.log(`    提取的分摊目标值 (层级${lineShiftLevelIndex}): ${targetValue}`);
          console.log(`    提取的车间值 (层级${scopeLevelIndex}): ${lineScopeValue}`);
        }
      }

      // ✅ 关键修改：只添加车间值匹配的产线作为分摊目标
      if (targetValue && lineScopeValue === scopeValue) {
        if (!matchedTargetsMap.has(targetValue)) {
          // 获取组织名称
          const org = await this.prisma.organization.findUnique({
            where: { id: lineShift.orgId },
            select: { name: true }
          });

          matchedTargetsMap.set(targetValue, {
            lineShiftId: lineShift.id,
            orgId: lineShift.orgId,
            orgName: org?.name || 'N/A',
            accountId: lineShift.accountId,
            targetValue: targetValue
          });
          console.log(`    ✅ 添加分摊目标: ${targetValue} (车间值匹配: ${lineScopeValue} === ${scopeValue})`);
        }
      } else if (targetValue) {
        console.log(`    ❌ 跳过: 车间值不匹配 (产线车间: ${lineScopeValue}, 待分摊数据车间: ${scopeValue})`);
      }
    }

    // 将Map转为数组
    const matchedTargets = Array.from(matchedTargetsMap.values());

    console.log(`\n[分摊计算] 步骤4: 确定分摊目标`);
    console.log(`  共匹配到 ${matchedTargets.length} 个分摊目标`);

    if (matchedTargets.length === 0) {
      console.log(`❌ 没有匹配的分摊目标，跳过分摊`);
      return 0;
    }

    matchedTargets.forEach((target, index) => {
      console.log(`  目标${index + 1}: 目标值=${target.targetValue}, 组织ID=${target.orgId}, 名称=${target.orgName}`);
    });

    // ✅ 步骤5: 获取当天所有班次的直接工时数据（按分摊目标值汇总）
    const directHoursByTarget = await this.getDirectHoursByTarget({
      calcDate,
      actualHoursAttendanceCodeId,
      targetLevelIndex: lineShiftLevelIndex,
    });

    // ✅ 步骤6: 计算分摊范围的总直接工时（按分摊目标值汇总）
    let scopeDirectHours = 0;

    for (const target of matchedTargets) {
      // 使用分摊目标值（从accountPath提取的层级值）来查询直接工时
      const targetDirectHours = directHoursByTarget[target.targetValue] || 0;
      scopeDirectHours += targetDirectHours;
      console.log(`  目标值=${target.targetValue}: 直接工时=${targetDirectHours}`);
    }

    console.log(`\n[分摊计算] 分摊范围总直接工时: ${scopeDirectHours}`);

    if (scopeDirectHours === 0) {
      console.log(`❌ 分摊范围的直接工时为0，无法按比例分摊，跳过分摊`);
      return 0;
    }

    // ✅ 步骤7: 对每个分摊目标进行分摊
    console.log(`\n[分摊计算] 步骤7: 执行分摊`);
    console.log(`  待分摊工时: ${calcResult.workHours}`);

    for (const target of matchedTargets) {
      // 使用分摊目标值（从accountPath提取的层级值）来获取直接工时
      const targetDirectHours = directHoursByTarget[target.targetValue] || 0;

      console.log(`\n  目标: ${target.orgName} (目标值: ${target.targetValue})`);
      console.log(`    直接工时: ${targetDirectHours}`);

      // 如果该目标没有直接工时，跳过
      if (targetDirectHours === 0) {
        console.log(`    ⚠️  该目标没有直接工时，跳过`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = targetDirectHours / scopeDirectHours;
      const allocatedHours = calcResult.workHours * allocationRatio;

      console.log(`    分摊系数: ${allocationRatio.toFixed(4)}`);
      console.log(`    分摊工时: ${allocatedHours.toFixed(2)}`);

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 获取间接设备账户
        let targetAccountId: number | null = null;
        let targetAccountName: string | null = null;
        let targetAccountPath: string | null = null;

        if (target.accountId) {
          targetAccountId = target.accountId;
          const account = await this.prisma.laborAccount.findUnique({
            where: { id: target.accountId },
            select: { name: true, path: true }
          });
          targetAccountName = account?.name || null;
          targetAccountPath = account?.path || null;
        } else {
          // 如果没有配置账户，创建间接设备账户（传递源账户信息进行逐层合并）
          const indirectAccount = await this.getLineIndirectAccount(
            {
              orgId: target.orgId,
              orgName: target.orgName
            },
            calcResult.accountPath,
            calcResult.accountId
          );
          if (indirectAccount) {
            targetAccountId = indirectAccount.id;
            targetAccountName = indirectAccount.name;
            targetAccountPath = indirectAccount.path;
          }
        }

        if (!targetAccountId) {
          console.log(`    ❌ 无法确定目标账户，跳过`);
          continue;
        }

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
            sourceEmployeeName: calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName || 'N/A',
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode || 'N/A',
            sourceHours: calcResult.workHours,
            targetType: 'ORGANIZATION',
            targetId: target.orgId,
            targetName: target.orgName,
            targetAccountId: targetAccountId,
            allocationBasis: rule.allocationBasis,
            basisValue: targetDirectHours,
            weightValue: scopeDirectHours,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（WorkHourResult）
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate: calcDate,
          shiftId: shiftId,
          shiftName: shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: allocatedHours,
          accountId: targetAccountId,
          accountName: targetAccountName || 'N/A',
          accountPath: targetAccountPath,
          ruleId: rule.id,
          batchNo: batchNo,
        });

        resultCount++;
        console.log(`    ✅ 分摊成功`);
      }
    }

    console.log(`\n[分摊计算] 完成，共生成 ${resultCount} 条分摊结果`);

    return resultCount;
  }

  private async executeActualYieldAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      shiftId,
      shiftName,
      shiftLines,
      lineToAccountPath,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // ✅ 获取源账户的路径
    let sourceAccountPath: string | null = null;

    if (calcResult.accountId) {
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
        select: { id: true, name: true, path: true, namePath: true },
      });

      if (sourceAccount) {
        sourceAccountPath = sourceAccount.path;
        console.log(`源账户: ${sourceAccount.namePath} (path: ${sourceAccount.path})`);
      }
    }

    if (!sourceAccountPath) {
      console.log(`无法确定源账户路径，跳过分摊`);
      return 0;
    }

    // ✅ 使用层级值精确匹配，而不是路径前缀匹配
    console.log(`[分摊计算] 开始过滤产线，源账户路径: ${sourceAccountPath}`);
    console.log(`[分摊计算] shiftLines数量: ${shiftLines.length}`);

    // 第一步：从源账户路径中提取车间层级的值
    // 路径格式：工厂/车间/产线/产品/工序
    // 示例：DH/DH01///  → 提取车间层级 → DH01
    const pathParts = sourceAccountPath.split('/').filter(p => p !== '');
    if (pathParts.length < 2) {
      console.log(`[分摊计算] 源账户路径格式错误，无法提取车间层级: ${sourceAccountPath}`);
      return 0;
    }

    const workshopCode = pathParts[1]; // 第2层是车间层级
    console.log(`[分摊计算] 从源账户路径提取车间层级值: ${workshopCode}`);

    // 第二步：在Organization表中查找车间组织
    const workshopOrg = await this.prisma.organization.findFirst({
      where: { code: workshopCode },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    if (!workshopOrg) {
      console.log(`[分摊计算] 未找到编码为${workshopCode}的车间组织`);
      return 0;
    }

    console.log(`[分摊计算] 找到车间组织: ID=${workshopOrg.id}, code=${workshopOrg.code}, name=${workshopOrg.name}`);

    // 第三步：获取该车间的所有产线组织（parentId=workshopOrg.id）
    const lineOrgs = await this.prisma.organization.findMany({
      where: { parentId: workshopOrg.id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    if (lineOrgs.length === 0) {
      console.log(`[分摊计算] 车间${workshopOrg.name}下没有找到产线组织`);
      return 0;
    }

    const lineOrgIds = lineOrgs.map(org => org.id);
    console.log(`[分摊计算] 找到${lineOrgs.length}个产线组织: IDs=${lineOrgIds.join(', ')}`);
    lineOrgs.forEach(org => {
      console.log(`  - ID=${org.id}, code=${org.code}, name=${org.name}`);
    });

    // 第四步：过滤shiftLines，只保留orgId在lineOrgIds列表中的产线
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      const isMatch = lineOrgIds.includes(lineShift.orgId);
      if (!isMatch) {
        console.log(`  产线 ${lineShift.orgName} (orgId=${lineShift.orgId}) 不在分摊范围内，跳过`);
      }
      return isMatch;
    });

    console.log(`[分摊计算] 过滤后产线数: ${filteredShiftLines.length}`);

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到在分摊范围内的产线，跳过分摊`);
      return 0;
    }

    // ✅ 获取当天各产线的实际产量（使用劳动力账户code路径匹配）
    const productionByLine = await this.getProductionByLine({
      calcDate,
      lineOrgs, // 传递产线组织列表
      productionLineHierarchyLevel: await this.getProductionLineHierarchyLevel(),
    });

    // ✅ 计算分摊范围的总产量（只计算filteredShiftLines中的产线）
    const scopeTotalProduction: Record<string, number> = {};

    for (const key in productionByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      // 只统计在分摊范围内的产线（orgId在lineOrgIds中），并且只统计当前班次的数据
      const lineShift = filteredShiftLines.find(ls => ls.orgId === lineId);
      if (lineShift && shiftId === params.shiftId) {
        if (!scopeTotalProduction['total']) {
          scopeTotalProduction['total'] = 0;
        }
        scopeTotalProduction['total'] += productionByLine[key];
      }
    }
    const scopeProduction = scopeTotalProduction['total'] || 0;

    if (scopeProduction === 0) {
      console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的实际产量为0，跳过分摊`);
      return 0;
    }

    console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的总实际产量: ${scopeProduction}`);

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(lineShift, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户（传递源账户信息进行逐层合并）
      const targetAccount = await this.getLineIndirectAccount(lineShift, sourceAccountPath, calcResult.accountId);

      if (!targetAccount) {
        console.log(`线体 ${lineShift.orgName} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的产量数据
      const lineProductionKey = `${lineShift.orgId}-${shiftId}`;
      const lineProduction = productionByLine[lineProductionKey] || 0;

      if (lineProduction === 0) {
        console.log(`线体 ${lineShift.orgName} 班次 ${shiftName} 的实际产量为0，跳过`);
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
            sourceEmployeeName: calcResult.employeeName || calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode || calcResult.definitionAttendanceCodeStr,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: lineShift.orgId,
            targetName: lineShift.orgName,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineProduction,
            weightValue: scopeProduction,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（WorkHourResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate: calcDate,
          shiftId: shiftId,
          shiftName: shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: allocatedHours,
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          accountPath: targetAccount.path,
          ruleId: rule.id,
          batchNo: batchNo,
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
      shiftId,
      shiftName,
      shiftLines,
      lineToAccountPath,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // ✅ 获取源账户的路径
    let sourceAccountPath: string | null = null;

    if (calcResult.accountId) {
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
        select: { id: true, name: true, path: true, namePath: true },
      });

      if (sourceAccount) {
        sourceAccountPath = sourceAccount.path;
        console.log(`源账户: ${sourceAccount.namePath} (path: ${sourceAccount.path})`);
      }
    }

    if (!sourceAccountPath) {
      console.log(`无法确定源账户路径，跳过分摊`);
      return 0;
    }

    // 获取当天各产线的标准产量数据（实际产量 × 转换系数）
    const equivalentProductionByLine = await this.getEquivalentProductionByLine({
      calcDate,
    });

    // ✅ 过滤shiftLines：只保留账户路径包含源账户路径的产线
    console.log(`[分摊��算] 开始过滤产线，源账户路径: ${sourceAccountPath}`);
    console.log(`[分摊计算] shiftLines:`, shiftLines.map((l: any) => ({ id: l.id, orgId: l.orgId, orgName: l.orgName })));

    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      const lineAccountPath = lineToAccountPath[lineShift.orgId];
      if (!lineAccountPath) {
        console.log(`  产线 ${lineShift.orgName} (orgId=${lineShift.orgId}) 没有找到账户路径，跳过`);
        return false;
      }

      // TODO: 实现新的层级值匹配逻辑
      const isContained = false; // 暂时返回false，等实现新逻辑后再修改
      console.log(`  产线 ${lineShift.orgName} (orgId=${lineShift.orgId}): 账户路径=${lineAccountPath}, 是否包含源路径=${isContained}`);

      return isContained;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到账户路径包含 ${sourceAccountPath} 的产线，跳过分摊`);
      return 0;
    }

    // ✅ 计算分摊范围的总标准产量（只计算filteredShiftLines中的产线）
    const scopeTotalEquivalentProduction: Record<string, number> = {};
    for (const key in equivalentProductionByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const lineAccountPath = lineToAccountPath[lineId];
      // 只统计账户路径包含源账户路径的产线，并且只统计当前班次的数据
      if (false) { // TODO: 实现新的层级值匹配逻辑
        if (!scopeTotalEquivalentProduction['total']) {
          scopeTotalEquivalentProduction['total'] = 0;
        }
        scopeTotalEquivalentProduction['total'] += equivalentProductionByLine[key];
      }
    }

    const scopeEquivalentProduction = scopeTotalEquivalentProduction['total'] || 0;

    if (scopeEquivalentProduction === 0) {
      console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的标准产量为0，跳过分摊`);
      return 0;
    }

    console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的总标准产量: ${scopeEquivalentProduction}`);

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(lineShift, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户（传递源账户信息进行逐层合并）
      const targetAccount = await this.getLineIndirectAccount(lineShift, sourceAccountPath, calcResult.accountId);

      if (!targetAccount) {
        console.log(`线体 ${lineShift.orgName} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的标准产量数据
      const lineProductionKey = `${lineShift.orgId}-${shiftId}`;
      const lineEquivalentProduction = equivalentProductionByLine[lineProductionKey] || 0;

      if (lineEquivalentProduction === 0) {
        console.log(`线体 ${lineShift.orgName} 班次 ${shiftName} 的标准产量为0，跳过`);
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
            sourceEmployeeName: calcResult.employeeName || calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode || calcResult.definitionAttendanceCodeStr,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: lineShift.orgId,
            targetName: lineShift.orgName,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineEquivalentProduction,
            weightValue: scopeEquivalentProduction,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（WorkHourResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate: calcDate,
          shiftId: shiftId,
          shiftName: shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: allocatedHours,
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          accountPath: targetAccount.path,
          ruleId: rule.id,
          batchNo: batchNo,
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
      shiftId,
      shiftName,
      shiftLines,
      lineToAccountPath,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    // ✅ 获取源账户的路径
    let sourceAccountPath: string | null = null;

    if (calcResult.accountId) {
      const sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: calcResult.accountId },
        select: { id: true, name: true, path: true, namePath: true },
      });

      if (sourceAccount) {
        sourceAccountPath = sourceAccount.path;
        console.log(`源账户: ${sourceAccount.namePath} (path: ${sourceAccount.path})`);
      }
    }

    if (!sourceAccountPath) {
      console.log(`无法确定源账户路径，跳过分摊`);
      return 0;
    }

    // 获取当天各产线的标准工时数据（实际产量 × 产品标准工时）
    const standardHoursByLine = await this.getStandardHoursByLine({
      calcDate,
    });

    // ✅ 过滤shiftLines：只保留账户路径包含源账户路径的产线
    console.log(`[分摊计算] 开始过滤产线，源账户路径: ${sourceAccountPath}`);
    console.log(`[分摊计算] shiftLines:`, shiftLines.map((l: any) => ({ id: l.id, orgId: l.orgId, orgName: l.orgName })));

    // ✅ 修复路径匹配逻辑：正确处理层级账户路径
    // 源账户路径可能是：DH/DH01/// (车间层级，///表示空层级)
    // 产线路径可能是：DH/DH01/DH01001// (产线层级)
    // 需要检查产线是否在源账户的范围内
    const filteredShiftLines = shiftLines.filter((lineShift: any) => {
      const lineAccountPath = lineToAccountPath[lineShift.orgId];
      if (!lineAccountPath) {
        console.log(`  产线 ${lineShift.orgName} (orgId=${lineShift.orgId}) 没有找到账户路径，跳过`);
        return false;
      }

      // ✅ 路径包含关系判断：
      // 1. 如果源路径末尾全是///（如 DH/DH01///），去掉末尾的空层级
      // 2. 检查产线路径是否以处理后的源路径开头
      let effectiveSourcePath = sourceAccountPath;

      // 去掉末尾的连续斜杠（空层级）
      while (effectiveSourcePath.endsWith('/')) {
        effectiveSourcePath = effectiveSourcePath.slice(0, -1);
      }

      // 如果源路径不是以/结尾，添加/以确保匹配前缀
      if (!effectiveSourcePath.endsWith('/')) {
        effectiveSourcePath += '/';
      }

      const isContained = lineAccountPath.startsWith(effectiveSourcePath);

      console.log(`  产线 ${lineShift.orgName} (orgId=${lineShift.orgId}): 账户路径=${lineAccountPath}, 源路径=${sourceAccountPath}, 有效源路径=${effectiveSourcePath}, 是否包含=${isContained}`);

      return isContained;
    });

    console.log(`原始产线数: ${shiftLines.length}，过滤后产线数: ${filteredShiftLines.length}`);

    // 输出过滤后的产线列表
    console.log(`[executeStandardHoursAllocation] 过滤后的产线列表:`);
    for (const lineShift of filteredShiftLines) {
      console.log(`  - 线体ID: ${lineShift.orgId}, 线体名称: ${lineShift.orgName}, 班次ID: ${lineShift.shiftId}`);
    }

    if (filteredShiftLines.length === 0) {
      console.log(`没有找到账户路径包含 ${sourceAccountPath} 的产线，跳过分摊`);
      return 0;
    }

    // ✅ 计算分摊范围的总标准工时（只计算filteredShiftLines中的产线）
    const scopeTotalStandardHours: Record<string, number> = {};
    for (const key in standardHoursByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const lineAccountPath = lineToAccountPath[lineId];
      // 只统计账户路径包含源账户路径的产线，并且只统计当前班次的数据
      if (false) { // TODO: 实现新的层级值匹配逻辑
        if (!scopeTotalStandardHours['total']) {
          scopeTotalStandardHours['total'] = 0;
        }
        scopeTotalStandardHours['total'] += standardHoursByLine[key];
      }
    }

    const scopeStandardHours = scopeTotalStandardHours['total'] || 0;

    if (scopeStandardHours === 0) {
      console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的标准工时为0，跳过分摊`);
      return 0;
    }

    console.log(`账户路径 ${sourceAccountPath} 班次 ${params.shiftName} 的总标准工时: ${scopeStandardHours}`);

    // 输出所有标准工时数据用于调试
    console.log(`[executeStandardHoursAllocation] 所有标准工时数据:`);
    for (const key in standardHoursByLine) {
      const [lineId, shiftId] = key.split('-').map(Number);
      const lineAccountPath = lineToAccountPath[lineId];
      console.log(`  产线 ${lineId} (账户路径: ${lineAccountPath || 'N/A'}) 班次 ${shiftId}: ${standardHoursByLine[key]}`);
    }

    // 解析分配归属层级
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    // 对每条产线进行分摊（只分摊到同车间的产线）
    for (const lineShift of filteredShiftLines) {
      // 检查产线是否在分配归属层级中
      if (!this.isLineInHierarchyLevels(lineShift, allocationHierarchyLevels)) {
        continue;
      }

      // 获取产线的间接设备账户（传递源账户信息进行逐层合并）
      const targetAccount = await this.getLineIndirectAccount(lineShift, sourceAccountPath, calcResult.accountId);

      if (!targetAccount) {
        console.log(`线体 ${lineShift.orgName} 没有找到间接设备账户，跳过`);
        continue;
      }

      // 计算分摊 - 使用当前班次的标准工时数据
      const lineProductionKey = `${lineShift.orgId}-${shiftId}`;
      const lineStandardHours = standardHoursByLine[lineProductionKey] || 0;

      if (lineStandardHours === 0) {
        console.log(`线体 ${lineShift.orgName} 班次 ${shiftName} 的标准工时为0，跳过`);
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
            sourceEmployeeName: calcResult.employeeName || calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName,
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode || calcResult.definitionAttendanceCodeStr,
            sourceHours: calcResult.actualHours,
            targetType: 'LINE',
            targetId: lineShift.orgId,
            targetName: lineShift.orgName,
            targetAccountId: targetAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: lineStandardHours,
            weightValue: scopeStandardHours,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（WorkHourResult）
        // 将分摊的工时记录到产线的间接工时账户中
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate: calcDate,
          shiftId: shiftId,
          shiftName: shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: allocatedHours,
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          accountPath: targetAccount.path,
          ruleId: rule.id,
          batchNo: batchNo,
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
  private async getDirectHoursByLine(params: { calcDate: Date; actualHoursAttendanceCodeId: number }): Promise<Record<string, number>> {
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

    // 获取当天的开线计划（线体组织）
    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        scheduleDate: calcDate,
        status: 'ACTIVE',
        participateInAllocation: true,
        deletedAt: null,
      },
    });

    if (lineShifts.length === 0) {
      return {};
    }

    // 建立线体组织名称匹配模式
    const orgPatterns: Record<string, any> = {};
    for (const lineShift of lineShifts) {
      orgPatterns[lineShift.orgName] = lineShift;
    }

    // 获取所有涉及的劳动力账户
    const accountIds = [...new Set(directResults.map(r => r.accountId).filter(id => id !== null))];
    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: accountIds as number[] },
      },
    });

    // 建立账户ID到线体组织的映射
    const accountToLineShift: Record<number, any> = {};
    for (const account of accounts) {
      // 从账户名称路径中提取线体标识
      // 格式：富阳工厂/W1总装车间/L1线体////直接设备
      const pathParts = account.name.split('/');
      for (const part of pathParts) {
        if (orgPatterns[part]) {
          accountToLineShift[account.id] = orgPatterns[part];
          break;
        }
      }
    }

    // 按线体组织和班次汇总直接工时
    const directHoursByLine: Record<string, number> = {};

    for (const result of directResults) {
      // 通过工时的劳动力账户ID找到对应的线体组织
      if (result.accountId && accountToLineShift[result.accountId]) {
        const lineShift = accountToLineShift[result.accountId];
        // 使用 "线体orgId-班次ID" 作为key，确保按班次分别统计
        const key = `${lineShift.orgId}-${result.shiftId}`;
        if (!directHoursByLine[key]) {
          directHoursByLine[key] = 0;
        }
        directHoursByLine[key] += result.actualHours;
      }
    }

    return directHoursByLine;
  }

  /**
   * 按分摊目标值获取直接工时
   * 从WorkHourResult表中查询直接工时，按accountPath的指定层级值分组汇总
   * @param params.calcDate - 计算日期
   * @param params.actualHoursAttendanceCodeId - 直接工时出勤代码ID
   * @param params.targetLevelIndex - 分摊目标层级索引（从WH1001配置获取）
   * @returns Record<string, number> - key为分摊目标值（从accountPath提取的层级值），value为直接工时总数
   */
  private async getDirectHoursByTarget(params: {
    calcDate: Date;
    actualHoursAttendanceCodeId: number;
    targetLevelIndex: number;
  }): Promise<Record<string, number>> {
    const { calcDate, actualHoursAttendanceCodeId, targetLevelIndex } = params;

    console.log(`\n[getDirectHoursByTarget] 开始查询直接工时`);
    console.log(`  计算日期: ${calcDate.toISOString().split('T')[0]}`);
    console.log(`  直接工时出勤代码ID: ${actualHoursAttendanceCodeId}`);
    console.log(`  目标层级索引: ${targetLevelIndex}`);

    // 查询WorkHourResult表中当天的直接工时数据
    const directResults = await this.prisma.workHourResult.findMany({
      where: {
        calcDate,
        definitionAttendanceCodeId: actualHoursAttendanceCodeId,
      },
    });

    console.log(`  查询到 ${directResults.length} 条直接工时记录`);

    if (directResults.length === 0) {
      return {};
    }

    // 按分摊目标值（从accountPath的指定层级提取）分组汇总直接工时
    const directHoursByTarget: Record<string, number> = {};

    for (const result of directResults) {
      if (!result.accountPath) {
        console.log(`  跳过记录 ID=${result.id}：没有accountPath`);
        continue;
      }

      // 从accountPath中提取指定层级的值作为分摊目标值
      const pathParts = result.accountPath.split('/');
      const targetValue = pathParts[targetLevelIndex];

      if (!targetValue) {
        console.log(`  跳过记录 ID=${result.id}：路径中层级${targetLevelIndex}的值为空`);
        console.log(`    accountPath: ${result.accountPath}`);
        continue;
      }

      // 累加该分摊目标值的直接工时
      if (!directHoursByTarget[targetValue]) {
        directHoursByTarget[targetValue] = 0;
      }
      directHoursByTarget[targetValue] += result.workHours || 0;

      console.log(`  记录 ID=${result.id}: 员工=${result.employeeNo}, 工时=${result.workHours}, 目标值=${targetValue}`);
    }

    console.log(`\n[getDirectHoursByTarget] 直接工时汇总结果:`);

    for (const [targetValue, hours] of Object.entries(directHoursByTarget)) {
      console.log(`  目标值=${targetValue}: ${hours}小时`);
    }

    return directHoursByTarget;
  }

  /**
   * 按产线平均分摊
   * 将待分摊工时平均分配到分摊范围内的所有产线
   *
   * 分摊公式：每条产线分摊工时 = 待分摊工时总数 / 产线总数
   *
   * 例如：车间内有3条产线，待分摊工时=9小时，每条产线分摊=9/3=3小时
   */
  private async executeProductionLineAverageAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      shiftId,
      shiftName,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    console.log(`\n[分摊计算] 开始按产线平均分摊`);
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId}`);
    console.log(`  待分摊工时: ${calcResult.actualHours}小时`);

    // ✅ 步骤1: 获取分摊范围配置
    const scopeLevelConfig = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id: rule.allocationScopeId },
      select: { id: true, code: true, name: true, level: true }
    });

    if (!scopeLevelConfig) {
      console.log(`❌ 分摊范围层级配置不存在 (ID=${rule.allocationScopeId})，跳过分摊`);
      return 0;
    }

    console.log(`  分摊范围层级: ${scopeLevelConfig.name} (ID: ${scopeLevelConfig.id}, Level: ${scopeLevelConfig.level})`);

    // ✅ 步骤2: 从待分摊数据的 accountPath 中提取分摊范围的值
    if (!calcResult.accountPath) {
      console.log(`❌ 待分摊数据没有 accountPath，跳过分摊`);
      return 0;
    }

    const sourceAccountPath = calcResult.accountPath;
    const pathParts = sourceAccountPath.split('/').filter(p => p);
    console.log(`  源账户路径: ${sourceAccountPath}`);
    console.log(`  路径分段: [${pathParts.join(', ')}]`);

    // 提取分摊范围的值
    const scopeLevelIndex = scopeLevelConfig.level - 1;
    if (scopeLevelIndex < 0 || scopeLevelIndex >= pathParts.length) {
      console.log(`❌ 层级索引 ${scopeLevelIndex} 超出路径范围，跳过分摊`);
      return 0;
    }

    const scopeValue = pathParts[scopeLevelIndex];
    console.log(`  分摊范围值: ${scopeValue} (层级索引: ${scopeLevelIndex})`);

    // ✅ 步骤3: 查询分摊范围内的所有产线
    // 产线层级固定为 level=3
    const productionLineLevel = 3;
    const productionLineConfig = await this.prisma.accountHierarchyConfig.findFirst({
      where: { level: productionLineLevel, status: 'ACTIVE' },
      select: { id: true, level: true, name: true }
    });

    if (!productionLineConfig) {
      console.log(`❌ 未找到产线层级配置，跳过分摊`);
      return 0;
    }

    console.log(`  产线层级: ${productionLineConfig.name} (Level: ${productionLineConfig.level})`);

    // 查询分摊范围内的所有产线
    // scopeValue 是分摊范围的值（如车间代码 DH01）
    // 需要找到所有路径中包含该值的产线
    const allLines = await this.prisma.organization.findMany({
      where: {
        type: 'TEAM', // 产线类型
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
      }
    });

    // 筛选出分摊范围内的产线
    // 例如：分摊范围是车间 DH01，则筛选出 parentId 指向 DH01 的产线
    const scopeOrg = await this.prisma.organization.findFirst({
      where: { code: scopeValue },
      select: { id: true, code: true, name: true }
    });

    if (!scopeOrg) {
      console.log(`❌ 未找到分摊范围组织 (code=${scopeValue})，跳过分摊`);
      return 0;
    }

    const targetLines = allLines.filter(line => line.parentId === scopeOrg.id);
    console.log(`  找到 ${targetLines.length} 条产线在分摊范围内 (${scopeOrg.name})`);

    if (targetLines.length === 0) {
      console.log(`❌ 分摊范围内没有产线，跳过分摊`);
      return 0;
    }

    // ✅ 步骤4: 计算每条产线应分摊的工时
    const totalHours = calcResult.actualHours || 0;
    const hoursPerLine = totalHours / targetLines.length;

    console.log(`\n[分摊计算] 分摊计算:`);
    console.log(`  待分摊总工时: ${totalHours}小时`);
    console.log(`  产线数量: ${targetLines.length}`);
    console.log(`  每条产线分摊: ${hoursPerLine.toFixed(2)}小时`);

    // ✅ 步骤5: 为每条产线创建间接工时记录
    for (const line of targetLines) {
      console.log(`\n[分摊计算] 处理产线: ${line.name} (${line.code})`);

      // ✅ 使用 getLineIndirectAccount 方法获取或创建产线的间接工时账户
      // 该方法会逐层合并源账户路径和目标产线��息
      const lineAccount = await this.getLineIndirectAccount(
        {
          orgId: line.id,
          orgName: line.name
        },
        calcResult.accountPath,
        calcResult.accountId
      );

      console.log(`  目标账户: ${lineAccount.name} (路径: ${lineAccount.path})`);

      if (!lineAccount) {
        console.log(`  ✗ 无法创建产线账户，跳过该产线`);
        continue;
      }

      // 创建或更新间接工时记录
      try {
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate,
          shiftId,
          shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: hoursPerLine,
          accountId: lineAccount.id,
          accountName: lineAccount.name,
          accountPath: lineAccount.path,
          ruleId: rule.id,
          batchNo,
        });

        console.log(`  ✓ 创建间接工时记录: 员工=${calcResult.employeeNo}, 产线=${line.name}, 工时=${hoursPerLine.toFixed(2)}小时`);

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
            sourceEmployeeName: calcResult.employeeName || calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName || 'N/A',
            attendanceCodeId: calcResult.definitionAttendanceCodeId,
            attendanceCode: calcResult.definitionAttendanceCodeStr || 'N/A',
            sourceHours: totalHours,
            targetType: 'LINE',
            targetId: line.id,
            targetName: line.name,
            targetAccountId: lineAccount.id,
            allocationBasis: rule.allocationBasis,
            basisValue: 1, // ✅ 分摊依据固定为1
            weightValue: targetLines.length, // ✅ 权重值为产线数量
            allocationRatio: 1 / targetLines.length,
            allocatedHours: hoursPerLine,
            calcTime,
          },
        } as any);

        resultCount++;
      } catch (error: any) {
        console.error(`  ✗ 创建分摊记录失败: ${error.message}`);
      }
    }

    console.log(`\n[分摊计算] 按产线平均分摊完成，生成 ${resultCount} 条记录`);

    return resultCount;
  }

  /**
   * 获取指定日期各产线的实际产量
   * ✅ 使用劳动力账户code路径进行匹配
   * @param params.calcDate - 计算日期
   * @param params.lineOrgs - 产线组织列表（从filteredShiftLines获取）
   * @param params.productionLineHierarchyLevel - 产线层级配置（从SystemConfig获取）
   * @returns 按"orgId-shiftId"为key的产量Map
   */
  private async getProductionByLine(params: {
    calcDate: Date;
    lineOrgs?: Array<{ id: number; code: string; name: string }>;
    productionLineHierarchyLevel?: number;
  }): Promise<Record<string, number>> {
    const { calcDate, lineOrgs, productionLineHierarchyLevel } = params;

    // 如果没有提供产线组织列表，返回空结果
    if (!lineOrgs || lineOrgs.length === 0) {
      console.log(`[getProductionByLine] 未提供产线组织列表，返回空结果`);
      return {};
    }

    // 如果没有提供产线层级配置，从SystemConfig获取
    const hierarchyLevel = productionLineHierarchyLevel ||
      (await this.getProductionLineHierarchyLevel());

    console.log(`[getProductionByLine] 开始获取产量数据，日期=${calcDate.toISOString()}, 产线层级=${hierarchyLevel}`);
    console.log(`[getProductionByLine] 产线组织数量=${lineOrgs.length}`);

    // 获取当天的产量记录，包含劳动力账户信息
    const productionRecords = await this.prisma.productionRecord.findMany({
      where: {
        recordDate: calcDate,
        deletedAt: null,
      },
    });

    console.log(`[getProductionByLine] 查询到${productionRecords.length}条产量记录`);

    // 获取所有相关的劳动力账户
    const orgIds = lineOrgs.map(org => org.id);
    const laborAccounts = await this.prisma.laborAccount.findMany({
      where: {
        path: {
          contains: '/', // 确保是有效路径
        },
        status: 'ACTIVE',
      },
    });

    // 按产线编码分组劳动力账户
    // 从路径中提取产线层级的值（第hierarchyLevel层）
    const laborAccountsByLineCode = new Map<string, typeof laborAccounts>();
    for (const account of laborAccounts) {
      const pathParts = account.path.split('/').filter(p => p !== '');
      if (pathParts.length >= hierarchyLevel) {
        const lineCode = pathParts[hierarchyLevel - 1]; // 层级从1开始，数组从0开始
        if (!laborAccountsByLineCode.has(lineCode)) {
          laborAccountsByLineCode.set(lineCode, []);
        }
        laborAccountsByLineCode.get(lineCode)!.push(account);
      }
    }

    console.log(`[getProductionByLine] 劳动力账户按产线编码分组完成，分组数=${laborAccountsByLineCode.size}`);

    // 按产线和班次汇总实际产量
    // Key格式: "orgId-shiftId" （orgId是Organization.id）
    const productionByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (!record.shiftId) {
        continue;
      }

      // 通过ProductionRecord.orgId获取劳动力账户
      const recordLaborAccount = laborAccounts.find(la => la.id === record.orgId);
      if (!recordLaborAccount) {
        continue;
      }

      // 从劳动力账户路径中提取产线编码
      const pathParts = recordLaborAccount.path.split('/').filter(p => p !== '');
      if (pathParts.length < hierarchyLevel) {
        continue;
      }

      const lineCode = pathParts[hierarchyLevel - 1];

      // 查找对应的产线组织（通过code匹配）
      const lineOrg = lineOrgs.find(org => org.code === lineCode);
      if (!lineOrg) {
        continue;
      }

      // 使用产线组织的ID作为key
      const key = `${lineOrg.id}-${record.shiftId}`;
      if (!productionByLineAndShift[key]) {
        productionByLineAndShift[key] = 0;
      }
      productionByLineAndShift[key] += record.actualQty || 0;

      console.log(`[getProductionByLine] 匹配产量记录: orgId=${lineOrg.id}, code=${lineCode}, shiftId=${record.shiftId}, actualQty=${record.actualQty}`);
    }

    console.log(`[getProductionByLine] 产量汇总完成，结果条数=${Object.keys(productionByLineAndShift).length}`);
    Object.entries(productionByLineAndShift).forEach(([key, qty]) => {
      console.log(`  ${key}: ${qty}`);
    });

    return productionByLineAndShift;
  }

  /**
   * 获取产线层级配置
   */
  private async getProductionLineHierarchyLevel(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'productionLineHierarchyLevel' },
    });
    return config?.configValue ? parseInt(config.configValue, 10) : 3;
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
    });

    // 按产线和班次汇总标准产量
    // Key格式: "lineId-shiftId"
    const equivalentProductionByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (record.lineId && record.shiftId) {
        const key = `${record.lineId}-${record.shiftId}`;
        if (!equivalentProductionByLineAndShift[key]) {
          equivalentProductionByLineAndShift[key] = 0;
        }
        // 标准产量 = 实际产量（不使用转换系数）
        equivalentProductionByLineAndShift[key] += record.actualQty || 0;
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
    });

    console.log(`[getStandardHoursByLine] 查询到 ${productionRecords.length} 条产量记录`);

    // 按产线和班次汇总标准工时
    // Key格式: "lineId-shiftId"
    const standardHoursByLineAndShift: Record<string, number> = {};

    for (const record of productionRecords) {
      if (record.lineId && record.shiftId) {
        const key = `${record.lineId}-${record.shiftId}`;
        if (!standardHoursByLineAndShift[key]) {
          standardHoursByLineAndShift[key] = 0;
        }
        // 标准工时 = 实际产量 × 产品标准工时（从记录中获取）
        const productStandardHours = record.standardHours || 0;
        const actualQty = record.actualQty || 0;
        const calculatedHours = actualQty * productStandardHours;
        standardHoursByLineAndShift[key] += calculatedHours;

        console.log(`[getStandardHoursByLine] 产线ID: ${record.lineId}, 班次ID: ${record.shiftId}, ` +
                    `产品: ${record.productName}, 实际产量: ${actualQty}, 产品标准工时: ${productStandardHours}, ` +
                    `计算标准工时: ${calculatedHours}, 累计: ${standardHoursByLineAndShift[key]}`);
      } else {
        if (!record.lineId) {
          console.log(`[getStandardHoursByLine] 产量记录缺少产线ID: ${record.id}`);
        }
        if (!record.shiftId) {
          console.log(`[getStandardHoursByLine] 产量记录缺少班次ID: ${record.id}`);
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
    // ✅ 修复日期类型匹配：使用原始SQL查询
    // LineShift.scheduleDate 存储的是 integer（毫秒时间戳）
    // Prisma schema定义是DateTime，但实际数据类型不匹配，所以使用原始查询
    const calcTimestamp = calcDate.getTime();

    const lineShifts = await this.prisma.$queryRaw`
      SELECT *
      FROM "LineShift"
      WHERE "scheduleDate" = ${calcTimestamp}
        AND "status" = 'ACTIVE'
        AND "participateInAllocation" = 1
        AND "deletedAt" IS NULL
    `;

    return lineShifts as any[];
  }

  /**
   * 获取产线到车间的映射
   */
  /**
   * 获取产线（线体组织）到车间的映射
   * 通过组织的parentId关系：线体 orgId → parentId（车间ID）
   */
  private async getLineToWorkshopMapping(lineShifts: any[]): Promise<Record<number, number>> {
    const mapping: Record<number, number> = {};

    // 收集所有唯一的orgId
    const uniqueOrgIds = [...new Set(lineShifts.map((ls) => ls.orgId))];

    // 批量查询组织信息
    const orgs = await this.prisma.organization.findMany({
      where: {
        id: { in: uniqueOrgIds },
      },
      select: {
        id: true,
        parentId: true,
        type: true,
      },
    });

    // 建立orgId → parentId的映射
    const orgToParent: Record<number, number> = {};
    for (const org of orgs) {
      if (org.parentId) {
        orgToParent[org.id] = org.parentId;
      }
    }

    // 为lineShift建立映射：orgId → 车间ID
    for (const lineShift of lineShifts) {
      const workshopId = orgToParent[lineShift.orgId];
      if (workshopId) {
        mapping[lineShift.orgId] = workshopId;
      }
    }

    return mapping;
  }

  /**
   * ✅ 获取产线到劳动力账户路径的映射
   * 通过LineShift.accountId获取LaborAccount.path
   */
  private async getLineToAccountPathMapping(lineShifts: any[]): Promise<Record<number, string>> {
    const mapping: Record<number, string> = {};

    // 收集所有唯一的accountId
    const uniqueAccountIds = [...new Set(lineShifts.map((ls) => ls.accountId).filter(id => id))];

    if (uniqueAccountIds.length === 0) {
      console.warn('[getLineToAccountPathMapping] 没有找到任何accountId');
      return mapping;
    }

    // 批量查询劳动力账户信息
    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: uniqueAccountIds },
      },
      select: {
        id: true,
        path: true,
        namePath: true,
      },
    });

    // 建立accountId → path的映射
    const accountToPath: Record<number, string> = {};
    for (const account of accounts) {
      if (account.path) {
        accountToPath[account.id] = account.path;
      }
    }

    // 为lineShift建立映射：orgId → accountPath
    for (const lineShift of lineShifts) {
      if (lineShift.accountId && lineShift.orgId) {
        const accountPath = accountToPath[lineShift.accountId];
        if (accountPath) {
          mapping[lineShift.orgId] = accountPath;
          console.log(`[getLineToAccountPathMapping] 产线orgId=${lineShift.orgId}, accountId=${lineShift.accountId}, path=${accountPath}`);
        } else {
          console.warn(`[getLineToAccountPathMapping] 产线orgId=${lineShift.orgId}, accountId=${lineShift.accountId} 没有找到path`);
        }
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
  private async getLineToFactoryMapping(lineShifts: any[]): Promise<Record<number, number>> {
    const mapping: Record<number, number> = {};

    // Get unique orgIds from lineShifts
    const uniqueOrgIds = [...new Set(lineShifts.map((ls) => ls.orgId))];

    // Batch query organizations
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: uniqueOrgIds } },
      select: { id: true, parentId: true },
    });

    // Build orgId → org object mapping
    const orgMap: Record<number, any> = {};
    for (const org of orgs) {
      orgMap[org.id] = org;
    }

    // For each lineShift, get the factory (parent's parent)
    for (const lineShift of lineShifts) {
      const lineOrg = orgMap[lineShift.orgId];
      if (lineOrg && lineOrg.parentId) {
        // Get the workshop (parent of line)
        const workshop = await this.prisma.organization.findUnique({
          where: { id: lineOrg.parentId },
          select: { parentId: true },
        });
        // workshop.parentId is the factory
        if (workshop && workshop.parentId) {
          mapping[lineShift.orgId] = workshop.parentId;
        }
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
      return await this.getLineToWorkshopMapping(lineShifts);
    }

    const mapping: Record<number, number> = {};
    const mappingType = hierarchyConfig.mappingType;
    const mappingValue = hierarchyConfig.mappingValue;

    console.log(`[getLineToHierarchyMapping] hierarchyLevelId=${hierarchyLevelId}, mappingType=${mappingType}, mappingValue=${mappingValue}`);

    // 收集所有唯一的orgId
    const uniqueOrgIds = [...new Set(lineShifts.map((ls) => ls.orgId))];

    // 批量查询组织信息（获取完整的层级路径）
    const orgs = await this.prisma.organization.findMany({
      where: {
        id: { in: uniqueOrgIds },
      },
      select: {
        id: true,
        parentId: true,
        type: true,
      },
    });

    // 建立orgId → Organization的映射
    const orgMap: Record<number, any> = {};
    for (const org of orgs) {
      orgMap[org.id] = org;
    }

    // 根据映射类型和映射值确定使用哪个层级
    for (const lineShift of lineShifts) {
      const org = orgMap[lineShift.orgId];
      if (!org) continue;

      let scopeId: number | undefined;

      if ((mappingType === 'ORG_TYPE' || mappingType === 'ORG') && mappingValue) {
        // 根据组织类型映射
        const orgType = mappingValue.toUpperCase();

        if (orgType.includes('TEAM') || orgType.includes('LINE') || orgType.includes('产线') || orgType.includes('线体')) {
          // 线体级别，使用线体自身ID
          scopeId = org.id;
        } else if (orgType.includes('DEPARTMENT') || orgType.includes('WORKSHOP') || orgType.includes('车间')) {
          // 车间级别，使用线体的parentId（车间ID）
          scopeId = org.parentId || undefined;
        } else if (orgType.includes('COMPANY') || orgType.includes('FACTORY') || orgType.includes('ORG') || orgType.includes('工厂') || orgType.includes('组织')) {
          // 工厂级别，需要向上查找
          // 车间的parentId是工厂
          if (org.parentId) {
            const parentOrg = await this.prisma.organization.findUnique({
              where: { id: org.parentId },
              select: { parentId: true },
            });
            scopeId = parentOrg?.parentId;
          }
        } else {
          // 其他类型，默认使用线体自身ID
          console.warn(`未知的组织类型映射: ${mappingValue}，使用线体自身ID`);
          scopeId = org.id;
        }
      } else {
        // 默认使用线体自身ID
        scopeId = org.id;
      }

      if (scopeId !== undefined && scopeId !== null) {
        mapping[lineShift.orgId] = scopeId;
      }
    }

    console.log(`[getLineToHierarchyMapping] Final mapping:`, mapping);
    return mapping;
  }

  /**
   * 检查产线是否在指定的层级中
   * @param lineShift 线体班次对象
   * @param hierarchyLevels 层级ID列表（来自AccountHierarchyConfig）
   * @returns 是否参与分摊
   */
  private isLineInHierarchyLevels(lineShift: any, hierarchyLevels: any[]): boolean {
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
      // ✅ 使用员工编号、出勤代码字符串、班次ID和账户ID作为唯一键
      // 兼容WorkHourResult和CalcResult两种数据结构
      // WorkHourResult: 使用 workHours, definitionAttendanceCodeId
      // CalcResult: 使用 actualHours, attendanceCodeId
      const attendanceCode = result.attendanceCode || result.calcAttendanceCode || '';
      const key = `${result.employeeNo}-${attendanceCode}-${result.shiftId}-${result.accountId}`;

      if (aggregatedMap.has(key)) {
        // 如果已存在，累加工时
        const existing = aggregatedMap.get(key);

        // ✅ 兼容两种数据结构的工时字段
        const workHours = result.actualHours || result.workHours || 0;
        existing.actualHours = (existing.actualHours || 0) + workHours;
        existing.workHours = (existing.workHours || 0) + workHours;

        // CalcResult特有字段
        existing.standardHours = (existing.standardHours || 0) + (result.standardHours || 0);
        existing.overtimeHours = (existing.overtimeHours || 0) + (result.overtimeHours || 0);
        existing.leaveHours = (existing.leaveHours || 0) + (result.leaveHours || 0);
        existing.absenceHours = (existing.absenceHours || 0) + (result.absenceHours || 0);

        // 保存原始记录ID列表，用于追踪
        if (!existing.sourceIds) {
          existing.sourceIds = [];
        }
        existing.sourceIds.push(result.id);
      } else {
        // 如果不存在，创建新记录
        // ✅ 字段映射：将WorkHourResult的字段映射为CalcResult格式
        const workHours = result.actualHours || result.workHours || 0;
        aggregatedMap.set(key, {
          ...result,
          actualHours: workHours,
          workHours: workHours,
          attendanceCodeId: result.definitionAttendanceCodeId || result.attendanceCodeId,
          definitionAttendanceCodeId: result.definitionAttendanceCodeId,
          standardHours: result.standardHours || 0,
          overtimeHours: result.overtimeHours || 0,
          leaveHours: result.leaveHours || 0,
          absenceHours: result.absenceHours || 0,
          sourceIds: [result.id],
        });
      }
    });

    return Array.from(aggregatedMap.values());
  }

  /**
   * 获取或创建产线的间接工时账户
   * 通过源账户路径与目标层级逐层合并生成目标账户
   *
   * @param lineShift 产线班次对象
   * @param sourceAccountPath 源账户路径（格式：工厂/车间/产线/产品/工序）
   * @param sourceAccountId 源账户ID
   * @returns 目标账户对象
   */
  private async getLineIndirectAccount(lineShift: any, sourceAccountPath?: string, sourceAccountId?: number): Promise<any> {
    // 查询源账户信息
    let sourceAccount: any = null;
    if (sourceAccountId) {
      sourceAccount = await this.prisma.laborAccount.findUnique({
        where: { id: sourceAccountId },
        select: { id: true, name: true, namePath: true, path: true, hierarchyValues: true }
      });
    }

    // 通过线体组织查询产线信息
    const lineOrg = await this.prisma.organization.findUnique({
      where: { id: lineShift.orgId },
      select: { id: true, name: true, code: true, parentId: true, type: true },
    });

    if (!lineOrg) {
      console.log(`线体组织不存在 (orgId: ${lineShift.orgId})`);
      return null;
    }

    // 查询车间和工厂信息
    let workshopOrg: any = null;
    let factoryOrg: any = null;

    if (lineOrg.parentId) {
      workshopOrg = await this.prisma.organization.findUnique({
        where: { id: lineOrg.parentId },
        select: { id: true, name: true, code: true, parentId: true, type: true },
      });

      if (workshopOrg && workshopOrg.parentId) {
        factoryOrg = await this.prisma.organization.findUnique({
          where: { id: workshopOrg.parentId },
          select: { id: true, name: true, code: true, type: true },
        });
      }
    }

    // 逐层合并生成目标账户路径
    // 路径格式：工厂/车间/产线/产品/工序
    let targetPathParts = ['', '', '', '', '']; // 初始化5层
    let targetNamePathParts = ['', '', '', '', ''];
    let targetCodePathParts = ['', '', '', '', ''];

    if (sourceAccount && sourceAccount.path) {
      // 从源账户路径中提取各层级的值
      const sourcePathParts = sourceAccount.path.split('/').filter(p => p !== '');
      const sourceNamePathParts = (sourceAccount.namePath || sourceAccount.name).split('/').filter(p => p !== '');

      // 复制源账户的层级值（工厂、车间）
      for (let i = 0; i < Math.min(2, sourcePathParts.length); i++) {
        targetCodePathParts[i] = sourcePathParts[i];
      }
      for (let i = 0; i < Math.min(2, sourceNamePathParts.length); i++) {
        targetNamePathParts[i] = sourceNamePathParts[i];
      }
    } else {
      // 使用组织信息
      if (factoryOrg) {
        targetCodePathParts[0] = factoryOrg.code;
        targetNamePathParts[0] = factoryOrg.name;
      }
      if (workshopOrg) {
        targetCodePathParts[1] = workshopOrg.code;
        targetNamePathParts[1] = workshopOrg.name;
      }
    }

    // 目标层级（产线）优先级高，替换第3层
    targetCodePathParts[2] = lineOrg.code;
    targetNamePathParts[2] = lineOrg.name;

    // 产品和工序层级保持为空（第4、5层）
    // 因为源账户是车间层级（DH/DH01///），后面都是空的

    const targetPath = targetCodePathParts.join('/');
    const targetNamePath = targetNamePathParts.join('/');
    const targetName = targetNamePath;

    console.log(`[逐层合并] 源账户路径: ${sourceAccount?.path || 'N/A'}`);
    console.log(`[逐层合并] 目标产线: ${lineOrg.name} (${lineOrg.code})`);
    console.log(`[逐层合并] 合并后路径: ${targetPath}`);
    console.log(`[逐层合并] 合并后名称: ${targetName}`);

    // 查找或创建目标账户
    let account = await this.prisma.laborAccount.findFirst({
      where: {
        path: targetPath,
        status: 'ACTIVE',
      },
    });

    if (!account) {
      console.log(`目标账户不存在，自动创建: ${targetName}`);

      try {
        // 查找父账户（去掉最后一层）
        const parentPath = targetCodePathParts.slice(0, 2).join('/');
        let parentAccount = await this.prisma.laborAccount.findFirst({
          where: {
            path: parentPath,
            status: 'ACTIVE',
          },
        });

        // 如果父账户也不存在，先创建父账户
        if (!parentAccount && sourceAccount) {
          // 使用源账户作为父账户
          parentAccount = sourceAccount;
        }

        // 解析hierarchyValues
        let hierarchyValues: any = {};
        try {
          if (sourceAccount && sourceAccount.hierarchyValues) {
            const sourceHv = JSON.parse(sourceAccount.hierarchyValues);
            if (Array.isArray(sourceHv)) {
              // 从源账户的层级值中复制，并添加产线层级
              hierarchyValues = {
                orgId: sourceHv.find((hv: any) => hv.levelId === 4)?.selectedValue?.id,
                workshopId: sourceHv.find((hv: any) => hv.levelId === 5)?.selectedValue?.id,
                lineId: lineOrg.id,
              };
            } else {
              hierarchyValues = sourceHv;
            }
          }
        } catch (e) {
          console.log(`解析源账户hierarchyValues失败，使用默认值`);
        }

        // 创建目标账户
        account = await this.prisma.laborAccount.create({
          data: {
            name: targetName,
            code: `LINE_${lineOrg.code}_${lineShift.orgId}`,
            path: targetPath,
            namePath: targetNamePath,
            accountPath: targetPath,
            type: 'LINE',
            level: 3,
            parentId: parentAccount?.id,
            parentPath: parentAccount?.path,
            hierarchyValues: JSON.stringify(hierarchyValues),
            orgId: lineOrg.id,
            orgName: lineOrg.name,
            status: 'ACTIVE',
            effectiveDate: new Date(),
            usageType: 'ALLOCATED', // 标记为分摊工时账户
          },
        });

        console.log(`✓ 成功创建目标账户: ${account.name} (ID: ${account.id}, path: ${account.path})`);
      } catch (error: any) {
        console.error(`✗ 创建目标账户失败: ${error.message}`);
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
    lineShift: any,
    indirectHoursAttendanceCodeId: number,
    executeById: number,
    executeByName: string
  ): Promise<any> {
    // 账户编码：线体orgId_INDIRECT
    const accountCode = `LINE_${lineShift.orgId}_INDIRECT`;

    // 查找是否已存在该线体的间接工时账户
    let account = await this.prisma.laborAccount.findFirst({
      where: {
        code: accountCode,
        status: 'ACTIVE',
      },
    });

    if (!account) {
      // 需要创建线体的间接工时账户
      // 首先确保上级账户存在（组织 -> 车间 -> 线体）

      // 1. 查找或创建组织账户（工厂）
      // 通过线体组织查询车间和工厂
      const lineOrg = await this.prisma.organization.findUnique({
        where: { id: lineShift.orgId },
        select: { id: true, name: true, parentId: true },
      });

      let orgId = 1;
      let orgName = '默认工厂';
      let workshopId: number | null = null;
      let workshopName = '默认车间';

      if (lineOrg && lineOrg.parentId) {
        // 查询车间
        const workshop = await this.prisma.organization.findUnique({
          where: { id: lineOrg.parentId },
          select: { id: true, name: true, parentId: true },
        });

        if (workshop) {
          workshopId = workshop.id;
          workshopName = workshop.name;
          // 查询工厂
          if (workshop.parentId) {
            const factory = await this.prisma.organization.findUnique({
              where: { id: workshop.parentId },
              select: { id: true, name: true },
            });
            if (factory) {
              orgId = factory.id;
              orgName = factory.name;
            }
          }
        }
      }

      let orgAccount = await this.prisma.laborAccount.findFirst({
        where: {
          type: 'ORG',
          code: `ORG_${orgId}`,
          status: 'ACTIVE',
        },
      });

      if (!orgAccount) {
        orgAccount = await this.prisma.laborAccount.create({
          data: {
            code: `ORG_${orgId}`,
            name: orgName,
            type: 'ORG',
            level: 1,
            path: `${orgId}`,
            namePath: orgName,
            hierarchyValues: JSON.stringify({
              orgId: orgId,
              orgName: orgName,
            }),
            usageType: 'ALLOCATED',
            effectiveDate: new Date(),
            status: 'ACTIVE',
          },
        });
      }

      // 2. 查找或创建车间账户
      let workshopAccount = null;
      if (workshopId) {
        workshopAccount = await this.prisma.laborAccount.findFirst({
          where: {
            type: 'WORKSHOP',
            code: `WORKSHOP_${workshopId}`,
            status: 'ACTIVE',
          },
        });

        if (!workshopAccount) {
          workshopAccount = await this.prisma.laborAccount.create({
            data: {
              code: `WORKSHOP_${workshopId}`,
              name: workshopName,
              type: 'WORKSHOP',
              level: orgAccount.level + 1,
              path: `${orgAccount.path}/${workshopId}`,
              namePath: `${orgAccount.namePath}/${workshopName}`,
              hierarchyValues: JSON.stringify({
                orgId: orgId,
                orgName: orgName,
                workshopId: workshopId,
                workshopName: workshopName,
              }),
              parentId: orgAccount.id,
              usageType: 'ALLOCATED',
              effectiveDate: new Date(),
              status: 'ACTIVE',
            },
          });
        }
      }

      // 3. 创建线体间接工时账户
      const parentAccount = workshopAccount || orgAccount;

      account = await this.prisma.laborAccount.create({
        data: {
          code: accountCode,
          name: `${lineShift.orgName}_间接工时`,
          type: 'LINE',
          level: parentAccount.level + 1,
          path: `${parentAccount.path}/${lineShift.orgId}`,
          namePath: `${parentAccount.namePath}/${lineShift.orgName}_间接工时`,
          hierarchyValues: JSON.stringify({
            lineId: lineShift.orgId,
            lineCode: `LINE_${lineShift.orgId}`,
            lineName: lineShift.orgName,
            workshopId: workshopId,
            workshopName: workshopName,
            orgId: orgId,
            orgName: orgName,
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
   * 根据筛选条件过滤员工列表
   * 支持多字段组合条件（fieldGroups结构）
   */
  private filterEmployeesByConditions(employees: any[], employeeFilter: any): string[] {
    const filteredEmployeeNos: string[] = [];

    // employeeFilter结构: { fieldGroups: [{ id: "xxx", fieldGroups: [{ id: "xxx", conditions: [...] }] }] }
    if (!employeeFilter.fieldGroups || employeeFilter.fieldGroups.length === 0) {
      return employees.map(e => e.employeeNo);
    }

    // 遍历每个字段组（OR关系）
    for (const fieldGroup of employeeFilter.fieldGroups) {
      if (!fieldGroup.fieldGroups || fieldGroup.fieldGroups.length === 0) {
        continue;
      }

      // 每个字段组内的子组是AND关系
      let groupMatchedEmployeeNos = [...employees.map(e => e.employeeNo)];

      for (const subGroup of fieldGroup.fieldGroups) {
        if (!subGroup.conditions || subGroup.conditions.length === 0) {
          continue;
        }

        // 子组内的条件是AND关系
        const subGroupEmployeeNos: string[] = [];

        for (const employee of employees) {
          let matchesAllConditions = true;

          for (const condition of subGroup.conditions) {
            const { fieldCode, operator, value } = condition;

            // 获取员工的字段值
            const fieldValue = employee[fieldCode];

            // 根据操作符判断
            if (!this.evaluateCondition(fieldValue, operator, value)) {
              matchesAllConditions = false;
              break;
            }
          }

          if (matchesAllConditions) {
            subGroupEmployeeNos.push(employee.employeeNo);
          }
        }

        // 取交集（AND关系）
        groupMatchedEmployeeNos = groupMatchedEmployeeNos.filter(no => subGroupEmployeeNos.includes(no));
      }

      // 取并集（OR关系）
      for (const employeeNo of groupMatchedEmployeeNos) {
        if (!filteredEmployeeNos.includes(employeeNo)) {
          filteredEmployeeNos.push(employeeNo);
        }
      }
    }

    return filteredEmployeeNos;
  }

  /**
   * 评估单个筛选条件
   */
  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'eq': // 等于
        return fieldValue == conditionValue;
      case 'ne': // 不等于
        return fieldValue != conditionValue;
      case 'gt': // 大于
        return fieldValue > conditionValue;
      case 'gte': // 大于等于
        return fieldValue >= conditionValue;
      case 'lt': // 小于
        return fieldValue < conditionValue;
      case 'lte': // 小于等于
        return fieldValue <= conditionValue;
      case 'like': // 模糊匹配
        return fieldValue && fieldValue.toString().includes(conditionValue.toString());
      case 'in': // 包含于
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'notIn': // 不包含于
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * 根据筛选条件获取工时记录
   */
  private async getFilteredCalcResults(params: any): Promise<any[]> {
    const { startDate, endDate, employeeFilter, accountFilter, attendanceCodeIds } = params;

    console.log(`\n[分摊计算] ========== 开始查询待分摊工时记录 ==========`);
    console.log(`  日期范围: ${startDate} ~ ${endDate}`);
    console.log(`  出勤代码IDs: ${attendanceCodeIds?.join(', ') || '无'}`);
    console.log(`  员工筛选: ${JSON.stringify(employeeFilter)}`);
    console.log(`  账户筛选: ${JSON.stringify(accountFilter)}`);

    const nextDate = new Date(endDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const where: any = {
      calcDate: {
        gte: startDate,
        lt: nextDate,
      },
    };

    // 出勤代码筛选（使用definitionAttendanceCodeId）
    if (attendanceCodeIds && attendanceCodeIds.length > 0) {
      where.definitionAttendanceCodeId = { in: attendanceCodeIds };
      console.log(`  应用出勤代码筛选: ${attendanceCodeIds.join(', ')}`);
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

    const results = await this.prisma.workHourResult.findMany({
      where,
    });

    // 人员筛选（在查询后处理）
    let filteredResults = results;


    // ✅ 人员筛选（在查���后处理）
    if (employeeFilter && Object.keys(employeeFilter).length > 0) {
      console.log(`[分摊计算] 开始应用人员筛选条件: ${JSON.stringify(employeeFilter)}`);

      // 提取所有唯一的employeeNo
      const uniqueEmployeeNos = [...new Set(results.map(r => r.employeeNo))];
      console.log(`[分摊计算] 待筛选的员工数量: ${uniqueEmployeeNos.length}`);

      if (uniqueEmployeeNos.length > 0) {
        // 批量查询员工信息及其当前岗位信息
        const employees = await this.prisma.employee.findMany({
          where: {
            employeeNo: { in: uniqueEmployeeNos },
          },
          select: {
            id: true,
            employeeNo: true,
            name: true,
          },
        });

        // 查询员工的岗位信息（从WorkInfoHistory表）
        const employeeIds = employees.map(e => e.id);
        const workInfoList = await this.prisma.workInfoHistory.findMany({
          where: {
            employeeId: { in: employeeIds },
            isCurrent: true,
          },
          select: {
            employeeId: true,
            position: true,
            jobLevel: true,
            employeeType: true,
          },
        });

        // 构建employeeNo到岗位信息的映射
        const employeeWorkInfoMap = new Map();
        for (const employee of employees) {
          const workInfo = workInfoList.find(w => w.employeeId === employee.id);
          employeeWorkInfoMap.set(employee.employeeNo, {
            ...employee,
            position: workInfo?.position || null,
            jobLevel: workInfo?.jobLevel || null,
            employeeType: workInfo?.employeeType || null,
          });
        }

        // 解析筛选条件并过滤
        const filteredEmployeeNos = this.filterEmployeesByConditions(
          Array.from(employeeWorkInfoMap.values()),
          employeeFilter
        );

        console.log(`[分摊计算] 人员筛选后符合条件的员工数量: ${filteredEmployeeNos.length}`);
        console.log(`[分摊计算] 符合条件的员工编号: ${filteredEmployeeNos.join(', ')}`);

        // 过滤WorkHourResult
        filteredResults = results.filter(r => filteredEmployeeNos.includes(r.employeeNo));
        console.log(`[分摊计算] 人员筛选后工时记录数量: ${filteredResults.length} (原始: ${results.length})`);
      } else {
        filteredResults = results;
      }
    } else {
      filteredResults = results;
    }

    console.log(`[分摊计算] ========== 查询完成 ==========`);
    console.log(`  最终符合条件的工时记录数量: ${filteredResults.length}`);
    if (filteredResults.length > 0) {
      console.log(`  员工列表: ${[...new Set(filteredResults.map(r => r.employeeNo))].join(', ')}`);
      console.log(`  出勤代码列表: ${[...new Set(filteredResults.map(r => r.definitionAttendanceCodeStr))].join(', ')}`);
      console.log(`  总工时: ${filteredResults.reduce((sum, r) => sum + (r.workHours || 0), 0).toFixed(2)}小时`);
    } else {
      console.log(`  ⚠️ 没有找到符合条件的工时记录！`);
      console.log(`  可能的原因:`);
      console.log(`    1. 指定日期范围内没有工时记录`);
      console.log(`    2. 出勤代码筛选不匹配（需要: ${attendanceCodeIds?.join(', ') || '无'}）`);
      console.log(`    3. 员工筛选条件过严（${Object.keys(employeeFilter || {}).length > 0 ? JSON.stringify(employeeFilter) : '无'}）`);
      console.log(`    4. 账户筛选条件过严（${Object.keys(accountFilter || {}).length > 0 ? JSON.stringify(accountFilter) : '无'}）`);
    }
    console.log(`[分摊计算] ========================================\n`);

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
                sourceEmployeeName: null,
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

    // 获取所有规则信息
    const ruleIds = items.map(item => item.ruleId).filter(id => id != null);
    const rules = await this.prisma.allocationRuleConfig.findMany({
      where: {
        id: { in: ruleIds as number[] },
      },
      select: {
        id: true,
        ruleName: true,
      },
    });

    // 建立规则的映射
    const ruleMap: Record<number, any> = {};
    rules.forEach(rule => {
      ruleMap[rule.id] = rule;
    });

    // 获取所有相关的源工时记录详细信息
    const calcResultIds = items.map(item => item.calcResultId);
    const calcResults = await this.prisma.calcResult.findMany({
      where: {
        id: { in: calcResultIds },
      },
      select: {
        id: true,
        employeeNo: true,
        shiftId: true,
        shiftName: true,
        calcDate: true,
        employee: {
          select: {
            name: true,
          },
        },
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

    // 为每条结果添加源工时记录、目标账户和规则的详细信息
    const enrichedItems = items.map(item => ({
      ...item,
      sourceCalcResult: calcResultMap[item.calcResultId] || null,
      targetAccountName: item.targetAccountId ? (targetAccountMap[item.targetAccountId]?.name || null) : null,
      rule: ruleMap[item.ruleId] || null,
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

    // 获取所有活跃状态的账户
    const allAccounts = await this.prisma.laborAccount.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        path: true,
        namePath: true,
        hierarchyValues: true,
      },
    });

    console.log(`[层级筛选] 找到 ${allAccounts.length} 个活跃账户`);

    // 筛选符合条件的账户
    const matchedAccounts: any[] = [];

    for (const account of allAccounts) {
      try {
        let hierarchyValues: any[] = [];

        // 尝试从 hierarchyValues 字段解析
        if (account.hierarchyValues) {
          try {
            const parsed = JSON.parse(account.hierarchyValues);
            if (Array.isArray(parsed) && parsed.length > 0) {
              hierarchyValues = parsed;
            }
          } catch (e) {
            console.log(`[层级筛选] 账户 ${account.code} 的 hierarchyValues 解析失败，尝试从path解析`);
          }
        }

        // 如果 hierarchyValues 为空，尝试从 path 字段解析
        if (hierarchyValues.length === 0 && account.path) {
          const pathParts = account.path.split('/').filter(p => p);

          // 从 path 构建层级信息
          // path 格式：DH/DH01/DH0101/A02
          // 索引0: 工厂(工厂级组织levelId=4)
          // 索引1: 车间(车间级组织levelId=5)
          // 索引2: 产线(产线级组织levelId=6)
          // 索引3: 产品(产品级levelId=7)

          if (pathParts.length > 0) {
            // 查找工厂级组织
            const factoryOrg = await this.prisma.organization.findFirst({
              where: { code: pathParts[0] },
              select: { id: true, code: true, name: true, type: true }
            });
            if (factoryOrg) {
              hierarchyValues.push({
                levelId: 4,
                level: 1,
                name: '工厂',
                selectedValue: {
                  id: factoryOrg.id,
                  code: factoryOrg.code,
                  name: factoryOrg.name,
                  type: factoryOrg.type
                }
              });
            }
          }

          if (pathParts.length > 1) {
            // 查找车间级组织
            const workshopOrg = await this.prisma.organization.findFirst({
              where: { code: pathParts[1] },
              select: { id: true, code: true, name: true, type: true }
            });
            if (workshopOrg) {
              hierarchyValues.push({
                levelId: 5,
                level: 2,
                name: '车间',
                selectedValue: {
                  id: workshopOrg.id,
                  code: workshopOrg.code,
                  name: workshopOrg.name,
                  type: workshopOrg.type
                }
              });
            }
          }

          if (pathParts.length > 2) {
            // 查找产线级组织
            const lineOrg = await this.prisma.organization.findFirst({
              where: { code: pathParts[2] },
              select: { id: true, code: true, name: true, type: true }
            });
            if (lineOrg) {
              hierarchyValues.push({
                levelId: 6,
                level: 3,
                name: '产线',
                selectedValue: {
                  id: lineOrg.id,
                  code: lineOrg.code,
                  name: lineOrg.name,
                  type: lineOrg.type
                }
              });
            }
          }

          console.log(`[层级筛选] 从path解析出 ${hierarchyValues.length} 个层级`);
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

          // ✅ 优先使用 code 匹配，兼容 ID 匹配
          const accountValueCode = levelValue.selectedValue.code;
          const accountValueId = levelValue.selectedValue.id;

          // 检查账户的层级值是否在筛选条件中
          // 优先使用 code 匹配（更稳定），如果 code 不在 valueIds 中，尝试 ID 匹配
          let matched = false;
          let matchMethod = '';

          if (accountValueCode && valueIds.includes(accountValueCode)) {
            matched = true;
            matchMethod = 'code';
          } else if (valueIds.includes(accountValueId) || valueIds.includes(String(accountValueId))) {
            matched = true;
            matchMethod = 'id';
          }

          if (!matched) {
            matchesAll = false;
            console.log(`[层级筛选] ✗ 层级 ${levelName} (${levelId}): 账户值=code(${accountValueCode}), id(${accountValueId}), 筛选值=[${valueIds.join(', ')}], 不匹配`);
            break;
          }

          console.log(`[层级筛选] ✓ 层级 ${levelName} (${levelId}): 账户值=code(${accountValueCode}), id(${accountValueId}), 匹配方式=${matchMethod}`);
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

  /**
   * 创建或更新分摊产生的工时记录到 WorkHourResult 表
   * 实现唯一性约束：同一员工 + 同一分摊规则 + 同一日期 + 同一考勤代码 = 只存一条记录
   */
  private async createOrUpdateAllocationWorkHour(params: {
    employeeNo: string;
    calcDate: Date;
    shiftId: number;
    shiftName?: string;
    definitionAttendanceCodeId: number;
    definitionAttendanceCodeStr: string;
    workHours: number;
    accountId: number;
    accountName: string;
    accountPath?: string;
    ruleId: number;
    batchNo: string;
  }): Promise<any> {
    // ✅ 唯一性约束：员工 + 日期 + 考勤代码 + 规则 + 目标账户
    // 这样同一员工分摊到不同目标账户的工时会分别存储
    const existing = await this.prisma.workHourResult.findFirst({
      where: {
        employeeNo: params.employeeNo,
        calcDate: params.calcDate,
        definitionAttendanceCodeId: params.definitionAttendanceCodeId,
        source: '3',
        sourceId: params.ruleId,
        accountId: params.accountId,  // ✅ 添加目标账户到唯一性约束
      },
    });

    if (existing) {
      // 如果已存在，累加工时（同一次分摊再次执行）
      console.log(`  更新工时记录: ID=${existing.id}, 原工时=${existing.workHours}, 新增工时=${params.workHours}`);
      return this.prisma.workHourResult.update({
        where: { id: existing.id },
        data: {
          workHours: existing.workHours + params.workHours,
          updatedAt: new Date(),
        },
      });
    } else {
      // 如果不存在，创建新记录
      console.log(`  创建工时记录: 员工=${params.employeeNo}, 工时=${params.workHours}, 账户=${params.accountName}`);
      return this.prisma.workHourResult.create({
        data: {
          employeeNo: params.employeeNo,
          workDate: params.calcDate,
          calcDate: params.calcDate,
          shiftId: params.shiftId,
          shiftName: params.shiftName,
          definitionAttendanceCodeId: params.definitionAttendanceCodeId,
          definitionAttendanceCodeStr: params.definitionAttendanceCodeStr,
          calcAttendanceCode: '',
          attendanceCodeName: '分摊工时',
          workHours: params.workHours,
          amount: 0,
          source: '3',
          sourceType: 'ALLOCATION',
          sourceId: params.ruleId,
          sourceBatchId: params.batchNo,
          accountId: params.accountId,
          accountName: params.accountName,
          accountPath: params.accountPath,
          status: 'DRAFT',
        },
      });
    }
  }

  // ============ Product Standard Hours ============

  async getProductStandardHours(productId: number) {
    return this.prisma.productStandardHours.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async createProductStandardHours(productId: number, dto: any) {
    const {
      processId,
      processName,
      standardHours,
      quantity,
      effectiveDate,
      expiryDate,
      status,
      description,
      createdById,
      createdByName,
    } = dto;

    // 验证必填字段
    if (!standardHours) {
      throw new BadRequestException('标准工时不能为空');
    }

    if (!effectiveDate) {
      throw new BadRequestException('生效日期不能为空');
    }

    // 解析日期
    const effective = new Date(effectiveDate);
    effective.setHours(0, 0, 0, 0);

    let expiry: Date | null = null;
    if (expiryDate) {
      expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);

      // 验证：失效日期不能小于生效日期
      if (expiry < effective) {
        throw new BadRequestException('失效日期不能小于生效日期');
      }
    }

    // 查询条件：相同产品和工序（如果指定了工序）
    const where: any = {
      productId,
      deletedAt: null,
      status: 'ACTIVE',
    };

    if (processId) {
      where.processId = parseInt(processId);
    } else {
      where.processId = null;
    }

    // 检查日期区间是否与现有记录冲突
    const existingRecords = await this.prisma.productStandardHours.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    for (const record of existingRecords) {
      const recordEffective = new Date(record.effectiveDate);
      recordEffective.setHours(0, 0, 0, 0);

      const recordExpiry = record.expiryDate ? new Date(record.expiryDate) : null;
      if (recordExpiry) {
        recordExpiry.setHours(0, 0, 0, 0);
      }

      // 检查区间是否重叠（两个区间有交集）
      // 区间1: [effective, expiry] (expiry为null表示无限大)
      // 区间2: [recordEffective, recordExpiry] (recordExpiry为null表示无限大)
      // 两个区间相交的条件: effective < recordExpiry AND recordEffective < expiry
      // 特殊情况: null表示无限大，所以null < 永远是false

      const effectiveLessThanRecordExpiry = !recordExpiry || effective < recordExpiry;
      const recordEffectiveLessThanExpiry = !expiry || recordEffective < expiry;

      // 两个区间有交集
      if (effectiveLessThanRecordExpiry && recordEffectiveLessThanExpiry) {
        throw new BadRequestException(
          `日期区间 ${effectiveDate.toISOString().substring(0, 10)} - ${expiry ? expiry.toISOString().substring(0, 10) : '永久'} 与现有配置 ${recordEffective.toISOString().substring(0, 10)} - ${recordExpiry ? recordExpiry.toISOString().substring(0, 10) : '永久'} 冲突`
        );
      }
    }

    // 如果存在没有失效日期的前一条记录，自动更新其失效日期
    if (existingRecords.length > 0) {
      const latestRecord = existingRecords[0];
      if (!latestRecord.expiryDate) {
        // 前一条记录没有失效日期，设置其失效日期为新生效日期 - 1天
        const previousDay = new Date(effective);
        previousDay.setDate(previousDay.getDate() - 1);
        previousDay.setHours(0, 0, 0, 0);

        await this.prisma.productStandardHours.update({
          where: { id: latestRecord.id },
          data: { expiryDate: previousDay },
        });
      }
    }

    // 创建新记录
    const result = await this.prisma.productStandardHours.create({
      data: {
        productId: productId,
        productName: dto.productName || '',
        processId: processId ? parseInt(processId) : null,
        processName: processName || null,
        standardHours: parseFloat(standardHours),
        effectiveDate: effective,
        expiryDate: expiry,
        status: status || 'ACTIVE',
        description: description || null,
        createdById: createdById || 1,
        createdByName: createdByName || 'System',
      },
    });

    return result;
  }

  async updateProductStandardHours(id: number, dto: any) {
    const existing = await this.prisma.productStandardHours.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new BadRequestException('配置不存在');
    }

    const {
      productId,
      processId,
      standardHours,
      quantity,
      effectiveDate,
      expiryDate,
      status,
      description,
    } = dto;

    // 解析日期
    const effective = new Date(effectiveDate);
    effective.setHours(0, 0, 0, 0);

    let expiry: Date | null = null;
    if (expiryDate) {
      expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);

      // 验证：失效日期不能小于生效日期
      if (expiry < effective) {
        throw new BadRequestException('失效日期不能小于生效日期');
      }
    }

    // 查询其他记录以检查日期冲突（排除当前记录）
    const where: any = {
      productId: existing.productId,
      deletedAt: null,
      id: { not: id },
      status: 'ACTIVE',
    };

    if (existing.processId) {
      where.processId = existing.processId;
    } else {
      where.processId = null;
    }

    const otherRecords = await this.prisma.productStandardHours.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    for (const record of otherRecords) {
      const recordEffective = new Date(record.effectiveDate);
      recordEffective.setHours(0, 0, 0, 0);

      const recordExpiry = record.expiryDate ? new Date(record.expiryDate) : null;
      if (recordExpiry) {
        recordExpiry.setHours(0, 0, 0, 0);
      }

      // 检查区间是否重叠（两个区间有交集）
      // 区间1: [effective, expiry] (expiry为null表示无限大)
      // 区间2: [recordEffective, recordExpiry] (recordExpiry为null表示无限大)
      // 两个区间相交的条件: effective <= recordExpiry AND recordEffective <= expiry
      // 特殊情况: null表示无限大，所以null <= 总是true，null >= 总是false

      const effectiveLessThanRecordExpiry = !recordExpiry || effective < recordExpiry;
      const recordEffectiveLessThanExpiry = !expiry || recordEffective < expiry;

      // 两个区间有交集
      if (effectiveLessThanRecordExpiry && recordEffectiveLessThanExpiry) {
        throw new BadRequestException(
          `日期区间 ${effectiveDate.toISOString().substring(0, 10)} - ${expiry ? expiry.toISOString().substring(0, 10) : '永久'} 与现有配置 ${recordEffective.toISOString().substring(0, 10)} - ${recordExpiry ? recordExpiry.toISOString().substring(0, 10) : '永久'} 冲突`
        );
      }

      if (effective <= recordEffective && (!expiry || !recordExpiry || expiry >= recordExpiry)) {
        throw new BadRequestException(
          `日期区间 ${effectiveDate.toISOString().substring(0, 10)} - ${expiry ? expiry.toISOString().substring(0, 10) : '永久'} 与现有配置 ${recordEffective.toISOString().substring(0, 10)} - ${recordExpiry ? recordExpiry.toISOString().substring(0, 10) : '永久'} 冲突`
        );
      }
    }

    // 更新记录
    const result = await this.prisma.productStandardHours.update({
      where: { id },
      data: {
        standardHours: standardHours ? parseFloat(standardHours) : existing.standardHours,
        effectiveDate: effective,
        expiryDate: expiry,
        status: status || existing.status,
        description: description !== undefined ? description : existing.description,
      },
    });

    return result;
  }

  async deleteProductStandardHours(id: number) {
    const existing = await this.prisma.productStandardHours.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new BadRequestException('配置不存在');
    }

    // 软删除
    await this.prisma.productStandardHours.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // ============ Product Standard Hour By Levels (Not Implemented) ============

  async getProductStandardHourByLevels(productId: number) {
    return this.prisma.productStandardHourByLevel.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getAllProductStandardHourByLevels(query: any) {
    const { page = 1, pageSize = 10, productId, accountPath } = query;

    const where: any = {
      deletedAt: null,
    };

    if (productId) {
      where.productId = parseInt(productId);
    }

    if (accountPath) {
      where.accountPath = {
        contains: accountPath,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.productStandardHourByLevel.findMany({
        where,
        orderBy: {
          effectiveDate: 'desc',
        },
        take: parseInt(pageSize),
        skip: (parseInt(page) - 1) * parseInt(pageSize),
      }),
      this.prisma.productStandardHourByLevel.count({ where }),
    ]);

    return {
      items,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };
  }

  async createProductStandardHourByLevel(dto: any) {
    const {
      productId,
      productCode,
      productName,
      hierarchyLevelId,
      hierarchyLevelName,
      hierarchyOptionValue,
      hierarchyOptionLabel,
      accountPath,
      standardHours,
      quantity,
      effectiveDate,
      expiryDate,
      status,
      description,
      createdById,
      createdByName,
    } = dto;

    // 验证必填字段
    if (!productId || !standardHours) {
      throw new BadRequestException('productId and standardHours are required');
    }

    if (!effectiveDate) {
      throw new BadRequestException('生效日期不能为空');
    }

    // 解析日期
    const effective = new Date(effectiveDate);
    effective.setHours(0, 0, 0, 0);

    let expiry: Date | null = null;
    if (expiryDate) {
      expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);

      // 验证：失效日期不能小于生效日期
      if (expiry < effective) {
        throw new BadRequestException('失效日期不能小于生效日期');
      }
    }

    // 查询相同产品和账户路径的现有记录
    const where: any = {
      productId: parseInt(productId),
      accountPath: accountPath || null,
      deletedAt: null,
      status: 'ACTIVE',
    };

    const existingRecords = await this.prisma.productStandardHourByLevel.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    // 检查日期区间是否与现有记录冲突
    for (const record of existingRecords) {
      const recordEffective = new Date(record.effectiveDate);
      recordEffective.setHours(0, 0, 0, 0);

      const recordExpiry = record.expiryDate ? new Date(record.expiryDate) : null;
      if (recordExpiry) {
        recordExpiry.setHours(0, 0, 0, 0);
      }

      // 检查区间是否重叠（两个区间有交集）
      // 区间1: [effective, expiry] (expiry为null表示无限大)
      // 区间2: [recordEffective, recordExpiry] (recordExpiry为null表示无限大)
      // 两个区间相交的条件: effective <= recordExpiry AND recordEffective <= expiry
      // 特殊情况: null表示无限大，所以null <= 永远是true，永远不是false

      const effectiveLessThanRecordExpiry = !recordExpiry || effective <= recordExpiry;
      const recordEffectiveLessThanExpiry = !expiry || recordEffective <= expiry;

      // 两个区间有交集
      if (effectiveLessThanRecordExpiry && recordEffectiveLessThanExpiry) {
        throw new BadRequestException(
          `日期区间 ${effective.toISOString().substring(0, 10)} - ${expiry ? expiry.toISOString().substring(0, 10) : '永久'} 与现有配置 ${recordEffective.toISOString().substring(0, 10)} - ${recordExpiry ? recordExpiry.toISOString().substring(0, 10) : '永久'} 冲突`
        );
      }
    }

    // 如果存在没有失效日期的前一条记录，自动更新其失效日期
    if (existingRecords.length > 0) {
      const latestRecord = existingRecords[0];
      if (!latestRecord.expiryDate) {
        // 前一条记录没有失效日期，设置其失效日期为新生效日期 - 1天
        const previousDay = new Date(effective);
        previousDay.setDate(previousDay.getDate() - 1);
        previousDay.setHours(0, 0, 0, 0);

        await this.prisma.productStandardHourByLevel.update({
          where: { id: latestRecord.id },
          data: { expiryDate: previousDay },
        });
      }
    }

    // 创建配置
    const result = await this.prisma.productStandardHourByLevel.create({
      data: {
        productId: parseInt(productId),
        productName: productName || '',
        accountLevel: dto.accountLevel || hierarchyLevelName || '',
        accountPath: accountPath || null,
        standardHours: parseFloat(standardHours) || 0,
        quantity: quantity ? parseFloat(quantity) : null,
        effectiveDate: effective,
        expiryDate: expiry,
        status: status || 'ACTIVE',
        description: description || null,
        createdById: createdById || 1,
        createdByName: createdByName || 'System',
      },
    });

    return result;
  }

  async updateProductStandardHourByLevel(id: number, dto: any) {
    const existing = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new BadRequestException('配置不存在');
    }

    const {
      productId,
      productName,
      hierarchyLevelName,
      accountPath,
      standardHours,
      quantity,
      effectiveDate,
      expiryDate,
      status,
      description,
    } = dto;

    // 验证必填字段
    if (!effectiveDate) {
      throw new BadRequestException('生效日期不能为空');
    }

    // 解析日期
    const effective = new Date(effectiveDate);
    effective.setHours(0, 0, 0, 0);

    let expiry: Date | null = null;
    if (expiryDate) {
      expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);

      // 验证：失效日期不能小于生效日期
      if (expiry < effective) {
        throw new BadRequestException('失效日期不能小于生效日期');
      }
    }

    // 查询其他记录以检查日期冲突（排除当前记录）
    const where: any = {
      productId: existing.productId,
      accountPath: existing.accountPath,
      deletedAt: null,
      id: { not: id },
      status: 'ACTIVE',
    };

    const otherRecords = await this.prisma.productStandardHourByLevel.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    // 检查日期区间是否与现有记录冲突
    for (const record of otherRecords) {
      const recordEffective = new Date(record.effectiveDate);
      recordEffective.setHours(0, 0, 0, 0);

      const recordExpiry = record.expiryDate ? new Date(record.expiryDate) : null;
      if (recordExpiry) {
        recordExpiry.setHours(0, 0, 0, 0);
      }

      // 检查区间是否重叠（两个区间有交集）
      // 区间1: [effective, expiry] (expiry为null表示无限大)
      // 区间2: [recordEffective, recordExpiry] (recordExpiry为null表示无限大)
      // 两个区间相交的条件: effective <= recordExpiry AND recordEffective <= expiry
      // 特殊情况: null表示无限大，所以null <= 永远是true，永远不是false

      const effectiveLessThanRecordExpiry = !recordExpiry || effective <= recordExpiry;
      const recordEffectiveLessThanExpiry = !expiry || recordEffective <= expiry;

      // 两个区间有交集
      if (effectiveLessThanRecordExpiry && recordEffectiveLessThanExpiry) {
        throw new BadRequestException(
          `日期区间 ${effective.toISOString().substring(0, 10)} - ${expiry ? expiry.toISOString().substring(0, 10) : '永久'} 与现有配置 ${recordEffective.toISOString().substring(0, 10)} - ${recordExpiry ? recordExpiry.toISOString().substring(0, 10) : '永久'} 冲突`
        );
      }
    }

    const result = await this.prisma.productStandardHourByLevel.update({
      where: { id },
      data: {
        productId: productId ? parseInt(productId) : existing.productId,
        productName: productName || existing.productName,
        accountLevel: hierarchyLevelName || existing.accountLevel,
        accountPath: accountPath !== undefined ? accountPath : existing.accountPath,
        standardHours: standardHours ? parseFloat(standardHours) : existing.standardHours,
        quantity: quantity !== undefined ? (quantity ? parseFloat(quantity) : null) : existing.quantity,
        effectiveDate: effective,
        expiryDate: expiry,
        status: status || existing.status,
        description: description !== undefined ? description : existing.description,
      },
    });

    return result;
  }

  async deleteProductStandardHourByLevel(id: number) {
    const existing = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new BadRequestException('配置不存在');
    }

    // 软删除
    await this.prisma.productStandardHourByLevel.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  // ============ Product Processes (Not Implemented) ============

  async getProductProcesses(productId: number) {
    throw new BadRequestException('Product processes feature not implemented');
  }

  async addProcessToProduct(productId: number, dto: any) {
    throw new BadRequestException('Product processes feature not implemented');
  }

  async removeProcessFromProduct(productId: number, processId: number) {
    throw new BadRequestException('Product processes feature not implemented');
  }

  async updateProductProcess(id: number, dto: any) {
    throw new BadRequestException('Product processes feature not implemented');
  }

  // ============ Earned Hours Configs ============

  async getEarnedHoursConfigs(query: any) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
        { configName: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.earnedHoursAllocationConfig.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { results: true },
          },
        },
      }),
      this.prisma.earnedHoursAllocationConfig.count({ where }),
    ]);

    console.log('=== getEarnedHoursConfigs ===');
    console.log('Raw items from DB:', items.map((item: any) => ({ id: item.id, code: item.code, name: item.name })));

    // 解析 rules 和 sourceConfig JSON 字符串，并转换数据结构
    const itemsWithParsed = items.map((item: any) => {
      const rules = item.rules ? JSON.parse(item.rules) : [];
      let sourceConfig = item.sourceConfig ? JSON.parse(item.sourceConfig) : null;

      // 转换 sourceConfig 为前端期望的 filterGroups 结构
      if (sourceConfig) {
        sourceConfig = {
          filterGroups: [
            {
              id: 'default_group',
              employeeFilter: sourceConfig.employeeFilter || { fieldGroups: [] },
              workHoursFilter: {
                hierarchySelections: sourceConfig.accountFilter?.hierarchySelections || [],
                attendanceCodes: sourceConfig.attendanceCodes || [],
              },
            },
          ],
        };
      }

      return {
        ...item,
        configCode: item.code, // 映射 code 为 configCode
        rules,
        sourceConfig,
        _count: {
          rules: rules.length,
          results: item._count.results,
        },
      };
    });

    console.log('Parsed items with configCode:', itemsWithParsed.map((item: any) => ({ id: item.id, configCode: item.configCode, name: item.name })));

    return {
      items: itemsWithParsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getEarnedHoursConfig(id: number) {
    const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    // 解析 rules 和 sourceConfig JSON 字符串
    const rules = config.rules ? JSON.parse(config.rules) : [];
    let sourceConfig = config.sourceConfig ? JSON.parse(config.sourceConfig) : null;

    // 转换 sourceConfig 为前端期望的 filterGroups 结构
    if (sourceConfig) {
      sourceConfig = {
        filterGroups: [
          {
            id: 'default_group',
            employeeFilter: sourceConfig.employeeFilter || { fieldGroups: [] },
            workHoursFilter: {
              hierarchySelections: sourceConfig.accountFilter?.hierarchySelections || [],
              attendanceCodes: sourceConfig.attendanceCodes || [],
            },
          },
        ],
      };
    }

    return {
      ...config,
      configCode: config.code, // 映射 code 为 configCode
      rules,
      sourceConfig,
      _count: {
        rules: rules.length,
        results: config._count.results,
      },
    };
  }

  async createEarnedHoursConfig(dto: any) {
    try {
      const {
        configCode,
        configName,
        description,
        orgId,
        orgName,
        orgPath,
        effectiveStartTime,
        effectiveEndTime,
        sourceConfig,
        rules,
        createdById,
        createdByName,
      } = dto;

      // 检查编码是否已存在
      const existing = await this.prisma.earnedHoursAllocationConfig.findUnique({
        where: { code: configCode },
      });

      if (existing) {
        throw new BadRequestException('配置编码已存在');
      }

      // 创建配置
      const config = await this.prisma.earnedHoursAllocationConfig.create({
        data: {
          code: configCode,
          name: configName,
          configName: configName,
          description: description || '',
          orgId: orgId || 1,
          orgPath: orgPath || '/',
          effectiveStartTime: new Date(effectiveStartTime),
          effectiveEndTime: effectiveEndTime ? new Date(effectiveEndTime) : null,
          status: 'DRAFT',
          createdById: createdById || 1,
          createdByName: createdByName || 'System',
          sourceConfig: sourceConfig ? JSON.stringify(sourceConfig) : '{}',
          rules: rules ? JSON.stringify(rules) : '[]',
        },
      });

      // 解析返回数据
      const parsedRules = config.rules ? JSON.parse(config.rules) : [];
      let parsedSourceConfig = config.sourceConfig ? JSON.parse(config.sourceConfig) : null;

      // 转换 sourceConfig 为前端期望的 filterGroups 结构
      if (parsedSourceConfig) {
        parsedSourceConfig = {
          filterGroups: [
            {
              id: 'default_group',
              employeeFilter: parsedSourceConfig.employeeFilter || { fieldGroups: [] },
              workHoursFilter: {
                hierarchySelections: parsedSourceConfig.accountFilter?.hierarchySelections || [],
                attendanceCodes: parsedSourceConfig.attendanceCodes || [],
              },
            },
          ],
        };
      }

      // 返回解析后的数据
      return {
        ...config,
        configCode: config.code, // 映射 code 为 configCode
        rules: parsedRules,
        sourceConfig: parsedSourceConfig,
      };
    } catch (error: any) {
      console.error('创建挣得工时配置失败:', error);
      throw new BadRequestException(error.message || '创建失败');
    }
  }

  async updateEarnedHoursConfig(id: number, dto: any) {
    try {
      const existing = await this.prisma.earnedHoursAllocationConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('配置不存在');
      }

      const {
        configCode,
        configName,
        description,
        sourceConfig,
        rules,
        updatedById,
        updatedByName,
      } = dto;

      // 如果启用了配置，不允许修改数据源
      if (existing.status === 'ACTIVE' && sourceConfig) {
        throw new BadRequestException('配置已启用，不允许修改数据源');
      }

      const config = await this.prisma.earnedHoursAllocationConfig.update({
        where: { id },
        data: {
          ...(configName && { name: configName, configName: configName }),
          ...(description !== undefined && { description }),
          ...(sourceConfig && { sourceConfig: JSON.stringify(sourceConfig) }),
          ...(rules && { rules: JSON.stringify(rules) }),
          ...(updatedById && { updatedById }),
          ...(updatedByName && { updatedByName }),
        },
      });

      // 解析返回数据
      const parsedRules = config.rules ? JSON.parse(config.rules) : [];
      let parsedSourceConfig = config.sourceConfig ? JSON.parse(config.sourceConfig) : null;

      // 转换 sourceConfig 为前端期望的 filterGroups 结构
      if (parsedSourceConfig) {
        parsedSourceConfig = {
          filterGroups: [
            {
              id: 'default_group',
              employeeFilter: parsedSourceConfig.employeeFilter || { fieldGroups: [] },
              workHoursFilter: {
                hierarchySelections: parsedSourceConfig.accountFilter?.hierarchySelections || [],
                attendanceCodes: parsedSourceConfig.attendanceCodes || [],
              },
            },
          ],
        };
      }

      return {
        ...config,
        configCode: config.code, // 映射 code 为 configCode
        rules: parsedRules,
        sourceConfig: parsedSourceConfig,
      };
    } catch (error: any) {
      console.error('更新挣得工时配置失败:', error);
      throw new BadRequestException(error.message || '更新失败');
    }
  }

  async deleteEarnedHoursConfig(id: number) {
    const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    if (config.status !== 'DRAFT') {
      throw new BadRequestException('只能删除草稿状态的配置');
    }

    await this.prisma.earnedHoursAllocationConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '删除成功' };
  }

  async activateEarnedHoursConfig(id: number, dto: any) {
    const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    if (config.status !== 'DRAFT') {
      throw new BadRequestException('只能启用草稿状态的配置');
    }

    await this.prisma.earnedHoursAllocationConfig.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById: dto.approvedById,
        approvedByName: dto.approvedByName,
        approvedAt: new Date(),
      },
    });

    return { message: '启用成功' };
  }

  async deactivateEarnedHoursConfig(id: number, dto: any) {
    const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    if (config.status !== 'ACTIVE') {
      throw new BadRequestException('只能停用启用状态的配置');
    }

    await this.prisma.earnedHoursAllocationConfig.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updatedById: dto.deactivatedById,
        updatedByName: dto.deactivatedByName,
      },
    });

    return { message: '停用成功' };
  }

  async copyEarnedHoursConfig(id: number, dto: any) {
    const original = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
    });

    if (!original) {
      throw new NotFoundException('配置不存在');
    }

    const newConfig = await this.prisma.earnedHoursAllocationConfig.create({
      data: {
        code: dto.configCode || `${original.code}_COPY`,
        name: dto.configName || `${original.name}_副本`,
        configName: dto.configName || `${original.configName}_副本`,
        description: original.description,
        orgId: original.orgId,
        orgPath: original.orgPath,
        effectiveStartTime: new Date(),
        effectiveEndTime: null,
        status: 'DRAFT',
        createdById: dto.createdById || 1,
        createdByName: dto.createdByName || 'System',
        sourceConfig: original.sourceConfig,
        rules: original.rules,
      },
    });

    return {
      ...newConfig,
      configCode: newConfig.code, // 映射 code 为 configCode
      rules: newConfig.rules ? JSON.parse(newConfig.rules) : [],
      sourceConfig: newConfig.sourceConfig ? JSON.parse(newConfig.sourceConfig) : null,
    };
  }

  async archiveEarnedHoursConfig(id: number) {
    const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    await this.prisma.earnedHoursAllocationConfig.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });

    return { message: '归档成功' };
  }

  // ============ Earned Hours Rules (Not Implemented) ============

  async getEarnedHoursRules(query: any) {
    throw new BadRequestException('Earned hours rules feature not implemented');
  }

  async getEarnedHoursRule(id: number) {
    throw new BadRequestException('Earned hours rules feature not implemented');
  }

  async createEarnedHoursRule(dto: any) {
    throw new BadRequestException('Earned hours rules feature not implemented');
  }

  async updateEarnedHoursRule(id: number, dto: any) {
    throw new BadRequestException('Earned hours rules feature not implemented');
  }

  async deleteEarnedHoursRule(id: number) {
    throw new BadRequestException('Earned hours rules feature not implemented');
  }

  // ============ Earned Hours Rule Targets (Not Implemented) ============

  async getEarnedHoursRuleTargets(ruleId: number) {
    throw new BadRequestException('Earned hours rule targets feature not implemented');
  }

  async createEarnedHoursRuleTarget(dto: any) {
    throw new BadRequestException('Earned hours rule targets feature not implemented');
  }

  async updateEarnedHoursRuleTarget(id: number, dto: any) {
    throw new BadRequestException('Earned hours rule targets feature not implemented');
  }

  async deleteEarnedHoursRuleTarget(id: number) {
    throw new BadRequestException('Earned hours rule targets feature not implemented');
  }

  // ============ Earned Hours Calculation Progress (Not Implemented) ============

  async getEarnedHoursCalculationProgress(batchNo: string) {
    throw new BadRequestException('Earned hours calculation progress feature not implemented');
  }

  // ============ Personal Production Records ============

  async getPersonalProductionRecords(query: any) {
    const { page = 1, pageSize = 10, startDate, endDate, employeeNo, orgId, shiftId, productId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (startDate) where.recordDate = { gte: new Date(startDate) };
    if (endDate) where.recordDate = { ...where.recordDate, lte: new Date(endDate) };
    if (employeeNo) where.employeeNo = employeeNo;
    if (orgId) where.orgId = +orgId;
    if (shiftId) where.shiftId = +shiftId;
    if (productId) where.productId = +productId;

    const [items, total] = await Promise.all([
      this.prisma.personalProductionRecord.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.personalProductionRecord.count({ where }),
    ]);

    // 添加计算字段
    const itemsWithCalculations = items.map((item: any) => ({
      ...item,
      conversionFactor: 1.0,
      convertedQty: item.actualQty || 0,
    }));

    return {
      items: itemsWithCalculations,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getPersonalProductionRecord(id: number) {
    const record = await this.prisma.personalProductionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('个人产量记录不存在');
    }

    return record;
  }

  async createPersonalProductionRecord(dto: any) {
    const {
      recordDate,
      employeeNo,
      employeeName,
      orgId,
      orgName,
      lineId,
      lineName,
      shiftId,
      shiftName,
      productId,
      productCode,
      productName,
      actualQty,
      standardHours,
      source,
      recorderId,
      recorderName,
      description
    } = dto;

    // 验证员工是否存在
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
    });

    if (!employee) {
      throw new BadRequestException('员工不存在');
    }

    // productId 实际上是数据源选项的ID，需要先查找数据源选项
    const dataSourceOption = await this.prisma.dataSourceOption.findUnique({
      where: { id: productId },
    });

    if (!dataSourceOption) {
      throw new BadRequestException('产品数据源选项不存在');
    }

    // 直接使用数据源选项中的数据（label作为产品名称，value作为产品编码）
    const finalProductCode = dataSourceOption.value;
    const finalProductName = dataSourceOption.label;

    // 从产品标准配置中查找标准工时（如果前端没有传递）
    let productStandardHours = standardHours || 0;

    if (productStandardHours === 0 && orgId) {
      // 根据记录日期匹配对应的标准配置
      const targetDate = new Date(recordDate);
      targetDate.setHours(0, 0, 0, 0);

      // 使用新的匹配逻辑查找标准配置
      const standardHourConfig = await this.findMatchingStandardHourConfig(
        productId,
        orgId,
        orgName || '',
        targetDate
      );

      if (standardHourConfig) {
        // 找到标准工时配置，计算标准工时
        if (standardHourConfig.quantity && standardHourConfig.quantity > 0) {
          // 配置的是：X件 = Y标准工时
          // 需要计算：实际产量对应的标准工时
          productStandardHours = standardHourConfig.standardHours / standardHourConfig.quantity;
        } else {
          // 配置的是：1件 = X标准工时
          productStandardHours = standardHourConfig.standardHours;
        }
      } else {
        console.log(`[个人产量] 未找到标准配置，使用默认值 0`);
      }
    }

    // 检查是否已存在相同记录（按日期、员工、班次、劳动力账户、产品验证唯一性）
    const existing = await this.prisma.personalProductionRecord.findFirst({
      where: {
        recordDate: new Date(recordDate),
        employeeNo,
        shiftId: shiftId || null, // 班次
        orgId: orgId || null, // 劳动力账户
        productId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('该员工在该日期、班次、劳动力账户下的该产品产量记录已存在');
    }

    // 计算挣得工时 = 实际产量 * 标准工时
    const earnedHours = (actualQty || 0) * productStandardHours;

    // 创建个人产量记录
    const record = await this.prisma.personalProductionRecord.create({
      data: {
        recordDate: new Date(recordDate),
        employeeNo,
        employeeName: employeeName || employee.name || '',
        orgId,
        orgName,
        lineId,
        lineName,
        shiftId,
        shiftName,
        productId: productId, // 使用数据源选项ID
        productCode: finalProductCode,
        productName: finalProductName,
        actualQty: actualQty || 0,
        standardHours: productStandardHours,
        earnedHours,
        source: source || 'MANUAL',
        recorderId,
        recorderName,
        description,
      },
    });

    // 往WorkHourResult表插入挣得工时记录
    // 1. 从系统配置中获取挣得工时出勤代码
    const earnedHoursConfig = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'earnedHoursAttendanceCode' },
    });

    const earnedHoursAttendanceCode = earnedHoursConfig?.configValue || 'EARNED_HOURS';
    console.log(`[挣得工时] 配置的出勤代码: ${earnedHoursAttendanceCode}`);

    // 2. 查找对应的DefinitionAttendanceCode（挣得工时配置使用DefinitionAttendanceCode）
    const attendanceCode = await this.prisma.definitionAttendanceCode.findFirst({
      where: { code: earnedHoursAttendanceCode },
    });

    console.log(`[挣得工时] 找到的出勤代码: ${attendanceCode ? `${attendanceCode.code} - ${attendanceCode.name} (id: ${attendanceCode.id})` : 'null'}`);

    // 3. 创建或更新WorkHourResult记录
    const workDate = new Date(recordDate);
    workDate.setHours(0, 0, 0, 0);

    // 4. 先删除当天该员工的所有挣得工时记录（全量更新）
    if (attendanceCode) {
      await this.prisma.workHourResult.deleteMany({
        where: {
          employeeNo,
          workDate,
          definitionAttendanceCodeId: attendanceCode.id,
          sourceType: 'PERSONAL_PRODUCTION',
        },
      });
    }

    // 5. 查询当天该员工的所有个人产量记录
    const personalRecords = await this.prisma.personalProductionRecord.findMany({
      where: {
        employeeNo,
        recordDate: new Date(recordDate),
        deletedAt: null,
      },
    });

    // 6. 按劳动力账户(orgId)分组汇总挣得工时
    const earnedHoursByOrg = new Map<number, { orgName: string; hours: number }>();
    for (const record of personalRecords) {
      const orgId = record.orgId;
      const orgName = record.orgName;
      const hours = record.earnedHours || 0;

      if (orgId) {
        const current = earnedHoursByOrg.get(orgId) || { orgName, hours: 0 };
        current.hours += hours;
        earnedHoursByOrg.set(orgId, current);
      }
    }

    // 7. 为每个劳动力账户创建一条WorkHourResult记录
    if (attendanceCode) {
      console.log(`[挣得工时] 开始创建 WorkHourResult，共 ${earnedHoursByOrg.size} 个劳动力账户`);

      // 批量查询所有涉及的 LaborAccount，获取 accountPath
      const orgIds = Array.from(earnedHoursByOrg.keys());
      const laborAccounts = await this.prisma.laborAccount.findMany({
        where: {
          id: { in: orgIds },
        },
        select: {
          id: true,
          path: true,
          accountPath: true,
        },
      });

      // 创建映射: orgId -> path
      const accountPathMap = new Map<number, string>();
      laborAccounts.forEach((account) => {
        accountPathMap.set(account.id, account.path || account.accountPath || '');
      });

      for (const [orgId, data] of earnedHoursByOrg.entries()) {
        console.log(`[挣得工时] 创建记录: employeeNo=${employeeNo}, workDate=${workDate.toISOString()}, workHours=${data.hours}, accountId=${orgId}`);
        try {
          const result = await this.prisma.workHourResult.create({
            data: {
              employeeNo,
              workDate,
              calcDate: new Date(),
              shiftId: shiftId || null,
              shiftName: shiftName || null,
              definitionAttendanceCodeId: attendanceCode.id,
              definitionAttendanceCodeStr: attendanceCode.code, // ✅ 存储代码而非名称
              attendanceCode: earnedHoursAttendanceCode,
              attendanceCodeName: attendanceCode.name || '挣得工时',
              workHours: data.hours,
              accountId: orgId,
              accountName: data.orgName,
              accountPath: accountPathMap.get(orgId) || '', // ✅ 添加账户路径
              orgId,
              sourceType: 'PERSONAL_PRODUCTION', // 标识来源为个人产量
              source: '个人产量',
              status: 'COMPLETED',
            },
          });
          console.log(`[挣得工时] 创建成功: id=${result.id}`);
        } catch (error) {
          console.error(`[挣得工时] 创建失败:`, error);
        }
      }
    } else {
      console.log(`[挣得工时] attendanceCode 为 null，跳过创建 WorkHourResult`);
    }

    return record;
  }

  async updatePersonalProductionRecord(id: number, dto: any) {
    const record = await this.prisma.personalProductionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('个人产量记录不存在');
    }

    const { recordDate, employeeNo, employeeName, orgId, orgName, lineId, lineName, shiftId, shiftName, productId, productCode, productName, actualQty, standardHours, description } = dto;

    // 如果修改了关键字段（日期、员工、班次、产线、产品），需要验证唯一性
    const newRecordDate = recordDate ? new Date(recordDate) : record.recordDate;
    const newEmployeeNo = employeeNo !== undefined ? employeeNo : record.employeeNo;
    const newOrgId = orgId !== undefined ? orgId : record.orgId;
    const newShiftId = shiftId !== undefined ? shiftId : record.shiftId;
    const newProductId = productId !== undefined ? productId : record.productId;

    const keyFieldsChanged =
      (recordDate && newRecordDate.getTime() !== new Date(record.recordDate).getTime()) ||
      (employeeNo !== undefined && newEmployeeNo !== record.employeeNo) ||
      (shiftId !== undefined && newShiftId !== record.shiftId) ||
      (orgId !== undefined && newOrgId !== record.orgId) ||
      (productId !== undefined && newProductId !== record.productId);

    if (keyFieldsChanged) {
      // 验证员工是否存在
      if (employeeNo !== undefined && employeeNo !== record.employeeNo) {
        const employee = await this.prisma.employee.findUnique({
          where: { employeeNo: newEmployeeNo },
        });

        if (!employee) {
          throw new BadRequestException('员工不存在');
        }
      }

      // 检查是否已存在相同记录（按日期、员工、班次、劳动力账户、产品验证唯一性，排除当前记录）
      const existing = await this.prisma.personalProductionRecord.findFirst({
        where: {
          recordDate: newRecordDate,
          employeeNo: newEmployeeNo,
          shiftId: newShiftId || null,
          orgId: newOrgId || null,
          productId: newProductId,
          deletedAt: null,
          id: { not: id }, // 排除当前记录
        },
      });

      if (existing) {
        throw new BadRequestException('该员工在该日期、班次、劳动力账户下的该产品产量记录已存在');
      }
    }

    // 重新计算挣得工时
    const earnedHours = (actualQty !== undefined ? actualQty : record.actualQty) * record.standardHours;

    // 更新个人产量记录
    const updatedRecord = await this.prisma.personalProductionRecord.update({
      where: { id },
      data: {
        recordDate: newRecordDate,
        employeeNo: newEmployeeNo,
        employeeName: employeeName !== undefined ? employeeName : record.employeeName,
        orgId: newOrgId,
        orgName: orgName !== undefined ? orgName : record.orgName,
        lineId: lineId !== undefined ? lineId : record.lineId,
        lineName: lineName !== undefined ? lineName : record.lineName,
        shiftId: newShiftId,
        shiftName: shiftName !== undefined ? shiftName : record.shiftName,
        productId: newProductId,
        productCode: productCode !== undefined ? productCode : record.productCode,
        productName: productName !== undefined ? productName : record.productName,
        actualQty: actualQty !== undefined ? actualQty : record.actualQty,
        earnedHours,
        description: description !== undefined ? description : record.description,
      },
    });

    // 更新CalcResult表中的挣得工时记录
    const calcDate = newRecordDate;
    calcDate.setHours(0, 0, 0, 0);

    const calcResults = await this.prisma.calcResult.findMany({
      where: {
        employeeNo: newEmployeeNo,
        calcDate,
      },
    });

    for (const calcResult of calcResults) {
      try {
        const accountHours = JSON.parse(calcResult.accountHours || '[]');
        const earnedHoursIndex = accountHours.findIndex((ah: any) => ah.type === 'EARNED_HOURS');

        if (earnedHoursIndex >= 0) {
          accountHours[earnedHoursIndex].hours = earnedHours;
          await this.prisma.calcResult.update({
            where: { id: calcResult.id },
            data: {
              accountHours: JSON.stringify(accountHours),
            },
          });
        }
      } catch (error) {
        console.error('更新CalcResult失败:', error);
      }
    }

    return updatedRecord;
  }

  async deletePersonalProductionRecord(id: number) {
    const record = await this.prisma.personalProductionRecord.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundException('个人产量记录不存在');
    }

    // 软删除个人产量记录
    await this.prisma.personalProductionRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // 删除或更新CalcResult表中的挣得工时记录
    const calcDate = new Date(record.recordDate);
    calcDate.setHours(0, 0, 0, 0);

    const calcResults = await this.prisma.calcResult.findMany({
      where: {
        employeeNo: record.employeeNo,
        calcDate,
      },
    });

    for (const calcResult of calcResults) {
      try {
        const accountHours = JSON.parse(calcResult.accountHours || '[]');
        const filteredAccountHours = accountHours.filter((ah: any) => ah.type !== 'EARNED_HOURS');

        if (filteredAccountHours.length === 0) {
          // 如果没有其他工时记录，则删除这条CalcResult
          await this.prisma.calcResult.delete({
            where: { id: calcResult.id },
          });
        } else {
          // 否则更新accountHours
          await this.prisma.calcResult.update({
            where: { id: calcResult.id },
            data: {
              accountHours: JSON.stringify(filteredAccountHours),
            },
          });
        }
      } catch (error) {
        console.error('删除CalcResult失败:', error);
      }
    }

    return { message: '删除成功' };
  }
}

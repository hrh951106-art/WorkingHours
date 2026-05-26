import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { TABLE_METADATA } from './table-metadata';

@Injectable()
export class DataModelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建数据模型
   */
  async createModel(data: {
    name: string;
    code: string;
    type: string;
    sourceTable?: string;
    sourceSql?: string;
    description?: string;
    userId: number;
  }) {
    // 检查代码是否已存在
    const existing = await this.prisma.reportDataModel.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('模型代码已存在');
    }

    // 如果是表类型，自动导入字段
    let fields: any[] = [];
    if (data.type === 'table' && data.sourceTable) {
      fields = await this.importTableFields(data.sourceTable);
    }

    // 创建模型
    const model = await this.prisma.reportDataModel.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        sourceTable: data.sourceTable,
        sourceSql: data.sourceSql,
        description: data.description,
        createdById: data.userId,
        createdByName: 'System', // You may want to pass this in or get from user context
        fields: {
          create: fields,
        },
      },
      include: {
        fields: true,
      },
    });

    return model;
  }

  /**
   * 获取数据模型列表
   */
  async getModelList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, keyword, status } = params;

    const where: Prisma.ReportDataModelWhereInput = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.reportDataModel.count({ where }),
      this.prisma.reportDataModel.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          fields: {
            orderBy: { sortNo: 'asc' },
          },
          relations: true,
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
   * 获取数据模型详情
   */
  async getModelDetail(id: number) {
    const model = await this.prisma.reportDataModel.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { sortNo: 'asc' },
        },
        relations: true,
      },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    return model;
  }

  /**
   * 更新数据模型
   */
  async updateModel(id: number, data: any) {
    const model = await this.prisma.reportDataModel.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
      },
      include: {
        fields: true,
      },
    });

    return model;
  }

  /**
   * 删除数据模型
   */
  async deleteModel(id: number) {
    // 检查是否被报表引用
    const reportCount = await this.prisma.biReport.count({
      where: { modelId: id },
    });

    if (reportCount > 0) {
      throw new BadRequestException(`该模型被 ${reportCount} 个报表引用，无法删除`);
    }

    await this.prisma.reportDataModel.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * 添加模型字段
   */
  async addField(modelId: number, data: {
    name: string;
    code: string;
    type: string;
    dataType: string;
    sourceType: string;
    sourceExpr?: string;
    aggregation?: string;
    format?: string;
    description?: string;
    sortNo?: number;
  }) {
    // 检查字段代码是否已存在
    const existing = await this.prisma.reportModelField.findFirst({
      where: {
        modelId,
        code: data.code,
      },
    });

    if (existing) {
      throw new BadRequestException('字段代码已存在');
    }

    const field = await this.prisma.reportModelField.create({
      data: {
        model: {
          connect: { id: modelId },
        },
        code: data.code,
        name: data.name,
        description: data.description,
        fieldType: data.type,
        dataType: data.dataType,
        sourceExpr: data.sourceExpr,
        aggregation: data.aggregation,
        config: JSON.stringify({
          sourceType: data.sourceType,
          format: data.format,
        }),
        sortNo: data.sortNo,
      },
    });

    return field;
  }

  /**
   * 批量添加模型字段
   */
  async addFieldsBatch(modelId: number, fields: any[]) {
    // 删除现有字段
    await this.prisma.reportModelField.deleteMany({
      where: { modelId },
    });

    // 批量创建新字段
    const result = await this.prisma.reportModelField.createMany({
      data: fields.map(field => ({
        ...field,
        modelId,
      })),
      // skipDuplicates: true, // TODO: 类型问题，暂时注释
    });

    return { count: result.count };
  }

  /**
   * 更新模型字段
   */
  async updateField(fieldId: number, data: any) {
    const field = await this.prisma.reportModelField.update({
      where: { id: fieldId },
      data,
    });

    return field;
  }

  /**
   * 删除模型字段
   */
  async deleteField(fieldId: number) {
    await this.prisma.reportModelField.delete({
      where: { id: fieldId },
    });

    return { success: true };
  }

  /**
   * 添加模型关联关系
   */
  async addRelation(modelId: number, data: {
    name: string;
    type: string;
    leftField: string;
    rightModel: string;
    rightField: string;
    joinType?: string;
    description?: string;
  }) {
    const relation = await this.prisma.reportModelRelation.create({
      data: {
        model: {
          connect: { id: modelId },
        },
        relationCode: data.name,
        relationName: data.name,
        relationType: data.type,
        targetModel: data.rightModel,
        joinCondition: `LEFT.${data.leftField} = RIGHT.${data.rightField}`,
        description: data.description,
        config: JSON.stringify({
          joinType: data.joinType || 'INNER',
        }),
      },
    });

    return relation;
  }

  /**
   * 删除关联关系
   */
  async deleteRelation(relationId: number) {
    await this.prisma.reportModelRelation.delete({
      where: { id: relationId },
    });

    return { success: true };
  }

  /**
   * 从表导入字段（使用元数据）
   */
  private async importTableFields(tableName: string): Promise<any[]> {
    const columns = await this.prisma.$queryRaw`
      SELECT
        name as columnName,
        type as dataType,
        [notnull] as isRequired
      FROM pragma_table_info(${tableName})
      ORDER BY cid
    `;

    const metadata = TABLE_METADATA[tableName];

    const fields = (columns as any[]).map((column, index) => {
      const columnMeta = metadata?.fields[column.columnName];
      const dataType = this.mapDataType(column.dataType);

      // 优先使用元数据中的字段类型，否则自动推断
      let fieldType = columnMeta?.type || this.inferFieldType(column.columnName, dataType);

      return {
        name: columnMeta?.name || column.columnName,
        code: column.columnName,
        type: fieldType, // dimension 或 measure
        dataType: dataType,
        sourceType: 'column',
        sourceExpr: column.columnName,
        aggregation: fieldType === 'measure' ? 'sum' : null,
        description: columnMeta?.description,
        sortNo: index,
      };
    });

    return fields;
  }

  /**
   * 批量生成内置数据模型
   */
  async generateBuiltinModels() {
    const results = {
      success: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };

    // 获取所有配置了元数据的表
    const tables = Object.keys(TABLE_METADATA);

    for (const tableName of tables) {
      try {
        // 检查模型是否已存在
        const existingModel = await this.prisma.reportDataModel.findFirst({
          where: {
            sourceTable: tableName,
            type: 'table',
          },
        });

        if (existingModel) {
          results.skipped.push(tableName);
          continue;
        }

        const metadata = TABLE_METADATA[tableName];

        // 生成模型代码（表名转大写下划线）
        const code = tableName
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()
          .replace(/^_/, '');

        // 创建模型
        await this.prisma.reportDataModel.create({
          data: {
            name: metadata.name,
            code: code,
            type: 'table',
            sourceTable: tableName,
            description: metadata.description,
            status: 'ACTIVE',
            createdById: 1, // System user ID
            createdByName: 'System',
            fields: {
              create: await this.importTableFields(tableName),
            },
          },
        });

        results.success.push(tableName);
      } catch (error: any) {
        console.error(`生成模型失败: ${tableName}`, error);
        results.failed.push(`${tableName}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 重新生成指定模型的字段
   */
  async regenerateModelFields(modelId: number) {
    const model = await this.prisma.reportDataModel.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    if (model.type !== 'table' || !model.sourceTable) {
      throw new BadRequestException('只能重新生成表类型模型的字段');
    }

    // 删除现有字段
    await this.prisma.reportModelField.deleteMany({
      where: { modelId },
    });

    // 重新导入字段
    const fields = await this.importTableFields(model.sourceTable);

    await this.prisma.reportModelField.createMany({
      data: fields.map(field => ({
        ...field,
        modelId,
      })),
    });

    return {
      success: true,
      message: `成功重新生成 ${fields.length} 个字段`,
    };
  }

  /**
   * 映射SQLite数据类型到通用类型
   */
  private mapDataType(sqliteType: string): string {
    const type = sqliteType.toLowerCase();

    if (type.includes('int')) {
      return 'number';
    } else if (type.includes('real') || type.includes('float') || type.includes('double')) {
      return 'number';
    } else if (type.includes('text') || type.includes('char') || type.includes('clob')) {
      return 'string';
    } else if (type.includes('blob')) {
      return 'string';
    } else {
      return 'string';
    }
  }

  /**
   * 推断字段类型（维度或度量）
   */
  private inferFieldType(columnName: string, dataType: string): string {
    const name = columnName.toLowerCase();

    // 包含这些关键词的通常是度量
    const measureKeywords = [
      'amount', 'count', 'quantity', 'qty', 'price', 'cost',
      'sum', 'total', 'avg', 'rate', 'ratio', 'percent',
      '数量', '金额', '价格', '成本', '总计', '合计', '平均',
    ];

    // 以Id结尾的通常是维度
    if (name.endsWith('id') || name.endsWith('_id') || name.endsWith('Id')) {
      return 'dimension';
    }

    // 时间相关字段
    if (name.includes('time') || name.includes('date') || name.includes('时间') || name.includes('日期')) {
      return 'dimension';
    }

    // 名称相关字段
    if (name.includes('name') || name.includes('title') || name.includes('名称') || name.includes('标题')) {
      return 'dimension';
    }

    // 数值类型且包含度量关键词
    if (dataType === 'number' && measureKeywords.some(keyword => name.includes(keyword))) {
      return 'measure';
    }

    // 默认为维度
    return 'dimension';
  }

  /**
   * 基于模型执行查询
   */
  async executeModelQuery(modelId: number, config: {
    dimensions?: string[];
    measures?: string[];
    filters?: any[];
    orderBy?: any[];
    limit?: number;
    offset?: number;
  }) {
    const model = await this.prisma.reportDataModel.findUnique({
      where: { id: modelId },
      include: {
        fields: true,
      },
    });

    if (!model) {
      throw new NotFoundException('模型不存在');
    }

    // 构建SQL查询
    let sql = 'SELECT ';
    const params: any[] = [];

    // 添加维度字段
    if (config.dimensions && config.dimensions.length > 0) {
      const dimensionFields = model.fields.filter(f =>
        config.dimensions?.includes(f.code)
      );

      sql += dimensionFields.map(f => {
        if (f.aggregation && f.aggregation !== 'none') {
          return `${f.aggregation}(${f.sourceExpr}) as ${f.code}`;
        }
        return `${f.sourceExpr} as ${f.code}`;
      }).join(', ');
    }

    // 添加度量字段
    if (config.measures && config.measures.length > 0) {
      if (config.dimensions && config.dimensions.length > 0) {
        sql += ', ';
      }

      const measureFields = model.fields.filter(f =>
        config.measures?.includes(f.code)
      );

      sql += measureFields.map(f => {
        const agg = f.aggregation || 'sum';
        return `${agg}(${f.sourceExpr}) as ${f.code}`;
      }).join(', ');
    }

    // FROM子句
    if (model.type === 'table' && model.sourceTable) {
      sql += ` FROM ${model.sourceTable}`;
    } else if (model.type === 'sql' && model.sourceSql) {
      // 自定义SQL需要包裹在子查询中
      sql = sql.replace('FROM ', `FROM (${model.sourceSql}) as subquery `);
    }

    // WHERE子句（过滤条件）
    if (config.filters && config.filters.length > 0) {
      const filterClauses = config.filters.map(filter => {
        const field = model.fields.find(f => f.code === filter.field);
        if (!field) return '';

        const operator = filter.operator || '=';
        const value = filter.value;

        switch (operator) {
          case 'eq':
            return `${field.sourceExpr} = ${this.formatValue(value, field.dataType)}`;
          case 'ne':
            return `${field.sourceExpr} != ${this.formatValue(value, field.dataType)}`;
          case 'gt':
            return `${field.sourceExpr} > ${this.formatValue(value, field.dataType)}`;
          case 'gte':
            return `${field.sourceExpr} >= ${this.formatValue(value, field.dataType)}`;
          case 'lt':
            return `${field.sourceExpr} < ${this.formatValue(value, field.dataType)}`;
          case 'lte':
            return `${field.sourceExpr} <= ${this.formatValue(value, field.dataType)}`;
          case 'like':
            return `${field.sourceExpr} LIKE ${this.formatValue('%' + value + '%', field.dataType)}`;
          case 'in':
            return `${field.sourceExpr} IN (${(value as any[]).map(v => this.formatValue(v, field.dataType)).join(', ')})`;
          default:
            return '';
        }
      }).filter(f => f);

      if (filterClauses.length > 0) {
        sql += ' WHERE ' + filterClauses.join(' AND ');
      }
    }

    // GROUP BY子句
    if (config.dimensions && config.dimensions.length > 0) {
      sql += ' GROUP BY ' + config.dimensions.join(', ');
    }

    // ORDER BY子句
    if (config.orderBy && config.orderBy.length > 0) {
      const orderClauses = config.orderBy.map(order => {
        const field = model.fields.find(f => f.code === order.field);
        if (!field) return '';

        const direction = order.direction || 'ASC';
        return `${order.field} ${direction}`;
      }).filter(f => f);

      if (orderClauses.length > 0) {
        sql += ' ORDER BY ' + orderClauses.join(', ');
      }
    }

    // LIMIT和OFFSET
    if (config.limit) {
      sql += ` LIMIT ${config.limit}`;
    }
    if (config.offset) {
      sql += ` OFFSET ${config.offset}`;
    }

    // 执行查询
    try {
      const result = await this.prisma.$queryRawUnsafe(sql);
      return {
        success: true,
        data: result,
        sql,
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        sql,
        message: error.message,
      };
    }
  }

  /**
   * 格式化SQL值
   */
  private formatValue(value: any, dataType: string): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (dataType === 'string') {
      return `'${String(value).replace(/'/g, "''")}'`;
    } else if (dataType === 'date') {
      return `'${value}'`;
    } else {
      return String(value);
    }
  }

  /**
   * 创建复合模型
   */
  async createCompositeModel(data: {
    name: string;
    code: string;
    description?: string;
    joins: Array<{
      leftModelId: number;
      leftField: string;
      rightModelId: number;
      rightField: string;
      joinType: 'INNER' | 'LEFT' | 'RIGHT';
    }>;
    fields: Array<{
      modelId: number;
      fieldCode: string;
      alias?: string;
    }>;
  }) {
    // 检查代码是否已存在
    const existing = await this.prisma.reportDataModel.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('模型代码已存在');
    }

    // 获取所有关联的模型
    const modelIds = new Set([
      ...data.joins.map(j => j.leftModelId),
      ...data.joins.map(j => j.rightModelId),
    ]);

    const models = await this.prisma.reportDataModel.findMany({
      where: {
        id: { in: Array.from(modelIds) },
      },
      include: {
        fields: true,
      },
    });

    if (models.length !== modelIds.size) {
      throw new BadRequestException('部分关联模型不存在');
    }

    // 构建SQL查询
    let sql = 'SELECT ';
    const fieldDefinitions: string[] = [];
    const modelFields: any[] = [];

    // 处理选择的字段
    for (const field of data.fields) {
      const model = models.find(m => m.id === field.modelId);
      if (!model) continue;

      const modelField = model.fields?.find(f => f.code === field.fieldCode);
      if (!modelField) continue;

      const alias = field.alias || field.fieldCode;
      const fieldRef = `${model.sourceTable}_${field.fieldCode}`;

      fieldDefinitions.push(`${model.sourceTable}.${modelField.sourceExpr} as ${fieldRef}`);

      modelFields.push({
        name: modelField.name,
        code: alias,
        type: modelField.type,
        dataType: modelField.dataType,
        sourceType: 'calculated',
        sourceExpr: `${model.sourceTable}.${modelField.sourceExpr}`,
        aggregation: modelField.aggregation,
        description: modelField.description,
        sortNo: modelFields.length,
      });
    }

    sql += fieldDefinitions.join(', ');

    // 构建FROM和JOIN子句
    const firstModel = models.find(m => m.id === data.joins[0].leftModelId);
    if (!firstModel) {
      throw new BadRequestException('无效的JOIN配置');
    }

    sql += ` FROM ${firstModel.sourceTable}`;

    // 添加JOIN
    for (const join of data.joins) {
      const leftModel = models.find(m => m.id === join.leftModelId);
      const rightModel = models.find(m => m.id === join.rightModelId);

      if (!leftModel || !rightModel) {
        throw new BadRequestException('JOIN模型不存在');
      }

      sql += ` ${join.joinType} JOIN ${rightModel.sourceTable} ON ${leftModel.sourceTable}.${join.leftField} = ${rightModel.sourceTable}.${join.rightField}`;
    }

    // 创建模型
    const model = await this.prisma.reportDataModel.create({
      data: {
        name: data.name,
        code: data.code,
        type: 'sql',
        sourceTable: firstModel.sourceTable + ' JOIN ' + data.joins.map(j =>
          models.find(m => m.id === j.rightModelId)?.sourceTable
        ).join(', '),
        sourceSql: sql,
        description: data.description,
        status: 'ACTIVE',
        createdById: 1, // System user ID
        createdByName: 'System',
        fields: {
          create: modelFields,
        },
      },
      include: {
        fields: true,
      },
    });

    return model;
  }

  /**
   * 预览数据处理流程
   */
  async previewDataProcess(nodes: any[], connections: any[]) {
    // 找到输出节点
    const outputNode = nodes.find(n => n.type === 'output');
    if (!outputNode) {
      throw new BadRequestException('未找到输出节点');
    }

    // 生成SQL
    const sql = await this.generateSQLFromProcess(nodes, connections, outputNode);

    // 执行SQL查询（限制返回100条记录）
    const result = await this.prisma.$queryRawUnsafe(sql + ' LIMIT 100');

    return {
      data: result,
      total: Array.isArray(result) ? result.length : 0,
    };
  }

  /**
   * 从数据处理流程生成SQL
   */
  private async generateSQLFromProcess(nodes: any[], connections: any[], outputNode: any): Promise<string> {
    // 先获取所有source节点对应的模型
    const modelMap = new Map<any, any>();
    for (const node of nodes) {
      if (node.type === 'source') {
        const model = await this.prisma.reportDataModel.findUnique({
          where: { id: node.config?.modelId },
          include: { fields: true },
        });
        if (model) {
          modelMap.set(node.id, model);
        }
      }
    }

    // 构建节点映射以便快速查找
    const nodeMap = new Map<any, any>();
    nodes.forEach(node => nodeMap.set(node.id, node));

    const cteMap: Record<string, string> = {};

    // 简单处理：多次迭代直到所有节点都被处理
    let maxIterations = nodes.length * 2;
    let iteration = 0;
    while (iteration < maxIterations) {
      let processed = 0;

      for (const node of nodes) {
        if (cteMap[node.id]) continue; // 已处理

        let canProcess = true;

        switch (node.type) {
          case 'source':
            const model = modelMap.get(node.id);
            if (model) {
              if (model.type === 'table' && model.sourceTable) {
                cteMap[node.id] = `SELECT * FROM ${model.sourceTable}`;
                processed++;
              } else if (model.type === 'sql' && model.sourceSql) {
                cteMap[node.id] = `SELECT * FROM (${model.sourceSql}) AS src_${node.id}`;
                processed++;
              }
            }
            break;

          case 'filter':
            if (node.inputs && node.inputs[0] && cteMap[node.inputs[0]]) {
              const inputSQL = cteMap[node.inputs[0]];
              const conditions = node.config?.conditions || [];
              if (conditions.length > 0) {
                const whereClause = conditions.map((c: any) =>
                  `${c.field} ${c.operator} ${this.formatValue(c.value, 'string')}`
                ).join(' AND ');
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS filter_${node.id} WHERE ${whereClause}`;
              } else {
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS filter_${node.id}`;
              }
              processed++;
            } else {
              canProcess = false;
            }
            break;

          case 'join':
            if (node.inputs && node.inputs.length >= 2 &&
                cteMap[node.inputs[0]] && cteMap[node.inputs[1]]) {
              const leftSQL = cteMap[node.inputs[0]];
              const rightSQL = cteMap[node.inputs[1]];
              const joinType = node.config?.joinType || 'INNER';
              const leftField = node.config?.leftField;
              const rightField = node.config?.rightField;
              cteMap[node.id] = `SELECT * FROM (${leftSQL}) AS join_a_${node.id} ${joinType} JOIN (${rightSQL}) AS join_b_${node.id} ON join_a_${node.id}.${leftField} = join_b_${node.id}.${rightField}`;
              processed++;
            } else {
              canProcess = false;
            }
            break;

          case 'union':
            if (node.inputs && node.inputs.length >= 2) {
              const allInputsReady = node.inputs.every((inputId: string) => cteMap[inputId]);
              if (allInputsReady) {
                const queries = node.inputs.map((inputId: string) => cteMap[inputId]);
                cteMap[node.id] = queries.join('\nUNION ALL\n');
                processed++;
              } else {
                canProcess = false;
              }
            }
            break;

          case 'aggregate':
            if (node.inputs && node.inputs[0] && cteMap[node.inputs[0]]) {
              const inputSQL = cteMap[node.inputs[0]];
              const groupBy = node.config?.groupBy || [];
              const aggregations = node.config?.aggregations || [];
              if (aggregations.length > 0) {
                const selectFields = [
                  ...groupBy,
                  ...aggregations.map((a: any) => `${a.function}(${a.field}) AS ${a.alias}`)
                ];
                cteMap[node.id] = `SELECT ${selectFields.join(', ')} FROM (${inputSQL}) AS agg_${node.id} GROUP BY ${groupBy.join(', ')}`;
              } else {
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS agg_${node.id}`;
              }
              processed++;
            } else {
              canProcess = false;
            }
            break;

          case 'calculate':
            if (node.inputs && node.inputs[0] && cteMap[node.inputs[0]]) {
              const inputSQL = cteMap[node.inputs[0]];
              const calculations = node.config?.calculations || [];
              if (calculations.length > 0) {
                const calcFields = calculations.map((c: any) => `${c.expression} AS ${c.alias}`);
                cteMap[node.id] = `SELECT *, ${calcFields.join(', ')} FROM (${inputSQL}) AS calc_${node.id}`;
              } else {
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS calc_${node.id}`;
              }
              processed++;
            } else {
              canProcess = false;
            }
            break;

          case 'sort':
            if (node.inputs && node.inputs[0] && cteMap[node.inputs[0]]) {
              const inputSQL = cteMap[node.inputs[0]];
              const orderBy = node.config?.orderBy || [];
              if (orderBy.length > 0) {
                const orderClause = orderBy.map((o: any) => `${o.field} ${o.direction}`).join(', ');
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS sort_${node.id} ORDER BY ${orderClause}`;
              } else {
                cteMap[node.id] = `SELECT * FROM (${inputSQL}) AS sort_${node.id}`;
              }
              processed++;
            } else {
              canProcess = false;
            }
            break;

          case 'output':
            if (node.inputs && node.inputs[0] && cteMap[node.inputs[0]]) {
              cteMap[node.id] = cteMap[node.inputs[0]];
              processed++;
            } else {
              canProcess = false;
            }
            break;

          default:
            canProcess = false;
        }
      }

      // 如果所有节点都已处理，退出循环
      if (processed === 0 && Object.keys(cteMap).length === nodes.length) {
        break;
      }

      // 如果没有任何进展，退出循环避免无限循环
      if (processed === 0) {
        break;
      }

      iteration++;
    }

    return cteMap[outputNode.id] || 'SELECT 1 WHERE 1=0';
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TABLE_METADATA } from './table-metadata';

@Injectable()
export class BiReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取所有数据库表列表
   */
  async getDatabaseTables(): Promise<any[]> {
    const tables = await this.prisma.$queryRaw`
      SELECT name as tableName, sql as sql
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_%'
      ORDER BY name
    `;

    // 添加元数据信息
    return (tables as any[]).map(table => {
      const metadata = TABLE_METADATA[table.tableName];
      return {
        ...table,
        ...metadata,
        hasMetadata: !!metadata,
      };
    });
  }

  /**
   * 获取指定表的结构信息
   */
  async getTableStructure(tableName: string): Promise<any> {
    const columns = await this.prisma.$queryRaw`
      SELECT
        name as columnName,
        type as dataType,
        [notnull] as isRequired,
        dflt_value as defaultValue
      FROM pragma_table_info(${tableName})
      ORDER BY cid
    `;

    // 获取表的主键信息
    const primaryKeys = await this.prisma.$queryRaw`
      SELECT name as columnName
      FROM pragma_table_info(${tableName})
      WHERE pk > 0
      ORDER BY pk
    `;

    // 获取表的索引信息
    const indexes = await this.prisma.$queryRaw`
      SELECT
        name as indexName,
        sql as indexSql
      FROM sqlite_master
      WHERE type='index'
      AND tbl_name=${tableName}
      AND sql IS NOT NULL
    `;

    // 获取表的行数估算
    const countResult = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as rowCount FROM ${tableName}
    `);

    // 获取表元数据
    const metadata = TABLE_METADATA[tableName];

    // 为字段添加元数据信息
    const columnsWithMetadata = (columns as any[]).map(column => {
      const fieldMetadata = metadata?.fields[column.columnName];
      return {
        ...column,
        displayName: fieldMetadata?.name || column.columnName,
        description: fieldMetadata?.description,
        fieldType: fieldMetadata?.type,
      };
    });

    return {
      tableName,
      displayName: metadata?.name || tableName,
      description: metadata?.description,
      category: metadata?.category,
      hasMetadata: !!metadata,
      columns: columnsWithMetadata || [],
      primaryKeys: primaryKeys || [],
      indexes: indexes || [],
      rowCount: (countResult as any)[0]?.rowCount || 0,
    };
  }

  /**
   * 预览表数据
   */
  async previewTableData(tableName: string, limit: number = 20): Promise<any> {
    const data = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM ${tableName} LIMIT ${limit}
    `);

    return data;
  }

  /**
   * 搜索表（按名称模糊搜索）
   */
  async searchTables(keyword: string): Promise<any[]> {
    const tables = await this.prisma.$queryRaw`
      SELECT name as tableName, sql as sql
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_%'
      AND name LIKE ${'%' + keyword + '%'}
      ORDER BY name
    `;

    return tables as any[];
  }

  /**
   * 执行自定义SQL查询
   */
  async executeSql(sql: string, params: any[] = []): Promise<any> {
    try {
      // 安全检查：只允许SELECT查询
      const trimmedSql = sql.trim().toUpperCase();
      if (!trimmedSql.startsWith('SELECT')) {
        throw new Error('只允许执行SELECT查询');
      }

      // 防止多语句注入
      if (sql.includes(';') && sql.trim().split(';').filter(s => s.trim()).length > 1) {
        throw new Error('不允许执行多条SQL语句');
      }

      const result = await this.prisma.$queryRawUnsafe(sql, ...params);
      return {
        success: true,
        data: result,
        message: '查询成功',
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || '查询失败',
      };
    }
  }

  /**
   * 获取表的关联关系建议
   */
  async getTableRelations(tableName: string): Promise<any[]> {
    const columns = await this.prisma.$queryRaw`
      SELECT name as columnName, type as dataType
      FROM pragma_table_info(${tableName})
      ORDER BY cid
    `;

    const relations: any[] = [];

    // 查找可能的外键关系（以Id结尾的字段）
    for (const column of columns as any[]) {
      const columnName = column.columnName;
      if (columnName.endsWith('Id') || columnName.endsWith('ID')) {
        const relatedTableName = columnName.replace(/Id$|ID$/, '');

        // 检查关联表是否存在
        const relatedTable = await this.prisma.$queryRaw`
          SELECT name FROM sqlite_master
          WHERE type='table'
          AND name=${relatedTableName}
          LIMIT 1
        `;

        if ((relatedTable as any[]).length > 0) {
          relations.push({
            type: 'many_to_one',
            fromTable: tableName,
            fromColumn: columnName,
            toTable: relatedTableName,
            toColumn: 'id',
            confidence: 'high',
          });
        }
      }
    }

    return relations;
  }
}

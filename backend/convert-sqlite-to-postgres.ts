import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// 使用默认的dev.db
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function convertSQLiteToPostgreSQL() {
  console.log('=== 开始转换SQLite数据库到PostgreSQL格式 ===\n');

  const outputDir = path.join(process.cwd(), 'postgres-export');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const schemaFile = path.join(outputDir, 'schema.sql');
  const dataFile = path.join(outputDir, 'data.sql');

  console.log(`输出目录: ${outputDir}\n`);

  try {
    // 1. 获取所有表名
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    ` as Array<{ name: string }>;

    console.log(`找到 ${tables.length} 个表\n`);

    // PostgreSQL schema SQL
    let schemaSQL = '-- PostgreSQL Schema Export\n\n';
    schemaSQL += 'SET client_encoding = \'UTF8\';\n';
    schemaSQL += 'SET standard_conforming_strings = on;\n\n';

    // PostgreSQL data SQL
    let dataSQL = '-- PostgreSQL Data Export\n\n';
    dataSQL += 'SET client_encoding = \'UTF8\';\n';
    dataSQL += 'SET standard_conforming_strings = on;\n\n';
    dataSQL += 'BEGIN;\n\n';

    // 为每个表生成schema和data
    for (const table of tables) {
      const tableName = table.name;
      console.log(`处理表: ${tableName}`);

      // 获取表结构
      const columns = await prisma.$queryRaw`
        PRAGMA table_info(${tableName})
      ` as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

      // 获取索引信息
      const indexes = await prisma.$queryRaw`
        SELECT name, sql FROM sqlite_master
        WHERE type='index' AND tbl_name=${tableName} AND sql IS NOT NULL
      ` as Array<{ name: string; sql: string }>;

      // 生成PostgreSQL CREATE TABLE语句
      schemaSQL += `-- Table: ${tableName}\n`;
      schemaSQL += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
      schemaSQL += `CREATE TABLE "${tableName}" (\n`;

      const primaryKeys: string[] = [];
      const columnDefs: string[] = [];

      for (const col of columns) {
        let pgType = col.type;

        // 转换SQLite类型到PostgreSQL类型
        if (col.type === 'INTEGER') {
          pgType = 'INTEGER';
        } else if (col.type === 'TEXT') {
          pgType = 'TEXT';
        } else if (col.type === 'REAL') {
          pgType = 'DOUBLE PRECISION';
        } else if (col.type === 'BLOB') {
          pgType = 'BYTEA';
        } else if (col.type === 'NUMERIC') {
          pgType = 'NUMERIC';
        }

        const colDef = `  "${col.name}" ${pgType}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`;
        columnDefs.push(colDef);

        if (col.pk > 0) {
          primaryKeys.push(col.name);
        }
      }

      schemaSQL += columnDefs.join(',\n');

      if (primaryKeys.length > 0) {
        schemaSQL += ',\n  PRIMARY KEY (' + primaryKeys.map(pk => `"${pk}"`).join(', ') + ')';
      }

      schemaSQL += '\n);\n\n';

      // 创建索引
      for (const idx of indexes) {
        if (!idx.name.startsWith('sqlite_')) {
          // 解析索引SQL
          let indexSQL = idx.sql;

          // 转换SQLite索引语法到PostgreSQL
          indexSQL = indexSQL.replace(/CREATE UNIQUE INDEX/i, 'CREATE UNIQUE INDEX');
          indexSQL = indexSQL.replace(/CREATE INDEX/i, 'CREATE INDEX');
          indexSQL = indexSQL.replace(/ON\s+"?(\w+)"?\s*/i, `ON "${tableName}" `);

          schemaSQL += `${indexSQL};\n`;
        }
      }

      schemaSQL += '\n';

      // 获取表数据
      const rowCountResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "${tableName}"
      ` as Array<{ count: number }>;

      const rowCount = rowCountResult[0]?.count || 0;

      if (rowCount > 0) {
        console.log(`  导出 ${rowCount} 条记录`);

        dataSQL += `-- Data for table: ${tableName}\n`;
        dataSQL += `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;\n`;

        // 分批获取数据
        const batchSize = 1000;
        let offset = 0;

        while (offset < rowCount) {
          const rows = await prisma.$queryRaw`
            SELECT * FROM "${tableName}"
            LIMIT ${batchSize} OFFSET ${offset}
          ` as any[];

          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const val = row[col];

              if (val === null) {
                return 'NULL';
              } else if (typeof val === 'string') {
                // 转义单引号
                const escaped = val.replace(/'/g, "''");
                return `'${escaped}'`;
              } else if (typeof val === 'boolean') {
                return val ? 'TRUE' : 'FALSE';
              } else if (val instanceof Date) {
                return `'${val.toISOString()}'`;
              } else if (val instanceof Buffer) {
                return `'\\x${val.toString('hex')}'`;
              } else {
                return String(val);
              }
            });

            const cols = columns.map(c => `"${c}"`).join(', ');
            const vals = values.join(', ');

            dataSQL += `INSERT INTO "${tableName}" (${cols}) VALUES (${vals});\n`;
          }

          offset += batchSize;
        }

        dataSQL += '\n';
      } else {
        console.log(`  表为空，跳过数据导出`);
      }
    }

    dataSQL += 'COMMIT;\n';

    // 写入文件
    console.log('\n写入文件...');
    fs.writeFileSync(schemaFile, schemaSQL, 'utf8');
    fs.writeFileSync(dataFile, dataSQL, 'utf8');

    console.log(`\n✅ Schema文件: ${schemaFile}`);
    console.log(`✅ Data文件: ${dataFile}`);

    // 统计信息
    const schemaSize = (fs.statSync(schemaFile).size / 1024).toFixed(2);
    const dataSize = (fs.statSync(dataFile).size / 1024).toFixed(2);

    console.log(`\n文件大小:`);
    console.log(`  Schema: ${schemaSize} KB`);
    console.log(`  Data: ${dataSize} KB`);

  } catch (error) {
    console.error('❌ 转换失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

convertSQLiteToPostgreSQL()
  .then(() => {
    console.log('\n转换完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('转换失败:', error);
    process.exit(1);
  });

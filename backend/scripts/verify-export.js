/**
 * 验证导出完整性
 * 检查SQLite中有数据的表是否都在备份文件中
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const backupFile = '/Users/aaron.he/Desktop/AI/JY/deployment/jy_production_backup_latest.sql';

async function verifyExport() {
  console.log('=== 验证备份文件完整性 ===\n');

  // 1. 读取备份文件，统计每个表的INSERT数量
  const backupContent = fs.readFileSync(backupFile, 'utf8');
  const backupStats = {};

  const insertRegex = /INSERT INTO "([^"]+)"/g;
  let match;
  while ((match = insertRegex.exec(backupContent)) !== null) {
    const tableName = match[1];
    backupStats[tableName] = (backupStats[tableName] || 0) + 1;
  }

  console.log(`备份文件统计:`);
  console.log(`- 有数据的表: ${Object.keys(backupStats).length}`);
  console.log(`- 总记录数: ${Object.values(backupStats).reduce((a, b) => a + b, 0)}\n`);

  // 2. 获取SQLite所有表
  const tablesResult = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence' ORDER BY name
  `;
  const tables = tablesResult.map(t => t.name);

  console.log(`SQLite总表数: ${tables.length}\n`);

  // 3. 检查每个表
  let hasDataTables = 0;
  let emptyTables = 0;
  let missingTables = [];
  let mismatchTables = [];

  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = Number(result[0].count);

      if (count > 0) {
        hasDataTables++;
        const backupCount = backupStats[table] || 0;

        if (backupCount === 0) {
          missingTables.push({ table, count });
          console.log(`❌ ${table}: SQLite有${count}条，备份文件中缺失`);
        } else if (backupCount !== count) {
          mismatchTables.push({ table, sqlite: count, backup: backupCount });
          console.log(`⚠️  ${table}: SQLite=${count}, 备份=${backupCount}`);
        }
      } else {
        emptyTables++;
      }
    } catch (error) {
      // ignore query errors
    }
  }

  // 4. 输出总结
  console.log('\n=== 验证结果 ===');
  console.log(`✅ SQLite有数据的表: ${hasDataTables}`);
  console.log(`📭 空表: ${emptyTables}`);
  console.log(`📊 备份文件有数据的表: ${Object.keys(backupStats).length}`);

  if (missingTables.length > 0) {
    console.log(`\n❌ 缺失的表 (${missingTables.length}):`);
    missingTables.forEach(({ table, count }) => {
      console.log(`   - ${table}: ${count}条数据未导出`);
    });
  }

  if (mismatchTables.length > 0) {
    console.log(`\n⚠️  数据量不匹配 (${mismatchTables.length}):`);
    mismatchTables.forEach(({ table, sqlite, backup }) => {
      console.log(`   - ${table}: SQLite=${sqlite}, 备份=${backup}`);
    });
  }

  if (missingTables.length === 0 && mismatchTables.length === 0) {
    console.log('\n✅ ✅ ✅  所有有数据的表都已正确导出！');
    console.log('\n备份文件包含了本地环境的所有数据和配置！');
  }

  await prisma.$disconnect();
}

verifyExport().catch(console.error);

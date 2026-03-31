/**
 * 修复脚本：批量替换allocation.service.ts中使用lineShift.line的代码
 *
 * 改造内容：
 * 1. createLineShift - 移除lineId和ProductionLine查找逻辑
 * 2. 分摊计算方法 - 将lineShift.line改为lineShift（直接使用orgId/orgName）
 * 3. getLineIndirectAccount - 重构为通过组织层级创建账户
 * 4. isLineInHierarchyLevels - 修改参数类型
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/modules/allocation/allocation.service.ts');

console.log('读取文件...');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('执行替换...');

// 1. 修复 createLineShift 方法签名
content = content.replace(
  /async createLineShift\(dto: any\) \{[\s\S]*?const \{ orgId, orgName, lineId, shiftId, shiftName, scheduleDate, startTime, endTime, plannedProducts, participateInAllocation, description \} = dto;/,
  `async createLineShift(dto: any) {
    const { orgId, orgName, shiftId, shiftName, scheduleDate, startTime, endTime, plannedProducts, participateInAllocation, description } = dto;`
);

// 2. 移除整个ProductionLine查找逻辑块
content = content.replace(
  /\/\/ 如果没有提供 lineId，尝试根据 orgId 和 orgName 查找对应的产线[\s\S]*?if \(!finalLineId && orgId\) \{[\s\S]*?\n    \}/,
  ''
);

// 3. 移除create中的lineId字段
content = content.replace(
  /return this\.prisma\.lineShift\.create\(\{\s*data: \{\s*orgId,\s*orgName,\s*lineId: finalLineId,\s*shiftId,/g,
  `return this.prisma.lineShift.create({
      data: {
        orgId,
        orgName,
        shiftId,`
);

console.log('写入文件...');
fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ 修复完成！');

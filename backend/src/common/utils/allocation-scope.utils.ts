/**
 * 分摊范围工具类
 * 用于处理账户名称层级提取、开线计划表匹配等功能
 */

/**
 * 从账户名称中提取指定层级的值
 *
 * 账户名称格式: "大华富阳工厂/W2总装车间/-/大桶/-/-/-"
 * 层级说明:
 *   - level 1: 工厂（第1段）
 *   - level 2: 车间（第2段）
 *   - level 3: 线体（第3段）
 *   - level 4: 工序（第4段）
 *   - level 5: 产品（第5段）
 *   - level 6: 其他（第6段）
 *   - level 7: 其他（第7段）
 *
 * @param accountName 账户名称，如 "大华富阳工厂/W2总装车间/-/大桶/-/-/-"
 * @param level 层级（1-7）
 * @returns 该层级的值，如果层级不存在或为占位符"-"，则返回null
 */
export function extractLevelFromAccountName(accountName: string, level: number): string | null {
  if (!accountName || level < 1 || level > 7) {
    return null;
  }

  // 按 "/" 分割账户名称
  const parts = accountName.split('/').map(p => p.trim());

  // 检查层级是否在范围内
  if (level > parts.length) {
    return null;
  }

  // 获取对应层级的值（数组索引从0开始，所以是 level - 1）
  const value = parts[level - 1];

  // 如果值为占位符 "-"，则返回 null
  if (!value || value === '-') {
    return null;
  }

  return value;
}

/**
 * 批量从账户名称中提取多个层级的值
 *
 * @param accountName 账户名称
 * @param levels 要提取的层级数组
 * @returns 包含各层级值的对象
 */
export function extractMultipleLevelsFromAccountName(
  accountName: string,
  levels: number[]
): Record<number, string | null> {
  const result: Record<number, string | null> = {};

  for (const level of levels) {
    result[level] = extractLevelFromAccountName(accountName, level);
  }

  return result;
}

/**
 * 在开线计划表中匹配指定层级的数据
 *
 * @param lineShifts 开线计划记录数组
 * @param level 层级（1-7）
 * @param levelValue 该层级的值
 * @returns 匹配的开线计划记录数组
 */
export function matchLineShiftsByLevel(
  lineShifts: any[],
  level: number,
  levelValue: string
): any[] {
  if (!lineShifts || lineShifts.length === 0 || !levelValue) {
    return [];
  }

  return lineShifts.filter((lineShift) => {
    // 优先使用 accountName 进行匹配
    if (lineShift.accountName) {
      const extractedValue = extractLevelFromAccountName(lineShift.accountName, level);
      return extractedValue === levelValue;
    }

    // 如果没有 accountName，尝试使用 orgName
    // 注意：orgName 是 WH1001 配置的最低层级的组织名称
    // 这里需要根据实际情况判断是否匹配
    if (lineShift.orgName) {
      // 简单的字符串匹配
      return lineShift.orgName === levelValue;
    }

    return false;
  });
}

/**
 * 从开线计划记录中解析 WH1001 配置的层级值
 *
 * WH1001 配置的层级信息存储在 orgId 和 orgName 字段中
 * orgId: WH1001 配置的最低层级的组织 ID
 * orgName: WH1001 配置的最低层级的组织名称
 *
 * 如果需要获取更完整的层级信息，可以从 accountName 中解析
 *
 * @param lineShift 开线计划记录
 * @param targetLevel 目标层级（可选，如果不指定则返回 orgName）
 * @returns 层级值
 */
export function extractWH1001LevelFromLineShift(
  lineShift: any,
  targetLevel?: number
): string | null {
  if (!lineShift) {
    return null;
  }

  // 如果指定了目标层级，尝试从 accountName 中提取
  if (targetLevel && lineShift.accountName) {
    return extractLevelFromAccountName(lineShift.accountName, targetLevel);
  }

  // 否则返回 orgName（WH1001 配置的最低层级）
  return lineShift.orgName || null;
}

/**
 * 批量从开线计划记录中解析 WH1001 配置的层级值
 *
 * @param lineShifts 开线计划记录数组
 * @param targetLevel 目标层级（可选）
 * @returns 包含各开线计划层级值的数组
 */
export function extractWH1001LevelsFromLineShifts(
  lineShifts: any[],
  targetLevel?: number
): (string | null)[] {
  if (!lineShifts || lineShifts.length === 0) {
    return [];
  }

  return lineShifts.map((lineShift) =>
    extractWH1001LevelFromLineShift(lineShift, targetLevel)
  );
}

/**
 * 检查开线计划记录是否应该参与分摊
 *
 * @param lineShift 开线计划记录
 * @returns 是否应该参与分摊
 */
export function shouldParticipateInAllocation(lineShift: any): boolean {
  if (!lineShift) {
    return false;
  }

  // 检查 participateInAllocation 字段
  if (typeof lineShift.participateInAllocation === 'boolean') {
    return lineShift.participateInAllocation;
  }

  // 默认参与分摊
  return true;
}

/**
 * 过滤出应该参与分摊的开线计划记录
 *
 * @param lineShifts 开线计划记录数组
 * @returns 应该参与分摊的记录数组
 */
export function filterParticipatingLineShifts(lineShifts: any[]): any[] {
  if (!lineShifts || lineShifts.length === 0) {
    return [];
  }

  return lineShifts.filter((lineShift) =>
    shouldParticipateInAllocation(lineShift)
  );
}

/**
 * 完整的分摊范围匹配流程
 *
 * 步骤：
 * 1. 从源账户名称中提取指定层级的值
 * 2. 在开线计划表中匹配该层级的数据
 * 3. 从匹配的记录中解析 WH1001 配置的层级
 * 4. 过滤出应该参与分摊的记录
 *
 * @param sourceAccountName 源账户名称（待分摊工时）
 * @param allocationScopeLevel 分摊范围层级（1-7）
 * @param lineShifts 开线计划记录数组
 * @param wh1001TargetLevel WH1001 目标层级（可选）
 * @returns 匹配的、应该参与分摊的开线计划记录数组
 */
export function matchAllocationScope(
  sourceAccountName: string,
  allocationScopeLevel: number,
  lineShifts: any[],
  wh1001TargetLevel?: number
): any[] {
  // 第一步：从源账户名称中提取分摊范围层级的值
  const scopeValue = extractLevelFromAccountName(
    sourceAccountName,
    allocationScopeLevel
  );

  if (!scopeValue) {
    console.log(
      `无法从账户名称 "${sourceAccountName}" 中提取层级 ${allocationScopeLevel} 的值`
    );
    return [];
  }

  console.log(
    `从账户名称 "${sourceAccountName}" 中提取层级 ${allocationScopeLevel} 的值: "${scopeValue}"`
  );

  // 第二步：在开线计划表中匹配该层级的数据
  const matchedLineShifts = matchLineShiftsByLevel(
    lineShifts,
    allocationScopeLevel,
    scopeValue
  );

  console.log(
    `在开线计划表中匹配到 ${matchedLineShifts.length} 条层级 ${allocationScopeLevel} = "${scopeValue}" 的记录`
  );

  if (matchedLineShifts.length === 0) {
    return [];
  }

  // 第三步：从匹配的记录中解析 WH1001 配置的层级（如果需要）
  if (wh1001TargetLevel) {
    const wh1001Levels = extractWH1001LevelsFromLineShifts(
      matchedLineShifts,
      wh1001TargetLevel
    );
    console.log(
      `从匹配的记录中解析 WH1001 层级 ${wh1001TargetLevel} 的值:`,
      wh1001Levels
    );
  }

  // 第四步：过滤出应该参与分摊的记录
  const participatingLineShifts = filterParticipatingLineShifts(
    matchedLineShifts
  );

  console.log(
    `过滤后应该参与分摊的记录数: ${participatingLineShifts.length}`
  );

  return participatingLineShifts;
}

/**
 * 获取账户名称的层级路径信息
 *
 * @param accountName 账户名称
 * @returns 包含所有层级信息的对象
 */
export function getAccountNameHierarchy(accountName: string): {
  full: string;
  levels: Record<number, string | null>;
  levelCount: number;
} {
  if (!accountName) {
    return {
      full: '',
      levels: {},
      levelCount: 0,
    };
  }

  const parts = accountName.split('/').map(p => p.trim());
  const levels: Record<number, string | null> = {};

  for (let i = 1; i <= 7; i++) {
    levels[i] = extractLevelFromAccountName(accountName, i);
  }

  return {
    full: accountName,
    levels,
    levelCount: parts.length,
  };
}

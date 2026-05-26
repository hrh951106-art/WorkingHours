/**
 * 精益工时计算服务增强方法
 * 需要添加到 attendance-code.service.ts 中的方法
 */

// ==================== 需要添加的常量和导入 ====================
// 在文件顶部添加：
// import { differenceInMinutes } from 'date-fns';

// ==================== 需要添加的方法 ====================

/**
 * 获取员工的主劳动力账户（层级最高的账户）
 */
private async getEmployeeMainAccount(employeeId: number) {
  if (!employeeId) return null;

  const targetDate = new Date();
  const accounts = await this.prisma.laborAccount.findMany({
    where: {
      employeeId,
      type: 'MAIN',
      effectiveDate: { lte: targetDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: targetDate } },
      ],
    },
    orderBy: { level: 'desc' },
    take: 1,
  });

  const account = accounts[0] || null;
  if (!account) return null;

  // 如果 hierarchyValues 为空，尝试从 path 字段解析
  if (!account.hierarchyValues || account.hierarchyValues === '[]') {
    if (account.path && account.path !== '') {
      account.hierarchyValues = this.parsePathToHierarchyValues(account.path);
    }
  }

  return account;
}

/**
 * 从 path 字符串解析出 hierarchyValues
 */
private parsePathToHierarchyValues(path: string): string {
  const segments = path.split('/').filter(s => s !== '');

  while (segments.length < 7) {
    segments.push('-');
  }

  const hierarchyValues = [
    {
      levelId: 4,
      level: 1,
      name: '工厂',
      mappingType: 'ORG',
      mappingValue: '02',
      selectedValue: this.parsePathSegment(segments[0]),
    },
    {
      levelId: 5,
      level: 2,
      name: '车间',
      mappingType: 'ORG',
      mappingValue: '03',
      selectedValue: this.parsePathSegment(segments[1]),
    },
    {
      levelId: 6,
      level: 3,
      name: '产线',
      mappingType: 'ORG',
      mappingValue: '04',
      selectedValue: this.parsePathSegment(segments[2]),
    },
    {
      levelId: 7,
      level: 4,
      name: '产品',
      mappingType: 'FIELD_A01',
      mappingValue: null,
      selectedValue: this.parsePathSegment(segments[3]),
    },
    {
      levelId: 8,
      level: 5,
      name: '工序',
      mappingType: 'FIELD_ A02',
      mappingValue: null,
      selectedValue: this.parsePathSegment(segments[4]),
    },
    {
      levelId: 9,
      level: 6,
      name: '员工类型',
      mappingType: 'FIELD_employeeType',
      mappingValue: null,
      selectedValue: this.parsePathSegment(segments[5]),
    },
    {
      levelId: 10,
      level: 7,
      name: '岗位',
      mappingType: 'FIELD_jobPost',
      mappingValue: null,
      selectedValue: this.parsePathSegment(segments[6]),
    },
  ];

  return JSON.stringify(hierarchyValues);
}

/**
 * 解析 path 中的单个层级段
 */
private parsePathSegment(segment: string): any {
  if (!segment || segment === '-') {
    return { name: '-', isEmpty: true };
  }
  return { name: segment, isEmpty: false };
}

/**
 * 合并两个劳动力账户（优先级：punchAccount > mainAccount）
 */
private mergeAccounts(punchAccount: any, mainAccount: any): any {
  if (!punchAccount && !mainAccount) return null;
  if (!mainAccount) return punchAccount;
  if (!punchAccount) return mainAccount;

  // 解析层级值
  const punchValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];
  const mainValues = mainAccount.hierarchyValues ? JSON.parse(mainAccount.hierarchyValues) : [];

  // 创建合并后的层级值映射表
  const mergedValuesMap = new Map<number, any>();

  // 首先添加主账户的所有层级值（作为基础）
  mainValues.forEach((v: any) => {
    mergedValuesMap.set(v.level, v);
  });

  // 然后用刷卡账户的层级值覆盖（只覆盖有值的层级）
  punchValues.forEach((v: any) => {
    if (v.selectedValue) {
      mergedValuesMap.set(v.level, v);
    }
  });

  // 转换回数组并排序
  const mergedValues = Array.from(mergedValuesMap.values()).sort((a, b) => a.level - b.level);

  // 计算合并后的层级数
  const maxLevel = Math.max(
    punchValues.length > 0 ? punchValues[punchValues.length - 1].level : 0,
    mainValues.length > 0 ? mainValues[mainValues.length - 1].level : 0
  );

  // 构建namePath和path
  const namePath = this.buildNamePath(mergedValues);
  const path = this.buildPath(mergedValues);

  return {
    id: punchAccount.id,
    namePath: namePath,
    path: path,
    level: maxLevel,
    hierarchyValues: JSON.stringify(mergedValues),
  };
}

/**
 * 根据层级值构建namePath
 */
private buildNamePath(hierarchyValues: any[]): string {
  return hierarchyValues
    .map(v => {
      if (!v.selectedValue) return '-';
      if (v.selectedValueLabel) return v.selectedValueLabel;
      if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
        return v.selectedValue.name || '-';
      }
      return String(v.selectedValue);
    })
    .join('/');
}

/**
 * 根据层级值构建path（只使用code）
 */
private buildPath(hierarchyValues: any[]): string {
  return hierarchyValues
    .map(v => {
      if (!v.selectedValue) return '-';
      if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
        return v.selectedValue.code || '-';
      }
      return String(v.selectedValue);
    })
    .join('/');
}

/**
 * 合并相同账户且时间相邻的工时结果
 */
private mergeAdjacentWorkHours(workHourResults: any[]): any[] {
  if (!workHourResults || workHourResults.length === 0) {
    return [];
  }

  // 按开始时间排序
  const sortedResults = [...workHourResults].sort((a, b) =>
    new Date(a.punchInTime).getTime() - new Date(b.punchInTime).getTime()
  );

  const mergedResults: any[] = [];
  let currentGroup = [sortedResults[0]];

  for (let i = 1; i < sortedResults.length; i++) {
    const current = sortedResults[i];
    const previous = currentGroup[currentGroup.length - 1];

    const currentTime = new Date(current.punchInTime).getTime();
    const previousEndTime = new Date(previous.punchOutTime).getTime();

    // 检查是否可以合并：
    // 1. 账户相同（accountName 相同）
    // 2. 时间相邻（当前开始时间 = 前一个结束时间）
    const sameAccount = previous.accountName === current.accountName;
    const adjacentTime = currentTime === previousEndTime;

    if (sameAccount && adjacentTime) {
      currentGroup.push(current);
    } else {
      if (currentGroup.length > 0) {
        mergedResults.push(this.mergeWorkHourGroup(currentGroup));
      }
      currentGroup = [current];
    }
  }

  // 处理最后一组
  if (currentGroup.length > 0) {
    mergedResults.push(this.mergeWorkHourGroup(currentGroup));
  }

  return mergedResults;
}

/**
 * 将一组工时结果合并为一条
 */
private mergeWorkHourGroup(group: any[]): any {
  if (group.length === 0) return null;
  if (group.length === 1) return group[0];

  const first = group[0];
  const last = group[group.length - 1];

  // 合并工时
  const totalActualHours = group.reduce((sum, item) => sum + (item.actualHours || 0), 0);
  const totalStandardHours = group.reduce((sum, item) => sum + (item.standardHours || 0), 0);

  return {
    ...first,
    punchInTime: first.punchInTime,
    punchOutTime: last.punchOutTime,
    actualHours: Math.round(totalActualHours * 100) / 100,
    standardHours: Math.round(totalStandardHours * 100) / 100,
  };
}

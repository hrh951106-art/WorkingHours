import { Injectable } from '@nestjs/common';

/**
 * 摆卡间隔过滤服务
 * 用于处理重复刷卡数据的过滤，基于摆卡间隔配置进行筛选
 *
 * 支持两种模式：
 * 1. 简单模式：统一的摆卡间隔（所有记录使用相同间隔）
 * 2. 设备组模式：根据设备组ID使用不同的摆卡间隔
 */
@Injectable()
export class PunchIntervalFilterService {
  /**
   * 应用摆卡间隔过滤（简单模式 - 统一间隔）
   * @param punchRecords 打卡记录数组（已按时间排序）
   * @param filterIntervalMins 摆卡间隔（分钟），0表示不启用过滤
   * @returns 过滤后的打卡记录
   */
  applyIntervalFilter(punchRecords: any[], filterIntervalMins: number): any[] {
    // 如果间隔为0或记录为空，不过滤
    if (filterIntervalMins <= 0 || punchRecords.length === 0) {
      return punchRecords;
    }

    // 按劳动力账户分组
    const accountGroups = this.groupByAccount(punchRecords);

    // 对每个账户组分别进行过滤
    const filteredRecords: any[] = [];
    for (const [accountId, records] of accountGroups.entries()) {
      const groupFiltered = this.filterAccountGroup(records, filterIntervalMins);
      filteredRecords.push(...groupFiltered);
    }

    // 保持时间排序
    return filteredRecords.sort(
      (a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime(),
    );
  }

  /**
   * 应用摆卡间隔过滤（设备组模式 - 根据设备组ID使用不同间隔）
   * @param punchRecords 打卡记录数组（已按时间排序）
   * @param deviceGroupIntervals 设备组间隔配置 Map<deviceGroupId, intervalMinutes>
   * @returns 过滤后的打卡记录
   */
  applyIntervalFilterByDeviceGroup(
    punchRecords: any[],
    deviceGroupIntervals: Map<number, number>,
  ): any[] {
    if (punchRecords.length === 0) {
      return punchRecords;
    }

    // 如果没有配置任何设备组间隔，不过滤
    if (deviceGroupIntervals.size === 0) {
      return punchRecords;
    }

    // 按劳动力账户分组
    const accountGroups = this.groupByAccount(punchRecords);

    // 对每个账户组分别进行过滤
    const filteredRecords: any[] = [];
    for (const [accountId, records] of accountGroups.entries()) {
      const groupFiltered = this.filterAccountGroupByDeviceGroup(records, deviceGroupIntervals);
      filteredRecords.push(...groupFiltered);
    }

    // 保持时间排序
    return filteredRecords.sort(
      (a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime(),
    );
  }

  /**
   * 按劳动力账户分组
   * @param punchRecords 打卡记录数组
   * @returns Map<accountId, records[]>
   */
  private groupByAccount(punchRecords: any[]): Map<number | null, any[]> {
    const groups = new Map<number | null, any[]>();

    for (const record of punchRecords) {
      const accountId = record.accountId ?? null;
      if (!groups.has(accountId)) {
        groups.set(accountId, []);
      }
      groups.get(accountId)!.push(record);
    }

    return groups;
  }

  /**
   * 对单个账户组应用摆卡间隔过滤（简单模式）
   * 使用动态参考点算法
   * @param records 打卡记录数组（已按时间排序）
   * @param filterIntervalMins 摆卡间隔（分钟）
   * @returns 过滤后的打卡记录
   */
  private filterAccountGroup(records: any[], filterIntervalMins: number): any[] {
    if (records.length === 0) {
      return records;
    }

    const filtered: any[] = [];
    let referenceRecord: any = null;

    for (const currentRecord of records) {
      // 前置条件：强制补卡不受间隔影响
      if (this.isForcedPunch(currentRecord)) {
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        continue;
      }

      // 第一张卡直接保留
      if (referenceRecord === null) {
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        continue;
      }

      // 判断是否需要比较
      const shouldCompare = this.shouldCompareRecords(referenceRecord, currentRecord);

      if (!shouldCompare) {
        // 不需要比较，直接保留
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        continue;
      }

      // 需要比较，检查时间间隔
      const timeDiff = this.getTimeDifferenceMinutes(referenceRecord, currentRecord);

      if (timeDiff >= filterIntervalMins) {
        // 间隔大于等于摆卡间隔，保留当前卡，更新参考点
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
      }
      // 间隔小于摆卡间隔，丢弃当前卡（不更新参考点）
    }

    return filtered;
  }

  /**
   * 对单个账户组应用摆卡间隔过滤（设备组模式）
   * 根据设备组ID使用不同的摆卡间隔
   * @param records 打卡记录数组（已按时间排序）
   * @param deviceGroupIntervals 设备组间隔配置 Map<deviceGroupId, intervalMinutes>
   * @returns 过滤后的打卡记录
   */
  private filterAccountGroupByDeviceGroup(
    records: any[],
    deviceGroupIntervals: Map<number, number>,
  ): any[] {
    if (records.length === 0) {
      return records;
    }

    const filtered: any[] = [];
    let referenceRecord: any = null;
    let currentInterval = 0;

    for (const currentRecord of records) {
      // 前置条件：强制补卡不受间隔影响
      if (this.isForcedPunch(currentRecord)) {
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        // 获取当前设备的摆卡间隔
        currentInterval = this.getIntervalForDevice(currentRecord, deviceGroupIntervals);
        continue;
      }

      // 第一张卡直接保留
      if (referenceRecord === null) {
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        // 获取当前设备的摆卡间隔
        currentInterval = this.getIntervalForDevice(currentRecord, deviceGroupIntervals);
        continue;
      }

      // 获取当前设备的摆卡间隔
      const newInterval = this.getIntervalForDevice(currentRecord, deviceGroupIntervals);

      // 判断是否需要比较
      const shouldCompare = this.shouldCompareRecords(referenceRecord, currentRecord);

      if (!shouldCompare) {
        // 不需要比较，直接保留
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        currentInterval = newInterval;
        continue;
      }

      // 使用较大的间隔作为比较标准（确保不会误过滤）
      const effectiveInterval = Math.max(currentInterval, newInterval);

      // 如果有效间隔为0，不过滤
      if (effectiveInterval === 0) {
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        currentInterval = newInterval;
        continue;
      }

      // 需要比较，检查时间间隔
      const timeDiff = this.getTimeDifferenceMinutes(referenceRecord, currentRecord);

      if (timeDiff >= effectiveInterval) {
        // 间隔大于等于摆卡间隔，保留当前卡，更新参考点
        filtered.push(currentRecord);
        referenceRecord = currentRecord;
        currentInterval = newInterval;
      }
      // 间隔小于摆卡间隔，丢弃当前卡（不更新参考点）
    }

    return filtered;
  }

  /**
   * 获取打卡记录对应的设备组的摆卡间隔
   * @param record 打卡记录
   * @param deviceGroupIntervals 设备组间隔配置
   * @returns 摆卡间隔（分钟），如果没有配置则返回0
   */
  private getIntervalForDevice(
    record: any,
    deviceGroupIntervals: Map<number, number>,
  ): number {
    const deviceGroupId = record.device?.groupId;
    if (deviceGroupId && deviceGroupIntervals.has(deviceGroupId)) {
      return deviceGroupIntervals.get(deviceGroupId)!;
    }
    return 0;
  }

  /**
   * 判断是否为强制补卡
   * @param record 打卡记录
   * @returns 是否为强制补卡
   */
  private isForcedPunch(record: any): boolean {
    return record.source === 'MANUAL_SUPPLEMENT';
  }

  /**
   * 判断两条记录是否需要比较（基于进出标记）
   *
   * 比较规则：
   * - 进 + 进 → 需要比较 ✅
   * - 出 + 出 → 需要比较 ✅
   * - 进 + 出 → 不需要比较 ❌
   * - 有标记 + 无标记 → 不需要比较 ❌
   * - 无标记 + 无标记 → 需要比较 ✅
   *
   * @param record1 参考记录
   * @param record2 当前记录
   * @returns 是否需要比较
   */
  private shouldCompareRecords(record1: any, record2: any): boolean {
    const type1 = this.normalizePunchType(record1.punchType);
    const type2 = this.normalizePunchType(record2.punchType);

    // 有标记 + 无标记 → 不比较
    if (type1 === 'UNKNOWN' || type2 === 'UNKNOWN') {
      return false;
    }

    // 进 + 出 → 不比较
    if (
      (type1 === 'IN' && type2 === 'OUT') ||
      (type1 === 'OUT' && type2 === 'IN')
    ) {
      return false;
    }

    // 进 + 进 或 出 + 出 或 无标记 + 无标记 → 需要比较
    return true;
  }

  /**
   * 标准化进出标记类型
   * @param punchType 原始punchType值
   * @returns 标准化后的类型
   */
  private normalizePunchType(punchType: string | null | undefined): string {
    if (!punchType || punchType.trim() === '') {
      return 'UNKNOWN';
    }

    const type = punchType.toUpperCase().trim();
    if (type === 'IN' || type === '签入' || type === '进') {
      return 'IN';
    }
    if (type === 'OUT' || type === '签出' || type === '出') {
      return 'OUT';
    }

    return 'UNKNOWN';
  }

  /**
   * 计算两条记录的时间差（分钟）
   * @param record1 记录1
   * @param record2 记录2
   * @returns 时间差（分钟）
   */
  private getTimeDifferenceMinutes(record1: any, record2: any): number {
    const time1 = new Date(record1.punchTime).getTime();
    const time2 = new Date(record2.punchTime).getTime();
    return Math.abs(time2 - time1) / (1000 * 60);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * 成对收卡结果接口
 */
export interface PairingResult {
  inPunch: any;
  outPunch: any;
  accountId: number | null;
  pairingReason: string;
  priority: number;
}

/**
 * 成对收卡服务
 * 基于优先级的成对收卡逻辑
 *
 * 优先级：
 * 1. 子劳动力账户 + 进出标记 都相同
 * 2. 子劳动力账户 相同
 * 3. 进出标记 相同
 * 4. 无标记（第一笔视为进）
 *
 * 4种标准情况：
 * 1. 有子劳动力账户 + 有进出标记 → 人员 + 标记 + 账户 → 带账户
 * 2. 无子劳动力账户 + 有进出标记 → 人员 + 标记 → 不带账户
 * 3. 有子劳动力账户 + 无进出标记 → 人员 + 账户 → 带账户
 * 4. 无子劳动力账户 + 无进出标记 → 人员（相邻） → 不带账户
 */
@Injectable()
export class PunchPairingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 基于优先级的成对收卡
   * @param inPunches 签入打卡记录数组
   * @param outPunches 签退打卡记录数组
   * @param pairingInterval 摆卡间隔（分钟）
   * @returns 成对结果数组
   */
  pairPunchesByPriority(
    inPunches: any[],
    outPunches: any[],
    pairingInterval: number = 0,
  ): PairingResult[] {
    const results: PairingResult[] = [];
    const usedInPunches = new Set<number>();
    const usedOutPunches = new Set<number>();

    // 按时间排序
    inPunches.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    outPunches.sort((a, b) => new Date(b.punchTime).getTime() - new Date(a.punchTime).getTime());

    // 优先级1：子劳动力账户 + 进出标记 都相同
    const priority1Pairs = this.pairByAccountAndType(inPunches, outPunches, pairingInterval);
    for (const pair of priority1Pairs) {
      results.push(pair);
      usedInPunches.add(pair.inPunch.id);
      usedOutPunches.add(pair.outPunch.id);
    }

    // 过滤已使用的打卡记录
    const remainingInPunches = inPunches.filter(p => !usedInPunches.has(p.id));
    const remainingOutPunches = outPunches.filter(p => !usedOutPunches.has(p.id));

    // 优先级2：子劳动力账户 相同
    const priority2Pairs = this.pairByAccount(remainingInPunches, remainingOutPunches, pairingInterval);
    for (const pair of priority2Pairs) {
      results.push(pair);
      usedInPunches.add(pair.inPunch.id);
      usedOutPunches.add(pair.outPunch.id);
    }

    // 过滤已使用的打卡记录
    const remainingInPunches2 = inPunches.filter(p => !usedInPunches.has(p.id));
    const remainingOutPunches2 = outPunches.filter(p => !usedOutPunches.has(p.id));

    // 优先级3：进出标记 相同
    const priority3Pairs = this.pairByType(remainingInPunches2, remainingOutPunches2, pairingInterval);
    for (const pair of priority3Pairs) {
      results.push(pair);
      usedInPunches.add(pair.inPunch.id);
      usedOutPunches.add(pair.outPunch.id);
    }

    // 过滤已使用的打卡记录
    const remainingInPunches3 = inPunches.filter(p => !usedInPunches.has(p.id));
    const remainingOutPunches3 = outPunches.filter(p => !usedOutPunches.has(p.id));

    // 优先级4：无标记（相邻配对）
    const priority4Pairs = this.pairAdjacent(remainingInPunches3, remainingOutPunches3, pairingInterval);
    for (const pair of priority4Pairs) {
      results.push(pair);
      usedInPunches.add(pair.inPunch.id);
      usedOutPunches.add(pair.outPunch.id);
    }

    return results;
  }

  /**
   * 优先级1：子劳动力账户 + 进出标记 都相同
   * 适用情况1：有子劳动力账户 + 有进出标记
   */
  private pairByAccountAndType(
    inPunches: any[],
    outPunches: any[],
    pairingInterval: number,
  ): PairingResult[] {
    const results: PairingResult[] = [];
    const usedPunches = new Set<number>();

    // 按账户分组（不按type分组，这样同一账户的IN和OUT会在一起）
    const accountGroups = this.groupByAccount(inPunches, outPunches);

    for (const [accountId, group] of accountGroups.entries()) {
      const { in: groupInPunches, out: groupOutPunches } = group;

      // 将IN和OUT打卡合并，按时间排序
      const allPunches = [
        ...groupInPunches.map(p => ({ ...p, type: 'IN' })),
        ...groupOutPunches.map(p => ({ ...p, type: 'OUT' }))
      ].sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());

      // 按时间顺序相邻成对：只配对相邻的 IN 和 OUT
      for (let i = 0; i < allPunches.length - 1; i++) {
        const current = allPunches[i];
        const next = allPunches[i + 1];

        // 跳过已使用的打卡
        if (usedPunches.has(current.id) || usedPunches.has(next.id)) {
          continue;
        }

        // 只配对相邻的 IN 和 OUT
        if (current.type === 'IN' && next.type === 'OUT') {
          const inTime = new Date(current.punchTime);
          const outTime = new Date(next.punchTime);

          // 检查时间间隔
          let isValidPair = true;
          if (pairingInterval > 0) {
            const earliestOutTime = new Date(inTime.getTime() + pairingInterval * 60 * 1000);
            if (outTime < earliestOutTime) {
              isValidPair = false;
            }
          }

          if (isValidPair) {
            results.push({
              inPunch: current,
              outPunch: next,
              accountId: accountId === 'null' ? null : parseInt(String(accountId)),
              pairingReason: '优先级1：账户+标记相同，相邻成对',
              priority: 1,
            });
            usedPunches.add(current.id);
            usedPunches.add(next.id);
          }
        }
      }
    }

    return results;
  }

  /**
   * 优先级2：子劳动力账户 相同
   * 适用情况3：有子劳动力账户 + 无进出标记
   */
  private pairByAccount(
    inPunches: any[],
    outPunches: any[],
    pairingInterval: number,
  ): PairingResult[] {
    const results: PairingResult[] = [];
    const usedOutPunches = new Set<number>();

    // 按账户分组（不考虑进出标记）
    const accountGroups = this.groupByAccount(inPunches, outPunches);

    for (const [accountId, group] of accountGroups.entries()) {
      const { in: groupInPunches, out: groupOutPunches } = group;

      // 在该账户组内进行配对
      for (const inPunch of groupInPunches) {
        const inTime = new Date(inPunch.punchTime);
        let matchedOutPunch = null;

        // 查找匹配的签退记录
        for (const outPunch of groupOutPunches) {
          if (usedOutPunches.has(outPunch.id)) {
            continue;
          }

          const outTime = new Date(outPunch.punchTime);

          // 检查时间间隔
          if (pairingInterval > 0) {
            const earliestOutTime = new Date(inTime.getTime() + pairingInterval * 60 * 1000);
            if (outTime >= earliestOutTime) {
              matchedOutPunch = outPunch;
              break;
            }
          } else {
            // 无间隔要求，使用最早的签退
            if (outTime > inTime) {
              matchedOutPunch = outPunch;
              break;
            }
          }
        }

        if (matchedOutPunch) {
          results.push({
            inPunch,
            outPunch: matchedOutPunch,
            accountId: accountId === 'null' ? null : parseInt(String(accountId)),
            pairingReason: '优先级2：账户相同',
            priority: 2,
          });
          usedOutPunches.add(matchedOutPunch.id);
        }
      }
    }

    return results;
  }

  /**
   * 优先级3：进出标记 相同
   * 适用情况2：无子劳动力账户 + 有进出标记
   */
  private pairByType(
    inPunches: any[],
    outPunches: any[],
    pairingInterval: number,
  ): PairingResult[] {
    const results: PairingResult[] = [];
    const usedOutPunches = new Set<number>();

    // 所有打卡记录都没有账户ID，按进出标记配对
    for (const inPunch of inPunches) {
      const inTime = new Date(inPunch.punchTime);
      let matchedOutPunch = null;

      for (const outPunch of outPunches) {
        if (usedOutPunches.has(outPunch.id)) {
          continue;
        }

        const outTime = new Date(outPunch.punchTime);

        // 检查时间间隔
        if (pairingInterval > 0) {
          const earliestOutTime = new Date(inTime.getTime() + pairingInterval * 60 * 1000);
          if (outTime >= earliestOutTime) {
            matchedOutPunch = outPunch;
            break;
          }
        } else {
          // 无间隔要求，使用最早的签退
          if (outTime > inTime) {
            matchedOutPunch = outPunch;
            break;
          }
        }
      }

      if (matchedOutPunch) {
        results.push({
          inPunch,
          outPunch: matchedOutPunch,
          accountId: null,
          pairingReason: '优先级3：标记相同',
          priority: 3,
        });
        usedOutPunches.add(matchedOutPunch.id);
      }
    }

    return results;
  }

  /**
   * 优先级4：无标记（相邻配对）
   * 适用情况4：无子劳动力账户 + 无进出标记
   */
  private pairAdjacent(
    inPunches: any[],
    outPunches: any[],
    pairingInterval: number,
  ): PairingResult[] {
    const results: PairingResult[] = [];
    const usedOutPunches = new Set<number>();

    // 合并所有打卡记录并按时间排序
    const allPunches = [...inPunches, ...outPunches].sort(
      (a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime()
    );

    // 第一笔视为进，第二笔视为出，依此类推
    for (let i = 0; i < allPunches.length - 1; i += 2) {
      const inPunch = allPunches[i];
      const outPunch = allPunches[i + 1];

      if (!outPunch) {
        // 奇数个打卡，最后一笔单独处理
        results.push({
          inPunch: inPunch,
          outPunch: null,
          accountId: null,
          pairingReason: '优先级4：相邻配对（单卡）',
          priority: 4,
        });
        continue;
      }

      const inTime = new Date(inPunch.punchTime);
      const outTime = new Date(outPunch.punchTime);

      // 检查时间间隔（如果配置了）
      if (pairingInterval > 0) {
        const timeDiff = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
        if (timeDiff < pairingInterval) {
          // 间隔不足，跳过这对
          continue;
        }
      }

      results.push({
        inPunch: inPunch,
        outPunch: outPunch,
        accountId: null,
        pairingReason: '优先级4：相邻配对',
        priority: 4,
      });
    }

    return results;
  }

  /**
   * 按账户和进出标记分组
   */
  private groupByAccountAndType(
    inPunches: any[],
    outPunches: any[],
  ): Map<string, { in: any[]; out: any[] }> {
    const groups = new Map<string, { in: any[]; out: any[] }>();

    // 分组签入记录
    for (const punch of inPunches) {
      // 优先使用accountId，如果为null则使用deviceId
      const accountKey = punch.accountId ?? punch.deviceId ?? 'null';
      const punchType = punch.punchType ?? 'UNKNOWN';
      const key = `${accountKey}|${punchType}`;

      if (!groups.has(key)) {
        groups.set(key, { in: [], out: [] });
      }
      groups.get(key)!.in.push(punch);
    }

    // 分组签退记录
    for (const punch of outPunches) {
      // 优先使用accountId，如果为null则使用deviceId
      const accountKey = punch.accountId ?? punch.deviceId ?? 'null';
      const punchType = punch.punchType ?? 'UNKNOWN';
      const key = `${accountKey}|${punchType}`;

      if (!groups.has(key)) {
        groups.set(key, { in: [], out: [] });
      }
      groups.get(key)!.out.push(punch);
    }

    return groups;
  }

  /**
   * 按账户分组
   */
  private groupByAccount(
    inPunches: any[],
    outPunches: any[],
  ): Map<number | string, { in: any[]; out: any[] }> {
    const groups = new Map<number | string, { in: any[]; out: any[] }>();

    // 分组签入记录
    for (const punch of inPunches) {
      // 优先使用accountId，如果为null则使用deviceId
      const accountKey = punch.accountId ?? punch.deviceId ?? 'null';
      if (!groups.has(accountKey)) {
        groups.set(accountKey, { in: [], out: [] });
      }
      groups.get(accountKey)!.in.push(punch);
    }

    // 分组签退记录
    for (const punch of outPunches) {
      // 优先使用accountId，如果为null则使用deviceId
      const accountKey = punch.accountId ?? punch.deviceId ?? 'null';
      if (!groups.has(accountKey)) {
        groups.set(accountKey, { in: [], out: [] });
      }
      groups.get(accountKey)!.out.push(punch);
    }

    return groups;
  }

  /**
   * 处理未配对的打卡记录（单卡）
   */
  handleUnpairedPunches(
    inPunches: any[],
    outPunches: any[],
    pairedResults: PairingResult[],
  ): { inPunch: any; outPunch: any; accountId: number | null; pairingReason: string; priority: number }[] {
    const unpaired: any[] = [];
    const pairedInIds = new Set(pairedResults.map(r => r.inPunch?.id).filter(id => id != null));
    const pairedOutIds = new Set(pairedResults.map(r => r.outPunch?.id).filter(id => id != null));

    // 未配对的签入
    for (const inPunch of inPunches) {
      if (!pairedInIds.has(inPunch.id)) {
        unpaired.push({
          inPunch: inPunch,
          outPunch: null,
          accountId: inPunch.accountId ?? null,
          pairingReason: '单卡（只有签入）',
          priority: 5,
        });
      }
    }

    // 未配对的签退
    for (const outPunch of outPunches) {
      if (!pairedOutIds.has(outPunch.id)) {
        unpaired.push({
          inPunch: null,
          outPunch: outPunch,
          accountId: outPunch.accountId ?? null,
          pairingReason: '单卡（只有签退）',
          priority: 5,
        });
      }
    }

    return unpaired;
  }
}

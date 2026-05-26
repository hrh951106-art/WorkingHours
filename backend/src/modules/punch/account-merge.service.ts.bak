import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * 账户合并服务
 * 负责合并刷卡记录的子劳动力账户和设备绑定的子劳动力账户
 */
@Injectable()
export class AccountMergeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 合并刷卡账户和设备绑定账户
   * @param punchAccountPath 刷卡记录的账户路径（如："///A01/A02"）
   * @param deviceId 设备ID
   * @param punchTime 打卡时间
   * @returns 合并后的账户路径
   */
  async mergeAccounts(punchAccountPath: string | null, deviceId: number, punchTime: Date): Promise<string> {
    // 如果刷卡记录没有账户，只使用设备绑定账户
    if (!punchAccountPath || punchAccountPath.trim() === '') {
      const deviceAccountPath = await this.getDeviceAccountPath(deviceId, punchTime);
      return deviceAccountPath || '';
    }

    // 获取设备绑定的账户路径
    const deviceAccountPath = await this.getDeviceAccountPath(deviceId, punchTime);

    // 如果设备没有绑定账户，直接使用刷卡账户
    if (!deviceAccountPath || deviceAccountPath.trim() === '') {
      return punchAccountPath;
    }

    // 解析两个路径为数组
    const punchPath = this.parsePath(punchAccountPath);
    const devicePath = this.parsePath(deviceAccountPath);

    // 合并路径
    const mergedPath = this.mergePaths(punchPath, devicePath);

    // 转回字符串格式
    return this.pathToString(mergedPath);
  }

  /**
   * 获取设备在指定时间绑定的账户路径
   */
  private async getDeviceAccountPath(deviceId: number, punchTime: Date): Promise<string | null> {
    const binding = await this.prisma.deviceAccount.findFirst({
      where: {
        deviceId,
        effectiveDate: {
          lte: punchTime,
        },
        OR: [
          {
            expiryDate: null,
          },
          {
            expiryDate: {
              gte: punchTime,
            },
          },
        ],
      },
      include: {
        account: true,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!binding) {
      return null;
    }

    // 获取账户的完整路径
    const account = await this.prisma.laborAccount.findUnique({
      where: { id: binding.accountId },
      select: {
        namePath: true,
      },
    });

    return account?.namePath || null;
  }

  /**
   * 将路径字符串解析为数组
   * 例如："///A01/A02" => [null, null, null, "A01", "A02"]
   * 例如："A01/A02//A02/A03" => ["A01", "A02", null, "A02", "A03"]
   */
  private parsePath(pathString: string): (string | null)[] {
    if (!pathString || pathString.trim() === '') {
      return [];
    }

    // 按斜杠分割，空字符串表示该层级为空
    return pathString.split('/').map((part) => (part === '' ? null : part));
  }

  /**
   * 合并两个路径
   * 规则：相同层级刷卡数据优先，不同层级进行合并
   */
  private mergePaths(
    punchPath: (string | null)[],
    devicePath: (string | null)[]
  ): (string | null)[] {
    // 确定最大长度
    const maxLength = Math.max(punchPath.length, devicePath.length);
    const merged: (string | null)[] = [];

    for (let i = 0; i < maxLength; i++) {
      const punchValue = punchPath[i] ?? null;
      const deviceValue = devicePath[i] ?? null;

      if (punchValue !== null) {
        // 刷卡数据有值，优先使用刷卡数据
        merged.push(punchValue);
      } else if (deviceValue !== null) {
        // 刷卡数据为空，但设备绑定有值，使用设备的值
        merged.push(deviceValue);
      } else {
        // 两者都为空
        merged.push(null);
      }
    }

    return merged;
  }

  /**
   * 将路径数组转换为字符串
   * 例如：["A01", "A02", null, "A01", "A02"] => "A01/A02//A01/A02"
   */
  private pathToString(path: (string | null)[]): string {
    return path.map((part) => (part === null ? '' : part)).join('/');
  }

  /**
   * 批量合并打卡记录的账户
   * @param punchRecords 打卡记录列表
   * @returns 更新后的打卡记录（包含合并后的账户路径）
   */
  async batchMergeAccounts(punchRecords: Array<{ id: number; deviceId: number; punchTime: Date; accountId?: number | null }>) {
    const results = [];

    for (const record of punchRecords) {
      // 获取刷卡账户的路径
      let punchAccountPath = null;
      if (record.accountId) {
        const account = await this.prisma.laborAccount.findUnique({
          where: { id: record.accountId },
          select: { namePath: true },
        });
        punchAccountPath = account?.namePath || null;
      }

      // 合并账户
      const mergedPath = await this.mergeAccounts(punchAccountPath, record.deviceId, record.punchTime);

      // 查找或创建合并后的账户
      let mergedAccountId = null;
      if (mergedPath && mergedPath.trim() !== '') {
        const mergedAccount = await this.findOrCreateAccountByPath(mergedPath);
        mergedAccountId = mergedAccount.id;
      }

      results.push({
        id: record.id,
        mergedAccountId,
        mergedAccountPath: mergedPath,
      });
    }

    return results;
  }

  /**
   * 根据路径查找或创建账户
   */
  private async findOrCreateAccountByPath(path: string): Promise<any> {
    // 先尝试查找已存在的账户
    const existing = await this.prisma.laborAccount.findFirst({
      where: {
        namePath: path,
      },
    });

    if (existing) {
      return existing;
    }

    // 如果不存在，创建新账户
    // 这里简化处理，实际应该根据路径创建完整的账户层级
    return this.prisma.laborAccount.create({
      data: {
        code: `AUTO_${Date.now()}`,
        name: path.split('/').filter(Boolean).pop() || 'Auto',
        type: 'SUB',
        usageType: 'PUNCH',
        level: path.split('/').filter(Boolean).length,
        path: path, // 添加path字段
        namePath: path,
        effectiveDate: new Date(),
        status: 'ACTIVE',
      },
    });
  }
}

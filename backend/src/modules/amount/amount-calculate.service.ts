import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AmountCalculateService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据员工编号计算单个账户的金额
   *
   * 计算公式：
   * - 如果没有匹配到金额规则：金额 = 人员系数 × 工时数
   * - 如果匹配到金额规则（MULTIPLY）：金额 = 人员系数 × 倍数 × 工时数
   * - 如果匹配到金额规则（ADD）：金额 = 人员系数 × (工时数 + 固定值)
   * - 如果匹配到金额规则（CUSTOM）：金额 = 固定值 × 工时数
   */
  async calculateAmountByNo(params: {
    employeeNo: string;
    workHours: number;
    attendanceCode: string;
    accountPath: string;
    calcDate: Date;
  }): Promise<number> {
    const { employeeNo, workHours, attendanceCode, accountPath, calcDate } = params;

    // 1. 获取员工系数
    const coefficientRecord = await this.prisma.employeeCoefficient.findFirst({
      where: {
        employeeNo,
        effectiveDate: { lte: calcDate },
        OR: [{ expiryDate: null }, { expiryDate: { gte: calcDate } }],
        status: 'ACTIVE',
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!coefficientRecord) {
      return 0;
    }

    const baseCoefficient = coefficientRecord.coefficient;

    // 2. 检查出勤代码是否启用金额计算
    const attendanceCodeConfig = await this.prisma.calculationAttendanceCode.findUnique({
      where: { code: attendanceCode },
    });

    if (!attendanceCodeConfig || !attendanceCodeConfig.calculateHours) {
      return 0;
    }

    // 3. 尝试匹配金额政策
    const policy = await this.matchPolicy(accountPath, attendanceCode, calcDate);

    let finalAmount = 0;

    if (!policy) {
      // 没有匹配到金额规则，只使用人员系数
      finalAmount = workHours * baseCoefficient;
    } else {
      // 匹配到金额规则，结合人员系数和金额规则系数
      switch (policy.policyType) {
        case 'ADD':
          finalAmount = workHours * (baseCoefficient + (policy.fixedValue || 0));
          break;

        case 'MULTIPLY':
          const multiplier = policy.multiplier || 1;
          finalAmount = workHours * baseCoefficient * multiplier;
          break;

        case 'CUSTOM':
          finalAmount = workHours * (policy.fixedValue || 0);
          break;

        default:
          finalAmount = workHours * baseCoefficient;
      }
    }

    return Math.round(finalAmount * 100) / 100;
  }

  /**
   * 计算多个账户的总金额
   *
   * 分别计算每个账户的金额并累加
   */
  async calculateAmountForAccountByNo(params: {
    employeeNo: string;
    attendanceCode: string;
    accountHours: Array<{
      accountId: number;
      accountName: string;
      hours: number;
    }>;
    calcDate: Date;
  }): Promise<number> {
    const { employeeNo, attendanceCode, accountHours, calcDate } = params;

    let totalAmount = 0;

    for (const accountHour of accountHours) {
      const accountAmount = await this.calculateAmountByNo({
        employeeNo,
        workHours: accountHour.hours,
        attendanceCode,
        accountPath: accountHour.accountName,
        calcDate,
      });

      totalAmount += accountAmount;
    }

    return Math.round(totalAmount * 100) / 100;
  }

  /**
   * 匹配金额政策
   *
   * 匹配规则：
   * 1. 出勤代码在政策的 attendanceCodes 列表中
   * 2. 账户路径匹配政策的 accountPath（支持 EXACT 精确匹配和 PREFIX 前缀匹配）
   * 3. 政策在生效日期内且状态为 ACTIVE
   * 4. 按优先级排序，返回匹配度最高的政策
   */
  private async matchPolicy(
    accountPath: string,
    attendanceCode: string,
    calcDate: Date,
  ): Promise<any | null> {
    // 获取所有激活的金额政策
    const policies = await this.prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { priority: 'desc' },
    });

    // 遍历政策，找到第一个匹配的
    for (const policy of policies) {
      // 检查出勤代码是否匹配
      let policyAttendanceCodes: string[] = [];
      try {
        policyAttendanceCodes = JSON.parse(policy.attendanceCodes || '[]');
      } catch (e) {
        policyAttendanceCodes = [];
      }

      console.log(`[金额政策匹配] 检查政策: ${policy.name} (${policy.code})`);
      console.log(`  政策出勤代码:`, policyAttendanceCodes);
      console.log(`  实际出勤代码: ${attendanceCode}`);
      console.log(`  出勤代码匹配: ${policyAttendanceCodes.includes(attendanceCode)}`);

      if (!policyAttendanceCodes.includes(attendanceCode)) {
        console.log(`  ❌ 出勤代码不匹配，跳过`);
        continue;
      }

      // 检查账户路径是否匹配
      const isAccountMatch = this.checkAccountPathMatch(
        accountPath,
        policy.accountPath || '',
        policy.accountPathMatch || 'EXACT',
      );

      console.log(`  政策账户路径: ${policy.accountPath}`);
      console.log(`  实际账户路径: ${accountPath}`);
      console.log(`  匹配类型: ${policy.accountPathMatch || 'EXACT'}`);
      console.log(`  账户路径匹配: ${isAccountMatch}`);

      if (!isAccountMatch) {
        console.log(`  ❌ 账户路径不匹配，跳过`);
        continue;
      }

      // 找到匹配的政策
      console.log(`  ✅ 找到匹配的政策: ${policy.name}`);
      return policy;
    }

    console.log(`[金额政策匹配] ❌ 没有找到匹配的政策`);
    return null;
  }

  /**
   * 检查账户路径是否匹配
   *
   * @param actualPath 实际账户路径（如：A/B/C）
   * @param policyPath 政策配置的账户路径（如：A/B）
   * @param matchType 匹配类型（EXACT 精确匹配，PREFIX 前缀匹配）
   */
  private checkAccountPathMatch(
    actualPath: string,
    policyPath: string,
    matchType: string,
  ): boolean {
    if (!actualPath || !policyPath) {
      return false;
    }

    if (matchType === 'EXACT') {
      return actualPath === policyPath;
    } else if (matchType === 'PREFIX') {
      return actualPath.startsWith(policyPath);
    } else if (matchType === 'LEVEL') {
      // LEVEL 匹配：按层级匹配账户路径
      // 规则：
      // 1. 政策路径和实际路径都必须有相同的层级数量（按/分割后的数组长度）
      // 2. 逐层比较：
      //    - 如果政策路径的某一层为空字符串，则该层匹配任意值（通配符）
      //    - 如果政策路径的某一层有值，则实际路径的对应层必须完全相等
      //
      // 示例：
      // - 政策路径：///A01/A02 → ['','','','A01','A02']
      // - 实际路径：DH/DH01/DH0101/A01/A02 → ['DH','DH01','DH0101','A01','A02']
      // - 匹配结果：✅ 前3层为空（通配），第4层A01==A01，第5层A02==A02

      const policyLevels = policyPath.split('/');
      const actualLevels = actualPath.split('/');

      // 层级数量必须相同
      if (policyLevels.length !== actualLevels.length) {
        return false;
      }

      // 逐层比较
      for (let i = 0; i < policyLevels.length; i++) {
        const policyLevel = policyLevels[i];
        const actualLevel = actualLevels[i];

        // 如果政策层有值，则必须精确匹配
        if (policyLevel !== '' && policyLevel !== actualLevel) {
          return false;
        }

        // 如果政策层为空，则匹配任意值（通配符）
        // 继续检查下一层
      }

      return true;
    }

    return false;
  }
}

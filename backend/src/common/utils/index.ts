import { parse, format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';

// 导出分摊范围工具函数
export * from './allocation-scope.utils';

export class DateUtils {
  static formatDate(date: Date, pattern: string = 'yyyy-MM-dd'): string {
    return format(date, pattern);
  }

  static parseDate(dateStr: string, pattern: string = 'yyyy-MM-dd'): Date {
    return parse(dateStr, pattern, new Date());
  }

  static startOfDay(date: Date): Date {
    return startOfDay(date);
  }

  static endOfDay(date: Date): Date {
    return endOfDay(date);
  }

  static differenceInMinutes(dateLeft: Date, dateRight: Date): number {
    return differenceInMinutes(dateLeft, dateRight);
  }
}

export class StringUtils {
  static generateCode(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成带序号的编码
   * @param prefix 编码前缀/缩写
   * @param existingCodes 现有的编码列表
   * @returns 格式为 前缀_序号，例如 PR_001
   */
  static generateSequentialCode(prefix: string, existingCodes: string[]): string {
    // 过滤出相同前缀的编���
    const samePrefixCodes = existingCodes
      .filter(code => code?.startsWith(`${prefix}_`))
      .map(code => {
        const parts = code.split('_');
        const numStr = parts[parts.length - 1];
        const num = parseInt(numStr, 10);
        return isNaN(num) ? 0 : num;
      });

    // 找出最大序号，如果没有则从1开始
    const maxSeq = samePrefixCodes.length > 0 ? Math.max(...samePrefixCodes) : 0;
    const nextSeq = maxSeq + 1;

    // 格式化为3位数字，例如 001, 002, 003
    const seqStr = nextSeq.toString().padStart(3, '0');

    return `${prefix}_${seqStr}`;
  }
}

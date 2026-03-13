import { parse, format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';

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
}

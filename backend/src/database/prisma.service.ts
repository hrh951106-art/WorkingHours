import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    let dbUrl = configService.get<string>('DATABASE_URL');

    // 将相对路径转换为绝对路径（用于SQLite）
    if (dbUrl && dbUrl.startsWith('file:')) {
      const relativePath = dbUrl.replace('file:', '');
      const absolutePath = path.resolve(process.cwd(), relativePath);
      dbUrl = `file:${absolutePath}`;
    }

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    console.log('=== DATABASE CONNECTION INFO ===');
    console.log('DATABASE_URL from env:', this.configService.get<string>('DATABASE_URL'));
    console.log('Resolved dbUrl:', (this as any)._datasources?.db?.url || 'Not available');
    console.log('===============================');
    await this.$connect();
    console.log('Database connected');

    // 测试查询以验证数据库
    try {
      const result = await this.$queryRaw`PRAGMA database_list`;
      console.log('Database list:', result);
      const tableInfo = await this.$queryRaw`PRAGMA table_info(LaborHourReportRequest)`;
      const hasValue = (tableInfo as any[]).find((col: any) => col.name === 'value');
      console.log('Value column exists:', !!hasValue);
      if (!hasValue) {
        console.error('❌ VALUE COLUMN MISSING IN DATABASE!');
      }
    } catch (error) {
      console.error('Error checking database:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

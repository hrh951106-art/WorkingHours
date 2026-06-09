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
      log:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn']
          : ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    console.log('=== DATABASE CONNECTION INFO ===');
    console.log('DATABASE_URL from env:', this.configService.get<string>('DATABASE_URL'));
    console.log('Resolved dbUrl:', (this as any)._datasources?.db?.url || 'Not available');
    console.log('===============================');
    await this.$connect();
    console.log('Database connected');

    // 测��数据库连接
    try {
      await this.$queryRaw`SELECT 1`;
      console.log('Database connection test passed');
    } catch (error) {
      console.error('Database connection test failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

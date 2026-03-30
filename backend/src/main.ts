import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176', // 移动端H5
      process.env.FRONTEND_URL,
      process.env.MOBILE_URL,
    ].filter(Boolean),
    credentials: true,
  });

  // 验证管道
  // whitelist: false - 不过滤额外属性（人员信息模版是动态配置的，需要接收所有字段）
  // transform: 自动转换类型（如字符串转数字）
  // forbidNonWhitelisted: false - 不禁止额外属性
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('精益工时管理系统 API')
    .setDescription('基于 NestJS 的工时管理系统接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', '认证模块')
    .addTag('HR', '人事模块')
    .addTag('Account', '劳动力账户')
    .addTag('Punch', '打卡模块')
    .addTag('Shift', '排班模块')
    .addTag('Calculate', '计算模块')
    .addTag('Attendance', '考勤模块')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
🚀 Server is running on: http://localhost:${port}
📚 API Documentation: http://localhost:${port}/api-docs
  `);
}

bootstrap();

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户已被禁用');
    }

    const roles = user.userRoles.map((ur) => ur.role);

    // 查找用户对应的员工信息获取orgId
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo: user.username },
      select: { orgId: true },
    });

    const payload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      orgId: employee?.orgId,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        orgId: employee?.orgId,
        roles,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const roles = user.userRoles.map((ur) => ur.role);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      status: user.status,
      roles,
      createdAt: user.createdAt,
    };
  }
}

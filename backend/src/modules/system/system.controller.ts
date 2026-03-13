import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SystemService } from './system.service';

@ApiTags('System')
@Controller('system')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SystemController {
  constructor(private systemService: SystemService) {}

  // 用户管理
  @Get('users')
  @RequirePermissions('system:user:view')
  @ApiOperation({ summary: '获取用户列表' })
  async getUsers(@Query() query: any) {
    return this.systemService.getUsers(query);
  }

  @Get('users/:id')
  @RequirePermissions('system:user:view')
  @ApiOperation({ summary: '获取用户详情' })
  async getUser(@Param('id') id: string) {
    return this.systemService.getUser(+id);
  }

  @Post('users')
  @RequirePermissions('system:user:create')
  @ApiOperation({ summary: '创建用户' })
  async createUser(@Body() dto: any) {
    return this.systemService.createUser(dto);
  }

  @Put('users/:id')
  @RequirePermissions('system:user:edit')
  @ApiOperation({ summary: '更新用户' })
  async updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.systemService.updateUser(+id, dto);
  }

  @Delete('users/:id')
  @RequirePermissions('system:user:delete')
  @ApiOperation({ summary: '删除用户' })
  async deleteUser(@Param('id') id: string) {
    return this.systemService.deleteUser(+id);
  }

  // 角色管理
  @Get('roles')
  @RequirePermissions('system:role:view')
  @ApiOperation({ summary: '获取角色列表' })
  async getRoles(@Query() query: any) {
    return this.systemService.getRoles(query);
  }

  @Get('roles/:id')
  @RequirePermissions('system:role:view')
  @ApiOperation({ summary: '获取角色详情' })
  async getRole(@Param('id') id: string) {
    return this.systemService.getRole(+id);
  }

  @Post('roles')
  @RequirePermissions('system:role:create')
  @ApiOperation({ summary: '创建角色' })
  async createRole(@Body() dto: any) {
    return this.systemService.createRole(dto);
  }

  @Put('roles/:id')
  @RequirePermissions('system:role:edit')
  @ApiOperation({ summary: '更新角色' })
  async updateRole(@Param('id') id: string, @Body() dto: any) {
    return this.systemService.updateRole(+id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions('system:role:delete')
  @ApiOperation({ summary: '删除角色' })
  async deleteRole(@Param('id') id: string) {
    return this.systemService.deleteRole(+id);
  }

  // 工作台统计
  @Get('dashboard/stats')
  @RequirePermissions('system:dashboard:view')
  @ApiOperation({ summary: '获取工作台统计数据' })
  async getDashboardStats() {
    return this.systemService.getDashboardStats();
  }
}

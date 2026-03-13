import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccountService } from './account.service';

@ApiTags('Account')
@Controller('account')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Get('hierarchy-config/levels')
  @RequirePermissions('account:hierarchy:view')
  @ApiOperation({ summary: '获取层级配置列表' })
  async getHierarchyLevels() {
    return this.accountService.getHierarchyLevels();
  }

  @Post('hierarchy-config/levels')
  @RequirePermissions('account:hierarchy:edit')
  @ApiOperation({ summary: '创建层级配置' })
  async createHierarchyLevel(@Body() dto: any) {
    return this.accountService.createHierarchyLevel(dto);
  }

  @Put('hierarchy-config/levels/:id')
  @RequirePermissions('account:hierarchy:edit')
  @ApiOperation({ summary: '更新层级配置' })
  async updateHierarchyLevel(@Param('id') id: string, @Body() dto: any) {
    return this.accountService.updateHierarchyLevel(+id, dto);
  }

  @Delete('hierarchy-config/levels/:id')
  @RequirePermissions('account:hierarchy:edit')
  @ApiOperation({ summary: '删除层级配置' })
  async deleteHierarchyLevel(@Param('id') id: string) {
    return this.accountService.deleteHierarchyLevel(+id);
  }

  @Delete('hierarchy-config/levels/all')
  @RequirePermissions('account:hierarchy:edit')
  @ApiOperation({ summary: '删除所有层级配置' })
  async deleteAllHierarchyLevels() {
    return this.accountService.deleteAllHierarchyLevels();
  }

  @Post('hierarchy-config/levels/batch')
  @RequirePermissions('account:hierarchy:edit')
  @ApiOperation({ summary: '批量保存层级配置' })
  async batchSaveHierarchyLevels(@Body() dto: { levels: any[] }) {
    return this.accountService.batchSaveHierarchyLevels(dto.levels);
  }

  @Get('accounts')
  @RequirePermissions('account:list:view')
  @ApiOperation({ summary: '获取账户列表' })
  async getAccounts(@Query() query: any) {
    return this.accountService.getAccounts(query);
  }

  @Post('accounts')
  @RequirePermissions('account:create')
  @ApiOperation({ summary: '创建账户' })
  async createAccount(@Body() dto: any) {
    return this.accountService.createAccount(dto);
  }

  @Get('accounts/tree')
  @RequirePermissions('account:list:view')
  @ApiOperation({ summary: '获取账户树' })
  async getAccountTree() {
    return this.accountService.getAccountTree();
  }

  @Get('accounts/:id')
  @RequirePermissions('account:list:view')
  @ApiOperation({ summary: '获取账户详情' })
  async getAccount(@Param('id') id: string) {
    return this.accountService.getAccount(+id);
  }

  @Post('accounts/generate/:employeeId')
  @RequirePermissions('account:create')
  @ApiOperation({ summary: '为员工生成劳动力账户' })
  async generateAccountsForEmployee(@Param('employeeId') employeeId: string) {
    return this.accountService.generateAccountsForEmployee(+employeeId);
  }
}

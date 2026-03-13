import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';
import { PairingService } from './pairing.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';

@Injectable()
export class PunchService {
  constructor(
    private prisma: PrismaService,
    private pairingService: PairingService,
    private dataScopeService: DataScopeService,
  ) {}

  async getDevices() {
    return this.prisma.punchDevice.findMany({
      include: {
        group: true,
        bindings: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDevice(dto: any) {
    return this.prisma.punchDevice.create({
      data: {
        ...dto,
        code: dto.code || StringUtils.generateCode('DEV'),
      },
    });
  }

  async updateDevice(id: number, dto: any) {
    return this.prisma.punchDevice.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDevice(id: number) {
    await this.prisma.punchDevice.update({
      where: { id },
      data: { status: 'DISABLED' },
    });
    return { message: '删除成功' };
  }

  // 设备组管理
  async getDeviceGroups() {
    return this.prisma.deviceGroup.findMany({
      include: {
        devices: true,
        _count: {
          select: { devices: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeviceGroupById(id: number) {
    return this.prisma.deviceGroup.findUnique({
      where: { id },
      include: {
        devices: {
          include: {
            bindings: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });
  }

  async createDeviceGroup(dto: any) {
    return this.prisma.deviceGroup.create({
      data: {
        ...dto,
        code: dto.code || StringUtils.generateCode('DG'),
      },
    });
  }

  async updateDeviceGroup(id: number, dto: any) {
    return this.prisma.deviceGroup.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDeviceGroup(id: number) {
    await this.prisma.deviceGroup.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    return { message: '删除成功' };
  }

  async addDevicesToGroup(groupId: number, deviceIds: number[]) {
    // 更新设备的groupId
    await this.prisma.punchDevice.updateMany({
      where: {
        id: { in: deviceIds },
      },
      data: {
        groupId,
      },
    });

    return this.getDeviceGroupById(groupId);
  }

  async removeDevicesFromGroup(deviceIds: number[]) {
    // 将设备的groupId设置为null
    await this.prisma.punchDevice.updateMany({
      where: {
        id: { in: deviceIds },
      },
      data: {
        groupId: null,
      },
    });

    return { message: '移除成功' };
  }

  async getRecords(query: any, user?: any) {
    const { page = 1, pageSize = 10, employeeNo, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (employeeNo) where.employeeNo = employeeNo;
    if (startDate || endDate) {
      where.punchTime = {};
      if (startDate) where.punchTime.gte = new Date(startDate);
      if (endDate) where.punchTime.lte = new Date(endDate);
    }

    // 应用数据权限过滤
    if (user && user.username !== 'admin') {
      const dataScopeFilter = await this.dataScopeService.getPunchRecordFilter(user, user.orgId);
      Object.assign(where, dataScopeFilter);
    }

    const [items, total] = await Promise.all([
      this.prisma.punchRecord.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          device: true,
          employee: true,
        },
        orderBy: { punchTime: 'desc' },
      }),
      this.prisma.punchRecord.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async createRecord(dto: any) {
    // 创建打卡记录
    const record = await this.prisma.punchRecord.create({
      data: {
        ...dto,
        // 将时间字符串转换为 Date 对象
        punchTime: dto.punchTime ? new Date(dto.punchTime) : undefined,
        source: 'MANUAL',
      },
    });

    // 异步触发自动摆卡（不阻塞响应）
    this.pairingService.handleNewPunchRecord(record.id).catch((error) => {
      console.error('自动摆卡失败:', error);
    });

    return record;
  }

  async updateRecord(id: number, dto: any) {
    // 更新打卡记录
    const record = await this.prisma.punchRecord.update({
      where: { id },
      data: {
        ...dto,
        // 如果传入了 punchTime，确保正确更新
        punchTime: dto.punchTime ? new Date(dto.punchTime) : undefined,
      },
    });

    // 异步触发重新摆卡（不阻塞响应）
    this.pairingService.handleNewPunchRecord(record.id).catch((error) => {
      console.error('重新摆卡失败:', error);
    });

    return record;
  }

  async deleteRecord(id: number) {
    // 先获取打卡记录，以便后续触发摆卡
    const record = await this.prisma.punchRecord.findUnique({
      where: { id },
    });

    // 删除打卡记录
    await this.prisma.punchRecord.delete({
      where: { id },
    });

    // 异步触发重新摆卡（不阻塞响应）
    if (record) {
      const punchDate = new Date(record.punchTime);
      punchDate.setHours(0, 0, 0, 0);
      this.pairingService.pairPunches(record.employeeNo, punchDate).catch((error) => {
        console.error('删除后重新摆卡失败:', error);
      });
    }

    return { message: '删除成功' };
  }

  /**
   * 批量导入打卡记录
   */
  async importRecords(file: Express.Multer.File) {
    const csv = require('csv-parser');
    const { Readable } = require('stream');

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const errors: any[] = [];
      let successCount = 0;
      let failedCount = 0;

      // 创建可读流
      const stream = Readable.from(file.buffer.toString('utf-8'));

      stream
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            // 处理导入数据
            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              const rowNum = i + 2; // 跳过标题行

              try {
                // 验证必填字段
                if (!row['员工工号'] || !row['打卡时间'] || !row['刷卡设备代码'] || !row['刷卡类型']) {
                  errors.push({
                    row: rowNum,
                    message: '必填字段不能为空',
                  });
                  failedCount++;
                  continue;
                }

                // 查找员工
                const employee = await this.prisma.employee.findUnique({
                  where: { employeeNo: row['员工工号'] },
                });

                if (!employee) {
                  errors.push({
                    row: rowNum,
                    message: `员工工号 "${row['员工工号']}" 不存在`,
                  });
                  failedCount++;
                  continue;
                }

                // 查找设备
                const device = await this.prisma.punchDevice.findFirst({
                  where: { code: row['刷卡设备代码'] },
                });

                if (!device) {
                  errors.push({
                    row: rowNum,
                    message: `设备代码 "${row['刷卡设备代码']}" 不存在`,
                  });
                  failedCount++;
                  continue;
                }

                // 转换打卡类型
                const punchTypeMap: any = {
                  '签入': 'IN',
                  '签出': 'OUT',
                };
                const punchType = punchTypeMap[row['刷卡类型']];
                if (!punchType) {
                  errors.push({
                    row: rowNum,
                    message: `刷卡类型 "${row['刷卡类型']}" 无效，必须是"签入"或"签出"`,
                  });
                  failedCount++;
                  continue;
                }

                // 验证打卡时间格式
                const punchTime = new Date(row['打卡时间']);
                if (isNaN(punchTime.getTime())) {
                  errors.push({
                    row: rowNum,
                    message: `打卡时间格式错误，应为 YYYY-MM-DD HH:mm:ss`,
                  });
                  failedCount++;
                  continue;
                }

                // 创建打卡记录
                await this.prisma.punchRecord.create({
                  data: {
                    employeeNo: employee.employeeNo,
                    punchTime,
                    deviceId: device.id,
                    punchType,
                    source: 'MANUAL',
                  },
                });

                successCount++;
              } catch (error: any) {
                errors.push({
                  row: rowNum,
                  message: error.message || '未知错误',
                });
                failedCount++;
              }
            }

            // 异步触发摆卡处理
            const uniqueEmployees = [...new Set(results.map((r) => r['员工工号']))];
            for (const employeeNo of uniqueEmployees) {
              const dates = [...new Set(
                results
                  .filter((r) => r['员工工号'] === employeeNo)
                  .map((r) => {
                    const date = new Date(r['打卡时间']);
                    date.setHours(0, 0, 0, 0);
                    return date.toISOString();
                  })
              )];
              for (const dateStr of dates) {
                this.pairingService.pairPunches(employeeNo, new Date(dateStr)).catch((error) => {
                  console.error('导入后摆卡失败:', error);
                });
              }
            }

            resolve({
              successCount,
              failedCount,
              errors,
            });
          } catch (error: any) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async bindAccounts(deviceId: number, bindings: any[]) {
    // bindings格式: [{ accountId, effectiveDate, expiryDate }]

    // 验证提交的绑定之间没有时间冲突
    for (let i = 0; i < bindings.length; i++) {
      for (let j = i + 1; j < bindings.length; j++) {
        const binding1 = bindings[i];
        const binding2 = bindings[j];

        const effective1 = new Date(binding1.effectiveDate);
        const expiry1 = binding1.expiryDate ? new Date(binding1.expiryDate) : null;
        const effective2 = new Date(binding2.effectiveDate);
        const expiry2 = binding2.expiryDate ? new Date(binding2.expiryDate) : null;

        // 检查两个时间段是否有重叠
        const hasOverlap = this.checkTimeOverlap(effective1, expiry1, effective2, expiry2);

        if (hasOverlap) {
          throw new Error(`第 ${i + 1} 行和第 ${j + 1} 行的时间段存在冲突，同一时间段只能绑定一个账户`);
        }
      }
    }

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 先删除该设备的所有现有绑定
      await tx.deviceAccount.deleteMany({
        where: { deviceId },
      });

      // 创建新的绑定关系
      for (const binding of bindings) {
        const { accountId, effectiveDate, expiryDate } = binding;

        // 转换日期格式
        const effective = new Date(effectiveDate);
        const expiry = expiryDate ? new Date(expiryDate) : null;

        // 验证生效时间必须小于失效时间
        if (expiry && effective >= expiry) {
          throw new Error(`账户 ${accountId} 的生效时间必须早于失效时间`);
        }

        // 创建绑定关系
        await tx.deviceAccount.create({
          data: {
            deviceId,
            accountId,
            effectiveDate: effective,
            expiryDate: expiry,
          },
        });
      }

      // 返回更新后的设备信息
      return this.getDeviceByIdWithTx(tx, deviceId);
    });

    // 异步触发重新摆卡（不阻塞响应）
    // 获取该设备关联的所有员工和日期，然后触发摆卡
    this.triggerPairingForDevice(deviceId).catch((error) => {
      console.error('设备绑定账户变更后重新摆卡失败:', error);
    });

    return result;
  }

  /**
   * 为设备触发重新摆卡
   * 查找使用该设备的所有打卡记录，并触发对应日期的摆卡
   */
  private async triggerPairingForDevice(deviceId: number) {
    // 获取该设备的打卡记录
    const punchRecords = await this.prisma.punchRecord.findMany({
      where: { deviceId },
      select: {
        employeeNo: true,
        punchTime: true,
      },
      distinct: ['employeeNo', 'punchTime'],
    });

    // 按员工和日期分组，触发摆卡
    const dateSet = new Set<string>();

    for (const record of punchRecords) {
      const punchDate = new Date(record.punchTime);
      punchDate.setHours(0, 0, 0, 0);
      const dateKey = `${record.employeeNo}_${punchDate.toISOString()}`;

      if (!dateSet.has(dateKey)) {
        dateSet.add(dateKey);
        this.pairingService.pairPunches(record.employeeNo, punchDate).catch((error) => {
          console.error(`员工 ${record.employeeNo} 日期 ${punchDate.toISOString()} 摆卡失败:`, error);
        });
      }
    }
  }

  /**
   * 检查两个时间段是否有重叠
   * @param effective1 时间段1的开始时间
   * @param expiry1 时间段1的结束时间（null表示永久有效）
   * @param effective2 时间段2的开始时间
   * @param expiry2 时间段2的结束时间（null表示永久有效）
   * @returns 是否有重叠
   */
  private checkTimeOverlap(
    effective1: Date,
    expiry1: Date | null,
    effective2: Date,
    expiry2: Date | null
  ): boolean {
    // 时间段1: [effective1, expiry1 || +∞]
    // 时间段2: [effective2, expiry2 || +∞]

    // 计算两个时间段的结束时间，如果没有结束时间则使用一个很大的日期
    const end1 = expiry1 ? expiry1.getTime() : Number.MAX_SAFE_INTEGER;
    const end2 = expiry2 ? expiry2.getTime() : Number.MAX_SAFE_INTEGER;

    const start1 = effective1.getTime();
    const start2 = effective2.getTime();

    // 两个时间段有重叠的条件：max(start1, start2) < min(end1, end2)
    return Math.max(start1, start2) < Math.min(end1, end2);
  }

  private async getDeviceByIdWithTx(tx: any, id: number) {
    return tx.punchDevice.findUnique({
      where: { id },
      include: {
        bindings: {
          include: {
            account: true,
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });
  }

  private async getDeviceById(id: number) {
    return this.prisma.punchDevice.findUnique({
      where: { id },
      include: {
        bindings: {
          include: {
            account: true,
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });
  }

  async getExceptions(query: any) {
    // 简化实现，返回空异常列表
    return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }
}

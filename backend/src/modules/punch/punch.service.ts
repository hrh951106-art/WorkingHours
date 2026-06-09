import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';
import { PairingService } from './pairing.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { AttendancePunchTriggerService } from './attendance-punch-trigger.service';

@Injectable()
export class PunchService {
  constructor(
    private prisma: PrismaService,
    private pairingService: PairingService,
    private dataScopeService: DataScopeService,
    private attendancePunchTriggerService: AttendancePunchTriggerService,
  ) {}

  async getDevices() {
    return this.prisma.punchDevice.findMany({
      where: {
        status: {
          not: 'DISABLED',
        },
      },
      include: {
        group: true,
        bindings: {
          include: {
            account: true,
          },
          orderBy: { effectiveDate: 'desc' },
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
      where: {
        status: {
          not: 'INACTIVE',
        },
      },
      include: {
        devices: {
          where: {
            status: {
              not: 'DISABLED',
            },
          },
        },
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
        devices: true,
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
          account: true,
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
    // 添加调试日志
    console.log('[创建打卡记录] 接收到的数据:', JSON.stringify(dto, null, 2));
    console.log('[创建打卡记录] dto.accountId:', dto.accountId);
    console.log('[创建打卡记录] dto.accountId 类型:', typeof dto.accountId);

    // 处理 accountId：只有明确选择了账户才保存，否则设为 null
    const accountId = dto.accountId && dto.accountId !== '' ? dto.accountId : null;

    console.log('[创建打卡记录] 处理后的 accountId:', accountId);

    const record = await this.prisma.punchRecord.create({
      data: {
        ...dto,
        accountId, // 明确设置为 null 或用户选择的值
        punchTime: dto.punchTime ? new Date(dto.punchTime) : undefined,
        source: 'MANUAL',
      },
    });

    // 静默触发自动精益摆卡（不阻塞响应，不返回错误信息）
    if (accountId) {
      // 如果设置了账户，触发账户变更事件
      this.attendancePunchTriggerService
        .triggerPunchAccountChange({
          employeeNo: record.employeeNo,
          punchRecordId: record.id,
          punchDate: new Date(record.punchTime),
          triggerSource: 'punch.create',
        })
        .catch((error) => {
          console.error('触发账户变更摆卡失败:', error);
        });
    } else {
      // 没有设置账户，只触发普通的摆卡
      this.pairingService.handleNewPunchRecord(record.id).catch((error) => {
        console.error('自动摆卡失败:', error);
      });
    }

    // 直接返回打卡记录，不等待摆卡完成，不返回摆卡状态
    return record;
  }

  async updateRecord(id: number, dto: any) {
    // 检查账户是否变更
    const oldRecord = await this.prisma.punchRecord.findUnique({
      where: { id },
      select: { accountId: true, employeeNo: true, punchTime: true },
    });

    // 处理 accountId：只有明确选择了账户才保存，否则设为 null
    const accountId =
      dto.accountId !== undefined
        ? dto.accountId && dto.accountId !== ''
          ? dto.accountId
          : null
        : undefined;

    const record = await this.prisma.punchRecord.update({
      where: { id },
      data: {
        ...dto,
        accountId, // 明确设置为 null 或用户选择的值
        punchTime: dto.punchTime ? new Date(dto.punchTime) : undefined,
      },
    });

    // 如果账户发生了变更（包括从有值变为null），触发账户变更事件
    const hasAccountChanged = accountId !== undefined && accountId !== oldRecord?.accountId;

    // 静默触发自动精益摆卡（不阻塞响应，不返回错误信息）
    if (oldRecord && hasAccountChanged) {
      this.attendancePunchTriggerService
        .triggerPunchAccountChange({
          employeeNo: record.employeeNo,
          punchRecordId: record.id,
          punchDate: new Date(record.punchTime),
          triggerSource: 'punch.update',
        })
        .catch((error) => {
          console.error('触发账户变更摆卡失败:', error);
        });
    } else {
      // 账户未变更，只触发普通的摆卡
      this.pairingService.handleNewPunchRecord(record.id).catch((error) => {
        console.error('重新摆卡失败:', error);
      });
    }

    // 直接返回打卡记录，不等待摆卡完成，不返回摆卡状态
    return record;
  }

  async deleteRecord(id: number) {
    try {
      // 查询打卡记录
      const record = await this.prisma.punchRecord.findUnique({
        where: { id },
        select: {
          id: true,
          employeeNo: true,
          punchTime: true,
        },
      });

      if (!record) {
        throw new Error('打卡记录不存在');
      }

      // 保存必要信息，用于删除后触发重新摆卡
      const employeeNo = record.employeeNo;
      const punchDate = new Date(record.punchTime);
      punchDate.setHours(0, 0, 0, 0);

      console.log(
        `[删除打卡记录] ID: ${id}, 员工: ${employeeNo}, 日期: ${punchDate.toISOString()}`,
      );

      // 使用事务处理：先删除相关的摆卡记录，再删除打卡记录
      await this.prisma.$transaction(async (tx) => {
        try {
          // 先删除引用该打卡记录的摆卡记录
          // 包括 inPunchId、outPunchId、workStartPunchId、workEndPunchId
          await tx.punchPair.deleteMany({
            where: {
              OR: [
                { inPunchId: id },
                { outPunchId: id },
                { workStartPunchId: id },
                { workEndPunchId: id },
              ],
            },
          });

          console.log(`[删除打卡记录] 删除相关摆卡记录成功`);

          // 再删除打卡记录
          await tx.punchRecord.delete({
            where: { id },
          });

          console.log(`[删除打卡记录] 删除打卡记录 ${id} 成功`);
        } catch (error: any) {
          console.error(`[删除打卡记录] 事务内错误:`, error);
          throw error;
        }
      });

      // 删除后触发自动精益摆卡（异步执行，不阻塞响应）
      // 逻辑：删除当天所有旧摆卡数据 → 重新摆��
      setImmediate(() => {
        console.log(
          `[删除打卡记录] 触发自动精益摆卡: 员工 ${employeeNo}, 日期 ${punchDate.toISOString()}`,
        );

        // 直接调用 pairPunches，它会先删除当天所有旧数据再重新摆卡
        this.pairingService.pairPunches(employeeNo, punchDate).catch((error) => {
          console.error('[删除打卡记录] 自动精益摆卡失败:', error);
        });
      });

      return { message: '删除成功' };
    } catch (error: any) {
      console.error('[删除打卡记录] 删除失败:', error);
      throw error;
    }
  }

  async bindAccounts(deviceId: number, bindings: any[]) {
    // 验证设备是否存在
    const device = await this.prisma.punchDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error('设备不存在');
    }

    // 使用事务处理：删除旧绑定，创建新绑定
    await this.prisma.$transaction(async (tx) => {
      // 删除设备的所有现有绑定
      await tx.deviceAccount.deleteMany({
        where: { deviceId },
      });

      // 创建新的绑定关系
      for (const binding of bindings) {
        // 查询账户信息，获取层级路径
        const account = await tx.laborAccount.findUnique({
          where: { id: binding.accountId },
          select: {
            namePath: true,
            hierarchyValues: true,
          },
        });

        if (!account) {
          throw new Error(`账户ID ${binding.accountId} 不存在`);
        }

        // 从 hierarchyValues 生成层级编码，确保空层级也有占位符
        let path: string | null = null;
        if (account.hierarchyValues) {
          try {
            const hierarchyValues =
              typeof account.hierarchyValues === 'string'
                ? JSON.parse(account.hierarchyValues)
                : account.hierarchyValues;

            console.log('解析后的 hierarchyValues:', JSON.stringify(hierarchyValues, null, 2));

            // 按层级排序，提取每层的 code（包括空层级）
            const codes: string[] = [];
            if (Array.isArray(hierarchyValues)) {
              const sortedValues = hierarchyValues.sort((a, b) => a.level - b.level);
              console.log(
                '排序后的层级:',
                sortedValues.map((v: any) => `L${v.level}:${v.name}`),
              );

              sortedValues.forEach((hierarchy: any, index: number) => {
                // 即使未选择层级，也要保留空字符串占位符，保持完整链路
                const code = hierarchy.selectedValue?.code ?? '';
                console.log(
                  `层级 ${index + 1}: ${hierarchy.name}, selectedValue:`,
                  JSON.stringify(hierarchy.selectedValue),
                  `code: "${code}"`,
                );
                codes.push(code); // 无论是空字符串还是非空字符串都要push
              });
            }
            // 使用 / 连接，空字符串会自动形成 // 占位符
            path = codes.join('/');
            console.log('最终生成的层级编码:', path);
          } catch (error) {
            console.error('解析 hierarchyValues 失败:', error);
          }
        }

        // 创建绑定记录
        await tx.deviceAccount.create({
          data: {
            deviceId,
            accountId: binding.accountId,
            effectiveDate: new Date(binding.effectiveDate),
            expiryDate: binding.expiryDate ? new Date(binding.expiryDate) : null,
            namePath: account.namePath || null,
            path: path,
          },
        });

        // 触发设备账户变更事件（异步执行，不阻塞事务）
        // 注意：这里使用原始的 prisma 实例而不是事务的 tx，因为事件应该是异步的
        setImmediate(() => {
          this.attendancePunchTriggerService
            .triggerDeviceAccountChange({
              deviceId,
              effectiveDate: new Date(binding.effectiveDate),
              triggerSource: 'device-account.bind',
            })
            .catch((error) => {
              console.error('触发设备账户变更摆卡失败:', error);
            });
        });
      }
    });

    return { message: '绑定成功' };
  }

  async getExceptions(query: any) {
    return { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
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
                if (
                  !row['员工工号'] ||
                  !row['打卡时间'] ||
                  !row['刷卡设备代码'] ||
                  !row['刷卡类型']
                ) {
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
                  签入: 'IN',
                  签出: 'OUT',
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
              const dates = [
                ...new Set(
                  results
                    .filter((r) => r['员工工号'] === employeeNo)
                    .map((r) => {
                      const date = new Date(r['打卡时间']);
                      date.setHours(0, 0, 0, 0);
                      return date.toISOString();
                    }),
                ),
              ];
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
}

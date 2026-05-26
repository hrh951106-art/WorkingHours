import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Space,
  Divider,
  Spin,
  Empty,
  DatePicker,
  Button,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  AccountBookOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import request from '@/utils/request';
import EmployeeSelect from '@/components/common/EmployeeSelect';

dayjs.extend(weekday);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface AttendanceRecord {
  date: string;
  weekday: string;
  shiftName: string;
  punchInTime: string;
  punchOutTime: string;
  inAccountName: string;
  outAccountName: string;
}

const AttendanceDashboardPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  // 获取所有数据
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: [
      'attendanceDashboard',
      selectedEmployeeId,
      dateRange[0].format('YYYY-MM-DD'),
      dateRange[1].format('YYYY-MM-DD'),
    ],
    queryFn: async () => {
      if (!selectedEmployeeId || !selectedEmployee) return null;
      return request
        .get('/attendance-dashboard/all', {
          params: {
            employeeNo: selectedEmployee.employeeNo,
            startDate: dateRange[0].format('YYYY-MM-DD'),
            endDate: dateRange[1].format('YYYY-MM-DD'),
          },
        })
        .then((res: any) => res);
    },
    enabled: true, // 始终启用，即使没有选择员工
  });

  // 处理员工选择
  const handleEmployeeChange = (value: number | null, employee?: any) => {
    setSelectedEmployeeId(value);
    setSelectedEmployee(employee);
  };

  // 获取星期几
  const getWeekday = (dateStr: string) => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[dayjs(dateStr).day()];
  };

  // 生成日期范围内的所有日期
  const generateDateRange = (start: Dayjs, end: Dayjs) => {
    const dates: string[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return dates;
  };

  // 合并排班和打卡数据
  const mergedAttendanceData = React.useMemo(() => {
    const schedules = dashboardData?.data?.schedules || [];
    const punchData = dashboardData?.data?.punchData || [];

    // 创建日期到排班的映射
    const scheduleMap = new Map();
    schedules.forEach((schedule: any) => {
      scheduleMap.set(schedule.date, schedule.shiftName);
    });

    // 创建日期到打卡数据的映射
    const punchMap = new Map<string, any[]>();
    punchData.forEach((punch: any) => {
      if (!punchMap.has(punch.date)) {
        punchMap.set(punch.date, []);
      }
      punchMap.get(punch.date).push(punch);
    });

    // 生成所有日期的记录
    const allDates = generateDateRange(dateRange[0], dateRange[1]);
    const records: AttendanceRecord[] = [];

    allDates.forEach((date) => {
      const dayPunches = punchMap.get(date) || [];

      if (dayPunches.length === 0) {
        // 没有打卡数据，显示空行
        records.push({
          date,
          weekday: getWeekday(date),
          shiftName: scheduleMap.get(date) || '未排班',
          punchInTime: '-',
          punchOutTime: '-',
          inAccountName: '',
          outAccountName: '',
        });
      } else {
        // 有打卡数据，展开显示每一对打卡
        dayPunches.forEach((punch: any) => {
          const shiftName = punch.shiftName || scheduleMap.get(date) || '未排班';

          // 处理多班次打卡
          if (punch.workStartPunches && punch.workStartPunches.length > 0) {
            punch.workStartPunches.forEach((startPunch: any, idx: number) => {
              const endPunch = punch.workEndPunches?.[idx];

              records.push({
                date,
                weekday: getWeekday(date),
                shiftName,
                punchInTime: dayjs(startPunch.punchTime).format('HH:mm'),
                punchOutTime: endPunch ? dayjs(endPunch.punchTime).format('HH:mm') : '-',
                inAccountName: startPunch.accountName || '',
                outAccountName: endPunch?.accountName || '',
              });
            });
          } else if (punch.workStartPunchTime && punch.workEndPunchTime) {
            // 单班次
            records.push({
              date,
              weekday: getWeekday(date),
              shiftName,
              punchInTime: dayjs(punch.workStartPunchTime).format('HH:mm'),
              punchOutTime: dayjs(punch.workEndPunchTime).format('HH:mm'),
              inAccountName: '',
              outAccountName: '',
            });
          }
        });
      }
    });

    return records;
  }, [dashboardData, dateRange]);

  // 打卡记录表格列
  const attendanceColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      fixed: 'left' as const,
      render: (date: string, record: AttendanceRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{dayjs(date).format('MM-DD')}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.weekday}
          </Text>
        </div>
      ),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 120,
      render: (name: string) => <Tag color="blue">{name || '-'}</Tag>,
    },
    {
      title: '上班打卡',
      dataIndex: 'punchInTime',
      key: 'punchInTime',
      width: 100,
      align: 'center' as const,
      render: (time: string) => (
        <span style={{ color: time === '-' ? '#ccc' : '#52c41a', fontWeight: time === '-' ? 'normal' : 500 }}>
          {time}
        </span>
      ),
    },
    {
      title: '上班卡账户',
      dataIndex: 'inAccountName',
      key: 'inAccountName',
      width: 200,
      ellipsis: true,
      render: (name: string) => name || '-',
    },
    {
      title: '下班打卡',
      dataIndex: 'punchOutTime',
      key: 'punchOutTime',
      width: 100,
      align: 'center' as const,
      render: (time: string) => (
        <span style={{ color: time === '-' ? '#ccc' : '#1890ff', fontWeight: time === '-' ? 'normal' : 500 }}>
          {time}
        </span>
      ),
    },
    {
      title: '下班卡账户',
      dataIndex: 'outAccountName',
      key: 'outAccountName',
      width: 200,
      ellipsis: true,
      render: (name: string) => name || '-',
    },
  ];

  // 工时结果表格列
  const workHourResultColumns = [
    {
      title: '劳动力账户',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
    },
    {
      title: '出勤代码',
      dataIndex: 'attendanceCodeStr',
      key: 'attendanceCodeStr',
      width: 120,
      render: (code: string) => code || '-',
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      width: 100,
      align: 'center' as const,
      render: (days: number) => <Text strong>{days || 0}</Text>,
    },
    {
      title: '总工时',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 120,
      align: 'center' as const,
      render: (hours: number) => (
        <Text strong style={{ color: '#f5222d', fontSize: 16 }}>
          {hours?.toFixed(1) || '0.0'}
        </Text>
      ),
    },
  ];

  // 合并汇总数据 - 按账户和出勤代码组合
  const mergedSummaryData = React.useMemo(() => {
    const byAccount = dashboardData?.data?.byAccount || [];
    const byAttendanceCode = dashboardData?.data?.byAttendanceCode || [];

    // 创建组合数据：账户 + 出勤代码
    const merged: any[] = [];

    // 先添加按账户的汇总
    byAccount.forEach((account: any) => {
      merged.push({
        key: `account-${account.accountId || 'default'}`,
        accountName: account.accountName || '未分配',
        attendanceCodeStr: '',
        days: account.days,
        totalHours: account.totalHours,
        isAccount: true,
      });
    });

    // 再添加按出勤代码的汇总
    byAttendanceCode.forEach((code: any) => {
      merged.push({
        key: `code-${code.attendanceCodeId || 'default'}`,
        accountName: '',
        attendanceCodeStr: code.attendanceCodeStr || '未分类',
        days: code.days,
        totalHours: code.totalHours,
        isCode: true,
      });
    });

    return merged;
  }, [dashboardData]);

  // 日期快捷选项
  const dateRanges = {
    本月: [dayjs().startOf('month'), dayjs().endOf('month')] as [Dayjs, Dayjs],
    上月: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ] as [Dayjs, Dayjs],
    本周: [dayjs().startOf('week'), dayjs().endOf('week')] as [Dayjs, Dayjs],
    上周: [
      dayjs().subtract(1, 'week').startOf('week'),
      dayjs().subtract(1, 'week').endOf('week'),
    ] as [Dayjs, Dayjs],
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <AccountBookOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          考勤卡
        </Title>
        <Text type="secondary">查看员工排班与打卡记录</Text>
      </div>

      {/* 顶部操作栏 */}
      <Card
        style={{
          borderRadius: 8,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="middle">
            <div>
              <Text type="secondary" style={{ marginRight: 8 }}>
                员工：
              </Text>
              <EmployeeSelect
                value={selectedEmployeeId}
                onChange={handleEmployeeChange}
                placeholder="请选择员工"
                style={{ width: 300 }}
                allowClear
              />
            </div>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              ranges={dateRanges}
              format="YYYY-MM-DD"
              style={{ width: 280 }}
            />
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 上半部分：排班与打卡记录 */}
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <span>排班与打卡记录</span>
          </Space>
        }
        style={{
          borderRadius: 8,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : mergedAttendanceData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Empty description="暂无数据" />
          </div>
        ) : (
          <Table
            columns={attendanceColumns}
            dataSource={mergedAttendanceData}
            rowKey={(record, index) => `${record.date}-${index}`}
            pagination={{ pageSize: 31 }}
            size="small"
            bordered
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      {/* 下半部分：工时结果 */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#52c41a' }} />
            <span>工时结果</span>
          </Space>
        }
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        {!selectedEmployeeId ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Empty description="请选择员工查看工时结果" />
          </div>
        ) : (
          <Table
            columns={workHourResultColumns}
            dataSource={mergedSummaryData}
            pagination={false}
            size="small"
            bordered
            rowClassName={(record) => {
              if (record.isAccount) return 'account-row';
              if (record.isCode) return 'code-row';
              return '';
            }}
          />
        )}
        <style>{`
          .account-row {
            background-color: #f6ffed;
          }
          .code-row {
            background-color: #fff7e6;
          }
        `}</style>
      </Card>
    </div>
  );
};

export default AttendanceDashboardPage;

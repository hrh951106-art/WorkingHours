import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  Empty,
  Modal,
  List,
  Alert,
  Tooltip,
} from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Text } = Typography;

interface WorkHourResultsTabProps {
  selectedDateRange: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  selectedEmployee?: string;
}

type ViewMode = 'summary' | 'detail';

const WorkHourResultsTab: React.FC<WorkHourResultsTabProps> = ({
  selectedDateRange,
  selectedEmployee,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [selectedAttendanceCode, setSelectedAttendanceCode] = useState<string | null>(null);

  // 处理点击单个出勤代码卡片
  const handleCodeClick = useCallback((
    employeeNo: string,
    employeeName: string,
    date: string,
    codeName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // 阻止冒泡
    setSelectedDayData({
      employeeNo,
      employeeName,
      date,
    });
    setSelectedAttendanceCode(codeName);
    setDetailModalVisible(true);
  }, []);

  // 获取工时结果
  const { data: calcResults, isLoading } = useQuery({
    queryKey: ['calcResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), selectedEmployee],
    queryFn: () =>
      request.get('/calculate/results', {
        params: {
          startDate: selectedDateRange.start.format('YYYY-MM-DD'),
          endDate: selectedDateRange.end.format('YYYY-MM-DD'),
          employeeNo: selectedEmployee,
          pageSize: 1000,
        },
      }).then((res: any) => {
        // 过滤只显示在工时明细管理页面显示的出勤代码
        const items = res.items || [];
        return items.filter((item: any) =>
          item.attendanceCode && item.attendanceCode.showInDetailPage === true
        );
      }),
  });

  // 计算汇总统计（按出勤代码）
  const codeSummary = useMemo(() => {
    return calculateCodeSummary(calcResults || []);
  }, [calcResults]);

  // 按员工分组数据
  const employeeGroups = useMemo(() => {
    return groupByEmployee(calcResults || []);
  }, [calcResults]);

  // 获取所有员工（用于显示所有人员，即使没有工时数据）
  const { data: allEmployees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () =>
      request.get('/hr/employees', { params: { pageSize: 1000 } }).then((res: any) => res.items || []),
    enabled: viewMode === 'summary', // 只在汇总视图时加载
  });

  // 生成查询区间内的所有日期
  const allDatesInScope = useMemo(() => {
    const dates: string[] = [];
    const startDate = selectedDateRange.start.startOf('day');
    const endDate = selectedDateRange.end.startOf('day');
    const maxDays = 31; // 限制最多显示31天

    // 计算日期范围内的天数
    const diffDays = endDate.diff(startDate, 'day') + 1;
    const actualDays = Math.min(diffDays, maxDays);

    // 生成日期列表
    for (let i = 0; i < actualDays; i++) {
      const date = startDate.add(i, 'day');
      dates.push(date.format('YYYY-MM-DD'));
    }

    console.log('startDate:', startDate.format('YYYY-MM-DD'));
    console.log('endDate:', endDate.format('YYYY-MM-DD'));
    console.log('diffDays:', diffDays);
    console.log('actualDays:', actualDays);
    console.log('生成的日期列表:', dates);

    return dates;
  }, [selectedDateRange]);

  // 检查日期范围是否超过限制
  const totalDaysInRange = selectedDateRange.end.diff(selectedDateRange.start, 'day') + 1;
  const isDateRangeExceeded = totalDaysInRange > 31;

  // 合并所有员工和工时数据
  const displayEmployeeGroups = useMemo(() => {
    // 如果在明细视图或员工数据未加载，直接返回工时数据分组
    if (viewMode !== 'summary' || !allEmployees || allEmployees.length === 0) {
      return employeeGroups;
    }

    // 为每个员工创建数据结构，即使没有工时数据
    const allEmployeesMap = new Map(
      allEmployees.map((emp: any) => [
        emp.employeeNo,
        {
          employeeNo: emp.employeeNo,
          employeeName: emp.name,
          totalHours: 0,
          totalDays: 0,
          recordCount: 0,
          days: [],
          codeSummary: [],
          _isEmpty: true, // 标记为空数据
        },
      ])
    );

    // 合并工时数据
    employeeGroups.forEach((emp: any) => {
      allEmployeesMap.set(emp.employeeNo, {
        ...emp,
        _isEmpty: false,
      });
    });

    return Array.from(allEmployeesMap.values()).sort((a: any, b: any) =>
      a.employeeNo.localeCompare(b.employeeNo)
    );
  }, [viewMode, allEmployees, employeeGroups]);

  // 优化表格列定义 - 使用useMemo缓存
  const summaryTableColumns = useMemo(() => {
    return [
      {
        title: '员工',
        dataIndex: 'employeeNo',
        key: 'employeeNo',
        fixed: 'left' as const,
        width: 150,
        render: (employeeNo: string, record: any) => (
          <div>
            <Text strong style={{ fontSize: 13 }}>{employeeNo}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.employeeName}</Text>
          </div>
        ),
      },
      ...getDateColumns(allDatesInScope, handleCodeClick),
    ];
  }, [allDatesInScope, handleCodeClick]);

  if (isLoading || isLoadingEmployees) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  if (!calcResults || calcResults.length === 0) {
    return (
      <div style={{ padding: 60 }}>
        <Empty description="暂无工时数据" />
      </div>
    );
  }

  return (
    <div>
      {/* 日期范围警告 */}
      {isDateRangeExceeded && (
        <Alert
          message="日期范围过大"
          description={`您选择的日期范围为 ${totalDaysInRange} 天，为避免页面卡顿，汇总视图仅显示前 31 天的数据。如需查看完整数据，请使用明细视图或缩小日期范围。`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16, borderRadius: 8 }}
          closable
        />
      )}

      {/* 汇总统计区域 */}
      <Card
        title={<Text strong style={{ fontSize: 15 }}>工时汇总统计</Text>}
        style={{ marginBottom: 12, borderRadius: 12 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[12, 12]}>
          {codeSummary.map((item: any) => (
            <Col span={8} key={item.codeName}>
              <Card
                bordered={false}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 6,
                  height: '100%',
                }}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {item.codeName}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
                        {item.totalHours.toFixed(2)}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>小时</Text>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      <UserOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
                        {item.employeeCount}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>人</Text>
                    </div>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, display: 'block', marginTop: 3 }}>
                      {item.recordCount} 条记录
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 视图切换 */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12 }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong style={{ fontSize: 15 }}>
              {viewMode === 'summary' ? '汇总视图' : '明细视图'}
            </Text>
            <Text type="secondary">
              查询区间：{selectedDateRange.start.format('YYYY-MM-DD')} ~ {selectedDateRange.end.format('YYYY-MM-DD')}，
              共 {allDatesInScope.length} 天，
              {allEmployees ? allEmployees.length : 0} 人，
              {calcResults.length} 条工时记录
            </Text>
          </Space>
          <Button.Group>
            <Button
              type={viewMode === 'summary' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('summary')}
            >
              汇总视图
            </Button>
            <Button
              type={viewMode === 'detail' ? 'primary' : 'default'}
              icon={<BarsOutlined />}
              onClick={() => setViewMode('detail')}
            >
              明细视图
            </Button>
          </Button.Group>
        </div>
      </Card>

      {/* 汇总视图（交叉表格式：员工 × 日期） */}
      {viewMode === 'summary' && (
        <Card
          style={{ borderRadius: 12 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={displayEmployeeGroups}
            rowKey="employeeNo"
            pagination={false}
            size="middle"
            scroll={{ x: 'max-content' }}
            columns={summaryTableColumns}
          />
        </Card>
      )}

      {/* 明细视图 */}
      {viewMode === 'detail' && (
        <Card
          style={{ borderRadius: 12 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={calcResults}
            columns={detailColumns}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              defaultPageSize: 20,
            }}
            size="middle"
            scroll={{ x: 1400 }}
          />
        </Card>
      )}

      {/* 工时详情弹窗 */}
      <Modal
        title={
          <Space>
            <Text strong>工时明细</Text>
            {selectedDayData && selectedAttendanceCode && (
              <>
                <Tag color="blue">{selectedDayData.employeeNo}</Tag>
                <Text>{selectedDayData.employeeName}</Text>
                <Text type="secondary">|</Text>
                <Text>{dayjs(selectedDayData.date).format('YYYY-MM-DD')}</Text>
                <Text type="secondary">|</Text>
                <Tag color="purple">{selectedAttendanceCode}</Tag>
              </>
            )}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedAttendanceCode(null);
        }}
        footer={null}
        width={900}
      >
        {selectedDayData && selectedAttendanceCode ? (
          <CodeDetailContent
            calcResults={calcResults || []}
            employeeNo={selectedDayData.employeeNo}
            date={selectedDayData.date}
            attendanceCodeName={selectedAttendanceCode}
          />
        ) : (
          <Empty description="暂无工时数据" />
        )}
      </Modal>
    </div>
  );
};

// 明细视图列定义
const detailColumns = [
  {
    title: '员工号',
    dataIndex: 'employeeNo',
    key: 'employeeNo',
    width: 120,
    fixed: 'left' as const,
  },
  {
    title: '姓名',
    dataIndex: ['employee', 'name'],
    key: 'employeeName',
    width: 100,
  },
  {
    title: '排班日期',
    dataIndex: 'calcDate',
    key: 'calcDate',
    width: 120,
    render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
  },
  {
    title: '班次',
    dataIndex: 'shiftName',
    key: 'shiftName',
    width: 100,
    render: (name: string) => <Tag color="blue">{name}</Tag>,
  },
  {
    title: '出勤代码',
    dataIndex: ['attendanceCode', 'name'],
    key: 'attendanceCode',
    width: 120,
    render: (name: string) => <Tag color="purple">{name}</Tag>,
  },
  {
    title: '劳动力账户',
    dataIndex: 'accountName',
    key: 'accountName',
    width: 300,
    ellipsis: true,
    render: (name: string) => (
      name ? (
        <Tooltip title={name}>
          <Tag color="orange" style={{ maxWidth: '100%' }}>
            {name}
          </Tag>
        </Tooltip>
      ) : '-'
    ),
  },
  {
    title: '签入时间',
    dataIndex: 'punchInTime',
    key: 'punchInTime',
    width: 100,
    render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
  },
  {
    title: '签出时间',
    dataIndex: 'punchOutTime',
    key: 'punchOutTime',
    width: 100,
    render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
  },
  {
    title: '实际工时',
    dataIndex: 'actualHours',
    key: 'actualHours',
    width: 100,
    render: (hours: number) => (
      <Text strong style={{ color: '#6366f1', fontSize: 14 }}>
        {hours.toFixed(2)}h
      </Text>
    ),
  },
];

// 计算按出勤代码的汇总统计
function calculateCodeSummary(calcResults: any[]) {
  const summary: any = {};

  calcResults.forEach((result) => {
    const codeName = result.attendanceCode?.name || '未分类';
    const employeeNo = result.employeeNo;

    if (!summary[codeName]) {
      summary[codeName] = {
        codeName,
        totalHours: 0,
        employeeCount: 0,
        recordCount: 0,
        employees: new Set(),
      };
    }

    summary[codeName].totalHours += result.actualHours;
    summary[codeName].employeeCount = summary[codeName].employees.size;
    summary[codeName].recordCount++;
    summary[codeName].employees.add(employeeNo);
  });

  return Object.values(summary).map((item: any) => ({
    ...item,
    employeeCount: item.employees.size,
  }));
}

// 按员工分组数据
function groupByEmployee(calcResults: any[]) {
  const employeeMap: any = {};

  calcResults.forEach((result) => {
    const employeeNo = result.employeeNo;
    const employeeName = result.employee?.name || employeeNo;
    const calcDate = dayjs(result.calcDate).format('YYYY-MM-DD');
    const codeName = result.attendanceCode?.name || '未分类';

    if (!employeeMap[employeeNo]) {
      employeeMap[employeeNo] = {
        employeeNo,
        employeeName,
        totalHours: 0,
        totalDays: 0,
        recordCount: 0,
        days: [],
        codeSummary: {},
      };
    }

    const employee = employeeMap[employeeNo];
    employee.totalHours += result.actualHours;
    employee.recordCount++;

    // 按日期分组
    let dayData = employee.days.find((d: any) => d.date === calcDate);
    if (!dayData) {
      dayData = {
        date: calcDate,
        totalHours: 0,
        recordCount: 0,
        codeSummary: {},
      };
      employee.days.push(dayData);
      employee.totalDays++;
    }

    dayData.totalHours += result.actualHours;
    dayData.recordCount++;

    // 按出勤代码汇总（日期级别）
    if (!dayData.codeSummary[codeName]) {
      dayData.codeSummary[codeName] = {
        codeName,
        totalHours: 0,
        count: 0,
        accounts: new Set<string>(),
      };
    }
    dayData.codeSummary[codeName].totalHours += result.actualHours;
    dayData.codeSummary[codeName].count++;
    if (result.accountName) {
      dayData.codeSummary[codeName].accounts.add(result.accountName);
    }

    // 按出勤代码汇总（员工级别）
    if (!employee.codeSummary[codeName]) {
      employee.codeSummary[codeName] = {
        codeName,
        totalHours: 0,
        count: 0,
        dayCount: 0,
        accounts: new Set<string>(),
        dates: new Set<string>(),
      };
    }
    employee.codeSummary[codeName].totalHours += result.actualHours;
    employee.codeSummary[codeName].count++;
    employee.codeSummary[codeName].dates.add(calcDate);
    if (result.accountName) {
      employee.codeSummary[codeName].accounts.add(result.accountName);
    }
  });

  // 转换Set为数组，并将codeSummary对象转换为数组
  Object.values(employeeMap).forEach((employee: any) => {
    employee.days.sort((a: any, b: any) => a.date.localeCompare(b.date));
    employee.days.forEach((day: any) => {
      Object.keys(day.codeSummary).forEach(codeName => {
        day.codeSummary[codeName].accounts = Array.from(day.codeSummary[codeName].accounts);
      });
      day.codeSummary = Object.values(day.codeSummary);
    });
    Object.keys(employee.codeSummary).forEach(codeName => {
      employee.codeSummary[codeName].dayCount = employee.codeSummary[codeName].dates.size;
      employee.codeSummary[codeName].accounts = Array.from(employee.codeSummary[codeName].accounts);
    });
    employee.codeSummary = Object.values(employee.codeSummary);
  });

  return Object.values(employeeMap).sort((a: any, b: any) => {
    return a.employeeNo.localeCompare(b.employeeNo);
  });
}

// 生成日期列的辅助函数
function getDateColumns(
  dates: string[],
  onCodeClick: (employeeNo: string, employeeName: string, date: string, codeName: string, e: React.MouseEvent) => void
) {
  console.log('getDateColumns 接收到的 dates:', dates);

  // 为每个日期生成列
  const columns = dates.map((date: string) => {
    // 在外层捕获当前日期，避免闭包问题
    const currentDate = date;
    const column = {
      title: dayjs(currentDate).format('MM-DD'),
      dataIndex: currentDate,
      key: currentDate,
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const dayData = record.days?.find((d: any) => d.date === currentDate);

        // 如果没有数据，显示"-"
        if (!dayData || !dayData.codeSummary || dayData.codeSummary.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }

        return (
          <div style={{ padding: '4px 0' }}>
            {dayData.codeSummary.map((code: any, idx: number) => (
              <div
                key={code.codeName}
                style={{
                  fontSize: 11,
                  marginBottom: idx < dayData.codeSummary.length - 1 ? 6 : 0,
                  padding: '4px 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={(e) => onCodeClick(record.employeeNo, record.employeeName, currentDate, code.codeName, e)}
              >
                <div style={{ fontSize: 11, color: '#595959', marginBottom: 2 }}>
                  {code.codeName}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                  {code.totalHours.toFixed(2)}h
                </div>
              </div>
            ))}
          </div>
        );
      },
    };

    console.log(`生成列: ${currentDate}, title: ${column.title}`);

    return column;
  });

  console.log('总共生成了', columns.length, '列');
  console.log('列的标题:', columns.map(col => col.title));

  return columns;
}

// 出勤代码明细内容组件
interface CodeDetailContentProps {
  calcResults: any[];
  employeeNo: string;
  date: string;
  attendanceCodeName: string;
}

const CodeDetailContent: React.FC<CodeDetailContentProps> = ({
  calcResults,
  employeeNo,
  date,
  attendanceCodeName,
}) => {
  // 筛选符合条件的记录
  const filteredResults = calcResults.filter((result) => {
    return (
      result.employeeNo === employeeNo &&
      dayjs(result.calcDate).format('YYYY-MM-DD') === date &&
      result.attendanceCode?.name === attendanceCodeName
    );
  });

  // 按劳动力账户分组
  const groupedByAccount = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    filteredResults.forEach((result) => {
      const accountName = result.accountName || '未分配';
      if (!groups[accountName]) {
        groups[accountName] = [];
      }
      groups[accountName].push(result);
    });

    return groups;
  }, [filteredResults]);

  // 计算总工时
  const totalHours = useMemo(() => {
    return filteredResults.reduce((sum, r) => sum + (r.actualHours || 0), 0);
  }, [filteredResults]);

  if (filteredResults.length === 0) {
    return <Empty description="暂无明细数据" />;
  }

  return (
    <div>
      {/* 汇总信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
        <Space size="large">
          <Text>
            总工时：<Text strong style={{ color: '#10b981', fontSize: 16 }}>
              {totalHours.toFixed(2)}h
            </Text>
          </Text>
          <Text type="secondary">
            共 {filteredResults.length} 笔明细
          </Text>
          <Text type="secondary">
            分组：{Object.keys(groupedByAccount).length} 个劳动力账户
          </Text>
        </Space>
      </div>

      {/* 按账户分组显示 */}
      {Object.entries(groupedByAccount).map(([accountName, records]) => {
        const accountTotalHours = records.reduce((sum, r) => sum + (r.actualHours || 0), 0);

        return (
          <Card
            key={accountName}
            size="small"
            style={{ marginBottom: 12, borderRadius: 8 }}
            title={
              <Space>
                <Tag color="orange">{accountName}</Tag>
                <Text strong style={{ color: '#10b981' }}>
                  {accountTotalHours.toFixed(2)}h
                </Text>
                <Text type="secondary">({records.length} 笔)</Text>
              </Space>
            }
            bodyStyle={{ padding: '12px 16px' }}
          >
            {records.map((record, index) => {
              const startTime = record.punchInTime
                ? dayjs(record.punchInTime).format('HH:mm:ss')
                : '-';
              const endTime = record.punchOutTime
                ? dayjs(record.punchOutTime).format('HH:mm:ss')
                : '-';

              return (
                <div
                  key={record.id}
                  style={{
                    padding: '8px 12px',
                    background: index % 2 === 0 ? '#fafafa' : '#fff',
                    borderRadius: 4,
                    marginBottom: index < records.length - 1 ? 8 : 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space size="large">
                    <Text style={{ minWidth: 180 }}>
                      <Text type="secondary" style={{ marginRight: 8 }}>
                        时间段：
                      </Text>
                      <Text style={{ fontFamily: 'monospace' }}>
                        {startTime} ~ {endTime}
                      </Text>
                    </Text>

                    {record.shiftName && (
                      <Tag color="blue">{record.shiftName}</Tag>
                    )}
                  </Space>

                  <Text strong style={{ color: '#6366f1', fontSize: 14 }}>
                    {record.actualHours?.toFixed(2) || 0}h
                  </Text>
                </div>
              );
            })}
          </Card>
        );
      })}
    </div>
  );
};

export default WorkHourResultsTab;

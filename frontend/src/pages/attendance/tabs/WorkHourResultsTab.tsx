import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Divider,
} from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  UserOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Text } = Typography;

interface WorkHourResultsTabProps {
  selectedDateRange: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  selectedEmployee?: string;
}

type ViewMode = 'summary' | 'timeline' | 'detail';

const WorkHourResultsTab: React.FC<WorkHourResultsTabProps> = ({
  selectedDateRange,
  selectedEmployee,
}) => {
  // 根据日期范围决定默认视图：单日显示时间刻度视图，多日显示汇总视图
  const isSingleDay = selectedDateRange.start.isSame(selectedDateRange.end, 'day');
  const defaultViewMode: ViewMode = isSingleDay ? 'timeline' : 'summary';

  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [selectedAttendanceCode, setSelectedAttendanceCode] = useState<string | null>(null);

  // 当日期范围变化时，切换到合适的视图模式
  useEffect(() => {
    const newMode: ViewMode = isSingleDay ? 'timeline' : 'summary';
    if ((viewMode === 'timeline' && !isSingleDay) || (viewMode === 'summary' && isSingleDay)) {
      setViewMode(newMode);
    }
  }, [isSingleDay]);

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

  // 获取工时结果（从 WorkHourResult 表）
  const { data: workHourResults, isLoading } = useQuery({
    queryKey: ['workHourResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), selectedEmployee],
    queryFn: () =>
      request.get('/allocation/work-hours', {
        params: {
          startDate: selectedDateRange.start.format('YYYY-MM-DD'),
          endDate: selectedDateRange.end.format('YYYY-MM-DD'),
          employeeNo: selectedEmployee,
          pageSize: 1000,
        },
      }).then((res: any) => {
        // 返回 WorkHourResult 数据
        return res.items || [];
      }),
  });

  // 计算汇总统计（按出勤代码）
  const codeSummary = useMemo(() => {
    return calculateCodeSummary(workHourResults || []);
  }, [workHourResults]);

  // 按员工分组数据
  const employeeGroups = useMemo(() => {
    return groupByEmployee(workHourResults || []);
  }, [workHourResults]);

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

  if (!workHourResults || workHourResults.length === 0) {
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
        style={{ marginBottom: 12, borderRadius: 12 }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[12, 12]}>
          {codeSummary.map((item: any) => (
            <Col span={8} key={item.codeName}>
              <Card
                bordered={false}
                style={{
                  background: '#fff',
                  borderRadius: 6,
                  height: '100%',
                  border: `1px solid ${item.color}`,
                  borderLeftWidth: '3px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
                bodyStyle={{ padding: '10px 12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Tag color={item.color} style={{ marginBottom: 4, fontSize: 11, padding: '0 6px' }}>
                      {item.codeName}
                    </Tag>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 20, fontWeight: 600, color: item.color }}>
                        {item.totalHours.toFixed(2)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>小时</Text>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      <UserOutlined style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11 }} />
                      <Text style={{ fontSize: 16, fontWeight: 600 }}>
                        {item.employeeCount}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 10 }}>人</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 9, display: 'block', marginTop: 2 }}>
                      {item.recordCount} 条
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
              {viewMode === 'summary' ? '汇总视图' : viewMode === 'timeline' ? '时间刻度视图' : '明细视图'}
            </Text>
            <Text type="secondary">
              查询区间：{selectedDateRange.start.format('YYYY-MM-DD')} ~ {selectedDateRange.end.format('YYYY-MM-DD')}，
              共 {allDatesInScope.length} 天，
              {allEmployees ? allEmployees.length : 0} 人，
              {workHourResults?.length || 0} 条工时记录
            </Text>
          </Space>
          <Button.Group>
            {/* 单日时显示时间刻度视图按钮 */}
            {isSingleDay && (
              <Button
                type={viewMode === 'timeline' ? 'primary' : 'default'}
                icon={<ClockCircleOutlined />}
                onClick={() => setViewMode('timeline')}
              >
                时间刻度视图
              </Button>
            )}
            {/* 多日时显示汇总视图按钮 */}
            {!isSingleDay && (
              <Button
                type={viewMode === 'summary' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('summary')}
              >
                汇总视图
              </Button>
            )}
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

      {/* 时间刻度视图（单日模式） */}
      {viewMode === 'timeline' && (
        <TimelineView
          workHourResults={workHourResults || []}
          selectedDate={selectedDateRange.start}
          allEmployees={allEmployees || []}
        />
      )}

      {/* 明细视图 */}
      {viewMode === 'detail' && (
        <DetailListView
          workHourResults={workHourResults || []}
          allEmployees={allEmployees || []}
          selectedDateRange={selectedDateRange}
        />
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
            workHourResults={workHourResults || []}
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
    title: '计算日期',
    dataIndex: 'calcDate',
    key: 'calcDate',
    width: 120,
    render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
  },
  {
    title: '定义出勤代码',
    dataIndex: 'definitionAttendanceCode',
    key: 'definitionAttendanceCode',
    width: 140,
    render: (code: any) => (
      code ? <Tag color="blue">{code.name || code.code || '-'}</Tag> : <Tag type="secondary">未配置</Tag>
    ),
  },
  {
    title: '计算出勤代码',
    dataIndex: 'calcAttendanceCode',
    key: 'calcAttendanceCode',
    width: 120,
    render: (code: string) => <Tag color="purple">{code || '-'}</Tag>,
  },
  {
    title: '班次',
    dataIndex: 'shiftName',
    key: 'shiftName',
    width: 100,
    render: (name: string) => (name ? <Tag color="cyan">{name}</Tag> : '-'),
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    width: 100,
    render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    key: 'endTime',
    width: 100,
    render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
  },
  {
    title: '劳动力账户',
    dataIndex: 'accountName',
    key: 'accountName',
    width: 250,
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
    title: '工时',
    dataIndex: 'workHours',
    key: 'workHours',
    width: 100,
    render: (hours: number) => (
      <Text strong style={{ color: '#00B365', fontSize: 14 }}>
        {hours?.toFixed(2) || 0}h
      </Text>
    ),
  },
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    width: 80,
    render: (source: number) => {
      const sourceMap: Record<number, { text: string; color: string }> = {
        1: { text: '计算', color: 'blue' },
        2: { text: '报工', color: 'green' },
        3: { text: '手动', color: 'orange' },
      };
      const info = sourceMap[source] || { text: '未知', color: 'default' };
      return <Tag color={info.color}>{info.text}</Tag>;
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    render: (status: string) => {
      const statusMap: Record<string, { text: string; color: string }> = {
        DRAFT: { text: '草稿', color: 'default' },
        CONFIRMED: { text: '已确认', color: 'success' },
      };
      const info = statusMap[status] || { text: status, color: 'default' };
      return <Tag color={info.color}>{info.text}</Tag>;
    },
  },
  {
    title: '批次ID',
    dataIndex: 'sourceBatchId',
    key: 'sourceBatchId',
    width: 200,
    ellipsis: true,
    render: (batchId: string) => (
      <Tooltip title={batchId}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {batchId || '-'}
        </Text>
      </Tooltip>
    ),
  },
];

// 计算按出勤代码的汇总统计
function calculateCodeSummary(workHourResults: any[]) {
  const summary: any = {};

  workHourResults.forEach((result) => {
    // 检查是否在工时明细页面显示
    const showInDetailPage = result.definitionAttendanceCode?.showInDetailPage;
    if (showInDetailPage === false) {
      return; // 跳过不显示的出勤代码
    }

    // 优先使用定义出勤代码的名称，其次使用 code，最后使用计算出勤代码
    const codeName = result.definitionAttendanceCode?.name ||
                     result.definitionAttendanceCodeStr ||
                     result.calcAttendanceCode ||
                     '未分类';
    const employeeNo = result.employeeNo;
    // 获取定义的颜色
    const color = result.definitionAttendanceCode?.color || '#1890ff';

    if (!summary[codeName]) {
      summary[codeName] = {
        codeName,
        totalHours: 0,
        employeeCount: 0,
        recordCount: 0,
        employees: new Set(),
        color, // ✅ 添加颜色
      };
    }

    summary[codeName].totalHours += result.workHours || 0;
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
function groupByEmployee(workHourResults: any[]) {
  const employeeMap: any = {};

  workHourResults.forEach((result) => {
    // 检查是否在工时明细页面显示
    const showInDetailPage = result.definitionAttendanceCode?.showInDetailPage;
    if (showInDetailPage === false) {
      return; // 跳过不显示的出勤代码
    }

    const employeeNo = result.employeeNo;
    const employeeName = result.employee?.name || employeeNo;
    const calcDate = dayjs(result.calcDate).format('YYYY-MM-DD');
    // 优先使用定义出勤代码的名称，其次使用 code，最后使用计算出勤代码
    const codeName = result.definitionAttendanceCode?.name ||
                     result.definitionAttendanceCodeStr ||
                     result.calcAttendanceCode ||
                     '未分类';

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
    employee.totalHours += result.workHours || 0;
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

    dayData.totalHours += result.workHours || 0;
    dayData.recordCount++;

    // 按出勤代码汇总（日期级别）
    if (!dayData.codeSummary[codeName]) {
      const color = result.definitionAttendanceCode?.color || '#1890ff';
      dayData.codeSummary[codeName] = {
        codeName,
        totalHours: 0,
        count: 0,
        color, // ✅ 添加颜色
      };
    }
    dayData.codeSummary[codeName].totalHours += result.workHours || 0;
    dayData.codeSummary[codeName].count++;

    // 按出勤代码汇总（员工级别）
    if (!employee.codeSummary[codeName]) {
      employee.codeSummary[codeName] = {
        codeName,
        totalHours: 0,
        count: 0,
        dayCount: 0,
        dates: new Set<string>(),
      };
    }
    employee.codeSummary[codeName].totalHours += result.workHours || 0;
    employee.codeSummary[codeName].count++;
    employee.codeSummary[codeName].dates.add(calcDate);
  });

  // 转换Set为数组，并将codeSummary对象转换为数组
  Object.values(employeeMap).forEach((employee: any) => {
    employee.days.sort((a: any, b: any) => a.date.localeCompare(b.date));
    employee.days.forEach((day: any) => {
      day.codeSummary = Object.values(day.codeSummary);
    });
    Object.keys(employee.codeSummary).forEach(codeName => {
      employee.codeSummary[codeName].dayCount = employee.codeSummary[codeName].dates.size;
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
                  padding: '6px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  borderRadius: 4,
                  backgroundColor: `${code.color}15`, // ✅ 使用颜色作为背景色，15表示约8%透明度
                  border: `1px solid ${code.color}40`, // ✅ 使用颜色作为边框，40表示约25%透明度
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${code.color}25`; // 悬停时增加透明度
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${code.color}15`;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={(e) => onCodeClick(record.employeeNo, record.employeeName, currentDate, code.codeName, e)}
              >
                <div style={{ fontSize: 11, fontWeight: 500, color: code.color, marginBottom: 2 }}>
                  {code.codeName}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: code.color }}>
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
  workHourResults: any[];
  employeeNo: string;
  date: string;
  attendanceCodeName: string;
}

const CodeDetailContent: React.FC<CodeDetailContentProps> = ({
  workHourResults,
  employeeNo,
  date,
  attendanceCodeName,
}) => {
  // 筛选符合条件的记录
  const filteredResults = workHourResults.filter((result) => {
    return (
      result.employeeNo === employeeNo &&
      dayjs(result.calcDate).format('YYYY-MM-DD') === date &&
      (result.definitionAttendanceCodeStr === attendanceCodeName ||
       result.definitionAttendanceCode?.name === attendanceCodeName ||
       result.calcAttendanceCode === attendanceCodeName)
    );
  });

  // 计算总工时
  const totalHours = useMemo(() => {
    return filteredResults.reduce((sum, r) => sum + (r.workHours || 0), 0);
  }, [filteredResults]);

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

    // 为每个账户计算小计
    const groupSummary = Object.entries(groups).map(([accountName, records]) => {
      const accountHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
      return {
        accountName,
        records,
        accountHours,
      };
    });

    return groupSummary.sort((a, b) => b.accountHours - a.accountHours);
  }, [filteredResults]);

  if (filteredResults.length === 0) {
    return <Empty description="暂无明细数据" />;
  }

  const employee = filteredResults[0]?.employee;
  const definitionCode = filteredResults[0]?.definitionAttendanceCode;

  return (
    <div>
      {/* 第一层：员工信息汇总 */}
      <div style={{ marginBottom: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae7ff' }}>
        <Space size="large" wrap>
          <div>
            <Text type="secondary">员工工号：</Text>
            <Text strong style={{ fontSize: 15 }}>{employeeNo}</Text>
          </div>
          <div>
            <Text type="secondary">姓名：</Text>
            <Text strong style={{ fontSize: 15 }}>{employee?.name || '-'}</Text>
          </div>
          <div>
            <Text type="secondary">日期：</Text>
            <Text strong style={{ fontSize: 15 }}>{date}</Text>
          </div>
          <div>
            <Text type="secondary">出勤代码：</Text>
            <Tag color="blue" style={{ fontSize: 14 }}>
              {definitionCode?.name || definitionCode?.code || attendanceCodeName}
            </Tag>
          </div>
          <div>
            <Text type="secondary">总工时：</Text>
            <Text strong style={{ color: '#10b981', fontSize: 18 }}>
              {totalHours.toFixed(2)}h
            </Text>
          </div>
        </Space>
      </div>

      {/* 第二层：按劳动力账户分组 */}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {groupedByAccount.map(({ accountName, records, accountHours }) => (
          <Card
            key={accountName}
            size="small"
            title={
              <Space>
                <Text strong>劳动力账户：</Text>
                <Tag color="orange" style={{ maxWidth: 500 }}>
                  {accountName}
                </Tag>
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  小计：
                </Text>
                <Text strong style={{ color: '#10b981', fontSize: 16 }}>
                  {accountHours.toFixed(2)}h
                </Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({records.length} 笔)
                </Text>
              </Space>
            }
            style={{ borderRadius: 8 }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            {/* 第三层：时间段明细 */}
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {records.map((record, index) => (
                <div
                  key={record.id}
                  style={{
                    padding: '10px 14px',
                    background: index % 2 === 0 ? '#fafafa' : '#fff',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space size="large">
                    <Text type="secondary">时间段：</Text>
                    {record.startTime && record.endTime ? (
                      <>
                        <Text code style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 500 }}>
                          {dayjs(record.startTime).format('HH:mm:ss')}
                        </Text>
                        <Text type="secondary" style={{ margin: '0 4px', fontSize: 15 }}>~</Text>
                        <Text code style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 500 }}>
                          {dayjs(record.endTime).format('HH:mm:ss')}
                        </Text>
                      </>
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </Space>

                  {/* 工时 */}
                  <Text strong style={{ color: '#00B365', fontSize: 16, minWidth: 80, textAlign: 'right' }}>
                    {record.workHours?.toFixed(2)}h
                  </Text>
                </div>
              ))}
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
};

// === 明细列表视图组件 ===
interface DetailListViewProps {
  workHourResults: any[];
  allEmployees: any[];
  selectedDateRange: { start: dayjs.Dayjs; end: dayjs.Dayjs };
}

const DetailListView: React.FC<DetailListViewProps> = ({
  workHourResults,
  allEmployees,
  selectedDateRange,
}) => {
  // 生成日期区间内的所有日期
  const allDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = selectedDateRange.start.startOf('day');
    const endDate = selectedDateRange.end.startOf('day');

    let currentDate = startDate;
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }

    return dates;
  }, [selectedDateRange]);

  // 按员工和日期分组数据
  const employeeDateData = useMemo(() => {
    const data: { [key: string]: { [key: string]: any[] } } = {};

    workHourResults.forEach((record) => {
      const employeeNo = record.employeeNo;
      const dateStr = dayjs(record.calcDate).format('YYYY-MM-DD');

      if (!data[employeeNo]) {
        data[employeeNo] = {};
      }
      if (!data[employeeNo][dateStr]) {
        data[employeeNo][dateStr] = [];
      }
      data[employeeNo][dateStr].push(record);
    });

    return data;
  }, [workHourResults]);

  // 获取员工列表（使用查询条件中的所有员工）
  const employeeList = useMemo(() => {
    if (allEmployees.length === 0) {
      // 如果没有传入员工列表，从数据中提取
      const employeeMap = new Map<string, { name: string; no: string }>();
      workHourResults.forEach((r) => {
        if (!employeeMap.has(r.employeeNo)) {
          employeeMap.set(r.employeeNo, {
            name: r.employee?.name || r.employeeNo,
            no: r.employeeNo,
          });
        }
      });
      return Array.from(employeeMap.values()).map((emp, idx) => ({
        employeeNo: emp.no,
        employeeName: emp.name,
      }));
    }

    return allEmployees.map((emp: any) => ({
      employeeNo: emp.employeeNo,
      employeeName: emp.name,
    }));
  }, [allEmployees, workHourResults]);

  if (workHourResults.length === 0) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty description="暂无工时数据" />
      </Card>
    );
  }

  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
              {/* 员工信息列 */}
              <th style={{
                padding: '16px',
                textAlign: 'left',
                fontWeight: 500,
                fontSize: 13,
                color: '#5A6A87',
                border: '1px solid #f0f0f0',
                position: 'sticky',
                left: 0,
                background: '#fafafa',
                zIndex: 10,
                minWidth: 200,
              }}>
                员工
              </th>
              {/* 日期列 */}
              {allDates.map((date) => (
                <th key={date} style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#5A6A87',
                  border: '1px solid #f0f0f0',
                  minWidth: 280,
                }}>
                  <div style={{ marginBottom: 4 }}>
                    {dayjs(date).format('MM-DD')}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(date).format('dddd')}
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employeeList.map(({ employeeNo, employeeName }) => {
              const employeeData = employeeDateData[employeeNo] || {};

              return (
                <tr key={employeeNo} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {/* 员工信息 */}
                  <td style={{
                    padding: '16px',
                    border: '1px solid #f0f0f0',
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    zIndex: 5,
                  }}>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>{employeeName}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{employeeNo}</Text>
                    </div>
                  </td>

                  {/* 日期明细 */}
                  {allDates.map((date) => {
                    const records = employeeData[date] || [];

                    return (
                      <td key={date} style={{
                        padding: '12px 16px',
                        border: '1px solid #f0f0f0',
                        verticalAlign: 'top',
                      }}>
                        {records.length === 0 ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
                        ) : (
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {records.map((record, index) => {
                              const color = record.definitionAttendanceCode?.color || '#1890ff';
                              const codeName = record.definitionAttendanceCode?.name ||
                                             record.definitionAttendanceCodeStr ||
                                             record.calcAttendanceCode ||
                                             '未分类';

                              return (
                                <div
                                  key={record.id}
                                  style={{
                                    padding: '8px 12px',
                                    background: `${color}10`,
                                    border: `1px solid ${color}40`,
                                    borderRadius: 4,
                                    fontSize: 11,
                                  }}
                                >
                                  {/* 第1行：出勤代码 + 时数 */}
                                  <div style={{ marginBottom: 4 }}>
                                    <Tag color={color} style={{ fontSize: 11, margin: 0, padding: '0 4px' }}>
                                      {codeName}
                                    </Tag>
                                    <Text strong style={{ marginLeft: 8, color, fontSize: 12 }}>
                                      {record.workHours?.toFixed(2)}h
                                    </Text>
                                  </div>

                                  {/* 第2行：时间段 */}
                                  {record.startTime && record.endTime ? (
                                    <div style={{ marginBottom: 4, color: '#5A6A87' }}>
                                      {dayjs(record.startTime).format('HH:mm')} ~ {dayjs(record.endTime).format('HH:mm')}
                                    </div>
                                  ) : (
                                    <div style={{ marginBottom: 4, color: '#8C96A8' }}>-</div>
                                  )}

                                  {/* 第3行：劳动力账户 */}
                                  <div style={{
                                    color: '#5A6A87',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {record.accountName || '未分配'}
                                  </div>
                                </div>
                              );
                            })}
                          </Space>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// === 时间刻度视图组件 ===
interface TimelineViewProps {
  workHourResults: any[];
  selectedDate: dayjs.Dayjs;
  allEmployees: any[];
}

const TimelineView: React.FC<TimelineViewProps> = ({
  workHourResults,
  selectedDate,
  allEmployees,
}) => {
  // 筛选当天数据
  const dayResults = useMemo(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return workHourResults.filter((r) =>
      dayjs(r.calcDate).format('YYYY-MM-DD') === dateStr
    );
  }, [workHourResults, selectedDate]);

  // 计算时间刻度范围（处理跨夜情况）
  const timeRange = useMemo(() => {
    if (dayResults.length === 0) {
      return { start: 0, end: 1440 }; // 默认 00:00 - 24:00
    }

    let minStart = 1440; // 24:00
    let maxEnd = 0; // 00:00

    dayResults.forEach((record) => {
      if (record.startTime && record.endTime) {
        const start = dayjs(record.startTime);
        const end = dayjs(record.endTime);

        // 转换为当天的绝对分钟数
        const startMinutes = start.hour() * 60 + start.minute();
        const endMinutes = end.hour() * 60 + end.minute();

        // 如果结束时间小于开始时间，说明跨夜，结束时间加24小时
        const adjustedEnd = endMinutes < startMinutes ? endMinutes + 1440 : endMinutes;

        minStart = Math.min(minStart, startMinutes);
        maxEnd = Math.max(maxEnd, adjustedEnd);
      }
    });

    // 如果没有有效的开始结束时间，使用默认范围
    if (minStart === 1440 && maxEnd === 0) {
      return { start: 0, end: 1440 };
    }

    // 向下取整到最近的30分钟刻度
    const start = Math.floor(minStart / 30) * 30;
    // 向上取整到最近的30分钟刻度
    const end = Math.ceil(maxEnd / 30) * 30;

    return { start, end };
  }, [dayResults]);

  // 生成时间刻度（每30分钟一个刻度）
  const timeScales = useMemo(() => {
    const scales: number[] = [];
    for (let t = timeRange.start; t <= timeRange.end; t += 30) {
      scales.push(t);
    }
    return scales;
  }, [timeRange]);

  // 格式化分钟数为 HH:mm
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const day = Math.floor(minutes / 1440);
    const dayText = day === 0 ? '' : day === 1 ? '次日 ' : day === -1 ? '前日 ' : `${day > 0 ? '+' : ''}${day}日 `;
    return `${dayText}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // 按员工分组数据
  const employeeTimelineData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    dayResults.forEach((record) => {
      const employeeNo = record.employeeNo;
      if (!groups[employeeNo]) {
        groups[employeeNo] = [];
      }
      groups[employeeNo].push(record);
    });

    // 为每个员工计算时间条位置
    return Object.entries(groups).map(([employeeNo, records]) => {
      const employee = records[0]?.employee;
      const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);

      const timelineBars = records.map((record) => {
        if (!record.startTime || !record.endTime) {
          return null;
        }

        const start = dayjs(record.startTime);
        const end = dayjs(record.endTime);
        let startMinutes = start.hour() * 60 + start.minute();
        let endMinutes = end.hour() * 60 + end.minute();

        // 处理跨夜：如果结束时间小于开始时间，说明跨夜，结束时间加24小时
        const isOvernight = endMinutes < startMinutes;
        if (isOvernight) {
          endMinutes += 1440;
        }

        const color = record.definitionAttendanceCode?.color || '#1890ff';
        const codeName = record.definitionAttendanceCode?.name ||
                        record.definitionAttendanceCodeStr ||
                        record.calcAttendanceCode ||
                        '未分类';

        return {
          id: record.id,
          startMinutes,
          endMinutes,
          left: ((startMinutes - timeRange.start) / (timeRange.end - timeRange.start)) * 100,
          width: ((endMinutes - startMinutes) / (timeRange.end - timeRange.start)) * 100,
          color,
          codeName,
          accountName: record.accountName || '未分配',
          workHours: record.workHours,
          startTime: start.format('HH:mm:ss'),
          endTime: end.format('HH:mm:ss'),
          isOvernight,
        };
      }).filter(Boolean);

      return {
        employeeNo,
        employeeName: employee?.name || employeeNo,
        employee,
        totalHours,
        timelineBars,
      };
    }).sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));
  }, [dayResults, timeRange]);

  if (dayResults.length === 0) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty description="所选日期暂无工时数据" />
      </Card>
    );
  }

  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 24 }}
    >
      {/* 时间刻度表头 */}
      <div style={{ marginBottom: 16, paddingLeft: 200 }}>
        <div style={{ position: 'relative', height: 40 }}>
          {timeScales.map((minutes, index) => {
            const left = ((minutes - timeRange.start) / (timeRange.end - timeRange.start)) * 100;
            const showLabel = index % 2 === 0; // 每隔一个刻度显示标签
            return (
              <div
                key={minutes}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 8,
                    background: '#d9d9d9',
                  }}
                />
                {showLabel && (
                  <Text style={{ fontSize: 11, color: '#8c96a8', marginTop: 4 }}>
                    {formatMinutes(minutes)}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 员工时间轴列表 */}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {employeeTimelineData.map(({ employeeNo, employeeName, employee, totalHours, timelineBars }) => (
          <div
            key={employeeNo}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              transition: 'all 0.2s',
            }}
          >
            {/* 左侧：员工信息 */}
            <div style={{
              width: 200,
              flexShrink: 0,
              paddingRight: 16,
              borderRight: '1px solid #f0f0f0',
            }}>
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: 14 }}>{employeeName}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  {employeeNo}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                共 {timelineBars.length} 笔 · {totalHours.toFixed(2)}h
              </Text>
            </div>

            {/* 右侧：时间刻度 */}
            <div style={{
              flex: 1,
              position: 'relative',
              height: 60,
              minWidth: 0,
            }}>
              {/* 背景网格线 */}
              {timeScales.map((minutes) => {
                const left = ((minutes - timeRange.start) / (timeRange.end - timeRange.start)) * 100;
                return (
                  <div
                    key={minutes}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: minutes % 60 === 0 ? '#e5e8ed' : '#f5f5f5',
                      zIndex: 0,
                    }}
                  />
                );
              })}

              {/* 时间条 */}
              {timelineBars.map((bar: any) => (
                <Tooltip
                  key={bar.id}
                  title={
                    <div>
                      <div>{bar.codeName}</div>
                      <div>时间：{bar.startTime} ~ {bar.endTime}</div>
                      <div>账户：{bar.accountName}</div>
                      <div>工时：{bar.workHours?.toFixed(2)}h</div>
                    </div>
                  }
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: `${bar.left}%`,
                      width: `${Math.max(bar.width, 2)}%`,
                      top: 16,
                      height: 28,
                      background: bar.color,
                      borderRadius: 4,
                      cursor: 'pointer',
                      zIndex: 1,
                      transition: 'all 0.2s',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scaleY(1.1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scaleY(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        padding: '0 8px',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: '#fff',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {bar.width > 5 ? bar.codeName : ''}
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </Space>
    </Card>
  );
};

export default WorkHourResultsTab;

import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Space,
  Tag,
  Input,
  Popconfirm,
  Divider,
  Checkbox,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  CalendarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import AccountSelect from '@/components/common/AccountSelect';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';

interface ScheduleItem {
  id: number;
  employeeId?: number;
  scheduleDate: string;
  shiftId: number;
  shiftName: string;
  shiftColor?: string;
  adjustedStart?: string;
  adjustedEnd?: string;
  status: string;
  segments?: ScheduleSegmentItem[];
}

interface ScheduleSegmentItem {
  id?: number;
  type: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  accountId?: number;
}

interface EmployeeItem {
  id: number;
  employeeNo: string;
  name: string;
  orgName: string;
  schedules: ScheduleItem[];
  key: string;
}

const SchedulePage: React.FC = () => {
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    month: dayjs(),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [searchForm] = useState<any>(null);

  // 选中的员工和日期
  const [selectedEmployeeKeys, setSelectedEmployeeKeys] = useState<React.Key[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 批量排班对话框
  const [batchScheduleModalOpen, setBatchScheduleModalOpen] = useState(false);
  const [batchForm] = Form.useForm();

  // 复制排班对话框
  const [copyScheduleModalOpen, setCopyScheduleModalOpen] = useState(false);
  const [copyForm] = Form.useForm();

  // 编辑排班对话框
  const [editScheduleModalOpen, setEditScheduleModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [editingSegments, setEditingSegments] = useState<ScheduleSegmentItem[]>([]);

  // 获取班次列表
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => request.get('/shift/shifts').then((res: any) => res),
  });

  // 获取层级配置
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () => request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取组织架构树
  const { data: orgTree } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 获取人事信息配置（用于非组织层级字段）
  const { data: employeeInfoConfigs } = useQuery({
    queryKey: ['employee-info-configs'],
    queryFn: () => request.get('/hr/employee-info-configs').then((res: any) => res || []),
  });

  // 获取子账户列表
  const { data: accounts } = useQuery({
    queryKey: ['accounts', 'SUB'],
    queryFn: () => request.get('/account/accounts?type=SUB&sortBy=createdAt&sortOrder=desc').then((res: any) => {
      // 处理可能返回的不同数据结构
      if (Array.isArray(res)) return res;
      if (res?.items && Array.isArray(res.items)) return res.items;
      if (res?.data && Array.isArray(res.data)) return res.data;
      return [];
    }),
  });

  // 获取组织列表
  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => request.get('/hr/organizations').then((res: any) => res),
  });

  // 获取所有员工列表
  const { data: allEmployees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res),
  });

  // 获取排班数据
  const { data: scheduleData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', filters.month.format('YYYY-MM')],
    queryFn: async () => {
      const params: any = {
        startDate: filters.month.startOf('month').format('YYYY-MM-DD'),
        endDate: filters.month.endOf('month').format('YYYY-MM-DD'),
      };

      const res = await request.get('/shift/schedules/calendar', { params });
      return res;
    },
    enabled: !!filters.month,
  });

  const isLoading = employeesLoading || schedulesLoading;

  // 处理员工数据
  const employees: EmployeeItem[] = useMemo(() => {
    if (!allEmployees) return [];

    // 确保allEmployees是数组
    const employeeList = Array.isArray(allEmployees) ? allEmployees : (allEmployees?.items || []);

    // 先创建所有员工的基础数据
    const employeeMap = new Map<number, EmployeeItem>();

    employeeList.forEach((emp: any) => {
      employeeMap.set(Number(emp.id), {
        id: Number(emp.id),
        employeeNo: emp.employeeNo,
        name: emp.name,
        orgName: emp.org?.name || '-',
        schedules: [],
        key: emp.id.toString(),
      });
    });

    // 然后关联排班数据
    if (scheduleData) {
      // 确保 scheduleData 是数组
      const scheduleList = Array.isArray(scheduleData) ? scheduleData : [];

      scheduleList.forEach((item: any) => {
        const emp = item.employee;
        if (emp && item.scheduleDate) {
          const empId = Number(emp.id);
          const empInMap = employeeMap.get(empId);

          if (empInMap) {
            empInMap.schedules.push({
              id: item.id,
              scheduleDate: item.scheduleDate,
              shiftId: item.shiftId,
              shiftName: item.shift?.name || '-',
              shiftColor: item.shift?.color,
              adjustedStart: item.adjustedStart,
              adjustedEnd: item.adjustedEnd,
              status: item.status,
              segments: item.segments || [], // 包含班段信息（已合并覆盖数据）
            });
          }
        }
      });
    }

    // 对每个员工的排班按日期排序
    employeeMap.forEach((emp) => {
      emp.schedules.sort((a, b) => dayjs(a.scheduleDate).isBefore(dayjs(b.scheduleDate)) ? -1 : 1);
    });

    const result = Array.from(employeeMap.values());

    return result;
  }, [allEmployees, scheduleData]);

  // 过滤后的员工列表
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 使用动态搜索条件进行过滤
      if (!dynamicFilters || Object.keys(dynamicFilters).length === 0) return true;

      // 如果有动态搜索条件，进行简单的文本匹配
      const hasTextFilter = Object.keys(dynamicFilters).some(key => {
        const value = dynamicFilters[key];
        if (!value) return false;
        const searchValue = value.toString().toLowerCase();
        return (
          emp.name.toLowerCase().includes(searchValue) ||
          emp.employeeNo.toLowerCase().includes(searchValue)
        );
      });

      return hasTextFilter || Object.keys(dynamicFilters).length === 0 || !Object.values(dynamicFilters).some(v => v);
    });
  }, [employees, dynamicFilters]);

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  // 生成日期列
  const dateColumns = useMemo(() => {
    const columns: any[] = [];
    const startDate = filters.month.startOf('month');
    const endDate = filters.month.endOf('month');
    const daysDiff = endDate.diff(startDate, 'day') + 1;

    for (let i = 0; i < daysDiff; i++) {
      const currentDate = startDate.add(i, 'day');
      const dateStr = currentDate.format('YYYY-MM-DD');
      const isSelected = selectedDates.includes(dateStr);

      columns.push({
        title: (
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleDateSelection(dateStr)}>
            <Checkbox
              checked={isSelected}
              style={{ marginRight: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleDateSelection(dateStr);
              }}
            />
            <div style={{ fontSize: '12px', display: 'inline-block' }}>
              {currentDate.format('MM-DD')}
            </div>
            <div style={{ color: '#999', fontSize: '11px' }}>{currentDate.format('ddd')}</div>
          </div>
        ),
        dataIndex: dateStr,
        width: 90,
        align: 'center' as const,
        render: (_: any, record: EmployeeItem) => {
          const schedule = record.schedules.find((s) => {
            // 将scheduleDate格式化为YYYY-MM-DD后再比较
            const scheduleDate = dayjs(s.scheduleDate).format('YYYY-MM-DD');
            return scheduleDate === dateStr;
          });

          if (!schedule) {
            return <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>;
          }

          return (
            <div
              style={{
                padding: '4px',
                borderRadius: '4px',
                background: schedule.shiftColor || '#1890ff',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
              onClick={() => handleEditSchedule(schedule)}
            >
              <div>{schedule.shiftName}</div>
              {(schedule.adjustedStart || schedule.adjustedEnd) && (
                <Tag color="gold" style={{ margin: '2px 0 0 0', fontSize: '9px', padding: '0 2px' }}>
                  已调整
                </Tag>
              )}
            </div>
          );
        },
      });
    }

    return columns;
  }, [filters.month, selectedDates]);

  // 表格列
  const columns = [
    {
      title: '工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '组织',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 150,
      fixed: 'left' as const,
    },
    ...dateColumns,
  ];

  // 切换日期选择
  const toggleDateSelection = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  // 批量排班
  const batchScheduleMutation = useMutation({
    mutationFn: (data: any) => {
      const schedules: any[] = [];

      selectedEmployeeKeys.forEach((empId) => {
        selectedDates.forEach((dateStr) => {
          schedules.push({
            employeeId: empId,
            shiftId: data.shiftId,
            scheduleDate: dateStr,
          });
        });
      });

      return request.post('/shift/schedules/batch', { schedules });
    },
    onSuccess: () => {
      message.success('批量排班成功');
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
      setBatchScheduleModalOpen(false);
      batchForm.resetFields();
      setSelectedEmployeeKeys([]);
      setSelectedDates([]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量排班失败');
    },
  });

  // 复制排班
  const copyScheduleMutation = useMutation({
    mutationFn: (data: any) => {
      const { sourceDate, targetDates } = data;

      const schedules: any[] = [];

      selectedEmployeeKeys.forEach((empId) => {
        // 获取源日期的排班
        const emp = employees.find((e) => e.id === empId);
        if (emp) {
          const sourceSchedule = emp.schedules.find((s) => s.scheduleDate === sourceDate);

          if (sourceSchedule) {
            // 复制到目标日期
            targetDates.forEach((dateStr: string) => {
              schedules.push({
                employeeId: empId,
                shiftId: sourceSchedule.shiftId,
                scheduleDate: dateStr,
              });
            });
          }
        }
      });

      return request.post('/shift/schedules/batch', { schedules });
    },
    onSuccess: () => {
      message.success('复制排班成功');
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
      setCopyScheduleModalOpen(false);
      copyForm.resetFields();
      setSelectedEmployeeKeys([]);
      setSelectedDates([]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '复制排班失败');
    },
  });

  // 更新排班
  const updateScheduleMutation = useMutation({
    mutationFn: (data: any) => {
      return request.put(`/shift/schedules/${data.id}`, {
        adjustedSegments: data.segments,
      });
    },
    onSuccess: () => {
      message.success('更新成功');
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
      setEditScheduleModalOpen(false);
      editForm.resetFields();
      setEditingSchedule(null);
      setEditingSegments([]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 删除排班
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/shift/schedules/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
      setEditScheduleModalOpen(false);
      editForm.resetFields();
      setEditingSchedule(null);
      setEditingSegments([]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 批量删除排班
  const batchDeleteScheduleMutation = useMutation({
    mutationFn: () => {
      const scheduleIds: number[] = [];

      // 收集所有选中员工在选中日期的排班ID
      selectedEmployeeKeys.forEach((empId) => {
        const emp = employees.find((e) => e.id === empId);
        if (emp) {
          selectedDates.forEach((dateStr) => {
            const schedule = emp.schedules.find((s) => s.scheduleDate === dateStr);
            if (schedule && schedule.id) {
              scheduleIds.push(schedule.id);
            }
          });
        }
      });

      return Promise.all(scheduleIds.map(id => request.delete(`/shift/schedules/${id}`)));
    },
    onSuccess: (_, __, variables) => {
      message.success('批量删除成功');
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
      setSelectedEmployeeKeys([]);
      setSelectedDates([]);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量删除失败');
    },
  });

  // 处理批量排班
  const handleBatchSchedule = () => {
    if (selectedEmployeeKeys.length === 0) {
      message.warning('请先选择要排班的员工');
      return;
    }
    if (selectedDates.length === 0) {
      message.warning('请先选择排班日期');
      return;
    }
    batchForm.resetFields();
    setBatchScheduleModalOpen(true);
  };

  // 处理复制排班
  const handleCopySchedule = () => {
    if (selectedEmployeeKeys.length === 0) {
      message.warning('请先选择要复制排班的员工');
      return;
    }
    if (selectedDates.length === 0) {
      message.warning('请先选择目标日期');
      return;
    }
    copyForm.resetFields();
    setCopyScheduleModalOpen(true);
  };

  // 处理编辑排班
  const handleEditSchedule = (schedule: ScheduleItem) => {
    // 获取班次信息
    const shift = shifts?.find((s: any) => s.id === schedule.shiftId);

    // 初始化班段数据
    let segments: ScheduleSegmentItem[] = [];

    // 优先使用 schedule 中已经覆盖过的 segments（包含 accountId 等自定义值）
    if (schedule.segments && schedule.segments.length > 0) {
      segments = schedule.segments.map((seg: any) => ({
        id: seg.id,
        type: seg.type,
        startDate: seg.startDate,
        startTime: seg.startTime,
        endDate: seg.endDate,
        endTime: seg.endTime,
        duration: seg.duration,
        accountId: seg.accountId, // 使用覆盖后的子劳动力账户
      }));
    } else if (shift && shift.segments) {
      // 如果 schedule 中没有 segments，从班次中获取
      segments = shift.segments.map((seg: any) => ({
        id: seg.id,
        type: seg.type,
        startDate: seg.startDate,
        startTime: seg.startTime,
        endDate: seg.endDate,
        endTime: seg.endTime,
        duration: seg.duration,
        accountId: seg.accountId, // 继承班次设置的子劳动力账户
      }));
    }

    // 如果有调整后的时间，需要应用调整
    if (schedule.adjustedStart || schedule.adjustedEnd) {
      // 这里简化处理，实际应该根据调整时间修改第一个和最后一个班段
      if (segments.length > 0) {
        if (schedule.adjustedStart) {
          segments[0].startTime = schedule.adjustedStart;
        }
        if (schedule.adjustedEnd) {
          segments[segments.length - 1].endTime = schedule.adjustedEnd;
        }
      }
    }

    // 如果没有班段，创建一个默认班段
    if (segments.length === 0) {
      segments = [{
        type: 'NORMAL',
        startDate: '+0',
        startTime: schedule.adjustedStart || '08:00',
        endDate: '+0',
        endTime: schedule.adjustedEnd || '17:00',
        duration: 0,
      }];
    }

    // 重新计算时长
    segments = segments.map((seg) => ({
      ...seg,
      duration: calculateSegmentDuration(seg),
    }));

    setEditingSchedule(schedule);
    setEditingSegments(segments);
    editForm.setFieldsValue({
      shiftId: schedule.shiftId,
    });
    setEditScheduleModalOpen(true);
  };

  // 计算班段时长
  const calculateSegmentDuration = (segment: ScheduleSegmentItem): number => {
    if (!segment.startTime || !segment.endTime) return 0;

    const [startHour, startMinute] = segment.startTime.split(':').map(Number);
    const [endHour, endMinute] = segment.endTime.split(':').map(Number);

    let startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // 如果结束日期是后一天
    if (segment.endDate === '+1' && segment.startDate === '+0') {
      endMinutes += 24 * 60;
    }

    const durationMinutes = endMinutes - startMinutes;
    return Math.round((durationMinutes / 60) * 100) / 100;
  };

  // 更新班段
  const updateSegment = (index: number, field: string, value: any) => {
    const newSegments = [...editingSegments];
    newSegments[index] = { ...newSegments[index], [field]: value };

    // 自动计算时长
    if (['startTime', 'endTime', 'startDate', 'endDate'].includes(field)) {
      newSegments[index].duration = calculateSegmentDuration(newSegments[index]);
    }

    setEditingSegments(newSegments);
  };

  // 提交批量排班
  const handleBatchScheduleOk = async () => {
    try {
      const values = await batchForm.validateFields();
      batchScheduleMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 提交复制排班
  const handleCopyScheduleOk = async () => {
    try {
      const values = await copyForm.validateFields();
      copyScheduleMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 提交编辑排班
  const handleEditScheduleOk = async () => {
    if (!editingSchedule) return;

    try {
      await editForm.validateFields();

      updateScheduleMutation.mutate({
        id: editingSchedule.id,
        segments: editingSegments,
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理删除排班
  const handleDeleteSchedule = () => {
    if (editingSchedule) {
      deleteScheduleMutation.mutate(editingSchedule.id);
    }
  };

  // 处理批量删除排班
  const handleBatchDeleteSchedule = () => {
    if (selectedEmployeeKeys.length === 0) {
      message.warning('请先选择要删除排班的员工');
      return;
    }
    if (selectedDates.length === 0) {
      message.warning('请先选择要删除排班的日期');
      return;
    }

    // 计算要删除的排班数量
    let scheduleCount = 0;
    selectedEmployeeKeys.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        selectedDates.forEach((dateStr) => {
          const schedule = emp.schedules.find((s) => s.scheduleDate === dateStr);
          if (schedule && schedule.id) {
            scheduleCount++;
          }
        });
      }
    });

    if (scheduleCount === 0) {
      message.warning('所选员工和日期没有可删除的排班');
      return;
    }

    if (confirm(`确定要删除选中的 ${scheduleCount} 条排班记录吗？`)) {
      batchDeleteScheduleMutation.mutate();
    }
  };

  // 获取当月的所有日期选项
  const getAllDatesInMonth = () => {
    const dates: string[] = [];
    const startDate = filters.month.startOf('month');
    const endDate = filters.month.endOf('month');
    let current = startDate;

    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }

    return dates;
  };

  return (
    <ModernPageLayout
      title="排班管理"
      description="管理员工的排班信息，支持批量排班、复制排班等功能"
      breadcrumb={[
        { label: '排班管理', path: '/shift' },
        { label: '排班管理', path: '/shift/schedules' },
      ]}
      stats={[
        {
          title: '员工总数',
          value: employees.length,
          prefix: <TeamOutlined style={{ color: '#6366f1' }} />,
          color: '#6366f1',
        },
        {
          title: '本月排班数',
          value: (scheduleData?.length || 0),
          prefix: <CalendarOutlined style={{ color: '#10b981' }} />,
          color: '#10b981',
        },
        {
          title: '已选择员工',
          value: selectedEmployeeKeys.length,
          prefix: <TeamOutlined style={{ color: '#f59e0b' }} />,
          color: '#f59e0b',
        },
      ]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: '24px' }}
      >
        {/* 月份选择器和动态搜索条件放在同一行 */}
        <div style={{ marginBottom: 24 }}>
          <DynamicSearchConditions
            pageCode="schedules"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ month: filters.month }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'month') {
                setFilters({ ...filters, month: value || dayjs() });
              }
            }}
          />
        </div>

        {/* 操作按钮 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleBatchSchedule}
                disabled={selectedEmployeeKeys.length === 0 || selectedDates.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: 8,
                  height: 40,
                  fontWeight: 500,
                }}
              >
                批量排班 ({selectedEmployeeKeys.length}人 × {selectedDates.length}日)
              </Button>

              <Button
                icon={<CopyOutlined />}
                onClick={handleCopySchedule}
                disabled={selectedEmployeeKeys.length === 0 || selectedDates.length === 0}
                style={{ borderRadius: 8, height: 40 }}
              >
                复制排班
              </Button>

              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDeleteSchedule}
                disabled={selectedEmployeeKeys.length === 0 || selectedDates.length === 0}
                style={{ borderRadius: 8, height: 40 }}
              >
                批量删除排班
              </Button>

              <Button
                onClick={() => {
                  setSelectedEmployeeKeys([]);
                  setSelectedDates([]);
                }}
                style={{ borderRadius: 8, height: 40 }}
              >
                清空选择
              </Button>

              <Divider type="vertical" />

              <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                提示：勾选表头的复选框可以快速选择该列所有日期
              </span>
            </Space>
          </Col>
        </Row>

        {/* 排班表格 */}
        <Table
          columns={columns}
          dataSource={filteredEmployees}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys: selectedEmployeeKeys,
            onChange: (keys) => setSelectedEmployeeKeys(keys),
          }}
          size="small"
          bordered
          style={{
            borderRadius: 8,
            overflow: 'hidden',
          }}
        />
      </Card>

      {/* 批量排班对话框 */}
      <Modal
        title={`批量排班 (${selectedEmployeeKeys.length}人 × ${selectedDates.length}日)`}
        open={batchScheduleModalOpen}
        onOk={handleBatchScheduleOk}
        onCancel={() => {
          setBatchScheduleModalOpen(false);
          batchForm.resetFields();
        }}
        confirmLoading={batchScheduleMutation.isPending}
        width={500}
        styles={{
          content: { borderRadius: 12 },
        }}
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item
            name="shiftId"
            label="班次"
            rules={[{ required: true, message: '请选择班次' }]}
          >
            <Select
              placeholder="请选择班次"
              style={{ borderRadius: 8 }}
            >
              {(shifts || []).map((shift: any) => (
                <Select.Option key={shift.id} value={shift.id}>
                  <Tag color={shift.color}>{shift.name}</Tag>
                  ({shift.standardHours}小时)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 复制排班对话框 */}
      <Modal
        title="复制排班"
        open={copyScheduleModalOpen}
        onOk={handleCopyScheduleOk}
        onCancel={() => {
          setCopyScheduleModalOpen(false);
          copyForm.resetFields();
        }}
        confirmLoading={copyScheduleMutation.isPending}
        width={500}
        styles={{
          content: { borderRadius: 12 },
        }}
      >
        <Form form={copyForm} layout="vertical">
          <Form.Item
            name="sourceDate"
            label="源日期"
            rules={[{ required: true, message: '请选择源日期' }]}
            extra="从该日期复制排班"
          >
            <DatePicker style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="targetDates"
            label="目标日期"
            rules={[{ required: true, message: '请选择目标日期' }]}
            extra="复制到这些日期"
          >
            <Select
              mode="multiple"
              placeholder="请选择目标日期"
              style={{ width: '100%', borderRadius: 8 }}
            >
              {getAllDatesInMonth().map((dateStr) => (
                <Select.Option key={dateStr} value={dateStr}>
                  {dateStr}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑排班对话框 */}
      <Modal
        title="编辑排班"
        open={editScheduleModalOpen}
        onOk={handleEditScheduleOk}
        onCancel={() => {
          setEditScheduleModalOpen(false);
          editForm.resetFields();
          setEditingSchedule(null);
          setEditingSegments([]);
        }}
        confirmLoading={updateScheduleMutation.isPending}
        width={800}
        styles={{
          content: { borderRadius: 12 },
        }}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="员工">
                <Input
                  value={employees.find((e) => e.id === editingSchedule?.employeeId)?.name}
                  disabled
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="排班日期">
                <Input
                  value={editingSchedule?.scheduleDate}
                  disabled
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shiftId" label="班次">
                <Select disabled style={{ borderRadius: 8 }}>
                  {(shifts || []).map((shift: any) => (
                    <Select.Option key={shift.id} value={shift.id}>
                      {shift.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider orientation="left" style={{ borderColor: '#e2e8f0' }}>
          班段时间调整
        </Divider>

        <Table
          columns={[
            {
              title: '类型',
              dataIndex: 'type',
              key: 'type',
              width: 100,
              render: (type: string, _record: ScheduleSegmentItem, _index: number) => {
                const colorMap: Record<string, string> = {
                  NORMAL: 'blue',
                  REST: 'green',
                  TRANSFER: 'orange',
                };
                const labelMap: Record<string, string> = {
                  NORMAL: '正常',
                  REST: '休息',
                  TRANSFER: '转移',
                };
                return (
                  <Tag color={colorMap[type] || 'default'}>
                    {labelMap[type] || type}
                  </Tag>
                );
              },
            },
            {
              title: '开始时间',
              key: 'startTime',
              width: 140,
              render: (_: any, record: ScheduleSegmentItem, index: number) => (
                <Input
                  type="time"
                  value={record.startTime}
                  onChange={(e) => updateSegment(index, 'startTime', e.target.value)}
                  style={{ borderRadius: 6 }}
                />
              ),
            },
            {
              title: '结束时间',
              key: 'endTime',
              width: 140,
              render: (_: any, record: ScheduleSegmentItem, index: number) => (
                <Input
                  type="time"
                  value={record.endTime}
                  onChange={(e) => updateSegment(index, 'endTime', e.target.value)}
                  style={{ borderRadius: 6 }}
                />
              ),
            },
            {
              title: '时长(小时)',
              dataIndex: 'duration',
              key: 'duration',
              width: 100,
              render: (duration: number) => (
                <span style={{ fontWeight: 600, color: '#6366f1' }}>
                  {duration.toFixed(2)}
                </span>
              ),
            },
            {
              title: '转移子账户',
              dataIndex: 'accountId',
              key: 'accountId',
              width: 300,
              render: (accountId: number | undefined, record: ScheduleSegmentItem, index: number) => {
                return (
                  <AccountSelect
                    value={accountId || null}
                    usageType="SHIFT"
                    onChange={(value) => updateSegment(index, 'accountId', value)}
                    placeholder="选择子账户"
                  />
                );
              },
            },
          ]}
          dataSource={editingSegments}
          rowKey={(record, index) => String(record.id || index || 0)}
          pagination={false}
          size="small"
          style={{ borderRadius: 8 }}
        />

        <div style={{ marginTop: 24 }}>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={handleDeleteSchedule}
            okText="确认"
            cancelText="取消"
          >
            <Button
              danger
              block
              icon={<DeleteOutlined />}
              style={{
                borderRadius: 8,
                height: 40,
                fontWeight: 500,
              }}
            >
              删除此排班
            </Button>
          </Popconfirm>
        </div>
      </Modal>

    </ModernPageLayout>
  );
};

export default SchedulePage;

import { useState, useMemo, useEffect, useRef } from 'react';
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
  Popover,
  Divider,
  Checkbox,
  InputNumber,
  Tooltip,
  Alert,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  CalendarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  KeyboardArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import AccountSelect from '@/components/common/AccountSelect';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import { useKeyboardShortcuts, ShortcutPresets } from '@/hooks/useKeyboardShortcuts';
import { useScheduleClipboard } from '@/hooks/useScheduleClipboard';

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
  isPending?: boolean; // 标记为未保存状态
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

// 快速班次选择弹出框组件
interface QuickShiftSelectPopoverProps {
  shifts: any[];
  onSelect: (shiftId: number) => void;
}

const QuickShiftSelectPopover: React.FC<QuickShiftSelectPopoverProps> = ({ shifts, onSelect }) => {
  const [searchText, setSearchText] = useState('');

  // 过滤班次
  const filteredShifts = shifts.filter((shift) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      shift.name?.toLowerCase().includes(searchLower) ||
      shift.code?.toLowerCase().includes(searchLower)
    );
  });

  // 格式化班次时间（显示第一个开始和最后一个结束）
  const formatShiftTime = (shift: any) => {
    if (!shift.segments || shift.segments.length === 0) {
      return '-';
    }
    const firstSegment = shift.segments[0];
    const lastSegment = shift.segments[shift.segments.length - 1];
    return `${firstSegment.startTime} - ${lastSegment.endTime}`;
  };

  return (
    <div style={{ width: '350px', maxHeight: '400px' }}>
      {/* 搜索框 */}
      <div style={{ padding: '12px 12px 8px 12px' }}>
        <Input
          placeholder="搜索班次名称或代码"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          prefix={<span style={{ color: '#9ca3af' }}>🔍</span>}
          size="large"
        />
      </div>

      {/* 班次列表 */}
      <div style={{ padding: '0 12px 12px 12px', maxHeight: '320px', overflowY: 'auto' }}>
        {filteredShifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
            {searchText ? '未找到匹配的班次' : '暂无可用班次'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredShifts.map((shift) => (
              <div
                key={shift.id}
                onClick={() => onSelect(shift.id)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = shift.color || '#1890ff';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Space size={6}>
                    <Tag
                      color={shift.color}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        fontWeight: 500,
                        margin: 0,
                      }}
                    >
                      {shift.code || shift.name}
                    </Tag>
                    <span style={{ fontWeight: 500, color: '#262626', fontSize: '13px' }}>
                      {shift.name}
                    </span>
                  </Space>
                  <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                    {shift.standardHours}h
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#595959', fontWeight: 500 }}>
                  {formatShiftTime(shift)}
                </div>

                {shift.description && (
                  <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 4 }}>
                    {shift.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SchedulePage: React.FC = () => {
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs],
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [searchForm] = useState<any>(null);

  // 选中的员工和日期
  const [selectedEmployeeKeys, setSelectedEmployeeKeys] = useState<React.Key[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 范围选择状态
  const [rangeSelectionStart, setRangeSelectionStart] = useState<{employeeIndex: number; dateIndex: number} | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // 待保存的修改
  const [pendingChanges, setPendingChanges] = useState<{
    creates: any[];
    updates: any[];
    deletes: number[];
  }>({ creates: [], updates: [], deletes: [] });

  // 批量添加按钮的弹出框状态
  const [batchAddPopoverOpen, setBatchAddPopoverOpen] = useState(false);

  // 编辑排班对话框
  const [editScheduleModalOpen, setEditScheduleModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [editingSegments, setEditingSegments] = useState<ScheduleSegmentItem[]>([]);

  // 加载状态
  const [isSaving, setIsSaving] = useState(false);

  // 剪贴板管理
  const { clipboard, clipboardSource, copy, paste, clear, isValid, getClipboardInfo } = useScheduleClipboard();

  // 快捷键提示显示状态
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);

  // 表格引用
  const tableRef = useRef<HTMLDivElement>(null);

  // 计算日期列数
  const dateCount = useMemo(() => {
    const [startDate, endDate] = filters.dateRange;
    return endDate.diff(startDate, 'day') + 1;
  }, [filters.dateRange]);

  // 获取所有日期列表
  const allDates = useMemo(() => {
    const dates: string[] = [];
    const [startDate, endDate] = filters.dateRange;
    let current = startDate;

    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }

    return dates;
  }, [filters.dateRange]);

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
    queryKey: ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
    queryFn: async () => {
      const params: any = {
        startDate: filters.dateRange[0].format('YYYY-MM-DD'),
        endDate: filters.dateRange[1].format('YYYY-MM-DD'),
      };

      const res = await request.get('/shift/schedules/calendar', { params });
      return res;
    },
    enabled: !!filters.dateRange && filters.dateRange.length === 2,
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
            // 处理班段覆盖信息（与后端API逻辑一致）
            let segments = item.segments || [];
            if (item.adjustedSegments) {
              try {
                const overrides = JSON.parse(item.adjustedSegments);
                segments = segments.map((seg: any) => {
                  const override = overrides.find((o: any) => o.id === seg.id);
                  return override ? { ...seg, ...override } : seg;
                });
              } catch (e) {
                console.error('Failed to parse adjustedSegments:', e);
              }
            }

            empInMap.schedules.push({
              id: item.id,
              scheduleDate: item.scheduleDate,
              shiftId: item.shiftId,
              shiftName: item.shift?.name || '-',
              shiftColor: item.shift?.color,
              adjustedStart: item.adjustedStart,
              adjustedEnd: item.adjustedEnd,
              status: item.status,
              isPending: item.isPending || false, // 从API返回的数据不包含isPending
              segments: segments, // 包含班段信息（已合并覆盖数据）
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

  // 处理 Shift 键状态
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setRangeSelectionStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 处理单元格点击（支持范围选择）
  const handleCellClick = (employeeIndex: number, dateIndex: number) => {
    if (isShiftPressed && rangeSelectionStart) {
      // 范围选择
      const startEmp = Math.min(rangeSelectionStart.employeeIndex, employeeIndex);
      const endEmp = Math.max(rangeSelectionStart.employeeIndex, employeeIndex);
      const startDate = Math.min(rangeSelectionStart.dateIndex, dateIndex);
      const endDate = Math.max(rangeSelectionStart.dateIndex, dateIndex);

      const selectedEmps: React.Key[] = [];
      const selectedDates: string[] = [];

      for (let i = startEmp; i <= endEmp; i++) {
        selectedEmps.push(filteredEmployees[i]?.id);
      }

      for (let i = startDate; i <= endDate; i++) {
        selectedDates.push(allDates[i]);
      }

      setSelectedEmployeeKeys(selectedEmps.filter(Boolean));
      setSelectedDates(selectedDates.filter(Boolean));
    } else {
      // 普通点击：选择该单元格所在的行和列
      setRangeSelectionStart({ employeeIndex, dateIndex });
      const employee = filteredEmployees[employeeIndex];
      if (employee) {
        setSelectedEmployeeKeys([employee.id]);
        setSelectedDates([allDates[dateIndex]]);
      }
    }
  };

  // 处理单元格双击（编辑排班或快速排班）
  const handleCellDoubleClick = (schedule?: ScheduleItem, employeeId?: number, dateStr?: string) => {
    if (schedule) {
      // 已有排班，进入编辑模式
      handleEditSchedule(schedule);
    } else if (employeeId && dateStr) {
      // 没有排班，弹出快速选择班次对话框
      setQuickScheduleTarget({ employeeId, dateStr });
      setQuickScheduleModalOpen(true);
    }
  };

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  // 生成日期列
  const dateColumns = useMemo(() => {
    const columns: any[] = [];
    const [startDate, endDate] = filters.dateRange;
    const daysDiff = endDate.diff(startDate, 'day') + 1;

    for (let i = 0; i < daysDiff; i++) {
      const currentDate = startDate.add(i, 'day');
      const dateStr = currentDate.format('YYYY-MM-DD');
      const isSelected = selectedDates.includes(dateStr);

      columns.push({
        title: (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: isSelected ? '4px' : '0',
            }}
            className={isSelected ? 'date-column-selected' : ''}
          >
            <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#1e40af' : '#374151' }}>
              {currentDate.format('MM-DD')}
            </div>
            <div style={{ color: isSelected ? '#3b82f6' : '#9ca3af', fontSize: '12px' }}>
              {currentDate.format('ddd')}
            </div>
          </div>
        ),
        dataIndex: dateStr,
        width: 90,
        align: 'center' as const,
        render: (_: any, record: EmployeeItem, rowIndex: number) => {
          // 查找该日期的所有排班（支持多个班次）
          const schedules = record.schedules.filter((s) => {
            // 将scheduleDate格式化为YYYY-MM-DD后再比较
            const scheduleDate = dayjs(s.scheduleDate).format('YYYY-MM-DD');
            return scheduleDate === dateStr;
          });

          // 检查当前单元格是否被选中
          const isEmployeeSelected = selectedEmployeeKeys.includes(record.id);
          const isDateSelected = selectedDates.includes(dateStr);
          const isCellSelected = isEmployeeSelected && isDateSelected;

          const cellContent = (
            <>
              {schedules.length === 0 && (
                <div
                  style={{
                    padding: '8px 6px',
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: isCellSelected ? '#eff6ff' : 'transparent',
                    border: isCellSelected ? '1px solid #bfdbfe' : '1px solid #f3f4f6',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ color: '#f3f4f6', fontSize: '13px' }}>-</span>
                </div>
              )}

              {schedules.length > 1 && (
                <div
                  style={{
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minHeight: '48px',
                    cursor: 'pointer',
                    background: isCellSelected ? '#eff6ff' : 'transparent',
                    border: isCellSelected ? '1px solid #bfdbfe' : '1px solid #f3f4f6',
                    borderRadius: '4px',
                  }}
                >
                  {schedules.map((schedule, idx) => (
                    <div
                      key={schedule.id || idx}
                      style={{
                        padding: '4px 6px',
                        background: schedule.shiftColor ? `${schedule.shiftColor}15` : '#3b82f615',
                        color: schedule.shiftColor || '#3b82f6',
                        fontSize: '11px',
                        borderRadius: '3px',
                        border: `1px solid ${schedule.shiftColor || '#3b82f6'}40`,
                        fontWeight: 500,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {schedule.shiftName}
                    </div>
                  ))}
                </div>
              )}

              {schedules.length === 1 && (() => {
                const schedule = schedules[0];
                return (
                  <div
                    style={{
                      padding: '8px 6px',
                      background: schedule.shiftColor ? `${schedule.shiftColor}15` : '#3b82f615',
                      color: schedule.shiftColor || '#3b82f6',
                      fontSize: '12px',
                      cursor: 'pointer',
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      borderRadius: '4px',
                      border: isCellSelected ? `2px solid ${schedule.shiftColor || '#3b82f6'}` : `1px solid ${schedule.shiftColor || '#3b82f6'}30`,
                      transition: 'all 0.15s ease',
                      fontWeight: 500,
                      opacity: isCellSelected ? 1 : 0.85,
                      boxShadow: isCellSelected ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
                    }}
                  >
                    <div>{schedule.shiftName}</div>
                    {(schedule.adjustedStart || schedule.adjustedEnd) && (
                      <Tag
                        color="gold"
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '10px',
                          padding: '0 6px',
                          borderRadius: '3px',
                          lineHeight: '18px',
                        }}
                      >
                        已调整
                      </Tag>
                    )}
                    {schedule.isPending && (
                      <Tag
                        color="orange"
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '10px',
                          padding: '0 6px',
                          borderRadius: '3px',
                          lineHeight: '18px',
                        }}
                      >
                        未保存
                      </Tag>
                    )}
                  </div>
                );
              })()}
            </>
          );

          // 如果已有排班，直接返回（双击编辑）
          if (schedules.length > 0) {
            return (
              <div
                onClick={() => handleCellClick(rowIndex, i)}
                onDoubleClick={() => handleCellDoubleClick(schedules[0], record.id, dateStr)}
                title="双击编辑排班"
              >
                {cellContent}
              </div>
            );
          }

          // 空白单元格，使用 Popover
          return (
            <Popover
              trigger="click"
              placement="bottom"
              content={
                <QuickShiftSelectPopover
                  shifts={shifts || []}
                  onSelect={(shiftId) => {
                    handleQuickScheduleConfirm(shiftId, record.id, dateStr);
                  }}
                />
              }
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleCellClick(rowIndex, i);
                }}
                style={{
                  padding: '8px 6px',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: isCellSelected ? '#eff6ff' : 'transparent',
                  border: isCellSelected ? '1px solid #bfdbfe' : '1px solid #f3f4f6',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="点击快速添加班次"
              >
                <span style={{ color: '#d1d5db', fontSize: '13px' }}>+</span>
              </div>
            </Popover>
          );
        },
      });
    }

    return columns;
  }, [filters.dateRange, selectedDates, selectedEmployeeKeys, rangeSelectionStart, isShiftPressed, shifts]);

  // 表格列
  const columns = [
    {
      title: '工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 100,
      fixed: 'left' as const,
      render: (text: string) => <span style={{ color: '#6b7280' }}>{text}</span>
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
      render: (text: string) => <span style={{ color: '#374151', fontWeight: 500 }}>{text}</span>
    },
    {
      title: '组织',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => <span style={{ color: '#6b7280' }}>{text}</span>
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
  const handleBatchScheduleConfirm = (shiftId: number) => {
    const schedules: any[] = [];
    const shift = shifts?.find((s: any) => s.id === shiftId);

    // 生成临时负数ID（用于前端显示）
    let tempId = -1;
    selectedEmployeeKeys.forEach((empId) => {
      selectedDates.forEach((dateStr) => {
        // 从 allEmployees 中查找完整的员工信息
        const employee = (Array.isArray(allEmployees) ? allEmployees : (allEmployees?.items || []))
          .find((e: any) => Number(e.id) === empId);

        const newSchedule = {
          id: tempId--, // 临时负数ID
          employeeId: empId,
          shiftId: shiftId,
          scheduleDate: dateStr,
          shiftName: shift?.name || '',
          shiftColor: shift?.color || '#1890ff',
          status: 'PENDING', // 标记为待保存状态
          isPending: true, // 标记为未保存状态
          employee: employee ? {
            id: employee.id,
            employeeNo: employee.employeeNo,
            name: employee.name,
            org: employee.org,
          } : undefined,
          shift: shift ? {
            id: shift.id,
            name: shift.name,
            color: shift.color,
          } : undefined,
        };
        schedules.push(newSchedule);
      });
    });

    // 添加到待保存列表（不包含临时ID和额外字段）
    const schedulesToSave = schedules.map(({ id, isPending, employee, shift, ...rest }) => rest);
    setPendingChanges(prev => ({
      ...prev,
      creates: [...prev.creates, ...schedulesToSave],
    }));

    // 立即在本地数据中添加，让UI立即显示
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        // 将原有数据和新数据合并
        const existingData = Array.isArray(oldData) ? oldData : [];
        return [...existingData, ...schedules];
      }
    );

    setBatchScheduleModalOpen(false);
    batchForm.resetFields();
    setSelectedEmployeeKeys([]);
    setSelectedDates([]);
  };

  // 快速排班确认
  const handleQuickScheduleConfirm = (shiftId: number, employeeId: number, dateStr: string) => {
    const shift = shifts?.find((s: any) => s.id === shiftId);

    // 从 allEmployees 中查找完整的员工信息
    const employee = (Array.isArray(allEmployees) ? allEmployees : (allEmployees?.items || []))
      .find((e: any) => Number(e.id) === employeeId);

    const newSchedule = {
      id: Date.now() + Math.random(), // 临时ID
      employeeId: employeeId,
      shiftId: shiftId,
      scheduleDate: dateStr,
      shiftName: shift?.name || '',
      shiftColor: shift?.color || '#1890ff',
      status: 'PENDING', // 标记为待保存状态
      isPending: true, // 标记为未保存状态
      employee: employee ? {
        id: employee.id,
        employeeNo: employee.employeeNo,
        name: employee.name,
        org: employee.org,
      } : undefined,
      shift: shift ? {
        id: shift.id,
        name: shift.name,
        color: shift.color,
      } : undefined,
    };

    // 添加到待保存列表（不包含临时ID和额外字段）
    const { id, isPending, employee: emp, shift: sh, ...scheduleToSave } = newSchedule;
    setPendingChanges(prev => ({
      ...prev,
      creates: [...prev.creates, scheduleToSave],
    }));

    // 立即在本地数据中添加，让UI立即显示
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        // 将原有数据和新数据合并
        const existingData = Array.isArray(oldData) ? oldData : [];
        return [...existingData, newSchedule];
      }
    );

    message.success(`已为 ${employee?.name} 在 ${dateStr} 添加班次：${shift?.name}`);
  };

  // 更新排班
  const handleUpdateSchedule = (data: any) => {
    console.log('=== 更新排班 ===');
    console.log('更新数据:', data);
    console.log('editingSegments:', data.segments);

    // 添加到待保存列表
    setPendingChanges(prev => ({
      ...prev,
      updates: [...prev.updates, {
        id: data.id,
        adjustedSegments: data.segments, // 发送完整的 segments 数据，包含修改后的时间
      }],
    }));

    // 立即在本地数据中更新，让UI立即显示
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        const existingData = Array.isArray(oldData) ? oldData : [];
        return existingData.map((item: any) => {
          if (item.id === data.id) {
            // 合并 adjustedSegments 到 segments
            let mergedSegments = item.segments || [];
            if (item.segments && item.segments.length > 0) {
              const overrides = data.segments;
              mergedSegments = item.segments.map((seg: any) => {
                const override = overrides.find((o: any) => o.id === seg.id);
                // 如果找到覆盖数据，合并所有字段（包括时间）
                return override ? { ...seg, ...override } : seg;
              });
            }

            console.log('合并后的 segments:', mergedSegments);

            // 提取第一个和最后一个班段的时间用于显示
            const firstSegment = mergedSegments[0];
            const lastSegment = mergedSegments[mergedSegments.length - 1];

            return {
              ...item,
              adjustedStart: firstSegment?.startTime,
              adjustedEnd: lastSegment?.endTime,
              adjustedSegments: JSON.stringify(data.segments), // 保存完整的 segments 数据
              segments: mergedSegments, // 同时更新 segments 以便编辑时使用
              isPending: true, // 标记为未保存状态
            };
          }
          return item;
        });
      }
    );

    setEditScheduleModalOpen(false);
    editForm.resetFields();
    setEditingSchedule(null);
    setEditingSegments([]);
  };

  // 处理编辑排班
  const handleEditSchedule = (schedule: ScheduleItem) => {
    // 获取班次信息
    const shift = shifts?.find((s: any) => s.id === schedule.shiftId);

    // 初始化班段数据
    let segments: ScheduleSegmentItem[] = [];

    console.log('=== 编辑排班 ===');
    console.log('schedule:', schedule);
    console.log('schedule.segments:', schedule.segments);

    // 优先使用 schedule 中已经覆盖过的 segments（包含 accountId 等自定义值）
    if (schedule.segments && schedule.segments.length > 0) {
      segments = schedule.segments.map((seg: any) => ({
        id: seg.id,
        type: seg.type,
        startDate: seg.startDate || '+0',
        startTime: seg.startTime,
        endDate: seg.endDate || '+0',
        endTime: seg.endTime,
        duration: 0, // 重新计算
        accountId: seg.accountId, // 使用覆盖后的子劳动力账户
      }));

      console.log('从 schedule.segments 获取班段:', segments);
    } else if (shift && shift.segments) {
      // 如果 schedule 中没有 segments，从班次中获取
      segments = shift.segments.map((seg: any) => ({
        id: seg.id,
        type: seg.type,
        startDate: seg.startDate || '+0',
        startTime: seg.startTime,
        endDate: seg.endDate || '+0',
        endTime: seg.endTime,
        duration: 0, // 重新计算
        accountId: seg.accountId, // 继承班次设置的子劳动力账户
      }));

      console.log('从 shift.segments 获取班段:', segments);
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

      console.log('创建默认班段:', segments);
    }

    // 重新计算时长
    segments = segments.map((seg) => {
      const duration = calculateSegmentDuration(seg);
      console.log(`班段 ${seg.type} 时长计算: ${seg.startTime} - ${seg.endTime} = ${duration}小时`);
      return {
        ...seg,
        duration,
      };
    });

    console.log('最终班段数据:', segments);

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

  // 提交编辑排班
  const handleEditScheduleOk = async () => {
    if (!editingSchedule) return;

    try {
      await editForm.validateFields();

      handleUpdateSchedule({
        id: editingSchedule.id,
        segments: editingSegments,
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理删除排班（在编辑对话框中）
  const handleDeleteScheduleInModal = () => {
    if (!editingSchedule) return;

    // 添加到待保存列表
    setPendingChanges(prev => ({
      ...prev,
      deletes: [...prev.deletes, editingSchedule.id],
    }));

    // 立即从本地数据中移除该排班，让UI立即更新
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        // 过滤掉被删除的排班
        return oldData.filter((item: any) => {
          return item.id !== editingSchedule.id;
        });
      }
    );

    setEditScheduleModalOpen(false);
    editForm.resetFields();
    setEditingSchedule(null);
    setEditingSegments([]);
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

    // 收集要删除的排班ID
    const scheduleIds: number[] = [];
    selectedEmployeeKeys.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        selectedDates.forEach((dateStr) => {
          const schedule = emp.schedules.find((s) => {
            const scheduleDate = dayjs(s.scheduleDate).format('YYYY-MM-DD');
            return scheduleDate === dateStr;
          });
          if (schedule && schedule.id) {
            scheduleIds.push(schedule.id);
          }
        });
      }
    });

    if (scheduleIds.length === 0) {
      message.warning('所选员工和日期没有可删除的排班');
      return;
    }

    // 添加到待保存列表
    setPendingChanges(prev => ({
      ...prev,
      deletes: [...prev.deletes, ...scheduleIds],
    }));

    // 立即从本地数据中移除这些排班，让UI立即更新
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        // 过滤掉被删除的排班
        return oldData.filter((item: any) => {
          // 如果该排班的员工在选中列表中，且日期在选中日期中，且ID在删除列表中，则过滤掉
          if (!item.employee) return true;

          const isSelectedEmployee = selectedEmployeeKeys.includes(item.employee.id);
          const itemDate = dayjs(item.scheduleDate).format('YYYY-MM-DD');
          const isSelectedDate = selectedDates.includes(itemDate);
          const shouldDelete = isSelectedEmployee && isSelectedDate && scheduleIds.includes(item.id);

          return !shouldDelete;
        });
      }
    );

    setSelectedEmployeeKeys([]);
    setSelectedDates([]);
  };

  // 快捷键：复制排班到剪贴板
  const handleKeyboardCopy = () => {
    if (selectedEmployeeKeys.length === 0 || selectedDates.length === 0) {
      message.warning('请先选择要复制的区域');
      return;
    }

    // 收集选中区域的排班数据
    const schedulesToCopy: any[] = [];
    selectedEmployeeKeys.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        selectedDates.forEach((dateStr) => {
          const schedule = emp.schedules.find((s) => {
            // 格式化 scheduleDate 后再比较
            const scheduleDate = dayjs(s.scheduleDate).format('YYYY-MM-DD');
            return scheduleDate === dateStr;
          });
          if (schedule) {
            schedulesToCopy.push(schedule);
          }
        });
      }
    });

    if (schedulesToCopy.length === 0) {
      message.warning('所选区域没有排班数据');
      return;
    }

    // 复制到剪贴板
    copy(
      selectedEmployeeKeys as number[],
      selectedDates[0],
      schedulesToCopy
    );
  };

  // 快捷键：从剪贴板粘贴排班
  const handleKeyboardPaste = async () => {
    if (!isValid()) {
      message.warning('剪贴板为空或已过期');
      return;
    }

    if (selectedEmployeeKeys.length === 0 || selectedDates.length === 0) {
      message.warning('请先选择要粘贴的目标员工和日期');
      return;
    }

    const clipboardInfo = getClipboardInfo();
    if (!clipboardInfo) return;

    // 生成粘贴数据
    const schedulesToPaste: any[] = [];
    const schedulesToDisplay: any[] = [];

    selectedEmployeeKeys.forEach((empId) => {
      // 从 allEmployees 中查找完整的员工信息
      const employee = (Array.isArray(allEmployees) ? allEmployees : (allEmployees?.items || []))
        .find((e: any) => Number(e.id) === empId);

      selectedDates.forEach((dateStr) => {
        clipboard.schedules.forEach((schedule: any) => {
          const shift = shifts?.find((s: any) => s.id === schedule.shiftId);
          const newSchedule = {
            id: Date.now() + Math.random(), // 临时ID
            employeeId: empId,
            shiftId: schedule.shiftId,
            scheduleDate: dateStr,
            shiftName: shift?.name || schedule.shiftName || '',
            shiftColor: shift?.color || schedule.shiftColor || '#1890ff',
            status: 'PENDING', // 标记为待保存状态
            isPending: true, // 标记为未保存状态
            employee: employee ? {
              id: employee.id,
              employeeNo: employee.employeeNo,
              name: employee.name,
              org: employee.org,
            } : undefined,
            shift: shift ? {
              id: shift.id,
              name: shift.name,
              color: shift.color,
            } : undefined,
          };
          schedulesToDisplay.push(newSchedule);

          schedulesToPaste.push({
            employeeId: empId,
            shiftId: schedule.shiftId,
            scheduleDate: dateStr,
          });
        });
      });
    });

    // 添加到待保存列表（不包含临时ID和额外字段）
    setPendingChanges(prev => ({
      ...prev,
      creates: [...prev.creates, ...schedulesToPaste],
    }));

    // 立即在本地数据中添加，让UI立即显示
    queryClient.setQueryData(
      ['schedules', filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')],
      (oldData: any) => {
        if (!oldData) return oldData;

        // 将原有数据和新数据合并
        const existingData = Array.isArray(oldData) ? oldData : [];
        return [...existingData, ...schedulesToDisplay];
      }
    );
  };

  // 快捷键：删除选中排班
  const handleKeyboardDelete = () => {
    handleBatchDeleteSchedule();
  };

  // 检查事件是否在输入框中
  const isEventInInput = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.getAttribute('contenteditable') === 'true' ||
      target.closest('.ant-select') !== null ||
      target.closest('.ant-modal') !== null
    );
  };

  // 保存所有修改
  const handleSaveAll = async () => {
    const totalChanges = pendingChanges.creates.length + pendingChanges.updates.length + pendingChanges.deletes.length;

    if (totalChanges === 0) {
      message.info('没有待保存的修改');
      return;
    }

    setIsSaving(true);

    try {
      let successCreates = 0;
      let successUpdates = 0;
      let successDeletes = 0;
      let errorMessages: string[] = [];

      // 执行创建
      if (pendingChanges.creates.length > 0) {
        try {
          await request.post('/shift/schedules/batch', { schedules: pendingChanges.creates });
          successCreates = pendingChanges.creates.length;
        } catch (error: any) {
          console.error('创建排班失败:', error);
          errorMessages.push(`新增失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
        }
      }

      // 执行更新
      if (pendingChanges.updates.length > 0) {
        for (const update of pendingChanges.updates) {
          try {
            await request.put(`/shift/schedules/${update.id}`, {
              adjustedSegments: update.adjustedSegments,
            });
            successUpdates++;
          } catch (error: any) {
            console.error(`更新排班 ${update.id} 失败:`, error);
            errorMessages.push(`更新失败(ID:${update.id}): ${error?.response?.data?.message || error?.message || '未知错误'}`);
          }
        }
      }

      // 执行删除
      if (pendingChanges.deletes.length > 0) {
        for (const id of pendingChanges.deletes) {
          try {
            await request.delete(`/shift/schedules/${id}`);
            successDeletes++;
          } catch (error: any) {
            console.error(`删除排班 ${id} 失败:`, error);
            errorMessages.push(`删除失败(ID:${id}): ${error?.response?.data?.message || error?.message || '未知错误'}`);
          }
        }
      }

      // 如果有错误，显示详细错误信息
      if (errorMessages.length > 0) {
        message.error({
          content: (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>保存过程中遇到错误：</div>
              {errorMessages.map((msg, idx) => (
                <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                  • {msg}
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12 }}>
                成功: {successCreates}新增, {successUpdates}更新, {successDeletes}删除
              </div>
            </div>
          ),
          duration: 6,
        });
      } else if (successCreates + successUpdates + successDeletes > 0) {
        message.success({
          content: (
            <Space>
              <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
              <span>
                成功保存 {successCreates} 条新增、{successUpdates} 条更新、{successDeletes} 条删除
              </span>
            </Space>
          ),
          duration: 3,
          style: {
            marginTop: '20vh',
            borderRadius: 12,
            padding: '12px 20px',
          },
        });

        // 清空待保存列表
        setPendingChanges({ creates: [], updates: [], deletes: [] });
      }

      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'] });
    } catch (error: any) {
      console.error('保存失败:', error);
      message.error(`保存失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 快捷键：全选
  const handleSelectAll = () => {
    setSelectedEmployeeKeys(filteredEmployees.map((e) => e.id));
    setSelectedDates(allDates);
    setRangeSelectionStart(null);
    message.success('已全选所有员工和日期');
  };

  // 快捷键：取消选择
  const handleClearSelection = () => {
    setSelectedEmployeeKeys([]);
    setSelectedDates([]);
    setRangeSelectionStart(null);
    message.info('已清空选择');
  };

  // 键盘快捷键配置
  useKeyboardShortcuts([
    {
      ...ShortcutPresets.copy,
      handler: (e) => {
        if (!isEventInInput(e)) {
          handleKeyboardCopy();
        }
      },
    },
    {
      ...ShortcutPresets.paste,
      handler: (e) => {
        if (!isEventInInput(e)) {
          handleKeyboardPaste();
        }
      },
    },
    {
      ...ShortcutPresets.delete,
      handler: (e) => {
        if (!isEventInInput(e)) {
          handleKeyboardDelete();
        }
      },
    },
    {
      ...ShortcutPresets.backspace,
      handler: (e) => {
        if (!isEventInInput(e)) {
          handleKeyboardDelete();
        }
      },
    },
    {
      ...ShortcutPresets.selectAll,
      handler: (e) => {
        if (!isEventInInput(e)) {
          handleSelectAll();
        }
      },
    },
    {
      ...ShortcutPresets.escape,
      handler: (e) => {
        handleClearSelection();
      },
    },
  ]);

  return (
    <ModernPageLayout
      title="排班管理"
      description={
        <Space>
          <span>管理员工的排班信息，支持批量排班、复制排班等功能</span>
          <Badge count="NEW" style={{ backgroundColor: '#00B365', fontSize: '11px' }} />
        </Space>
      }
      breadcrumb={[
        { label: '排班管理', path: '/shift' },
        { label: '排班管理', path: '/shift/schedules' },
      ]}
    >
      {/* 键盘快捷键提示 */}
      {showKeyboardHints && (
        <Alert
          message={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>⌨️ 快捷键：</strong>
              </div>
              <Space wrap>
                <Tag>
                  <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>Shift + 点击</kbd> 范围选择
                </Tag>
                <Tag>
                  <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>点击空白</kbd> 快速排班
                </Tag>
                <Tag>
                  <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>双击排班</kbd> 编辑
                </Tag>
                <Tag>
                  <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>Delete</kbd> 删除
                </Tag>
                <Tag>
                  <kbd style={{ fontFamily: 'monospace', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>Esc</kbd> 取消
                </Tag>
              </Space>
              <div style={{ color: '#6b7280', fontSize: '12px', marginTop: 8 }}>
                💡 单击选择单元格 • 点击空白单元格或"添加"按钮快速排班 • 双击已有排班编辑 • Shift+点击选择区域
              </div>
              {pendingChanges.creates.length + pendingChanges.updates.length + pendingChanges.deletes.length > 0 && (
                <Space style={{ color: '#f59e0b', marginTop: 8 }}>
                  <CheckCircleOutlined />
                  <span>
                    待保存: {pendingChanges.creates.length}条新增、{pendingChanges.updates.length}条更新、{pendingChanges.deletes.length}条删除
                  </span>
                </Space>
              )}
            </Space>
          }
          type="info"
          closable
          onClose={() => setShowKeyboardHints(false)}
          style={{
            marginBottom: 16,
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
          icon={<InfoCircleOutlined style={{ color: '#3b82f6' }} />}
        />
      )}

      <Card
        style={{
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: 16,
          boxShadow: 'none',
        }}
        bodyStyle={{ padding: '20px' }}
      >
        {/* 日期区间选择器和动态搜索条件放在同一行 */}
        <div style={{ marginBottom: 24 }}>
          <DynamicSearchConditions
            pageCode="schedule-management"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ dateRange: filters.dateRange }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'dateRange') {
                setFilters({ ...filters, dateRange: value || [dayjs().startOf('month'), dayjs().endOf('month')] });
              }
            }}
          />
        </div>

        {/* 操作按钮 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space wrap size="small">
              <Popover
                trigger="click"
                placement="bottom"
                open={batchAddPopoverOpen}
                onOpenChange={(visible) => setBatchAddPopoverOpen(visible)}
                content={
                  <QuickShiftSelectPopover
                    shifts={shifts || []}
                    onSelect={(shiftId) => {
                      handleBatchScheduleConfirm(shiftId);
                      setBatchAddPopoverOpen(false);
                    }}
                  />
                }
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={selectedEmployeeKeys.length === 0 || selectedDates.length === 0}
                  style={{
                    borderRadius: '6px',
                    height: '36px',
                    fontWeight: 500,
                  }}
                >
                  添加
                </Button>
              </Popover>

              <Tooltip title="快捷键: Delete">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDeleteSchedule}
                  disabled={selectedEmployeeKeys.length === 0 || selectedDates.length === 0}
                  style={{
                    borderRadius: '6px',
                    height: '36px',
                  }}
                >
                  删除
                </Button>
              </Tooltip>

              <Divider type="vertical" style={{ height: '36px' }} />

              <Tooltip title="保存所有待提交的修改">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSaveAll}
                  disabled={pendingChanges.creates.length + pendingChanges.updates.length + pendingChanges.deletes.length === 0}
                  style={{
                    borderRadius: '6px',
                    height: '36px',
                  }}
                >
                  保存
                </Button>
              </Tooltip>

              <Tooltip title="快捷键: Esc">
                <Button
                  onClick={handleClearSelection}
                  style={{
                    borderRadius: '6px',
                    height: '36px',
                  }}
                >
                  清空选择
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {/* 排班表格 */}
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={filteredEmployees}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="middle"
            bordered
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
            }}
            className="schedule-table"
          />
        </div>

        <style>{`
          .schedule-table .ant-table {
            font-size: 13px;
          }

          .schedule-table .ant-table-thead > tr > th {
            background: #f9fafb;
            color: #374151;
            font-weight: 600;
            border-color: #e5e7eb;
            padding: 12px 8px;
          }

          .schedule-table .ant-table-tbody > tr:hover > td {
            background: #fafafa !important;
          }

          .schedule-table .ant-table-cell {
            transition: all 0.15s ease;
          }

          .schedule-table .ant-table-cell-fix-left,
          .schedule-table .ant-table-cell-fix-right {
            background: white;
            border-right-color: #e5e7eb !important;
          }

          /* 表格边框颜色优化 */
          .schedule-table .ant-table-tbody > tr > td {
            border-color: #f3f4f6;
          }

          .schedule-table .ant-table-thead > tr > th {
            border-color: #e5e7eb !important;
          }

          /* 表格斑马纹 */
          .schedule-table .ant-table-tbody > tr:nth-child(even) {
            background: #fafafa;
          }

          .schedule-table .ant-table-tbody > tr:nth-child(odd) {
            background: white;
          }

          /* 选中日期的列样式 - 轻微高亮 */
          .date-column-selected {
            background: #f0f9ff !important;
          }
        `}</style>
      </Card>

      {/* 编辑排班对话框 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>编辑排班</span>
          </Space>
        }
        open={editScheduleModalOpen}
        onOk={handleEditScheduleOk}
        onCancel={() => {
          setEditScheduleModalOpen(false);
          editForm.resetFields();
          setEditingSchedule(null);
          setEditingSegments([]);
        }}
        confirmLoading={isSaving}
        width={900}
        okButtonProps={{
          style: {
            borderRadius: '6px',
          },
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
          },
        }}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>员工</span>}>
                <Input
                  value={employees.find((e) => e.id === editingSchedule?.employeeId)?.name}
                  disabled
                  style={{ background: '#f9fafb' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={{ fontWeight: 500 }}>排班日期</span>}>
                <Input
                  value={editingSchedule?.scheduleDate}
                  disabled
                  style={{ background: '#f9fafb' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shiftId" label={<span style={{ fontWeight: 500 }}>班次</span>}>
                <Select disabled style={{ background: '#f9fafb' }}>
                  {(shifts || []).map((shift: any) => (
                    <Select.Option key={shift.id} value={shift.id}>
                      <Tag color={shift.color}>{shift.name}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider
          orientation="left"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
          }}
        >
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
              width: 160,
              render: (_: any, record: ScheduleSegmentItem, index: number) => (
                <DatePicker.TimePicker
                  value={record.startTime ? dayjs(record.startTime, 'HH:mm') : null}
                  format="HH:mm"
                  onChange={(time) => updateSegment(index, 'startTime', time ? time.format('HH:mm') : '')}
                  style={{ width: '100%' }}
                  placeholder="选择时间"
                />
              ),
            },
            {
              title: '结束时间',
              key: 'endTime',
              width: 160,
              render: (_: any, record: ScheduleSegmentItem, index: number) => (
                <DatePicker.TimePicker
                  value={record.endTime ? dayjs(record.endTime, 'HH:mm') : null}
                  format="HH:mm"
                  onChange={(time) => updateSegment(index, 'endTime', time ? time.format('HH:mm') : '')}
                  style={{ width: '100%' }}
                  placeholder="选择时间"
                />
              ),
            },
            {
              title: '时长(小时)',
              dataIndex: 'duration',
              key: 'duration',
              width: 120,
              render: (duration: number) => (
                <Tag color="purple">
                  {duration.toFixed(2)}h
                </Tag>
              ),
            },
            {
              title: '转移子账户',
              dataIndex: 'accountId',
              key: 'accountId',
              width: 600,
              render: (accountId: number | undefined, record: ScheduleSegmentItem, index: number) => {
                return (
                  <AccountSelect
                    value={accountId || null}
                    usageType="SHIFT"
                    onChange={(value) => updateSegment(index, 'accountId', value)}
                    placeholder="选择子账户"
                    style={{ width: '100%' }}
                  />
                );
              },
            },
          ]}
          dataSource={editingSegments}
          rowKey={(record, index) => String(record.id || index || 0)}
          pagination={false}
          size="middle"
        />

        <div style={{ marginTop: 24 }}>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={handleDeleteScheduleInModal}
            okText="确认"
            cancelText="取消"
            okButtonProps={{
              danger: true,
              style: { borderRadius: '6px' },
            }}
            cancelButtonProps={{
              style: { borderRadius: '6px' },
            }}
          >
            <Button
              danger
              block
              icon={<DeleteOutlined />}
              style={{
                borderRadius: '6px',
                height: '38px',
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

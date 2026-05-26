import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  DatePicker,
  Input,
  message,
  Collapse,
  Row,
  Col,
  Typography,
  Alert,
  Empty,
  Select,
  TimePicker,
  Card,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  CaretRightOutlined,
  ExpandOutlined,
  ShrinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import AccountSelect from '@/components/common/AccountSelect';

const { Text } = Typography;

interface PunchResultsTabProps {
  selectedDateRange: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  selectedEmployee?: string;
  onRefresh?: () => void;
}

const PunchResultsTab: React.FC<PunchResultsTabProps> = ({
  selectedDateRange,
  selectedEmployee,
  onRefresh,
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [overlapDetailModalOpen, setOverlapDetailModalOpen] = useState(false);
  const [addPunchModalOpen, setAddPunchModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [overlapRecords, setOverlapRecords] = useState<any[]>([]);
  const [modifiedRecordIds, setModifiedRecordIds] = useState<Set<number>>(new Set());
  const [isSupplementMode, setIsSupplementMode] = useState(false); // 是否为补卡模式
  const [supplementType, setSupplementType] = useState<'in' | 'out' | null>(null); // 补卡类型
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]); // 展开的行keys
  const [form] = Form.useForm();
  const [addPunchForm] = Form.useForm();

  const { data: punchPairs, isLoading, refetch } = useQuery({
    queryKey: ['punchPairs', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), selectedEmployee],
    queryFn: () =>
      request.get('/punch/pairing/results', {
        params: {
          startDate: selectedDateRange.start.format('YYYY-MM-DD'),
          endDate: selectedDateRange.end.format('YYYY-MM-DD'),
          employeeNo: selectedEmployee,
          pageSize: 1000,
        },
      }).then((res: any) => res.items || []),
  });

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  // 获取班次列表
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => request.get('/shift/shifts').then((res: any) => res.items || []),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => request.put(`/punch/pairs/${data.id}`, data),
    onSuccess: (_, variables) => {
      message.success(isSupplementMode ? '补卡成功' : '修改成功');
      // 标记为已修改
      setModifiedRecordIds(prev => new Set(prev).add(variables.id));
      setEditModalOpen(false);
      setIsSupplementMode(false);
      setSupplementType(null);
      setOverlapDetailModalOpen(false);
      form.resetFields();
      refetch();
      onRefresh?.();
    },
  });

  const createPunchMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/pairs', data),
    onSuccess: () => {
      message.success('新增打卡成功');
      setAddPunchModalOpen(false);
      addPunchForm.resetFields();
      refetch();
      onRefresh?.();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '新增打卡失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/punch/pairing/results/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      setOverlapDetailModalOpen(false);
      refetch();
      onRefresh?.();
    },
  });

  const groupedData = groupPunchPairs(punchPairs || []);

  const isMissingPunch = (record: any) => {
    return !record.inPunchTime || !record.outPunchTime;
  };

  // 检查单个记录是否与其他记录有交叉
  const getOverlapStatus = (targetRecord: any, allRecords: any[]) => {
    if (!targetRecord.inPunchTime || !targetRecord.outPunchTime || !targetRecord.account?.namePath) {
      return false;
    }

    const validRecords = allRecords.filter((r) => {
      return r.inPunchTime && r.outPunchTime && r.account?.namePath && r.id !== targetRecord.id;
    });

    if (validRecords.length === 0) return false;

    const targetPath = targetRecord.account.namePath || '';
    const targetLevel = targetPath.split('/').filter(p => p.trim()).length;

    for (const record of validRecords) {
      // 只检查相同层级的记录
      const recordPath = record.account.namePath || '';
      const recordLevel = recordPath.split('/').filter(p => p.trim()).length;

      if (targetLevel !== recordLevel) continue;
      if (targetRecord.account?.id === record.account?.id) continue;

      // 检查时间是否重叠（完美衔接不算交叉）
      const start1 = dayjs(targetRecord.inPunchTime);
      const end1 = dayjs(targetRecord.outPunchTime);
      const start2 = dayjs(record.inPunchTime);
      const end2 = dayjs(record.outPunchTime);

      const hasOverlap = !(
        end1.isSame(start2) ||     // r1结束时间等于r2开始时间（完美衔接）
        end1.isBefore(start2) ||
        start1.isAfter(end2) ||
        start1.isSame(end2)        // r1开始时间等于r2结束时间（完美衔接）
      );

      if (hasOverlap) return true;
    }

    return false;
  };

  // 检查同一人、同一日期、同一班次的打卡记录是否有时间交叉
  const hasOverlap = (records: any[]) => {
    if (records.length < 2) return false;

    // 获取所有有效的打卡记录（有签入和签出时间，且有账户信息）
    const validRecords = records.filter((r) => {
      return r.inPunchTime && r.outPunchTime && r.account?.namePath;
    });

    if (validRecords.length < 2) return false;

    // 按账户层级分组（层级数相同的一组）
    const levelGroups: { [level: number]: any[] } = {};
    validRecords.forEach((record) => {
      const namePath = record.account.namePath || '';
      // 计算层级数（通过路径中 "/" 的数量）
      const level = namePath.split('/').filter(p => p.trim()).length;
      if (!levelGroups[level]) {
        levelGroups[level] = [];
      }
      levelGroups[level].push(record);
    });

    // 检查每个层级组内是否有时间交叉
    for (const level in levelGroups) {
      const levelRecords = levelGroups[level];

      // 检查该层级内的所有记录两两之间是否有时间重叠
      for (let i = 0; i < levelRecords.length; i++) {
        for (let j = i + 1; j < levelRecords.length; j++) {
          const r1 = levelRecords[i];
          const r2 = levelRecords[j];

          // 如果账户相同，跳过
          if (r1.account?.id === r2.account?.id) continue;

          // 检查时间是否重叠或交叉
          const start1 = dayjs(r1.inPunchTime);
          const end1 = dayjs(r1.outPunchTime);
          const start2 = dayjs(r2.inPunchTime);
          const end2 = dayjs(r2.outPunchTime);

          // 判断时间交叉：两个时间段有重叠（完美衔接不算交叉）
          // 例如：23:00~04:00 和 04:00~10:00 不算交叉
          const hasOverlap = !(
            end1.isSame(start2) ||     // r1结束时间等于r2开始时间（完美衔接）
            end1.isBefore(start2) ||   // r1 在 r2 之前
            start1.isAfter(end2) ||    // r1 在 r2 之后
            start1.isSame(end2)        // r1开始时间等于r2结束时间（完美衔接）
          );

          if (hasOverlap) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const handleEdit = (record: any) => {
    setCurrentRecord(record);

    // 检查是否缺卡
    const missingIn = !record.inPunchTime;
    const missingOut = !record.outPunchTime;

    if (missingIn || missingOut) {
      // 补卡模式
      setIsSupplementMode(true);
      // 如果只缺一个卡，补对应的位置；如果都缺，默认补充进班卡
      if (missingIn && !missingOut) {
        setSupplementType('in');
      } else if (!missingIn && missingOut) {
        setSupplementType('out');
      } else {
        // 都缺，默认补充进班卡
        setSupplementType('in');
      }
      form.setFieldsValue({
        pairDate: record.pairDate ? dayjs(record.pairDate) : null,
        shiftId: record.shiftId || null,
        shiftName: record.shiftName || '',
        accountId: record.account?.id || null,
        inPunchTime: missingIn ? null : (record.inPunchTime ? dayjs(record.inPunchTime) : null),
        outPunchTime: missingOut ? null : (record.outPunchTime ? dayjs(record.outPunchTime) : null),
      });
    } else {
      // 编辑模式 - 可以修改所有信息
      setIsSupplementMode(false);
      setSupplementType(null);
      form.setFieldsValue({
        pairDate: record.pairDate ? dayjs(record.pairDate) : null,
        shiftId: record.shiftId || null,
        shiftName: record.shiftName || '',
        accountId: record.account?.id || null,
        inPunchTime: record.inPunchTime ? dayjs(record.inPunchTime) : null,
        outPunchTime: record.outPunchTime ? dayjs(record.outPunchTime) : null,
      });
    }
    setEditModalOpen(true);
  };

  // 根据日期和员工查询排班信息
  const fetchEmployeeSchedule = async (employeeNo: string, date: string) => {
    try {
      console.log('正在查询排班信息:', { employeeNo, date });

      // 先根据 employeeNo 查询员工信息获取 employeeId
      const employeeRes = await request.get('/hr/employees', {
        params: {
          employeeNo,
          pageSize: 1,
        },
      });

      const employeeList = employeeRes.items || [];
      if (employeeList.length === 0) {
        message.warning('未找到员工信息');
        return;
      }

      const employeeId = employeeList[0].id;
      console.log('找到员工ID:', employeeId);

      // 使用 employeeId 查询排班信息
      const res = await request.get('/shift/schedules', {
        params: {
          employeeId,
          startDate: date,
          endDate: date,
          pageSize: 100,
        },
      });

      console.log('排班API响应:', res);
      const schedules = res.items || [];
      if (schedules.length > 0) {
        const schedule = schedules[0];
        console.log('找到排班:', schedule);
        form.setFieldsValue({
          shiftId: schedule.shiftId,
          shiftName: schedule.shift?.name || schedule.shiftName || '',
        });
        message.success('已自动加载该日期的排班信息');
      } else {
        message.warning('该日期未找到排班信息');
      }
    } catch (error) {
      console.error('查询排班信息失败:', error);
      message.error('查询排班信息失败');
    }
  };

  // 处理日期切换
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    console.log('=== 日期切换事件触发 ===');
    console.log('新日期:', date?.format('YYYY-MM-DD'));
    console.log('当前记录:', currentRecord);

    if (date && currentRecord?.employeeNo) {
      const employeeNo = currentRecord.employeeNo;
      const dateStr = date.format('YYYY-MM-DD');
      console.log('准备查询排班信息:', { employeeNo, dateStr });

      // 清空当前班次信息
      form.setFieldsValue({
        shiftId: null,
        shiftName: '',
      });

      // 异步查询排班信息
      fetchEmployeeSchedule(employeeNo, dateStr);
    } else {
      console.log('无法查询排班 - 缺少必要参数');
      console.log('date 存在:', !!date);
      console.log('currentRecord 存在:', !!currentRecord);
      console.log('employeeNo:', currentRecord?.employeeNo);
      message.warning('无法查询排班信息：缺少员工编号或日期');
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();

      if (isSupplementMode) {
        // 补卡模式 - 只更新缺失的时间字段
        const updateData: any = {
          id: currentRecord.id,
        };

        if (supplementType === 'in') {
          updateData.inPunchTime = values.inPunchTime?.format('YYYY-MM-DD HH:mm:ss');
        } else if (supplementType === 'out') {
          updateData.outPunchTime = values.outPunchTime?.format('YYYY-MM-DD HH:mm:ss');
        }

        updateMutation.mutate(updateData);
      } else {
        // 编辑模式 - 更新所有信息
        updateMutation.mutate({
          id: currentRecord.id,
          pairDate: values.pairDate?.format('YYYY-MM-DD'),
          shiftId: values.shiftId,
          accountId: values.accountId,
          inPunchTime: values.inPunchTime?.format('YYYY-MM-DD HH:mm:ss'),
          outPunchTime: values.outPunchTime?.format('YYYY-MM-DD HH:mm:ss'),
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleAddPunch = () => {
    setAddPunchModalOpen(true);
  };

  const handleSaveAddPunch = async () => {
    try {
      const values = await addPunchForm.validateFields();

      // 获取选择的开始和结束时间（已经是完整的日期时间）
      const startTime = values.startTime;
      const endTime = values.endTime;

      // 格式化为完整的日期时间字符串
      const inPunchTime = startTime.format('YYYY-MM-DD HH:mm:ss');
      const outPunchTime = endTime.format('YYYY-MM-DD HH:mm:ss');

      // 计算工时
      const workHours = dayjs(outPunchTime).diff(dayjs(inPunchTime), 'hour', true);

      createPunchMutation.mutate({
        employeeNo: values.employeeNo,
        pairDate: values.punchDate.format('YYYY-MM-DD'),
        accountId: values.accountId,
        inPunchTime,
        outPunchTime,
        workHours,
        reason: values.reason || '',
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 检查记录是否被修改过
  const isRecordModified = (recordId: number) => {
    return modifiedRecordIds.has(recordId);
  };

  // 处理点击交叉标记
  const handleOverlapClick = (record: any, allRecords: any[]) => {
    // 找出所有与该记录有交叉的记录，并计算交叉时间段
    const overlappingRecords: any[] = [];

    if (!record.inPunchTime || !record.outPunchTime || !record.account?.namePath) {
      setOverlapRecords([{ ...record, isCurrent: true }]);
      setOverlapDetailModalOpen(true);
      return;
    }

    const targetPath = record.account.namePath || '';
    const targetLevel = targetPath.split('/').filter(p => p.trim()).length;
    const targetStart = dayjs(record.inPunchTime);
    const targetEnd = dayjs(record.outPunchTime);

    allRecords.forEach((r) => {
      if (r.id === record.id) return; // 跳过自己
      if (!r.inPunchTime || !r.outPunchTime || !r.account?.namePath) return;

      const recordPath = r.account.namePath || '';
      const recordLevel = recordPath.split('/').filter(p => p.trim()).length;

      // 只检查相同层级
      if (targetLevel !== recordLevel) return;
      // 只检查不同账户
      if (record.account?.id === r.account?.id) return;

      // 检查时间交叉（完美衔接不算交叉）
      const start2 = dayjs(r.inPunchTime);
      const end2 = dayjs(r.outPunchTime);

      const hasOverlap = !(
        targetEnd.isSame(start2) ||     // r1结束时间等于r2开始时间（完美衔接）
        targetEnd.isBefore(start2) ||
        targetStart.isAfter(end2) ||
        targetStart.isSame(end2)        // r1开始时间等于r2结束时间（完美衔接）
      );

      if (hasOverlap) {
        // 计算交叉时间段
        const overlapStart = targetStart.isAfter(start2) ? targetStart : start2;
        const overlapEnd = targetEnd.isBefore(end2) ? targetEnd : end2;

        overlappingRecords.push({
          ...r,
          overlapStartTime: overlapStart.format('YYYY-MM-DD HH:mm:ss'),
          overlapEndTime: overlapEnd.format('YYYY-MM-DD HH:mm:ss'),
          overlapDuration: overlapEnd.diff(overlapStart, 'hour', true),
        });
      }
    });

    // 添加当前记录（标记为当前记录）
    setOverlapRecords([{ ...record, isCurrent: true }, ...overlappingRecords]);
    setOverlapDetailModalOpen(true);
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  if (!punchPairs || punchPairs.length === 0) {
    return (
      <div style={{ padding: 60 }}>
        <Empty description="暂无打卡数据" />
      </div>
    );
  }

  // 准备分组数据作为表格数据源
  const groupListData = Object.entries(groupedData).map(([groupKey, group]: [string, any]) => {
    const groupRecords = group.records;
    const hasMissingCard = groupRecords.some((r: any) => isMissingPunch(r));
    const hasOverlapIssue = hasOverlap(groupRecords);
    const org = groupRecords[0]?.employee?.org;

    return {
      key: groupKey,
      employeeNo: group.employeeNo,
      employeeName: group.employeeName,
      organizationName: org?.name || '-',
      organizationCode: org?.code || '-',
      pairDate: group.pairDate,
      shiftName: group.shiftName,
      hasMissingCard,
      hasOverlapIssue,
      recordCount: groupRecords.length,
      records: groupRecords,
      groupKey,
    };
  });

  // 展开行的渲染函数
  const expandedRowRender = (record: any) => {
    const groupRecords = record.records || [];

    return (
      <div className="expanded-row-table-wrapper">
        <Table
          dataSource={groupRecords}
          rowKey="id"
          pagination={false}
          size="middle"
          showHeader={false}
          tableLayout="fixed"
          columns={[
            {
              title: '序号',
              key: 'index',
              width: 60,
              align: 'center' as const,
              render: (_: any, __: any, index: number) => {
                return <Text type="secondary">#{index + 1}</Text>;
              },
            },
            {
              title: '开始时间',
              dataIndex: 'inPunchTime',
              key: 'inPunchTime',
              width: 180,
              align: 'center' as const,
              render: (time: string) => {
                if (!time)
                  return (
                    <Tag color="warning" icon={<WarningOutlined />}>
                      缺卡
                    </Tag>
                  );
                return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
              },
            },
            {
              title: '结束时间',
              dataIndex: 'outPunchTime',
              key: 'outPunchTime',
              width: 180,
              align: 'center' as const,
              render: (time: string) => {
                if (!time)
                  return (
                    <Tag color="warning" icon={<WarningOutlined />}>
                      缺卡
                    </Tag>
                  );
                return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
              },
            },
            {
              title: '刷卡归属账户',
              dataIndex: 'accountName',
              key: 'account',
              width: 300,
              ellipsis: true,
              align: 'left' as const,
              render: (accountName: string) => {
                if (!accountName) return '-';
                // 直接显示API返回的accountName，不做任何处理
                return <Tag color="purple">{accountName}</Tag>;
              },
            },
            {
              title: '状态',
              key: 'status',
              width: 150,
              align: 'center' as const,
              render: (_: any, record: any) => {
                const isComplete = record.inPunchTime && record.outPunchTime;
                const isModified = isRecordModified(record.id);
                const groupRecords = groupedData[record.groupKey]?.records || [];
                const isOverlap = getOverlapStatus(record, groupRecords);

                return (
                  <Space size="small">
                    {isModified && (
                      <Tag color="orange" icon={<WarningOutlined />}>
                        已修改
                      </Tag>
                    )}
                    {isOverlap && (
                      <Tag
                        color="error"
                        icon={<WarningOutlined />}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleOverlapClick(record, groupRecords)}
                      >
                        交叉
                      </Tag>
                    )}
                    {!isModified && !isOverlap && (isComplete ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        完整
                      </Tag>
                    ) : (
                      <Tag color="warning" icon={<WarningOutlined />}>
                        缺卡
                      </Tag>
                    ))}
                  </Space>
                );
              },
            },
            {
              title: '操作',
              key: 'action',
              width: 120,
              align: 'center' as const,
              render: (_: any, record: any) => {
                const missingIn = !record.inPunchTime;
                const missingOut = !record.outPunchTime;
                const isMissingPunch = missingIn || missingOut;

                return (
                  <Space size={4}>
                    <Button
                      type="link"
                      size="small"
                      icon={isMissingPunch ? <PlusOutlined /> : <EditOutlined />}
                      onClick={() => handleEdit(record)}
                      title={isMissingPunch ? "补卡" : "修改"}
                    >
                      {isMissingPunch ? "补卡" : "修改"}
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.id)}
                      title="删除"
                    >
                      删除
                    </Button>
                  </Space>
                );
              },
            },
          ]}
      />
      </div>
    );
  };

  return (
    <>
      <style>{`
        .overlap-current-row {
          background-color: #e6f7ff !important;
        }
        .overlap-current-row:hover td {
          background-color: #bae7ff !important;
        }
        .modified-punch-row {
          background-color: #fff7ed !important;
        }
        .modified-punch-row:hover td {
          background-color: #ffedd5 !important;
        }
        /* 修复明细表格对齐问题 */
        .ant-table-expanded-row {
          background: transparent !important;
        }
        .ant-table-expanded-row > td {
          padding: 0 !important;
          border-bottom: none !important;
        }
        .expanded-row-table-wrapper {
          width: 100%;
        }
        .expanded-row-table-wrapper .ant-table-wrapper {
          margin: 0 !important;
        }
        .expanded-row-table-wrapper .ant-table {
          margin: 0 !important;
          background: #fafafa !important;
        }
        .expanded-row-table-wrapper .ant-table-tbody > tr > td {
          background: #fafafa !important;
          border-top: 1px solid #f0f0f0 !important;
        }
        .expanded-row-table-wrapper .ant-table-tbody > tr:first-child > td {
          border-top: none !important;
        }
        .expanded-row-table-wrapper .ant-table-tbody > tr:hover > td {
          background: #f5f5f5 !important;
        }
      `}</style>
      <div style={{ padding: '16px' }}>
        {/* 操作按钮区域 - 右侧 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <div></div> {/* 占位，让按钮靠右 */}
          <Space size="middle">
            <Button
              icon={<ExpandOutlined />}
              onClick={() => setExpandedKeys(groupListData.map(item => item.key))}
              size="large"
            >
              展开全部
            </Button>
            <Button
              icon={<ShrinkOutlined />}
              onClick={() => setExpandedKeys([])}
              size="large"
            >
              折叠全部
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPunch}
              size="large"
              style={{
                borderRadius: 8,
                height: 40,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              新增打卡
            </Button>
          </Space>
        </div>

      <Table
        dataSource={groupListData}
        rowKey="key"
        pagination={false}
        size="middle"
        tableLayout="fixed"
        expandable={{
          expandedRowRender,
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys),
          defaultExpandAllRows: false,
          expandIcon: ({ expanded, onExpand, record }) => {
            return (
              <div
                onClick={(e) => onExpand(record, e)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                }}
              >
                {expanded ? (
                  <CaretRightOutlined rotate={90} />
                ) : (
                  <CaretRightOutlined />
                )}
              </div>
            );
          },
        }}
        columns={[
          {
            title: '工号',
            dataIndex: 'employeeNo',
            key: 'employeeNo',
            width: 70,
          },
          {
            title: '姓名',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 70,
          },
          {
            title: '组织名称',
            dataIndex: 'organizationName',
            key: 'organizationName',
            width: 90,
            ellipsis: true,
          },
          {
            title: '组织代码',
            dataIndex: 'organizationCode',
            key: 'organizationCode',
            width: 60,
          },
          {
            title: '日期',
            dataIndex: 'pairDate',
            key: 'pairDate',
            width: 85,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
          },
          {
            title: '班次',
            dataIndex: 'shiftName',
            key: 'shiftName',
            width: 60,
            render: (name: string) => (name ? <Tag color="blue">{name}</Tag> : '-'),
          },
          {
            title: '状态',
            key: 'status',
            width: 90,
            render: (_: any, record: any) => {
              return (
                <Space size="small">
                  {record.hasMissingCard && (
                    <Tag color="warning" icon={<WarningOutlined />}>
                      缺卡
                    </Tag>
                  )}
                  {record.hasOverlapIssue && (
                    <Tag color="error" icon={<InfoCircleOutlined />}>
                      交叉
                    </Tag>
                  )}
                  {!record.hasMissingCard && !record.hasOverlapIssue && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      正常
                    </Tag>
                  )}
                </Space>
              );
            },
          },
          {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, record: any) => {
              return (
                <Space direction="vertical" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共{record.recordCount}笔打卡
                  </Text>
                </Space>
              );
            },
          },
        ]}
      />

      <Modal
        title={isSupplementMode ? "补卡" : "编辑打卡记录"}
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalOpen(false);
          setIsSupplementMode(false);
          setSupplementType(null);
          form.resetFields();
        }}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          {isSupplementMode ? (
            <>
              <Alert
                message="补卡提示"
                description={
                  supplementType === 'in'
                    ? "当前记录缺少签入时间，请补充签入时间，将自动形成一对打卡记录。"
                    : "当前记录缺少签出时间，请补充签出时间，将自动形成一对打卡记录。"
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {supplementType === 'in' ? (
                <Form.Item
                  name="inPunchTime"
                  label="签入时间"
                  rules={[{ required: true, message: '请选择签入时间' }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%' }}
                    placeholder="请选择签入时间"
                    disabledDate={(current) => {
                      const pairDate = form.getFieldValue('pairDate');
                      if (!pairDate || !current) return false;
                      const dayDiff = Math.abs(current.diff(pairDate, 'day'));
                      return dayDiff > 1;
                    }}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name="outPunchTime"
                  label="签出时间"
                  rules={[{ required: true, message: '请选择签出时间' }]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%' }}
                    placeholder="请选择签出时间"
                    disabledDate={(current) => {
                      const pairDate = form.getFieldValue('pairDate');
                      if (!pairDate || !current) return false;
                      const dayDiff = Math.abs(current.diff(pairDate, 'day'));
                      return dayDiff > 1;
                    }}
                  />
                </Form.Item>
              )}
            </>
          ) : (
            <>
              <Form.Item
                name="pairDate"
                label="日期"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  onChange={handleDateChange}
                />
              </Form.Item>
              <Form.Item
                name="shiftId"
                label="班次ID"
                hidden
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="shiftName"
                label="班次"
              >
                <Input disabled placeholder="切换日期后自动加载班次" style={{ backgroundColor: '#f5f5f5', color: '#000' }} />
              </Form.Item>
              <Form.Item
                name="accountId"
                label="劳动力账户"
                rules={[{ required: true, message: '请选择劳动力账户' }]}
              >
                <AccountSelect placeholder="请选择劳动力账户" />
              </Form.Item>
              <Form.Item
                name="inPunchTime"
                label="签入时间"
                rules={[{ required: true, message: '请选择签入时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  disabledDate={(current) => {
                    const pairDate = form.getFieldValue('pairDate');
                    if (!pairDate || !current) return false;
                    const dayDiff = Math.abs(current.diff(pairDate, 'day'));
                    return dayDiff > 1;
                  }}
                />
              </Form.Item>
              <Form.Item
                name="outPunchTime"
                label="签出时间"
                rules={[{ required: true, message: '请选择签出时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  disabledDate={(current) => {
                    const pairDate = form.getFieldValue('pairDate');
                    if (!pairDate || !current) return false;
                    const dayDiff = Math.abs(current.diff(pairDate, 'day'));
                    return dayDiff > 1;
                  }}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* 新增打卡对话框 */}
      <Modal
        title="新增打卡记录"
        open={addPunchModalOpen}
        onOk={handleSaveAddPunch}
        onCancel={() => {
          setAddPunchModalOpen(false);
          addPunchForm.resetFields();
        }}
        confirmLoading={createPunchMutation.isPending}
        width={600}
      >
        <Form
          form={addPunchForm}
          layout="vertical"
          style={{ marginTop: 24 }}
          onValuesChange={(changedValues) => {
            // 当打卡日期变化时，清空开始和结束时间
            if (changedValues.punchDate) {
              addPunchForm.setFieldsValue({
                startTime: null,
                endTime: null,
              });
            }
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employeeNo"
                label="员工"
                rules={[{ required: true, message: '请选择员工' }]}
              >
                <Select
                  placeholder="请选择员工"
                  showSearch
                  optionFilterProp="label"
                  options={employees?.map((emp: any) => ({
                    label: `${emp.name} (${emp.employeeNo})`,
                    value: emp.employeeNo,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="punchDate"
                label="打卡日期"
                rules={[{ required: true, message: '请选择打卡日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="accountId"
            label="劳动力账户"
            rules={[{ required: true, message: '请选择劳动力账户' }]}
          >
            <AccountSelect
              placeholder="请选择劳动力账户"
              usageType="PUNCH"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  placeholder="请选择开始时间"
                  disabledDate={(current) => {
                    // 获取打卡日期
                    const punchDate = addPunchForm.getFieldValue('punchDate');
                    if (!punchDate || !current) {
                      return false;
                    }
                    // 只允许选择打卡日期的前一天、当天、后一天
                    const dayDiff = Math.abs(current.diff(punchDate, 'day'));
                    return dayDiff > 1;
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  placeholder="请选择结束时间"
                  disabledDate={(current) => {
                    // 获取打卡日期
                    const punchDate = addPunchForm.getFieldValue('punchDate');
                    if (!punchDate || !current) {
                      return false;
                    }
                    // 只允许选择打卡日期的前一天、当天、后一天
                    const dayDiff = Math.abs(current.diff(punchDate, 'day'));
                    return dayDiff > 1;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="原因"
            rules={[{ required: true, message: '请输入原因' }]}
          >
            <Input.TextArea
              placeholder="请输入新增打卡的原因"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 交叉详情弹窗 */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            <Text strong>时间交叉详情</Text>
          </Space>
        }
        open={overlapDetailModalOpen}
        onCancel={() => setOverlapDetailModalOpen(false)}
        footer={null}
        width={1300}
      >
        {overlapRecords.length > 0 && (
          <div>
            <Alert
              message={
                <Space direction="vertical" size={0}>
                  <Text>检测到 {overlapRecords.length} 条记录存在时间交叉</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    第一条为当前查看的记录，其余为与该记录有时间交叉的记录
                  </Text>
                </Space>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              dataSource={overlapRecords}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 1250 }}
              rowClassName={(record) => record.isCurrent ? 'overlap-current-row' : ''}
              columns={[
                {
                  title: '当前记录',
                  key: 'isCurrent',
                  width: 90,
                  align: 'center' as const,
                  render: (_: any, record: any) => {
                    return record.isCurrent ? (
                      <Tag color="blue" icon={<CheckCircleOutlined />}>
                        当前
                      </Tag>
                    ) : (
                      <Tag color="default">交叉</Tag>
                    );
                  },
                },
                {
                  title: '劳动力账户',
                  dataIndex: ['account', 'namePath'],
                  key: 'account',
                  width: 300,
                  ellipsis: true,
                  render: (namePath: string) => {
                    if (!namePath) return '-';
                    const cleaned = namePath.replace(/\/+/g, '/').replace(/\/$/, '');
                    return <Tag color="purple" style={{ maxWidth: '100%' }}>{cleaned}</Tag>;
                  },
                },
                {
                  title: '签入时间',
                  dataIndex: 'inPunchTime',
                  key: 'inPunchTime',
                  width: 180,
                  render: (time: string) => {
                    if (!time)
                      return (
                        <Tag color="warning" icon={<WarningOutlined />}>
                          缺卡
                        </Tag>
                      );
                    return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
                  },
                },
                {
                  title: '签出时间',
                  dataIndex: 'outPunchTime',
                  key: 'outPunchTime',
                  width: 180,
                  render: (time: string) => {
                    if (!time)
                      return (
                        <Tag color="warning" icon={<WarningOutlined />}>
                          缺卡
                        </Tag>
                      );
                    return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
                  },
                },
                {
                  title: '交叉时间段',
                  key: 'overlapTime',
                  width: 350,
                  render: (_: any, record: any) => {
                    if (record.isCurrent) {
                      return <Text type="secondary">-</Text>;
                    }
                    if (!record.overlapStartTime || !record.overlapEndTime) {
                      return <Text type="secondary">-</Text>;
                    }
                    return (
                      <Space direction="vertical" size={0}>
                        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {record.overlapStartTime} ~ {record.overlapEndTime}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          交叉时长: {record.overlapDuration?.toFixed(2)}h
                        </Text>
                      </Space>
                    );
                  },
                },
                {
                  title: '工时',
                  dataIndex: 'workHours',
                  key: 'workHours',
                  width: 90,
                  align: 'center' as const,
                  render: (hours: number) => (
                    <Text strong style={{ color: '#00B365' }}>
                      {hours.toFixed(2)}h
                    </Text>
                  ),
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 140,
                  align: 'center' as const,
                  render: (_: any, record: any) => (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setCurrentRecord(record);
                          form.setFieldsValue({
                            inPunchTime: record.inPunchTime ? dayjs(record.inPunchTime) : null,
                            outPunchTime: record.outPunchTime ? dayjs(record.outPunchTime) : null,
                          });
                          setOverlapDetailModalOpen(false);
                          setEditModalOpen(true);
                        }}
                      >
                        修改
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              styles={{
                body: {
                  // Add custom style for current row
                },
              }}
            />
          </div>
        )}
      </Modal>
    </div>
    </>
  );
};

function groupPunchPairs(punchPairs: any[]) {
  const groups: any = {};

  punchPairs.forEach((pair) => {
    const key = `${pair.employeeNo}_${pair.pairDate}_${pair.shiftId}`;

    if (!groups[key]) {
      groups[key] = {
        employeeNo: pair.employeeNo,
        employeeName: pair.employee?.name || pair.employeeNo,
        pairDate: pair.pairDate,
        shiftId: pair.shiftId,
        shiftName: pair.shiftName,
        records: [],
      };
    }

    groups[key].records.push(pair);
  });

  return groups;
}

export default PunchResultsTab;

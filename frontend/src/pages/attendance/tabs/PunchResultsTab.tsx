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
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

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
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [overlapRecords, setOverlapRecords] = useState<any[]>([]);
  const [form] = Form.useForm();

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

  const updateMutation = useMutation({
    mutationFn: (data: any) => request.put(`/punch/pairs/${data.id}`, data),
    onSuccess: () => {
      message.success('修改成功');
      setEditModalOpen(false);
      setOverlapDetailModalOpen(false);
      refetch();
      onRefresh?.();
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

      // 检查时间是否重叠
      const start1 = dayjs(targetRecord.inPunchTime);
      const end1 = dayjs(targetRecord.outPunchTime);
      const start2 = dayjs(record.inPunchTime);
      const end2 = dayjs(record.outPunchTime);

      const hasOverlap = !(
        end1.isBefore(start2) ||
        start1.isAfter(end2)
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

          // 判断时间交叉：两个时间段有任何重叠即为交叉
          const hasOverlap = !(
            end1.isBefore(start2) || // r1 在 r2 之前
            start1.isAfter(end2)     // r1 在 r2 之后
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
    form.setFieldsValue({
      inPunchTime: record.inPunchTime ? dayjs(record.inPunchTime) : null,
      outPunchTime: record.outPunchTime ? dayjs(record.outPunchTime) : null,
    });
    setEditModalOpen(true);
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
      updateMutation.mutate({
        id: currentRecord.id,
        inPunchTime: values.inPunchTime?.format('YYYY-MM-DD HH:mm:ss'),
        outPunchTime: values.outPunchTime?.format('YYYY-MM-DD HH:mm:ss'),
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
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

      // 检查时间交叉
      const start2 = dayjs(r.inPunchTime);
      const end2 = dayjs(r.outPunchTime);

      const hasOverlap = !(
        targetEnd.isBefore(start2) ||
        targetStart.isAfter(end2)
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

  return (
    <>
      <style>{`
        .overlap-current-row {
          background-color: #e6f7ff !important;
        }
        .overlap-current-row:hover td {
          background-color: #bae7ff !important;
        }
      `}</style>
      <div style={{ padding: '24px' }}>
      <Collapse
        defaultActiveKey={[]}
        ghost
        items={Object.entries(groupedData).map(([groupKey, group]: [string, any]) => {
          const groupRecords = group.records;
          const hasMissingCard = groupRecords.some((r: any) => isMissingPunch(r));
          const hasOverlapIssue = hasOverlap(groupRecords);

          return {
            key: groupKey,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Space size="large">
                    <Text strong style={{ fontSize: 14 }}>
                      {group.employeeName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {dayjs(group.pairDate).format('YYYY-MM-DD')}
                    </Text>
                    <Tag color="blue">{group.shiftName}</Tag>
                    {hasMissingCard && (
                      <Tag color="warning" icon={<WarningOutlined />}>
                        有缺卡
                      </Tag>
                    )}
                    {hasOverlapIssue && (
                      <Tag color="error" icon={<InfoCircleOutlined />}>
                        有交叉
                      </Tag>
                    )}
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  共 {groupRecords.length} 对打卡
                </Text>
              </div>
            ),
            children: (
              <div style={{ padding: '16px 0' }}>
                <Table
                  dataSource={groupRecords}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  columns={[
                    {
                      title: '序号',
                      key: 'index',
                      width: 60,
                      render: (_: any, __: any, index: number) => index + 1,
                    },
                    {
                      title: '劳动力账户',
                      dataIndex: ['account', 'namePath'],
                      key: 'account',
                      width: 250,
                      render: (namePath: string) => {
                        if (!namePath) return '-';
                        const cleaned = namePath.replace(/\/+/g, '/').replace(/\/$/, '');
                        return <Tag color="purple">{cleaned}</Tag>;
                      },
                    },
                    {
                      title: '交叉标记',
                      key: 'overlap',
                      width: 100,
                      render: (_: any, record: any) => {
                        const isOverlap = getOverlapStatus(record, groupRecords);
                        return isOverlap ? (
                          <Tag
                            color="error"
                            icon={<WarningOutlined />}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleOverlapClick(record, groupRecords)}
                          >
                            交叉
                          </Tag>
                        ) : (
                          <Tag color="success">正常</Tag>
                        );
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
                      title: '工时',
                      dataIndex: 'workHours',
                      key: 'workHours',
                      width: 100,
                      render: (hours: number) => (
                        <Text strong style={{ color: '#6366f1' }}>
                          {hours.toFixed(2)}h
                        </Text>
                      ),
                    },
                    {
                      title: '状态',
                      key: 'status',
                      width: 100,
                      render: (_: any, record: any) => {
                        const isComplete = record.inPunchTime && record.outPunchTime;
                        return isComplete ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>
                            完整
                          </Tag>
                        ) : (
                          <Tag color="warning" icon={<WarningOutlined />}>
                            缺卡
                          </Tag>
                        );
                      },
                    },
                    {
                      title: '操作',
                      key: 'action',
                      width: 120,
                      render: (_: any, record: any) => (
                        <Space size="small">
                          <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                          />
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id)}
                          />
                        </Space>
                      ),
                    },
                  ]}
                  style={{ marginTop: 8 }}
                />
              </div>
            ),
          };
        })}
      />

      <Modal
        title="编辑打卡时间"
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="inPunchTime"
            label="签入时间"
            rules={[{ required: true, message: '请选择签入时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
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
                    <Text strong style={{ color: '#6366f1' }}>
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

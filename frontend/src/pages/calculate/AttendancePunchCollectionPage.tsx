import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  message,
  Space,
  Tag,
  Modal,
  Alert,
  DatePicker,
  Descriptions,
  Row,
  Col,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';

const AttendancePunchCollectionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // 获取考勤打卡收卡结果
  const { data: attendancePunchResults, isLoading, refetch } = useQuery({
    queryKey: ['attendancePunchResults', selectedDate.format('YYYY-MM-DD')],
    queryFn: () =>
      request
        .get('/punch/attendance-punch/results', {
          params: {
            startDate: selectedDate.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            endDate: selectedDate.endOf('day').format('YYYY-MM-DD HH:mm:ss'),
            pageSize: 1000,
          },
        })
        .then((res: any) => res.items || []),
    enabled: !!selectedDate,
  });

  // 考勤打卡收卡
  const collectMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/attendance-punch/collect', data),
    onSuccess: (result: any) => {
      if (result && result.length > 0) {
        message.success(`收卡完成，共处理${result.length}条记录`);
      } else {
        message.warning('未找到需要收卡的记录');
      }
      queryClient.invalidateQueries({ queryKey: ['attendancePunchResults'] });
    },
    onError: (error: any) => {
      message.error(`收卡失败: ${error.message || '未知错误'}`);
    },
  });

  const handleCollect = () => {
    Modal.confirm({
      title: '确认考勤打卡收卡',
      content: `确定要对 ${selectedDate.format('YYYY-MM-DD')} 进行考勤打卡收卡吗？`,
      onOk: () => {
        collectMutation.mutate({
          punchDate: selectedDate.format('YYYY-MM-DD'),
        });
      },
    });
  };

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: '员工编号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 100,
    },
    {
      title: '打卡日期',
      dataIndex: 'punchDate',
      key: 'punchDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 100,
      render: (type: string) => {
        const config = {
          scheduled: { text: '有排班', color: 'blue' },
          unscheduled: { text: '未排班', color: 'green' },
        };
        const { text, color } = config[type as keyof typeof config] || { text: type, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 150,
    },
    {
      title: '连续班次',
      dataIndex: 'isContinuousShift',
      key: 'isContinuousShift',
      width: 100,
      render: (isContinuous: boolean) => (
        <Tag color={isContinuous ? 'orange' : 'default'}>{isContinuous ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '上班卡',
      key: 'workStartPunchTime',
      width: 160,
      render: (_: any, record: any) => {
        if (record.workStartPunchTime) {
          return (
            <Space direction="vertical" size={0}>
              <span>{dayjs(record.workStartPunchTime).format('HH:mm:ss')}</span>
              {record.workStartShiftName && (
                <Tag color="blue" style={{ fontSize: '12px' }}>
                  {record.workStartShiftName}
                </Tag>
              )}
            </Space>
          );
        }
        return <Tag color="red">缺卡</Tag>;
      },
    },
    {
      title: '下班卡',
      key: 'workEndPunchTime',
      width: 160,
      render: (_: any, record: any) => {
        if (record.workEndPunchTime) {
          return (
            <Space direction="vertical" size={0}>
              <span>{dayjs(record.workEndPunchTime).format('HH:mm:ss')}</span>
              {record.workEndShiftName && (
                <Tag color="blue" style={{ fontSize: '12px' }}>
                  {record.workEndShiftName}
                </Tag>
              )}
            </Space>
          );
        }
        return <Tag color="red">缺卡</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <ModernPageLayout
      title="考勤打卡收卡"
      breadcrumbs={[
        { title: '考勤计算', path: '/calculate' },
        { title: '考勤打卡收卡' },
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space size="middle">
            <Form layout="inline">
              <Form.Item label="收卡日期">
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                  format="YYYY-MM-DD"
                  allowClear={false}
                />
              </Form.Item>
            </Form>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleCollect}
              loading={collectMutation.isPending}
            >
              执行收卡
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
              刷新
            </Button>
          </Space>
        </Card>

        <Alert
          message="考勤打卡收卡说明"
          description={
            <div>
              <p>• 有排班场景：根据员工当天的排班信息进行收卡</p>
              <p>• 未排班场景：根据未排班规则配置进行收卡</p>
              <p>• 连续班次：如果当天班次连续（间隔≤10分钟），只收首尾两笔卡</p>
              <p>• 不连续班次：每个班次分别收卡</p>
            </div>
          }
          type="info"
          showIcon
        />

        <Card title="收卡结果">
          <Table
            columns={columns}
            dataSource={attendancePunchResults}
            loading={isLoading || collectMutation.isPending}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Card>
      </Space>

      {/* 详情弹窗 */}
      <Modal
        title="考勤打卡收卡详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="员工编号">{selectedRecord.employeeNo}</Descriptions.Item>
            <Descriptions.Item label="员工姓名">
              {selectedRecord.employee?.name}
            </Descriptions.Item>
            <Descriptions.Item label="打卡日期">
              {dayjs(selectedRecord.punchDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="规则类型">
              <Tag
                color={
                  selectedRecord.ruleType === 'scheduled'
                    ? 'blue'
                    : selectedRecord.ruleType === 'unscheduled'
                    ? 'green'
                    : 'default'
                }
              >
                {selectedRecord.ruleType === 'scheduled'
                  ? '有排班'
                  : selectedRecord.ruleType === 'unscheduled'
                  ? '未排班'
                  : selectedRecord.ruleType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="规则名称" span={2}>
              {selectedRecord.ruleName}
            </Descriptions.Item>
            <Descriptions.Item label="连续班次">
              <Tag color={selectedRecord.isContinuousShift ? 'orange' : 'default'}>
                {selectedRecord.isContinuousShift ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="考勤卡号">{selectedRecord.accountId}</Descriptions.Item>

            <Descriptions.Item label="上班卡时间" span={2}>
              {selectedRecord.workStartPunchTime ? (
                <Space>
                  <ClockCircleOutlined />
                  {dayjs(selectedRecord.workStartPunchTime).format('YYYY-MM-DD HH:mm:ss')}
                  {selectedRecord.workStartShiftName && (
                    <Tag color="blue">{selectedRecord.workStartShiftName}</Tag>
                  )}
                </Space>
              ) : (
                <Tag color="red">缺卡</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="下班卡时间" span={2}>
              {selectedRecord.workEndPunchTime ? (
                <Space>
                  <ClockCircleOutlined />
                  {dayjs(selectedRecord.workEndPunchTime).format('YYYY-MM-DD HH:mm:ss')}
                  {selectedRecord.workEndShiftName && (
                    <Tag color="blue">{selectedRecord.workEndShiftName}</Tag>
                  )}
                </Space>
              ) : (
                <Tag color="red">缺卡</Tag>
              )}
            </Descriptions.Item>

            {selectedRecord.workStartPunches && (
              <Descriptions.Item label="所有上班卡" span={2}>
                <Row gutter={[8, 8]}>
                  {JSON.parse(selectedRecord.workStartPunches).map((punch: any, index: number) => (
                    <Col key={index}>
                      <Card size="small" style={{ minWidth: 200 }}>
                        <Space direction="vertical" size={0}>
                          <div>
                            <ClockCircleOutlined /> {dayjs(punch.punchTime).format('HH:mm:ss')}
                          </div>
                          {punch.shiftName && <Tag color="blue">{punch.shiftName}</Tag>}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Descriptions.Item>
            )}

            {selectedRecord.workEndPunches && (
              <Descriptions.Item label="所有下班卡" span={2}>
                <Row gutter={[8, 8]}>
                  {JSON.parse(selectedRecord.workEndPunches).map((punch: any, index: number) => (
                    <Col key={index}>
                      <Card size="small" style={{ minWidth: 200 }}>
                        <Space direction="vertical" size={0}>
                          <div>
                            <ClockCircleOutlined /> {dayjs(punch.punchTime).format('HH:mm:ss')}
                          </div>
                          {punch.shiftName && <Tag color="blue">{punch.shiftName}</Tag>}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </ModernPageLayout>
  );
};

export default AttendancePunchCollectionPage;

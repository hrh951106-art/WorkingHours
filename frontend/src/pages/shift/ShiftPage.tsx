import { Card, Table, Button, Tag } from 'antd';
import { PlusOutlined, EditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';

const ShiftPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => request.get('/shift/shifts').then((res: any) => res),
  });

  const handleEdit = (id: number) => {
    navigate(`/shift/shifts/${id}`);
  };

  const handleAdd = () => {
    navigate('/shift/shifts/new');
  };

  const columns = [
    { title: '班次编码', dataIndex: 'code', key: 'code', width: 150 },
    { title: '班次名称', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: any = {
          NORMAL: { text: '正常班', color: 'blue' },
          REST: { text: '休息班', color: 'green' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return (
          <Tag
            color={config.color}
            style={{
              borderRadius: 4,
              padding: '2px 8px',
              fontWeight: 500,
            }}
          >
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '标准工时',
      dataIndex: 'standardHours',
      key: 'standardHours',
      width: 120,
      render: (hours: number) => (
        <span style={{ fontWeight: 600, color: '#22B970' }}>{hours} 小时</span>
      ),
    },
    {
      title: '休息时长',
      dataIndex: 'breakHours',
      key: 'breakHours',
      width: 120,
      render: (hours: number) => `${hours} 小时`,
    },
    {
      title: '班段数',
      key: 'segmentCount',
      width: 100,
      render: (_: any, record: any) => (
        <Tag color="purple">{record.segments?.length || 0}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record.id)}
          style={{ color: '#22B970', fontWeight: 500 }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <ModernPageLayout
      title="班次管理"
      description="管理班次信息，包括正常班、休息班等不同类型的班次配置"
      breadcrumb={[
        { label: '排班管理', path: '/shift' },
        { label: '班次管理', path: '/shift/shifts' },
      ]}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{
            background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
            border: 'none',
            borderRadius: 8,
            height: 40,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
        >
          新建班次
        </Button>
      }
      stats={[
        {
          title: '班次总数',
          value: shifts?.length || 0,
          prefix: <ClockCircleOutlined style={{ color: '#22B970' }} />,
          color: '#22B970',
        },
        {
          title: '正常班',
          value: shifts?.filter((s: any) => s.type === 'NORMAL').length || 0,
          color: '#3b82f6',
        },
        {
          title: '休息班',
          value: shifts?.filter((s: any) => s.type === 'REST').length || 0,
          color: '#10b981',
        },
      ]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Table
          columns={columns}
          dataSource={shifts || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
          style={{
            borderRadius: 8,
          }}
        />
      </Card>
    </ModernPageLayout>
  );
};

export default ShiftPage;

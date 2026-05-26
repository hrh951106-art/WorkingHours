import { Card, Table, Button, Tag, Input, Row, Col, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import request from '@/utils/request';

const ShiftPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');

  // 判断是否在 iframe 环境（/embed 路径）
  const isEmbed = location.pathname.startsWith('/embed');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => request.get('/shift/shifts'),
  });

  // 删除班次
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/shift/shifts/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      // 刷新列表
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  // 根据搜索文本过滤班次
  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    if (!searchText) return shifts;

    const searchLower = searchText.toLowerCase();
    return shifts.filter((shift: any) =>
      shift.code?.toLowerCase().includes(searchLower) ||
      shift.name?.toLowerCase().includes(searchLower)
    );
  }, [shifts, searchText]);

  const handleEdit = (id: number) => {
    // 根据当前路径判断跳转路径
    const basePath = isEmbed ? '/embed/shift/shifts' : '/shift/shifts';
    navigate(`${basePath}/${id}`);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleAdd = () => {
    // 根据当前路径判断跳转路径
    const basePath = isEmbed ? '/embed/shift/shifts' : '/shift/shifts';
    navigate(`${basePath}/new`);
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
        <span style={{ fontWeight: 600, color: '#00B365' }}>{hours} 小时</span>
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
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
            style={{ color: '#00B365', fontWeight: 500 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除班次"
            description={`确定要删除班次"${record.name}"吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              style={{ fontWeight: 500 }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="班次管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新建班次
        </Button>
      }
    >
      {/* 搜索条件 */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="搜索班次编码或名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredShifts}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default ShiftPage;

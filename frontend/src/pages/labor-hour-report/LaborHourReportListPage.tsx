import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Descriptions,
  Tabs,
  Form,
} from 'antd';
import { PlusOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import { exportLaborHourReports } from '@/utils/export';

interface LaborHourReport {
  id: number;
  requestNo: string;
  reportDate: string;
  reportMode: string;
  employeeName: string;
  employeeNo: string;
  hourType: string;
  hourTypeName: string;
  startTime: string;
  endTime: string;
  value: number;
  unit: string;
  description?: string;
  accountCode: string;
  accountName: string;
  status: string;
  createdAt: string;
  employees?: Array<{
    id: number;
    employeeNo: string;
    employeeName: string;
  }>;
  _count?: {
    employees: number;
  };
}

const LaborHourReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('all');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, any>>({});

  // 获取工时报工申请列表
  const { data: listData, isLoading } = useQuery({
    queryKey: ['laborHourReports', activeTab, dynamicFilters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        pageSize: 50,
      };

      // 根据标签页设置状态过滤
      if (activeTab === 'my') {
        params.status = 'PENDING';
      } else if (activeTab === 'pending') {
        params.status = 'PENDING';
      }

      // 应用动态筛选条件
      Object.keys(dynamicFilters).forEach(key => {
        if (dynamicFilters[key] !== undefined && dynamicFilters[key] !== null && dynamicFilters[key] !== '') {
          params[key] = dynamicFilters[key];
        }
      });

      return request.get('/labor-hour-report/requests', { params });
    },
  });

  // 查看详情
  const handleViewDetail = (record: LaborHourReport) => {
    navigate(`/labor-hour-report/${record.id}`);
  };

  // 格式化工时类型标签
  const getHourTypeTag = (type: string) => {
    return <Tag color="blue">{type}</Tag>;
  };

  // 格式化工作流状态标签
  const getWorkflowStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '审批中' },
      APPROVED: { color: 'green', text: '已通过' },
      REJECTED: { color: 'red', text: '已拒绝' },
      CANCELLED: { color: 'default', text: '已取消' },
    };
    const item = config[status] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 导出数据
  const handleExport = () => {
    const data = listData?.items || [];
    if (data.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    try {
      exportLaborHourReports(data);
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 处理搜索
  const handleSearch = (values: Record<string, any>) => {
    setDynamicFilters(values);
  };

  // 处理重置
  const handleReset = () => {
    searchForm.resetFields();
    setDynamicFilters({});
  };

  const columns = [
    {
      title: '申请编号',
      dataIndex: 'requestNo',
      key: 'requestNo',
      width: 180,
    },
    {
      title: '报工模式',
      dataIndex: 'reportMode',
      key: 'reportMode',
      width: 100,
      render: (mode: string) => {
        const config: Record<string, { color: string; text: string }> = {
          personal: { color: 'blue', text: '个人报工' },
          team: { color: 'green', text: '团队报工' },
        };
        const item = config[mode] || { color: 'default', text: mode };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '报工日期',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '工时类型',
      dataIndex: 'hourTypeName',
      key: 'hourTypeName',
      width: 120,
      render: getHourTypeTag,
    },
    {
      title: '员工编号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
    },
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 100,
    },
    {
      title: '团队人数',
      dataIndex: '_count',
      key: 'teamCount',
      width: 100,
      render: (count: any, record: LaborHourReport) => {
        if (record.reportMode === 'team' && count?.employees) {
          return <Tag color="green">{count.employees} 人</Tag>;
        }
        return '-';
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 100,
    },
    {
      title: '工时数量',
      key: 'value',
      width: 100,
      render: (_: any, record: LaborHourReport) => `${record.value} ${record.unit}`,
    },
    {
      title: '报工归属',
      key: 'account',
      width: 200,
      render: (_: any, record: LaborHourReport) => (
        <div>
          <div>{record.accountName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.accountCode}</div>
        </div>
      ),
    },
    {
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getWorkflowStatusTag,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: LaborHourReport) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="工时报工管理"
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!listData?.items || listData.items.length === 0}
          >
            导出Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/labor-hour-report/create')}
          >
            创建工时报工
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'all', label: '全部报工' },
          { key: 'my', label: '我的报工' },
          { key: 'pending', label: '待我审批' },
        ]}
      />

      <DynamicSearchConditions
        pageCode="work-hour-results"
        onSearch={handleSearch}
        onReset={handleReset}
        loading={isLoading}
        form={searchForm}
        initialValues={dynamicFilters}
      />

      <Table
        columns={columns}
        dataSource={listData?.items || []}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 2000 }}
        pagination={{
          total: listData?.total || 0,
          pageSize: listData?.pageSize || 20,
          current: listData?.page || 1,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => handleViewDetail(record),
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
};

export default LaborHourReportListPage;

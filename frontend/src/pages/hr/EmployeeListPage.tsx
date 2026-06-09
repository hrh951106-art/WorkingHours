import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';

const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<any>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [searchForm] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employees', filters, pagination],
    queryFn: () =>
      request.get('/hr/employees', {
        params: {
          ...filters,
          page: pagination.current,
          pageSize: pagination.pageSize,
        },
      }).then((res: any) => res),
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['employees-stats'],
    queryFn: () =>
      request.get('/hr/employees', {
        params: { page: 1, pageSize: 1 },
      }).then((res: any) => res),
  });

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 根据数据源代码获取选项
  const getOptionsByDataSourceCode = (dataSourceCode: string) => {
    const dataSource = dataSources?.find((ds: any) => ds.code === dataSourceCode);
    if (!dataSource || !dataSource.options) {
      return [];
    }
    return dataSource.options
      .filter((opt: any) => opt.isActive)
      .map((opt: any) => ({
        id: opt.id,
        value: opt.value,
        label: opt.label,
      }));
  };

  // 获取性别选项
  const genderOptions = getOptionsByDataSourceCode('GENDER');

  // 根据性别值获取显示标签
  const getGenderLabel = (genderValue: string) => {
    const option = genderOptions.find((opt: any) => opt.value === genderValue);
    return option?.label || genderValue;
  };

  // 根据性别值获取标签颜色
  const getGenderColor = (genderValue: string) => {
    // 可以从数据源配置中获取颜色，这里使用默认颜色
    if (genderValue === 'MALE') return 'blue';
    if (genderValue === 'FEMALE') return 'pink';
    return 'default';
  };

  const flattenOrgs = (orgs: any[]): any[] => {
    const result: any[] = [];
    orgs.forEach((org) => {
      result.push(org);
      if (org.children) {
        result.push(...flattenOrgs(org.children));
      }
    });
    return result;
  };

  const handleSearch = (values: any) => {
    setFilters(values);
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: '工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
      render: (employeeNo: string, record: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/hr/employees/${record.id}`)}
          style={{ color: 'var(--color-primary)', padding: 0 }}
        >
          {employeeNo}
        </Button>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender: string) => (
        <Tag color={getGenderColor(gender)}>
          {getGenderLabel(gender)}
        </Tag>
      ),
    },
    {
      title: '所属组织',
      dataIndex: 'org',
      key: 'org',
      width: 200,
      render: (org: any) => org?.name || '-',
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '入职日期',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag
          color={status === 'ACTIVE' ? 'success' : 'error'}
          style={{
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
          }}
        >
          {status === 'ACTIVE' ? '在职' : '离职'}
        </Tag>
      ),
    },
  ];

  return (
    <ModernPageLayout
      title="人员管理"
      description="管理组织内的所有员工信息，包括员工的基本资料、组织架构、状态等"
      breadcrumb={[
        { label: '人事管理', path: '/hr' },
        { label: '人员管理', path: '/hr/employees' },
      ]}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/hr/employees/create')}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            height: 40,
            fontWeight: 500,
          }}
        >
          新增人员
        </Button>
      }
    >
      <Card
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-1)',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <DynamicSearchConditions
            pageCode="employee-list"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={filters}
          />

          <Table
            columns={columns}
            dataSource={data?.items || []}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1200 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize: pageSize || 10 });
              },
              style: {
                marginTop: 16,
              },
            }}
            style={{
              borderRadius: 'var(--radius-md)',
            }}
            rowClassName={(_, index) =>
              index % 2 === 0 ? '' : 'modern-table-row-even'
            }
          />
        </Space>
      </Card>
    </ModernPageLayout>
  );
};

export default EmployeeListPage;

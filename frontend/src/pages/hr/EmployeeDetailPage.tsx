import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Descriptions,
  Table,
  Tag,
  Space,
  message,
  Row,
  Col,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => request.get(`/hr/employees/${id}`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  const { data: accounts } = useQuery({
    queryKey: ['employeeAccounts', id],
    queryFn: () => request.get(`/hr/employees/${id}/accounts`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  // 重新生成账户的mutation
  const regenerateAccountsMutation = useMutation({
    mutationFn: () => {
      return request.post(`/hr/employees/${id}/accounts/regenerate`);
    },
    onSuccess: () => {
      message.success('重新生成账户成功');
      queryClient.invalidateQueries({ queryKey: ['employeeAccounts', id] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '重新生成账户失败';
      message.error(errorMsg);
      console.error('重新生成账户失败:', error);
    },
  });

  const handleRegenerateAccounts = () => {
    Modal.confirm({
      title: '确认重新生成账户',
      content: '重新生成账户将停用员工原有的所有账户，并根据当前配置创建新账户。是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        regenerateAccountsMutation.mutate();
      },
    });
  };

  const { data: infoTabs } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs').then((res: any) => res),
  });

  if (id === 'new') {
    return (
      <div>
        <Card>
          <p>新增人员功能开发中...</p>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
            返回
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <Card loading />;
  }

  const accountColumns = [
    {
      title: '账户编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '账户名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'MAIN' ? 'blue' : 'green'}>
          {type === 'MAIN' ? '主账户' : '子账户'}
        </Tag>
      ),
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '失效日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '激活' : '冻结'}
        </Tag>
      ),
    },
  ];

  const renderBasicInfo = () => (
    <Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
            返回列表
          </Button>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/hr/employees/${id}/edit`)}>
            编辑
          </Button>
        </Col>
      </Row>

      <Descriptions title="基本信息" bordered column={2}>
        <Descriptions.Item label="工号">{employee?.employeeNo}</Descriptions.Item>
        <Descriptions.Item label="姓名">{employee?.name}</Descriptions.Item>
        <Descriptions.Item label="性别">{employee?.gender === 'MALE' ? '男' : '女'}</Descriptions.Item>
        <Descriptions.Item label="身份证号">{employee?.idCard}</Descriptions.Item>
        <Descriptions.Item label="手机号">{employee?.phone}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{employee?.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="所属组织">{employee?.org?.name}</Descriptions.Item>
        <Descriptions.Item label="入职日期">
          {employee?.entryDate ? dayjs(employee.entryDate).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={employee?.status === 'ACTIVE' ? 'green' : 'red'}>
            {employee?.status === 'ACTIVE' ? '在职' : '离职'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {employee?.createdAt ? dayjs(employee.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const renderLaborAccounts = () => (
    <Card
      title="劳动力账户"
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRegenerateAccounts}
          loading={regenerateAccountsMutation.isPending}
        >
          重新生成账户
        </Button>
      }
    >
      <Table
        columns={accountColumns}
        dataSource={accounts || []}
        rowKey="id"
        pagination={false}
      />
    </Card>
  );

  const renderCustomTabs = () => {
    return (infoTabs || []).map((tab: any) => {
      const fields = tab.fields || [];

      if (fields.length === 0) {
        return null;
      }

      const getFieldDisplay = (field: any) => {
        const customFields = employee?.customFields ? JSON.parse(employee.customFields) : {};
        const value = customFields[field.fieldCode];

        if (value === undefined || value === null || value === '') {
          return '-';
        }

        // 根据字段类型格式化显示
        switch (field.fieldType) {
          case 'DATE':
            return dayjs(value).format('YYYY-MM-DD');
          case 'SELECT_SINGLE':
          case 'LOOKUP':
            return value;
          case 'SELECT_MULTI':
            return Array.isArray(value) ? value.join(', ') : value;
          case 'BOOLEAN':
            return value ? '是' : '否';
          default:
            return String(value);
        }
      };

      return (
        <Tabs.TabPane tab={tab.name} key={tab.code}>
          <Card>
            <Descriptions bordered column={2}>
              {fields.map((field: any) => (
                <Descriptions.Item label={field.fieldName} key={field.id}>
                  {getFieldDisplay(field)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Tabs.TabPane>
      );
    });
  };

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: renderBasicInfo(),
    },
    {
      key: 'accounts',
      label: '劳动力账户',
      children: renderLaborAccounts(),
    },
    ...(infoTabs || []).map((tab: any) => ({
      key: tab.code,
      label: tab.name,
      children: (
        <Card>
          <Descriptions bordered column={2}>
            {(tab.fields || []).map((field: any) => {
              const customFields = employee?.customFields ? JSON.parse(employee.customFields) : {};
              const value = customFields[field.fieldCode];

              const formatValue = (val: any) => {
                if (val === undefined || val === null || val === '') return '-';

                switch (field.fieldType) {
                  case 'DATE':
                    return dayjs(val).format('YYYY-MM-DD');
                  case 'SELECT_SINGLE':
                  case 'LOOKUP':
                    return val;
                  case 'SELECT_MULTI':
                    return Array.isArray(val) ? val.join(', ') : val;
                  case 'BOOLEAN':
                    return val ? '是' : '否';
                  default:
                    return String(val);
                }
              };

              return (
                <Descriptions.Item label={field.fieldName} key={field.id}>
                  {formatValue(value)}
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </Card>
      ),
    })),
  ];

  return (
    <div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default EmployeeDetailPage;

import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  message,
  Space,
  Tag,
  Select,
  Input,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hierarchy');
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => request.get('/account/accounts').then((res: any) => res),
  });

  const { data: hierarchyConfig, isLoading: configLoading } = useQuery({
    queryKey: ['hierarchyConfig'],
    queryFn: () => request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  const { data: orgTypes } = useQuery({
    queryKey: ['orgTypes'],
    queryFn: () => request.get('/hr/org-types').then((res: any) => res || []),
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 过滤出下拉类型的自定义字段
  const dropdownFields = customFields?.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  ) || [];

  const saveHierarchyMutation = useMutation({
    mutationFn: (levels: any[]) => {
      return request.post('/account/hierarchy-config/levels/batch', { levels });
    },
    onSuccess: () => {
      message.success('层级配置保存成功');
      queryClient.invalidateQueries({ queryKey: ['hierarchyConfig'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
      console.error('保存层级配置失败:', error);
    },
  });

  const accountColumns = [
    { title: '账户编码', dataIndex: 'code', key: 'code' },
    { title: '账户名称', dataIndex: 'name', key: 'name' },
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
    { title: '层级', dataIndex: 'level', key: 'level' },
    { title: '路径', dataIndex: 'path', key: 'path' },
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

  const handleAddLevel = () => {
    const newLevel = {
      id: Date.now(), // 临时ID
      name: '',
      mappingType: undefined,
      mappingValue: undefined,
      sort: (hierarchyConfig?.length || 0),
      status: 'ACTIVE',
    };

    queryClient.setQueryData(['hierarchyConfig'], (old: any[]) => [...(old || []), newLevel]);
  };

  const handleRemoveLevel = (tempId: number) => {
    queryClient.setQueryData(['hierarchyConfig'], (old: any[]) =>
      (old || []).filter(level => level.id !== tempId)
    );
  };

  const handleLevelChange = (tempId: number, field: string, value: any) => {
    queryClient.setQueryData(['hierarchyConfig'], (old: any[]) =>
      (old || []).map(level =>
        level.id === tempId ? { ...level, [field]: value } : level
      )
    );
  };

  const handleSaveHierarchy = async () => {
    // 验证所有层级都有名称和映射类型
    const invalidLevel = hierarchyConfig?.find((level: any) => !level.name || !level.mappingType);
    if (invalidLevel) {
      message.error('请完善所有层级的名称和映射类型');
      return;
    }

    // 验证层级名称不能重复
    const names = hierarchyConfig?.map((level: any) => level.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      message.error('层级名称不能重复');
      return;
    }

    // 验证选择了映射类型后是否选择了映射值
    const invalidMapping = hierarchyConfig?.find((level: any) =>
      level.mappingType === 'ORG_TYPE' && !level.mappingValue
    );
    if (invalidMapping) {
      message.error('请为选择"组织类型"的层级选择具体的组织类型');
      return;
    }

    // 验证一个组织类型只允许被映射一次
    const orgTypeMappings = hierarchyConfig?.filter((level: any) => level.mappingType === 'ORG_TYPE' && level.mappingValue);
    const orgTypeValues = orgTypeMappings?.map((level: any) => level.mappingValue);
    const uniqueOrgTypes = new Set(orgTypeValues);
    if (orgTypeValues?.length !== uniqueOrgTypes.size) {
      message.error('一个组织类型只允许被映射一次，请检查是否有重复的组织类型映射');
      return;
    }

    saveHierarchyMutation.mutate(hierarchyConfig);
  };

  const levelColumns = [
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: any, index: number) => {
        const isLastRow = index === (hierarchyConfig?.length || 0) - 1;
        return (
          <Space size="small">
            {isLastRow && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddLevel}
              />
            )}
            <Button
              size="small"
              icon={<MinusOutlined />}
              onClick={() => handleRemoveLevel(record.id)}
              disabled={(hierarchyConfig?.length || 0) <= 1}
              danger
            />
          </Space>
        );
      },
    },
    {
      title: '层级名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => {
        return (
          <Input
            value={text}
            onChange={(e) => handleLevelChange(record.id, 'name', e.target.value)}
            placeholder="如：集团、公司、部门"
            style={{ width: 200 }}
          />
        );
      },
    },
    {
      title: '映射类型',
      dataIndex: 'mappingType',
      key: 'mappingType',
      render: (text: string, record: any) => {
        const hasMapping = !!text; // 如果已选择映射类型
        return (
          <Select
            value={text}
            onChange={(value) => {
              handleLevelChange(record.id, 'mappingType', value);
              handleLevelChange(record.id, 'mappingValue', undefined); // 清空映射值
            }}
            style={{ width: 150 }}
            placeholder="请选择"
            disabled={hasMapping} // 已映射后禁止修改
          >
            <Select.Option value="ORG_TYPE">组织类型</Select.Option>
            {dropdownFields.map((field: any) => (
              <Select.Option key={field.code} value={`CUSTOM_${field.code}`}>
                {field.name}
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '映射值',
      dataIndex: 'mappingValue',
      key: 'mappingValue',
      render: (text: string, record: any) => {
        if (record.mappingType === 'ORG_TYPE') {
          return (
            <Select
              value={text}
              onChange={(value) => handleLevelChange(record.id, 'mappingValue', value)}
              style={{ width: 200 }}
              placeholder="选择组织类型"
            >
              {orgTypes?.map((type: any) => (
                <Select.Option key={type.code} value={type.code}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          );
        } else if (record.mappingType?.startsWith('CUSTOM_')) {
          // 自定义字段类型不需要选择映射值，因为字段本身就是映射
          const fieldCode = record.mappingType.replace('CUSTOM_', '');
          const field = dropdownFields.find((f: any) => f.code === fieldCode);
          return (
            <span style={{ color: '#999' }}>
              {field?.name || '-'}
            </span>
          );
        }
        return <span style={{ color: '#ccc' }}>-</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text: string, record: any) => {
        return (
          <Select
            value={text}
            onChange={(value) => handleLevelChange(record.id, 'status', value)}
            style={{ width: 100 }}
          >
            <Select.Option value="ACTIVE">激活</Select.Option>
            <Select.Option value="INACTIVE">停用</Select.Option>
          </Select>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: 'hierarchy',
      label: '层级配置',
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#666' }}>
              配置劳动力账户的层级结构，序号自动生成
            </div>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveHierarchy}
                loading={saveHierarchyMutation.isPending}
                // 检查是否有未保存的修改
              >
                保存配置
              </Button>
            </Space>
          </div>

          {hierarchyConfig?.length === 0 && !configLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#999', marginBottom: '16px' }}>
                暂无层级配置，点击下方按钮开始配置
              </p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddLevel}
              >
                新增层级
              </Button>
            </div>
          ) : (
            <Table
              columns={levelColumns}
              dataSource={hierarchyConfig || []}
              rowKey="id"
              loading={configLoading}
              pagination={false}
              size="small"
            />
          )}
        </>
      ),
    },
    {
      key: 'list',
      label: '账户列表',
      children: (
        <Table
          columns={accountColumns}
          dataSource={accounts?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total: accounts?.total || 0,
            pageSize: accounts?.pageSize || 10,
            current: accounts?.page || 1,
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <Card title="劳动力账户管理">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default AccountPage;

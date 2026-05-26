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
  Alert,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import HierarchyLevelDetailsTab from './components/HierarchyLevelDetailsTab';

const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
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

  const { data: employeeInfoConfigs } = useQuery({
    queryKey: ['employeeInfoConfigs'],
    queryFn: () => request.get('/hr/employee-info-configs').then((res: any) => res || []),
  });

  // 使用 employeeInfoConfigs 获取所有下拉字段（包括系统字段和自定义字段）
  const dropdownFields = employeeInfoConfigs || [];

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
    // 限制最多15个层级
    if (hierarchyConfig && hierarchyConfig.length >= 15) {
      message.warning('最多支持15个层级，已达到上限');
      return;
    }

    const newLevel = {
      id: `temp_${Date.now()}`, // 使用临时ID标识未保存状态
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

    // 验证选择组织类型时是否选择了映射值
    const invalidOrgMapping = hierarchyConfig?.find((level: any) =>
      level.mappingType === 'ORG' && !level.mappingValue
    );
    if (invalidOrgMapping) {
      message.error('请为选择"组织"的层级选择具体的组织类型');
      return;
    }

    // 验证一个组织类型只允许被映射一次
    const orgTypeMappings = hierarchyConfig?.filter((level: any) => level.mappingType === 'ORG' && level.mappingValue);
    const orgTypeValues = orgTypeMappings?.map((level: any) => level.mappingValue);
    const uniqueOrgTypes = new Set(orgTypeValues);
    if (orgTypeValues?.length !== uniqueOrgTypes.size) {
      message.error('一个组织类型只允许被映射一次，请检查是否有重复的组织类型映射');
      return;
    }

    // 验证一个字段只允许被映射一次
    const fieldMappings = hierarchyConfig?.filter((level: any) => level.mappingType?.startsWith('FIELD_'));
    const fieldValues = fieldMappings?.map((level: any) => level.mappingType);
    const uniqueFields = new Set(fieldValues);
    if (fieldValues?.length !== uniqueFields.size) {
      message.error('一个字段只允许被映射一次，请检查是否有重复的字段映射');
      return;
    }

    saveHierarchyMutation.mutate(hierarchyConfig);
  };

  // 判断是否为未保存的层级（临时ID）
  const isUnsavedLevel = (record: any) => {
    return typeof record.id === 'string' && record.id.startsWith('temp_');
  };

  const levelColumns = [
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: any, index: number) => {
        const isLastRow = index === (hierarchyConfig?.length || 0) - 1;
        const isMaxLevel = (hierarchyConfig?.length || 0) >= 15;
        const isUnsaved = isUnsavedLevel(record); // 是否为未保存的层级

        return (
          <Space size="small">
            {isLastRow && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddLevel}
                disabled={isMaxLevel}
                title={isMaxLevel ? '已达到最大层级数（15个）' : '新增层级'}
              />
            )}
            <Button
              size="small"
              icon={<MinusOutlined />}
              onClick={() => handleRemoveLevel(record.id)}
              disabled={(hierarchyConfig?.length || 0) <= 1 || !isUnsaved}
              danger
              title={!isUnsaved ? '已保存的层级不允许删除，只能修改状态' : ''}
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
        const inputValue = tempValues[record.id] !== undefined ? tempValues[record.id] : text;

        return (
          <Input
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              // 更新临时值
              setTempValues(prev => ({ ...prev, [record.id]: newValue }));
            }}
            onCompositionStart={() => {
              // 输入法开始，不做什么特殊处理
            }}
            onCompositionEnd={(e) => {
              // 输入法结束，提交最终值
              const finalValue = e.currentTarget.value;
              handleLevelChange(record.id, 'name', finalValue);
              // 清除临时值
              setTempValues(prev => {
                const newValues = { ...prev };
                delete newValues[record.id];
                return newValues;
              });
            }}
            onBlur={() => {
              // 失去焦点时也要确保值被保存
              if (tempValues[record.id] !== undefined) {
                handleLevelChange(record.id, 'name', tempValues[record.id]);
                setTempValues(prev => {
                  const newValues = { ...prev };
                  delete newValues[record.id];
                  return newValues;
                });
              }
            }}
            placeholder="如：集团、公司、部门"
            maxLength={50}
            style={{ width: 250 }}
          />
        );
      },
    },
    {
      title: '映射类型',
      dataIndex: 'mappingType',
      key: 'mappingType',
      render: (text: string, record: any) => {
        const isUnsaved = isUnsavedLevel(record);
        const hasMapping = !!text;

        return (
          <Select
            value={text}
            onChange={(value) => {
              handleLevelChange(record.id, 'mappingType', value);
              handleLevelChange(record.id, 'mappingValue', undefined); // 清空映射值
            }}
            style={{ width: 200 }}
            placeholder="请选择"
            disabled={!isUnsaved && hasMapping} // 已保存的层级禁止修改映射类型
          >
            <Select.Option value="ORG">组织</Select.Option>
            {dropdownFields.length > 0 && (
              <Select.OptGroup label="人事信息字段">
                {dropdownFields.map((field: any) => (
                  <Select.Option key={`FIELD_${field.field}`} value={`FIELD_${field.field}`}>
                    {field.name}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            )}
          </Select>
        );
      },
    },
    {
      title: '映射值',
      dataIndex: 'mappingValue',
      key: 'mappingValue',
      render: (text: string, record: any) => {
        const isUnsaved = isUnsavedLevel(record);

        if (record.mappingType === 'ORG') {
          // 选择组织类型
          return (
            <Select
              value={text}
              onChange={(value) => handleLevelChange(record.id, 'mappingValue', value)}
              style={{ width: 200 }}
              placeholder="选择组织类型"
              disabled={!isUnsaved && !!text} // 已保存的层级禁止修改映射值
            >
              {orgTypes?.map((type: any) => (
                <Select.Option key={type.code} value={type.code}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          );
        } else if (record.mappingType?.startsWith('FIELD_')) {
          // 字段映射，显示字段名称
          const fieldCode = record.mappingType.replace('FIELD_', '');
          const field = dropdownFields.find((f: any) => f.field === fieldCode);
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
              {hierarchyConfig && hierarchyConfig.length > 0 && (
                <Tag color="blue" style={{ marginLeft: 12 }}>
                  {hierarchyConfig.length} / 15
                </Tag>
              )}
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

          {/* 层级数量提示 */}
          {hierarchyConfig && hierarchyConfig.length >= 10 && (
            <Alert
              message={`当前已配置 ${hierarchyConfig.length} 个层级，最多支持 15 个层级`}
              type={hierarchyConfig.length >= 15 ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

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
    {
      key: 'levelDetails',
      label: '层级明细',
      children: <HierarchyLevelDetailsTab />,
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

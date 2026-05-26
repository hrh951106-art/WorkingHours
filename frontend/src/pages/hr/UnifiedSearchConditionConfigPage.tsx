import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Checkbox,
  Input,
  message,
  Space,
  Tag,
  Divider,
  Empty,
  Spin,
  Modal,
  Form,
  Select,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface SearchField {
  fieldCode: string;
  fieldName: string;
  fieldType: 'text' | 'select' | 'date' | 'dateRange' | 'organization';
  dataSourceCode?: string;
  groupName?: string | null;
  tabCode: string;
  tabName: string;
}

interface Config {
  id?: number;
  configCode: string;
  configName: string;
  pageCode: string;
  pageName: string;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  isEnabled: boolean;
  sortOrder: number;
  dataSourceCode?: string;
}

const AVAILABLE_PAGES = [
  { code: 'employee-list', name: '员工列表', icon: '👥' },
  { code: 'schedule-management', name: '排班管理', icon: '📅' },
  { code: 'punch-records', name: '打卡记录', icon: '⏰' },
  { code: 'punch-results', name: '摆卡结果', icon: '🎯' },
  { code: 'work-hour-details', name: '精益工时明细', icon: '📊' },
  { code: 'work-hour-results', name: '工时结果', icon: '⏱️' },
];

const UnifiedSearchConditionConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [form] = Form.useForm();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // 获取所有查询条件配置
  const { data: allConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['unifiedSearchConditionConfigs'],
    queryFn: () =>
      request.get('/hr/unified-search-condition-configs').then((res) => res),
  });

  // 获取可用字段
  const { data: availableFieldsData = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['availableSearchFields'],
    queryFn: () =>
      request.get('/hr/unified-search-condition-configs/available-fields').then((res) => res),
    staleTime: 0,
    gcTime: 0,
  });

  // 按configCode分组配置
  const configGroups = useMemo(() => {
    const groups: Record<string, {
      configCode: string;
      configName: string;
      applicablePages: string[];
      fields: Config[];
    }> = {};

    allConfigs.forEach((config: any) => {
      if (!groups[config.configCode]) {
        groups[config.configCode] = {
          configCode: config.configCode,
          configName: config.configName || config.configCode,
          applicablePages: config.applicablePages || [], // 使用后端返回的applicablePages数组
          fields: [],
        };
      }

      groups[config.configCode].fields.push(config);
    });

    return Object.values(groups);
  }, [allConfigs]);

  // 获取当前选中配置的字段
  const currentConfig = configGroups.find(g => g.configCode === selectedConfig);

  // 保存配置
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { configCode, configName, selectedFields: fieldCodes, selectedPages } = data;

      if (!configCode || !configName) {
        throw new Error('配置编码和配置名称不能为空');
      }

      if (!fieldCodes || fieldCodes.length === 0) {
        throw new Error('请至少选择一个字段');
      }

      if (!selectedPages || selectedPages.length === 0) {
        throw new Error('请至少选择一个应用页面');
      }

      const configs = fieldCodes.map((fieldCode: string, index: number) => {
        const field = allFieldsMap[fieldCode];
        return {
          configCode,
          configName,
          pageCode: selectedPages[0], // 主页面
          pageName: AVAILABLE_PAGES.find(p => p.code === selectedPages[0])?.name || '',
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          dataSourceCode: field.dataSourceCode,
          isEnabled: true,
          sortOrder: index,
          applicablePages: JSON.stringify(selectedPages),
        };
      });

      console.log('=== 保存配置 ===');
      console.log('配置编码:', configCode);
      console.log('配置名称:', configName);
      console.log('应用页面:', selectedPages);
      console.log('选中字段:', fieldCodes);
      console.log('要保存的配置:', configs);

      const result = await request.post('/hr/unified-search-condition-configs/batch', { configs });
      return result;
    },
    onSuccess: () => {
      message.success('保存成功');
      setIsModalOpen(false);
      form.resetFields();
      setSelectedFields([]);
      setEditingConfig(null);
      setSelectedConfig(null); // 清除选中的配置，避免打开详情弹窗
      queryClient.invalidateQueries({ queryKey: ['unifiedSearchConditionConfigs'] });
    },
    onError: (error: any) => {
      console.error('保存失败:', error);
      message.error(error.response?.data?.message || error.message || '保存失败');
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: async (configCode: string) => {
      // 获取该配置的所有记录ID
      const configsToDelete = allConfigs
        .filter((c: any) => c.configCode === configCode)
        .map((c: any) => c.id);

      // 批量删除
      await Promise.all(
        configsToDelete.map((id: number) =>
          request.delete(`/hr/unified-search-condition-configs/${id}`)
        )
      );
    },
    onSuccess: () => {
      message.success('删除成功');
      if (selectedConfig === editingConfig?.configCode) {
        setSelectedConfig(null);
      }
      queryClient.invalidateQueries({ queryKey: ['unifiedSearchConditionConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 所有可用字段映射
  const allFieldsMap = useMemo(() => {
    const map: Record<string, SearchField> = {};
    availableFieldsData.forEach((tab: any) => {
      tab.fields.forEach((field: SearchField) => {
        map[field.fieldCode] = field;
      });
    });
    return map;
  }, [availableFieldsData]);

  // 过滤后的字段列表
  const filteredFields = useMemo(() => {
    const fields: SearchField[] = [];
    availableFieldsData.forEach((tab: any) => {
      tab.fields.forEach((field: SearchField) => {
        const keyword = searchKeyword.toLowerCase();
        if (
          field.fieldName.toLowerCase().includes(keyword) ||
          field.fieldCode.toLowerCase().includes(keyword) ||
          (field.groupName && field.groupName.toLowerCase().includes(keyword))
        ) {
          fields.push(field);
        }
      });
    });
    return fields;
  }, [availableFieldsData, searchKeyword]);

  // 按页签分组
  const fieldsByTab = useMemo(() => {
    const groups: Record<string, { tabName: string; fields: SearchField[] }> = {};

    filteredFields.forEach((field) => {
      if (!groups[field.tabCode]) {
        groups[field.tabCode] = {
          tabName: field.tabName,
          fields: [],
        };
      }
      groups[field.tabCode].fields.push(field);
    });

    return groups;
  }, [filteredFields]);

  const handleCreateConfig = () => {
    setEditingConfig(null);
    form.resetFields();
    setSelectedFields([]);
    setIsModalOpen(true);
  };

  const handleEditConfig = (config: any) => {
    setEditingConfig(config);
    const fieldCodes = config.fields.map((f: Config) => f.fieldCode);
    setSelectedFields(fieldCodes);
    form.setFieldsValue({
      configCode: config.configCode,
      configName: config.configName,
      selectedPages: config.applicablePages,
    });
    setIsModalOpen(true);
  };

  const handleDeleteConfig = (configCode: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个查询条件配置吗？',
      onOk: () => {
        deleteMutation.mutate(configCode);
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await saveMutation.mutateAsync({
        ...values,
        selectedFields, // 使用state中的selectedFields
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleFieldToggle = (fieldCode: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, fieldCode]);
    } else {
      setSelectedFields(selectedFields.filter(f => f !== fieldCode));
    }
  };

  const handleSelectAllInTab = (tabCode: string, checked: boolean) => {
    const tab = availableFieldsData.find((t: any) => t.tabCode === tabCode);
    if (!tab) return;

    if (checked) {
      const tabFieldCodes = tab.fields.map((f: SearchField) => f.fieldCode);
      const newSelectedFields = [...new Set([...selectedFields, ...tabFieldCodes])];
      setSelectedFields(newSelectedFields);
    } else {
      const tabFieldCodes = new Set(tab.fields.map((f: SearchField) => f.fieldCode));
      setSelectedFields(selectedFields.filter(f => !tabFieldCodes.has(f)));
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>查询条件配置管理</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateConfig}
          >
            新建配置
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索配置..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        {configsLoading || fieldsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin tip="加载中..." />
          </div>
        ) : configGroups.length === 0 ? (
          <Empty
            description={
              <div>
                <p>还没有查询条件配置</p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                  点击"新建配置"创建第一个查询条件配置
                </p>
              </div>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {configGroups.map((config) => (
              <Col key={config.configCode} span={8}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <span>{config.configName}</span>
                      <Tag color="blue">{config.configCode}</Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => handleEditConfig(config)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteConfig(config.configCode)}
                      >
                        删除
                      </Button>
                    </Space>
                  }
                  hoverable
                  onClick={() => setSelectedConfig(config.configCode)}
                  style={{
                    cursor: 'pointer',
                    border: selectedConfig === config.configCode ? '2px solid #1890ff' : undefined,
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                      应用页面:
                    </div>
                    <Space wrap>
                      {config.applicablePages.map((pageCode) => {
                        const page = AVAILABLE_PAGES.find(p => p.code === pageCode);
                        return (
                          <Tag key={pageCode} icon={<span>{page?.icon}</span>}>
                            {page?.name}
                          </Tag>
                        );
                      })}
                    </Space>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  <div>
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                      包含字段 ({config.fields.length}个):
                    </div>
                    <Space wrap>
                      {config.fields.slice(0, 5).map((field) => (
                        <Tag key={field.fieldCode}>{field.fieldName}</Tag>
                      ))}
                      {config.fields.length > 5 && (
                        <Tag>+{config.fields.length - 5}</Tag>
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 配置编辑弹窗 */}
      <Modal
        title={editingConfig ? '编辑查询条件配置' : '新建查询条件配置'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingConfig(null);
          setSelectedFields([]);
        }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            selectedPages: [],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="configCode"
                label="配置编码"
                rules={[
                  { required: true, message: '请输入配置编码' },
                  { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和横线' }
                ]}
              >
                <Input
                  placeholder="如: basic_search"
                  disabled={!!editingConfig}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="configName"
                label="配置名称"
                rules={[{ required: true, message: '请输入配置名称' }]}
              >
                <Input placeholder="如: 基础查询条件" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="selectedPages"
            label="应用页面"
            rules={[{ required: true, message: '请至少选择一个应用页面' }]}
            extra="选择应用此查询条件的页面"
          >
            <Select
              mode="multiple"
              placeholder="请选择应用页面"
              options={AVAILABLE_PAGES.map(page => ({
                label: `${page.icon} ${page.name}`,
                value: page.code,
              }))}
            />
          </Form.Item>

          <Divider>选择查询字段</Divider>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.entries(fieldsByTab).map(([tabCode, tabData]) => {
              const tabFieldCodes = tabData.fields.map((f) => f.fieldCode);
              const allSelected = tabFieldCodes.length > 0 && tabFieldCodes.every(f => selectedFields.includes(f));
              const someSelected = tabFieldCodes.some(f => selectedFields.includes(f));

              return (
                <div key={tabCode} style={{ marginBottom: 24 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#1890ff',
                      fontSize: '14px'
                    }}>
                      {tabData.tabName}
                    </div>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={(e) => handleSelectAllInTab(tabCode, e.target.checked)}
                    >
                      全选
                    </Checkbox>
                  </div>
                  <div style={{
                    background: '#fafafa',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Row gutter={[8, 8]}>
                      {tabData.fields.map((field) => (
                        <Col key={field.fieldCode} span={12}>
                          <Checkbox
                            checked={selectedFields.includes(field.fieldCode)}
                            onChange={(e) => handleFieldToggle(field.fieldCode, e.target.checked)}
                            style={{ width: '100%' }}
                          >
                            <Tooltip title={`字段编码: ${field.fieldCode}`}>
                              <Space size="small">
                                <span>{field.fieldName}</span>
                                <Tag style={{ margin: 0 }} color={
                                  field.fieldType === 'select' ? 'blue' :
                                  field.fieldType === 'date' ? 'green' :
                                  field.fieldType === 'dateRange' ? 'cyan' :
                                  field.fieldType === 'organization' ? 'orange' :
                                  'default'
                                }>
                                  {
                                    field.fieldType === 'text' ? '文本' :
                                    field.fieldType === 'select' ? '下拉' :
                                    field.fieldType === 'date' ? '日期' :
                                    field.fieldType === 'dateRange' ? '日期范围' :
                                    field.fieldType === 'organization' ? '组织' :
                                    field.fieldType
                                  }
                                </Tag>
                              </Space>
                            </Tooltip>
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </div>
              );
            })}
          </div>
        </Form>
      </Modal>

      {/* 配置详情弹窗 */}
      <Modal
        title={`配置详情: ${currentConfig?.configName}`}
        open={!!selectedConfig && !isModalOpen}
        onCancel={() => setSelectedConfig(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedConfig(null)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {currentConfig && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                配置编码
              </div>
              <Tag color="blue">{currentConfig.configCode}</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                应用页面
              </div>
              <Space wrap>
                {currentConfig.applicablePages.map((pageCode) => {
                  const page = AVAILABLE_PAGES.find(p => p.code === pageCode);
                  return (
                    <Tag key={pageCode} icon={<span>{page?.icon}</span>}>
                      {page?.name}
                    </Tag>
                  );
                })}
              </Space>
            </div>

            <Divider />

            <div>
              <div style={{ color: '#666', fontSize: '12px', marginBottom: 8 }}>
                包含字段 ({currentConfig.fields.length}个)
              </div>
              <Space wrap>
                {currentConfig.fields.map((field) => (
                  <Tag key={field.fieldCode}>
                    {field.fieldName}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UnifiedSearchConditionConfigPage;

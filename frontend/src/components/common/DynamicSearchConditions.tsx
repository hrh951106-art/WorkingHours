import { useEffect, useState, useMemo } from 'react';
import { Form, Input, Select, TreeSelect, DatePicker, Space, Row, Col, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

interface SearchConditionConfig {
  id?: number;
  pageCode: string;
  pageName: string;
  fieldCode: string;
  fieldName: string;
  fieldType: 'text' | 'select' | 'date' | 'dateRange' | 'organization';
  isEnabled: boolean;
  sortOrder: number;
  dataSourceCode?: string;
}

interface DynamicSearchConditionsProps {
  pageCode: string;
  onSearch: (values: any) => void;
  onReset: () => void;
  loading?: boolean;
  form?: any;
  initialValues?: any;
  fixedFilters?: Record<string, any>;
  onFixedFilterChange?: (key: string, value: any) => void;
  extraActions?: React.ReactNode;
}

const DynamicSearchConditions: React.FC<DynamicSearchConditionsProps> = ({
  pageCode,
  onSearch,
  onReset,
  loading = false,
  form,
  initialValues = {},
  fixedFilters = {},
  onFixedFilterChange,
  extraActions,
}) => {
  const [internalForm] = Form.useForm();
  const activeForm = form || internalForm;

  // 获取统一查询条件配置
  const { data: unifiedConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['unifiedSearchConditionConfigs', pageCode],
    queryFn: async () => {
      try {
        const res = await request.get('/hr/unified-search-condition-configs');
        console.log('=== DynamicSearchConditions 获取配置 ===');
        console.log('页面代码:', pageCode);
        console.log('API返回的配置数量:', res?.length || 0);

        // 过滤出适用于当前页面的配置
        const filtered = (res || []).filter((config: any) => {
          const applicablePages = config.applicablePages || [];
          // applicablePages 可能是字符串（需要解析）或数组
          const pages = typeof applicablePages === 'string'
            ? JSON.parse(applicablePages)
            : applicablePages;
          const matches = pages.includes(pageCode) && config.isEnabled;
          console.log(`配置 ${config.configCode}: applicablePages=`, pages, 'isEnabled=', config.isEnabled, 'matches=', matches);
          return matches;
        });

        console.log('过滤后的配置数量:', filtered.length);
        console.log('过滤后的配置:', filtered);

        return filtered;
      } catch (error) {
        console.error('获取统一查询条件配置失败:', error);
        return [];
      }
    },
    staleTime: 0, // 立即过期，每次都重新获取
  });

  // 获取旧的搜索条件配置（作为备用）
  const { data: legacyConfigs = [] } = useQuery({
    queryKey: ['searchConditionConfigs', pageCode],
    queryFn: async () => {
      try {
        const res = await request.get('/hr/search-condition-configs', {
          params: { pageCode },
        });
        return res || [];
      } catch (error) {
        console.error('获取搜索条件配置失败:', error);
        return [];
      }
    },
  });

  // 优先使用统一配置，如果没有则使用旧配置
  // 确保结果是数组
  const searchConfigs = Array.isArray(unifiedConfigs) && unifiedConfigs.length > 0
    ? unifiedConfigs
    : (Array.isArray(legacyConfigs) ? legacyConfigs : []);

  // 获取组织架构数据（用于organization字段）
  const { data: orgTree = [] } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: async () => {
      try {
        const res = await request.get('/hr/organizations/tree');
        return res || [];
      } catch (error) {
        console.error('获取组织架构失败:', error);
        return [];
      }
    },
    enabled: searchConfigs.some((config: SearchConditionConfig) => config.fieldType === 'organization'),
  });

  // 将组织架构树转换为 TreeSelect 需要的数据格式
  const organizationTreeData = useMemo(() => {
    const convertToTreeData = (nodes: any[]): any[] => {
      return nodes.map((node) => ({
        title: node.name,
        value: node.id,
        key: node.id,
        children: node.children && node.children.length > 0 ? convertToTreeData(node.children) : undefined,
      }));
    };
    return convertToTreeData(orgTree);
  }, [orgTree]);

  const { data: dataSources = [] } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 获取数据源选项
  const getDataSourceOptions = (dataSourceCode: string) => {
    if (!dataSourceCode) return [];

    const dataSource = dataSources.find((ds: any) => ds.code === dataSourceCode);

    if (!dataSource) {
      console.log('DataSource not found for code:', dataSourceCode, 'Available dataSources:', dataSources);
      return [];
    }

    if (!dataSource.options || dataSource.options.length === 0) {
      console.log('DataSource options empty for:', dataSourceCode);
      return [];
    }

    const options = dataSource.options.map((opt: any) => ({
      label: opt.label || opt.name || opt.value,
      value: opt.value,
    }));

    console.log('DataSource options for', dataSourceCode, ':', options);
    return options;
  };

  const handleFinish = (values: any) => {
    // 格式化日期字段
    const formattedValues = { ...values };
    searchConfigs.forEach((config: SearchConditionConfig) => {
      if (config.fieldType === 'date' && formattedValues[config.fieldCode]) {
        formattedValues[config.fieldCode] = formattedValues[config.fieldCode].format('YYYY-MM-DD');
      }
      if (config.fieldType === 'dateRange' && formattedValues[config.fieldCode]) {
        const [start, end] = formattedValues[config.fieldCode];
        formattedValues[`${config.fieldCode}Start`] = start.format('YYYY-MM-DD');
        formattedValues[`${config.fieldCode}End`] = end.format('YYYY-MM-DD');
        delete formattedValues[config.fieldCode];
      }
    });
    onSearch(formattedValues);
  };

  const handleReset = () => {
    activeForm.resetFields();
    onReset();
  };

  if (configsLoading) {
    return <div>加载搜索条件...</div>;
  }

  const enabledConfigs = searchConfigs.filter((config: SearchConditionConfig) => config.isEnabled);

  if (enabledConfigs.length === 0) {
    return <div>暂无可用的搜索条件</div>;
  }

  return (
    <Form
      form={activeForm}
      layout="inline"
      onFinish={handleFinish}
      initialValues={initialValues}
      style={{ width: '100%' }}
    >
      <Row gutter={[12, 12]} align="middle" style={{ width: '100%' }}>
        {/* 固定查询条件（日期周期选择器） */}
        {(pageCode === 'schedules' ||
          pageCode === 'schedule-management' ||
          pageCode === 'punch-records' ||
          pageCode === 'punch-results' ||
          pageCode === 'work-hour-results' ||
          pageCode === 'workhour-details' ||
          pageCode === 'work-hour-details') && fixedFilters?.dateRange && (
          <Col style={{ marginBottom: 0 }}>
            <Form.Item
              label="日期范围"
              style={{ marginBottom: 0, marginRight: 0 }}
              labelCol={{ style: { width: 'auto', marginRight: 8 } }}
            >
              <Space>
                <DatePicker.RangePicker
                  value={
                    Array.isArray(fixedFilters.dateRange)
                      ? fixedFilters.dateRange
                      : [fixedFilters.dateRange.start, fixedFilters.dateRange.end]
                  }
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      onFixedFilterChange?.('dateRange', dates);
                    }
                  }}
                  format="YYYY-MM-DD"
                  style={{ width: 260 }}
                  allowClear={false}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => onSearch?.(activeForm.getFieldsValue())}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Form.Item>
          </Col>
        )}

        {enabledConfigs.map((config: SearchConditionConfig) => {
          return (
            <Col key={config.fieldCode} style={{ marginBottom: 0 }}>
              <Form.Item
                name={config.fieldCode}
                label={config.fieldName}
                style={{ marginBottom: 0, marginRight: 0 }}
                labelCol={{ style: { width: 'auto', marginRight: 8 } }}
              >
                {config.fieldType === 'text' && (
                  <Input
                    placeholder={`请输入${config.fieldName}`}
                    allowClear
                    size="middle"
                    style={{ width: 150 }}
                  />
                )}
                {config.fieldType === 'select' && (
                  <Select
                    placeholder={`请选择${config.fieldName}`}
                    allowClear
                    size="middle"
                    style={{ width: 150 }}
                    options={config.dataSourceCode ? getDataSourceOptions(config.dataSourceCode) : []}
                  />
                )}
                {config.fieldType === 'date' && (
                  <DatePicker
                    placeholder={`请选择${config.fieldName}`}
                    format="YYYY-MM-DD"
                    size="middle"
                    style={{ width: 150 }}
                  />
                )}
                {config.fieldType === 'dateRange' && (
                  <DatePicker.RangePicker
                    placeholder={['开始日期', '结束日期']}
                    format="YYYY-MM-DD"
                    size="middle"
                    style={{ width: 240 }}
                  />
                )}
                {config.fieldType === 'organization' && (
                  <TreeSelect
                    placeholder={`请选择${config.fieldName}`}
                    allowClear
                    size="middle"
                    style={{ width: 200 }}
                    treeData={organizationTreeData}
                    showSearch
                    treeNodeFilterProp="title"
                    treeDefaultExpandAll
                    treeCheckable={false}
                  />
                )}
              </Form.Item>
            </Col>
          );
        })}
        <Col style={{ marginBottom: 0 }}>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              {extraActions}
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="middle"
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                搜索
              </Button>
              <Button
                onClick={handleReset}
                icon={<ReloadOutlined />}
                size="middle"
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default DynamicSearchConditions;

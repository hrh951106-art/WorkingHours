import { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, Space, Row, Col, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import OrganizationTreeSelect from './OrganizationTreeSelect';

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

  const { data: searchConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['searchConditionConfigs', pageCode],
    queryFn: async () => {
      const res = await request.get('/hr/search-condition-configs', {
        params: { pageCode },
      });

      // 标准化字段类型
      const normalizedConfigs = (res || []).map((config: any) => {
        const fieldType = (config.fieldType || '').toLowerCase().trim();
        let standardType: 'text' | 'select' | 'date' | 'dateRange' | 'organization' = 'text';

        if (fieldType.includes('select') ||
            fieldType.includes('lookup') ||
            fieldType === 'select_single' ||
            fieldType === 'select_multi') {
          standardType = 'select';
        } else if (fieldType.includes('date') && fieldType.includes('range')) {
          standardType = 'dateRange';
        } else if (fieldType.includes('date')) {
          standardType = 'date';
        } else if (fieldType.includes('organization')) {
          standardType = 'organization';
        } else if (['text', 'select', 'date', 'dateRange', 'organization'].includes(fieldType)) {
          standardType = fieldType as any;
        }

        return {
          ...config,
          fieldType: standardType,
        };
      });

      const enabled = normalizedConfigs.filter((c: any) => c.isEnabled);
      console.log('=== Search Conditions Debug ===');
      console.log('PageCode:', pageCode);
      console.log('Raw response:', res);
      console.log('Normalized configs:', normalizedConfigs);
      console.log('Enabled configs:', enabled);
      console.log('Field types:', enabled.map((c: any) => ({
        fieldCode: c.fieldCode,
        fieldName: c.fieldName,
        fieldType: c.fieldType,
      })));
      return normalizedConfigs;
    },
  });

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
        {/* 固定查询条件（如月份选择器、日期范围选择器） */}
        {pageCode === 'schedules' && fixedFilters?.dateRange && (
          <Col style={{ marginBottom: 0 }}>
            <Form.Item
              label="日期范围"
              style={{ marginBottom: 0, marginRight: 0 }}
              labelCol={{ style: { width: 'auto', marginRight: 8 } }}
            >
              <DatePicker.RangePicker
                value={fixedFilters.dateRange}
                onChange={(dates) => onFixedFilterChange?.('dateRange', dates)}
                style={{ width: 240 }}
                size="middle"
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Form.Item>
          </Col>
        )}

        {(pageCode === 'punch-records' || pageCode === 'pair-results' || pageCode === 'work-hour-results' || pageCode === 'workhour-details') && fixedFilters?.dateRange && (
          <Col style={{ marginBottom: 0 }}>
            <Form.Item
              label="日期范围"
              style={{ marginBottom: 0, marginRight: 0 }}
              labelCol={{ style: { width: 'auto', marginRight: 8 } }}
            >
              <DatePicker.RangePicker
                value={[fixedFilters.dateRange.start, fixedFilters.dateRange.end]}
                onChange={(dates) => onFixedFilterChange?.('dateRange', dates)}
                style={{ width: 240 }}
                size="middle"
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Form.Item>
          </Col>
        )}

        {enabledConfigs.map((config: SearchConditionConfig) => {
          console.log('Rendering field:', {
            fieldCode: config.fieldCode,
            fieldName: config.fieldName,
            fieldType: config.fieldType,
          });

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
                  <OrganizationTreeSelect
                    placeholder={`请选择${config.fieldName}`}
                    allowClear
                    size="middle"
                    multiple
                    style={{ width: 300 }}
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

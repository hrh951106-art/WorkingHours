import { useState, useMemo } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Typography, Table, Input } from 'antd';
import { SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Text } = Typography;

const WorkHourBasicConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取班次属性定义列表
  const { data: shiftPropertyDefinitions = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['shiftPropertyDefinitions'],
    queryFn: () =>
      request.get('/shift/property-definitions').then((res: any) => res || []),
  });

  // 获取系统配置
  const { data: systemConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['allocationSystemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 获取出勤代码定义列表（用于工时代码配置）
  const { data: attendanceCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['attendanceCodeDefinitions'],
    queryFn: () =>
      request.get('/calculate/attendance-code-definitions').then((res: any) => res || []),
  });

  // 获取所有班次及其属性(用于根据属性筛选)
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['allShiftsWithProperties'],
    queryFn: async () => {
      const shifts = await request.get('/shift/shifts').then((res: any) => res?.items || res || []);

      // 为每个班次获取属性
      const shiftsWithProperties = await Promise.all(
        shifts.map(async (shift: any) => {
          try {
            const properties = await request.get(`/shift/shifts/${shift.id}/properties`).then((res: any) => res || []);
            // 提取属性键列表
            const propertyKeys = properties.map((p: any) => p.propertyKey);
            return {
              ...shift,
              propertyKeys,
            };
          } catch (error) {
            return {
              ...shift,
              propertyKeys: [],
            };
          }
        })
      );

      return shiftsWithProperties;
    },
  });

  // 使用 Form.useWatch 在组件顶层
  const selectedPropertyKeys = Form.useWatch('productionLineShiftPropertyKeys', form) || [];

  // 保存配置
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // 根据选择的属性筛选班次ID
      const selectedPropertyKeys = values.productionLineShiftPropertyKeys || [];
      const filteredShiftIds = allShifts
        .filter((shift: any) =>
          selectedPropertyKeys.some((key: string) => shift.propertyKeys?.includes(key))
        )
        .map((shift: any) => shift.id);

      const configs = [
        {
          configKey: 'productionLineHierarchyLevel',
          configValue: values.productionLineHierarchyLevel || '',
          category: 'WORK_HOURS',
          description: '开线计划产线选择可选层级（工厂、车间、产线）',
        },
        {
          configKey: 'standardHoursHierarchyLevels',
          configValue: (values.standardHoursHierarchyLevels || []).join(',') || '',
          category: 'WORK_HOURS',
          description: '标准工时配置层级',
        },
        {
          configKey: 'productionLineShiftPropertyKeys',
          configValue: selectedPropertyKeys.join(',') || '',
          category: 'WORK_HOURS',
          description: '产线开线班次属性',
        },
        {
          configKey: 'productionLineShiftIds',
          configValue: filteredShiftIds.join(',') || '',
          category: 'WORK_HOURS',
          description: '产线班次ID列表(自动根据属性生成)',
        },
        {
          configKey: 'actualHoursAllocationCode',
          configValue: values.actualHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '按实际工时方式分配的工时代码',
        },
        {
          configKey: 'indirectHoursAllocationCode',
          configValue: values.indirectHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '间接工时分配后的工时代码',
        },
        {
          configKey: 'earnedHoursAttendanceCode',
          configValue: values.earnedHoursAttendanceCode || '',
          category: 'ALLOCATION',
          description: '配置后，挣得工时计算结果存储至该代码',
        },
      ];

      // 更新或创建每个配置
      await Promise.all(
        configs.map((config) => {
          const existing = systemConfigs.find((c: any) => c.configKey === config.configKey);
          if (existing) {
            return request.put(`/hr/system-configs/${config.configKey}`, {
              configValue: config.configValue,
              description: config.description,
            });
          } else {
            return request.post('/hr/system-configs', config);
          }
        })
      );
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['allocationSystemConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['systemConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
    },
  });

  // 初始化表单数据
  const getInitialValues = () => {
    const productionLineConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineHierarchyLevel'
    );
    const standardHoursLevelsConfig = systemConfigs.find(
      (c: any) => c.configKey === 'standardHoursHierarchyLevels'
    );
    const shiftPropertiesConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineShiftPropertyKeys'
    );
    const actualHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'actualHoursAllocationCode'
    );
    const indirectHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'indirectHoursAllocationCode'
    );
    const earnedHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'earnedHoursAttendanceCode'
    );

    const propertyKeys = shiftPropertiesConfig?.configValue
      ? shiftPropertiesConfig.configValue.split(',').filter((key: string) => key)
      : [];

    const standardHoursLevels = standardHoursLevelsConfig?.configValue
      ? standardHoursLevelsConfig.configValue.split(',').filter((key: string) => key)
      : [];

    return {
      productionLineHierarchyLevel: productionLineConfig?.configValue || undefined,
      standardHoursHierarchyLevels: standardHoursLevels,
      productionLineShiftPropertyKeys: propertyKeys,
      actualHoursAllocationCode: actualHoursCodeConfig?.configValue || undefined,
      indirectHoursAllocationCode: indirectHoursCodeConfig?.configValue || undefined,
      earnedHoursAttendanceCode: earnedHoursCodeConfig?.configValue || undefined,
    };
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');

  // 参数配置定义
  const paramConfigs = useMemo(() => {
    const matchedShiftCount = allShifts.filter((shift: any) =>
      selectedPropertyKeys.some((key: string) => shift.propertyKeys?.includes(key))
    ).length;

    return [
      {
        key: 'productionLineHierarchyLevel',
        name: '开线计划产线对应劳动力账户层级',
        code: 'WH1001',
        description: '选择后，开线维护时产线选择该层级下的明细',
        renderValue: () => (
          <Form.Item name="productionLineHierarchyLevel" style={{ marginBottom: 0 }}>
            <Select
              placeholder="请选择产线对应的层级"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
            >
              {hierarchyLevels
                .filter((level: any) => level.mappingType === 'ORG_TYPE' || level.mappingType === 'ORG')
                .map((level: any) => (
                  <Select.Option key={level.id} value={level.name} label={level.name}>
                    {level.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'standardHoursHierarchyLevels',
        name: '标准工时配置层级',
        code: 'WH1002',
        description: '选择后，在产品标准配置中可以为每个配置层级设置标准',
        renderValue: () => (
          <Form.Item name="standardHoursHierarchyLevels" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              placeholder="请选择标准工时配置层级"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {hierarchyLevels.map((level: any) => (
                <Select.Option key={level.id} value={level.name} label={level.name}>
                  {level.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'productionLineShiftPropertyKeys',
        name: '开线计划可选班次的属性',
        code: 'WH1003',
        description: `选择班次属性后，班次选择将限制为具有这些属性的班次${selectedPropertyKeys.length > 0 ? `（当前匹配 ${matchedShiftCount} 个班次）` : ''}`,
        renderValue: () => (
          <Form.Item name="productionLineShiftPropertyKeys" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              placeholder="请选择产线开线班次属性"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {shiftPropertyDefinitions
                .filter((prop: any) => prop.status === 'ACTIVE')
                .map((prop: any) => (
                  <Select.Option
                    key={prop.propertyKey}
                    value={prop.propertyKey}
                    label={prop.name}
                  >
                    {prop.name}（{prop.propertyKey}）
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'actualHoursAllocationCode',
        name: '实际工时代码',
        code: 'AL1001',
        description: '配置后，按实际工时比例分配方式将从获取以上类型代码的工时数据',
        renderValue: () => (
          <Form.Item
            name="actualHoursAllocationCode"
            rules={[{ required: true, message: '请选择工时代码' }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {attendanceCodes.map((code: any) => (
                <Select.Option
                  key={code.code}
                  value={code.code}
                  label={`${code.name} (${code.code})`}
                >
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'indirectHoursAllocationCode',
        name: '间接工时分配后的工时代码',
        code: 'AL1002',
        description: '用于标识间接工时分配完成后生成的工时记录代码',
        renderValue: () => (
          <Form.Item
            name="indirectHoursAllocationCode"
            rules={[{ required: true, message: '请选择工时代码' }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {attendanceCodes.map((code: any) => (
                <Select.Option
                  key={code.code}
                  value={code.code}
                  label={`${code.name} (${code.code})`}
                >
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'earnedHoursAttendanceCode',
        name: '挣得工时出勤代码',
        code: 'AL1003',
        description: '配置后，挣得工时计算结果存储至该代码',
        renderValue: () => (
          <Form.Item
            name="earnedHoursAttendanceCode"
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {attendanceCodes.map((code: any) => (
                <Select.Option
                  key={code.code}
                  value={code.code}
                  label={`${code.name} (${code.code})`}
                >
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
    ];
  }, [hierarchyLevels, shiftPropertyDefinitions, attendanceCodes, selectedPropertyKeys, allShifts]);

  // 按搜索关键词过滤
  const filteredParams = useMemo(() => {
    if (!searchKeyword) return paramConfigs;
    const keyword = searchKeyword.toLowerCase();
    return paramConfigs.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.code.toLowerCase().includes(keyword)
    );
  }, [paramConfigs, searchKeyword]);

  // 表格列定义
  const paramColumns = [
    {
      title: '参数名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '参数代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '参数值',
      key: 'value',
      width: 320,
      render: (_: any, record: any) => record.renderValue(),
    },
    {
      title: '参数描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
  ];

  if (levelsLoading || configsLoading || propertiesLoading || codesLoading || shiftsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>工时基础配置</span>
          </Space>
        }
      >
        <Form
          form={form}
          initialValues={getInitialValues()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space>
              <span style={{ color: '#666' }}>代码/名称</span>
              <Input
                placeholder="请输入名称和代码"
                allowClear
                style={{ width: 220 }}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                suffix={<SearchOutlined style={{ color: '#bbb' }} />}
              />
            </Space>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              保存
            </Button>
          </div>

          <Table
            columns={paramColumns}
            dataSource={filteredParams}
            rowKey="key"
            pagination={false}
            size="middle"
            bordered={false}
            style={{ marginTop: 8 }}
          />
        </Form>
      </Card>
    </div>
  );
};

export default WorkHourBasicConfigPage;

import { useState, useMemo } from 'react';
import {
  Button,
  Space,
  Modal,
  Tree,
  Select,
  Input,
  Divider,
  Tag,
  Row,
  Col,
  Spin,
  Empty,
  Checkbox,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, LoadingOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface FieldCondition {
  fieldCode: string;
  fieldName: string;
  fieldType: 'organization' | 'select' | 'text' | 'number';
  operator: 'eq' | 'ne' | 'contains' | 'notContains' | 'gt' | 'lt' | 'in' | 'notIn';
  value: string | number | Array<string | number>;  // 支持字符串和数字类型
}

interface FieldGroup {
  id: string;
  conditions: FieldCondition[];
}

interface EmployeeFieldFilterProps {
  value?: FieldGroup[];
  onChange?: (value: FieldGroup[]) => void;
  disabled?: boolean;
}

const operatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'notIn' },
];

// 内置字段定义
const builtInFields = [
  {
    code: 'organization',
    name: '产线',
    type: 'organization' as const,
    icon: <ApartmentOutlined />,
  },
  {
    code: 'employeeType',
    name: '员工类型',
    type: 'select' as const,
    configCode: 'employeeType', // 对应人事信息配置中的字段
  },
  {
    code: 'position',
    name: '岗位',
    type: 'select' as const,
    configCode: 'position', // 对应人事信息配置中的字段
  },
];

const EmployeeFieldFilter: React.FC<EmployeeFieldFilterProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  // 简化为只处理单个条件组的情况
  const [conditions, setConditions] = useState<FieldCondition[]>(
    value.length > 0 && value[0]?.conditions ? value[0].conditions : []
  );

  // 获取产线树
  const { data: orgTree, isLoading: orgLoading } = useQuery({
    queryKey: ['hrOrganizationTree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res),
  });

  // 获取自定义字段列表
  const { data: customFields } = useQuery({
    queryKey: ['hrCustomFields'],
    queryFn: () =>
      request.get('/hr/custom-fields').then((res: any) => res),
  });

  // 获取人事信息配置（查找项的数据源）
  const { data: employeeInfoConfigs } = useQuery({
    queryKey: ['employeeInfoConfigs'],
    queryFn: () =>
      request.get('/hr/employee-info-configs').then((res: any) => res || []),
  });

  // 获取数据源列表（用于 LOOKUP 类型字段）
  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () =>
      request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 产线选择Modal状态
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [currentConditionIndex, setCurrentConditionIndex] = useState<number | null>(null);
  const [selectedOrgKeys, setSelectedOrgKeys] = useState<React.Key[]>([]);
  const [includeChildOrgs, setIncludeChildOrgs] = useState(true);

  // 合并内置字段和自定义字段
  const allFields = useMemo(() => {
    const fields = [...builtInFields];

    if (customFields && customFields.length > 0) {
      customFields.forEach((field: any) => {
        // 判断字段类型
        let fieldType: 'organization' | 'select' | 'text' | 'number' = 'text';

        if (field.type === 'SELECT_SINGLE' || field.type === 'SELECT_MULTI' || field.type === 'LOOKUP') {
          fieldType = 'select';
        } else if (field.type === 'NUMBER') {
          fieldType = 'number';
        }

        fields.push({
          code: field.code,
          name: field.name,
          type: fieldType,
          configCode: field.type === 'LOOKUP' ? field.lookupConfigCode : undefined,
          fieldData: field,
        });
      });
    }

    return fields;
  }, [customFields]);

  // 获取字段的选项数据
  const getFieldOptions = (fieldCode: string) => {
    const field = allFields.find((f) => f.code === fieldCode);
    if (!field) return [];

    console.log('getFieldOptions - fieldCode:', fieldCode, 'field:', field);

    // 产线字段特殊处理
    if (field.type === 'organization') {
      return [];
    }

    // 内置字段：从人事信息配置中获取
    if ((field as any).configCode) {
      const config = employeeInfoConfigs?.find((c: any) => c.field === (field as any).configCode);
      console.log('内置字段 - configCode:', (field as any).configCode, 'config:', config);
      if (config?.options) {
        return config.options.map((opt: any) => ({
          label: opt.label || opt.name,
          value: opt.value || opt.code,
        }));
      }
    }

    // 自定义字段
    const fieldData = (field as any).fieldData;
    if (fieldData) {
      console.log('自定义字段 - fieldData:', fieldData);

      // LOOKUP 类型：从关联的数据源获取选项
      if (fieldData.type === 'LOOKUP' && fieldData.dataSource) {
        const dataSourceId = typeof fieldData.dataSource === 'object' ? fieldData.dataSource.id : fieldData.dataSource;
        const dataSource = dataSources?.find((ds: any) => ds.id === dataSourceId);
        console.log('LOOKUP 类型 - dataSourceId:', dataSourceId, 'dataSource:', dataSource);

        if (dataSource?.options) {
          return dataSource.options.map((opt: any) => ({
            label: opt.label || opt.name,
            value: opt.value || opt.code,
          }));
        }
      }
      // SELECT_SINGLE 或 SELECT_MULTI 类型：直接从字段配置中获取选项
      else if ((fieldData.type === 'SELECT_SINGLE' || fieldData.type === 'SELECT_MULTI') && fieldData.options) {
        return fieldData.options.map((opt: any) => ({
          label: opt.label || opt.name,
          value: opt.value || opt.code,
        }));
      }
    }

    console.log('未找到选项，返回空数组');
    return [];
  };

  // 添加条件
  const addCondition = () => {
    const newCondition: FieldCondition = {
      fieldCode: '',
      fieldName: '',
      fieldType: 'text',
      operator: 'eq',
      value: '',
    };
    const newConditions = [...conditions, newCondition];
    setConditions(newConditions);
    onChange?.([{ id: 'default', conditions: newConditions }]);
  };

  // 更新条件
  const updateCondition = (
    conditionIndex: number,
    updates: Partial<FieldCondition>
  ) => {
    const newConditions = [...conditions];
    newConditions[conditionIndex] = { ...newConditions[conditionIndex], ...updates };
    console.log('EmployeeFieldFilter - 更新条件:', newConditions[conditionIndex]);
    setConditions(newConditions);
    const fieldGroup = [{ id: 'default', conditions: newConditions }];
    console.log('EmployeeFieldFilter - 发送的fieldGroups:', JSON.stringify(fieldGroup, null, 2));
    onChange?.(fieldGroup);
  };

  // 删除条件
  const removeCondition = (conditionIndex: number) => {
    const newConditions = conditions.filter((_, i) => i !== conditionIndex);
    setConditions(newConditions);
    onChange?.([{ id: 'default', conditions: newConditions }]);
  };

  // 打开组织选择器
  const openOrgSelector = (conditionIndex: number) => {
    const condition = conditions[conditionIndex];

    if (condition) {
      setSelectedOrgKeys((condition.value as string) || []);
      setIncludeChildOrgs(
        (condition as any).includeChildOrgs !== undefined
          ? (condition as any).includeChildOrgs
          : true
      );
      setCurrentConditionIndex(conditionIndex);
      setOrgModalVisible(true);
    }
  };

  // 确认产线选择
  const handleOrgConfirm = () => {
    if (currentConditionIndex !== null) {
      updateCondition(currentConditionIndex, {
        value: selectedOrgKeys as string[],
        includeChildOrgs,
      });
    }
    setOrgModalVisible(false);
    setCurrentConditionIndex(null);
  };

  // 渲染产线树节点
  const renderTreeNodes = (nodes: any[]): any[] => {
    if (!nodes) return [];
    return nodes.map((node) => ({
      title: node.name,
      key: node.id,
      children: node.children && node.children.length > 0 ? renderTreeNodes(node.children) : undefined,
    }));
  };

  // 递归查找产线名称
  const findOrgName = (nodes: any[], id: number): string | null => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id === id) {
        return node.name;
      }
      if (node.children && node.children.length > 0) {
        const result = findOrgName(node.children, id);
        if (result) return result;
      }
    }
    return null;
  };

  // 渲染值输入组件
  const renderValueInput = (
    condition: FieldCondition,
    conditionIndex: number
  ) => {
    const isMulti = condition.operator === 'in' || condition.operator === 'notIn';

    // 产线字段
    if (condition.fieldType === 'organization') {
      const orgIds = (condition.value as Array<string | number>) || [];

      // 获取产线名称显示
      const getOrgNames = () => {
        if (!orgIds || orgIds.length === 0) return '';
        const names = orgIds.map((orgId) => {
          const orgName = findOrgName(orgTree, Number(orgId));
          return orgName || `产线${orgId}`;
        });
        return names.join('、');
      };

      return (
        <div>
          <Input
            placeholder="点击选择产线"
            value={getOrgNames()}
            readOnly
            onClick={() => !disabled && openOrgSelector(conditionIndex)}
            disabled={disabled}
            suffix={<ApartmentOutlined style={{ color: '#999' }} />}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
        </div>
      );
    }

    // Select类型字段
    if (condition.fieldType === 'select') {
      const options = getFieldOptions(condition.fieldCode);

      if (isMulti) {
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择值"
            value={condition.value as Array<string | number>}
            onChange={(val) => updateCondition(conditionIndex, { value: val })}
            disabled={disabled}
            showSearch
            optionFilterProp="label"
            options={options}
          />
        );
      }

      return (
        <Select
          style={{ width: '100%' }}
          placeholder="选择值"
          value={condition.value as string | number}
          onChange={(val) => updateCondition(conditionIndex, { value: val })}
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={options}
        />
      );
    }

    // 文本或数字类型
    if (isMulti) {
      return (
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="输入值后按回车添加"
          value={condition.value as Array<string | number>}
          onChange={(val) => updateCondition(conditionIndex, { value: val })}
          disabled={disabled}
          tokenSeparators={[',', ' ']}
        />
      );
    }

    return (
      <Input
        placeholder="请输入值"
        value={condition.value as string | number}
        onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  // 根据字段类型获取可用的操作符
  const getOperatorsForFieldType = (fieldType: string) => {
    if (fieldType === 'organization' || fieldType === 'select') {
      return operatorOptions.filter((op) =>
        ['eq', 'ne', 'in', 'notIn'].includes(op.value)
      );
    }
    if (fieldType === 'number') {
      return operatorOptions;
    }
    return operatorOptions.filter((op) =>
      ['eq', 'ne', 'contains', 'notContains'].includes(op.value)
    );
  };

  return (
    <div>
      {/* 条件列表 */}
      <div>
        {conditions.map((condition, conditionIndex) => (
          <Row key={conditionIndex} gutter={8} align="top" style={{ marginBottom: 12 }}>
            <Col span={1}>
              {conditionIndex > 0 && (
                <Tag color="blue" style={{ marginTop: 4 }}>
                  AND
                </Tag>
              )}
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择字段"
                value={condition.fieldCode}
                onChange={(val) => {
                  const field = allFields.find((f) => f.code === val);
                  updateCondition(conditionIndex, {
                    fieldCode: val,
                    fieldName: field?.name || val,
                    fieldType: field?.type || 'text',
                    value: '',
                    operator: 'eq',
                  });
                }}
                disabled={disabled}
                showSearch
                optionFilterProp="label"
              >
                {allFields.map((field) => (
                  <Select.Option key={field.code} value={field.code} label={field.name}>
                    <Space>
                      {field.icon}
                      {field.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={5}>
              <Select
                placeholder="操作符"
                value={condition.operator}
                onChange={(val) => updateCondition(conditionIndex, { operator: val })}
                disabled={disabled}
                options={getOperatorsForFieldType(condition.fieldType)}
              />
            </Col>
            <Col span={10}>
              {renderValueInput(condition, conditionIndex)}
            </Col>
            <Col span={2}>
              {conditions.length > 1 && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeCondition(conditionIndex)}
                  disabled={disabled}
                >
                  删除
                </Button>
              )}
            </Col>
          </Row>
        ))}

        {conditions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
            暂无条件，请添加条件
          </div>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 添加条件按钮 */}
      <Button
        type="dashed"
        onClick={addCondition}
        icon={<PlusOutlined />}
        block
        size="small"
        disabled={disabled}
      >
        添加条件
      </Button>

      {/* 产线选择Modal */}
      <Modal
        title="选择产线"
        open={orgModalVisible}
        onOk={handleOrgConfirm}
        onCancel={() => {
          setOrgModalVisible(false);
          setCurrentConditionIndex(null);
        }}
        width={600}
      >
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            checked={includeChildOrgs}
            onChange={(e) => setIncludeChildOrgs(e.target.checked)}
          >
            包含子产线
          </Checkbox>
          <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
            {selectedOrgKeys.length > 0 ? `已选择 ${selectedOrgKeys.length} 个产线` : '请选择产线'}
          </span>
        </div>

        {orgLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          </div>
        ) : !orgTree || orgTree.length === 0 ? (
          <Empty description="暂无产线数据" />
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: 8 }}>
            <Tree
              checkable
              checkedKeys={selectedOrgKeys}
              onCheck={(keys) => setSelectedOrgKeys(keys as React.Key[])}
              treeData={renderTreeNodes(orgTree)}
              defaultExpandAll
            />
          </div>
        )}

        {selectedOrgKeys.length > 0 && (
          <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>已选择的产线：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedOrgKeys.map((key) => {
                const orgName = findOrgName(orgTree, key as number);
                return (
                  <Tag key={key} color="blue">
                    {orgName || `产线${key}`}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeFieldFilter;

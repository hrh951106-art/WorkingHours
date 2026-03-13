import { useState, useEffect, useMemo } from 'react';
import { Select, Row, Col, Button, Space, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface HierarchyValue {
  levelId: number;
  level: number;
  levelName: string;
  valueIds: Array<string | number>;  // 支持字符串和数字类型
}

interface WorkHoursBelongingSelectorProps {
  value?: HierarchyValue[];
  onChange?: (value: HierarchyValue[]) => void;
  disabled?: boolean;
}

const WorkHoursBelongingSelector: React.FC<WorkHoursBelongingSelectorProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  const [selections, setSelections] = useState<HierarchyValue[]>([]);

  // 获取层级配置列表
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取组织树
  const { data: orgTree } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 获取人事字段配置
  const { data: employeeInfoConfigs } = useQuery({
    queryKey: ['employeeInfoConfigs'],
    queryFn: () =>
      request.get('/hr/employee-info-configs').then((res: any) => res || []),
  });

  // 获取自定义字段配置
  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () =>
      request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  useEffect(() => {
    // 只在外部value变化时更新内部状态
    if (value && value.length > 0 && JSON.stringify(value) !== JSON.stringify(selections)) {
      setSelections(value);
    }
  }, [value]);

  const addSelection = () => {
    const newSelections = [
      ...selections,
      { levelId: 0, level: 0, levelName: '', valueIds: [] },
    ];
    console.log('WorkHoursBelongingSelector - 添加新selection, newSelections:', JSON.stringify(newSelections, null, 2));
    setSelections(newSelections);
    onChange?.(newSelections);
  };

  const removeSelection = (index: number) => {
    const newSelections = selections.filter((_, i) => i !== index);
    setSelections(newSelections);
    onChange?.(newSelections);
  };

  const updateSelectionLevel = (index: number, levelId: number) => {
    const level = hierarchyLevels?.find((l: any) => l.id === levelId);
    const newSelections = selections.map((s, i) =>
      i === index
        ? { ...s, levelId, level: level?.level || 0, levelName: level?.name || '', valueIds: [] }
        : s
    );
    setSelections(newSelections);
    onChange?.(newSelections);
  };

  const updateSelectionValues = (index: number, valueIds: Array<string | number>) => {
    const newSelections = selections.map((s, i) =>
      i === index ? { ...s, valueIds } : s
    );
    console.log('WorkHoursBelongingSelector - 更新后的selections:', JSON.stringify(newSelections, null, 2));
    setSelections(newSelections);
    onChange?.(newSelections);
  };

  // 扁平化组织树
  const flattenOrgTree = (orgs: any[]): any[] => {
    const result: any[] = [];
    orgs.forEach((org) => {
      result.push({
        id: org.id,
        name: org.name,
        code: org.code,
        value: org.id,  // 使用ID而不是code，确保是数字类型
        label: org.name,
        type: org.type,
      });
      if (org.children) {
        result.push(...flattenOrgTree(org.children));
      }
    });
    return result;
  };

  // 根据层级的映射类型获取对应的选项
  const getLevelOptions = (levelId: number) => {
    const level = hierarchyLevels?.find((l: any) => l.id === levelId);
    if (!level) return [];

    console.log('获取层级选项:', {
      levelId,
      levelName: level.name,
      mappingType: level.mappingType,
      mappingValue: level.mappingValue,
    });

    let options: any[] = [];

    if (level.mappingType === 'ORG_TYPE') {
      // 产线类型：从产线树中获取所有该类型的产线
      const allOrgs = flattenOrgTree(orgTree || []);
      console.log('所有产线:', allOrgs);
      console.log('筛选类型:', level.mappingValue);
      options = allOrgs.filter((org: any) => org.type === level.mappingValue);
      console.log('筛选后的产线:', options);
    } else if (level.mappingType === 'EMPLOYEE_INFO') {
      // 人事信息：从人事字段配置中获取选项
      const config = employeeInfoConfigs?.find((c: any) => c.field === level.mappingValue);
      if (config?.options) {
        options = config.options.map((opt: any) => ({
          id: opt.value || opt.code,
          name: opt.label || opt.name,
          code: opt.value || opt.code,
          value: opt.value || opt.code,
          label: opt.label || opt.name,
        }));
      }
    } else if (level.mappingType?.startsWith('CUSTOM_')) {
      // 自定义字段：从自定义字段配置中获取选项
      const fieldCode = level.mappingType.replace('CUSTOM_', '');
      const field = customFields?.find((f: any) => f.code === fieldCode);

      if (field?.dataSource?.options) {
        options = field.dataSource.options.map((opt: any) => ({
          id: opt.value,
          name: opt.label,
          code: opt.value,
          value: opt.value,
          label: opt.label,
        }));
      }
    }

    // 去重（根据 value/code）
    const uniqueOptions = options.filter((opt, index, self) =>
      index === self.findIndex((t) => t.value === opt.value)
    );

    console.log('最终选项:', uniqueOptions);

    return uniqueOptions;
  };

  // 缓存所有层级的选项数据
  const levelOptionsMap = useMemo(() => {
    const map: Record<number, any[]> = {};
    selections.forEach((selection) => {
      if (selection.levelId) {
        map[selection.levelId] = getLevelOptions(selection.levelId);
      }
    });
    return map;
  }, [selections, hierarchyLevels, orgTree, employeeInfoConfigs, customFields]);

  return (
    <div>
      {selections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
          暂无工时归属，点击下方按钮添加
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {selections.map((selection, index) => {
            const levelOptions = levelOptionsMap[selection.levelId] || [];

            return (
              <Row key={index} gutter={8}>
                <Col span={1}>
                  {index > 0 && (
                    <Tag color="green">AND</Tag>
                  )}
                </Col>
                <Col span={10}>
                  <Select
                    placeholder="选择劳动力账户层级"
                    value={selection.levelId || undefined}
                    onChange={(val) => updateSelectionLevel(index, val)}
                    disabled={disabled}
                    style={{ width: '100%' }}
                    options={hierarchyLevels?.map((level: any) => ({
                      label: level.name,
                      value: level.id,
                    })) || []}
                    showSearch
                    optionFilterProp="label"
                  />
                </Col>
                <Col span={11}>
                  <Select
                    mode="multiple"
                    placeholder={`选择${selection.levelName || '账户'}`}
                    value={selection.valueIds}
                    onChange={(val) => updateSelectionValues(index, val)}
                    disabled={disabled || !selection.levelId}
                    style={{ width: '100%' }}
                    options={levelOptions.map((opt: any) => ({
                      label: opt.label || opt.name,
                      value: opt.value || opt.code,
                    }))}
                    showSearch
                    optionFilterProp="label"
                  />
                </Col>
                <Col span={2}>
                  {selections.length > 1 && (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeSelection(index)}
                      disabled={disabled}
                    >
                      删除
                    </Button>
                  )}
                </Col>
              </Row>
            );
          })}
        </Space>
      )}

      <Button
        type="dashed"
        onClick={addSelection}
        disabled={disabled}
        icon={<PlusOutlined />}
        block
        style={{ marginTop: selections.length > 0 ? 8 : 0 }}
      >
        添加工时归属
      </Button>
    </div>
  );
};

export default WorkHoursBelongingSelector;

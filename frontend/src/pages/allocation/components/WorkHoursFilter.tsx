import { useState, useEffect } from 'react';
import { Divider, Empty, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import WorkHoursBelongingSelector from './WorkHoursBelongingSelector';

interface WorkHoursCondition {
  hierarchySelections: Array<{
    levelId: number;
    level: number;
    levelName: string;
    valueIds: Array<string | number>;
  }>;
  attendanceCodes: string[];
}

interface WorkHoursFilterProps {
  value?: WorkHoursCondition;
  onChange?: (value: WorkHoursCondition) => void;
  attendanceCodes?: any[];
  disabled?: boolean;
}

const WorkHoursFilter: React.FC<WorkHoursFilterProps> = ({
  value,
  attendanceCodes = [],
  onChange,
  disabled = false,
}) => {
  const [condition, setCondition] = useState<WorkHoursCondition>(
    value || { hierarchySelections: [], attendanceCodes: [] }
  );

  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(condition)) {
      setCondition(value);
    }
  }, [value]);

  const updateCondition = (updates: Partial<WorkHoursCondition>) => {
    const newCondition = { ...condition, ...updates };
    console.log('WorkHoursFilter - 更新条件:', newCondition);
    console.log('hierarchySelections:', JSON.stringify(newCondition.hierarchySelections, null, 2));
    console.log('attendanceCodes:', newCondition.attendanceCodes);
    setCondition(newCondition);
    onChange?.(newCondition);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
          出勤代码
        </div>
        <Select
          mode="multiple"
          placeholder="选择出勤代码（可多选）"
          allowClear
          value={condition.attendanceCodes}
          onChange={(val) => updateCondition({ attendanceCodes: val })}
          disabled={disabled}
          style={{ width: '100%' }}
          options={attendanceCodes.map((code: any) => ({
            label: `${code.name} (${code.code})`,
            value: code.code,
          }))}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div>
        <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
          工时归属
        </div>
        <WorkHoursBelongingSelector
          value={condition.hierarchySelections}
          onChange={(val) => updateCondition({ hierarchySelections: val })}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default WorkHoursFilter;

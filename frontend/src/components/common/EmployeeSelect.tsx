import { useMemo, useState } from 'react';
import { Select, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  orgId: number;
  orgName: string;
  status: string;
}

interface EmployeeSelectProps {
  value?: number | null;
  onChange?: (value: number | null, employee?: Employee) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  className?: string;
  status?: string; // 过滤员工状态，如 ACTIVE
}

const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '选择员工',
  allowClear = true,
  style,
  className,
  status = 'ACTIVE',
}) => {
  const [searchText, setSearchText] = useState('');

  // 获取员工列表
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', status],
    queryFn: async () => {
      return request.get<{items: Employee[]}>('/hr/employees/select-list', {
        params: {
          status,
          pageSize: 1000,
        },
      }).then((res: any) => res.items || []);
    },
  });

  // 过滤员工列表
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchText) return employees;

    const lowerSearch = searchText.toLowerCase();
    return employees.filter((emp: Employee) =>
      emp.name?.toLowerCase().includes(lowerSearch) ||
      emp.employeeNo?.toLowerCase().includes(lowerSearch)
    );
  }, [employees, searchText]);

  // 构建显示名称
  const getEmployeeDisplayName = (emp: Employee) => {
    return `${emp.employeeNo} - ${emp.name || '未知'} (${emp.orgName || '未知部门'})`;
  };

  return (
    <Select
      value={value}
      onChange={(val) => {
        const employee = employees?.find((e: Employee) => e.id === val);
        onChange?.(val || null, employee);
      }}
      disabled={disabled}
      placeholder={placeholder}
      allowClear={allowClear}
      showSearch
      autoClearSearchValue
      filterOption={false}
      onSearch={setSearchText}
      loading={isLoading}
      style={style}
      className={className}
      optionLabelProp="label"
      notFoundContent={isLoading ? '加载中...' : '无匹配员工'}
    >
      {filteredEmployees?.map((emp: Employee) => (
        <Select.Option
          key={emp.id}
          value={emp.id}
          label={getEmployeeDisplayName(emp)}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>
              {emp.name || '未知'} ({emp.employeeNo})
            </span>
            <span style={{ fontSize: 12, color: '#999' }}>
              {emp.orgName || '未知部门'}
            </span>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};

export default EmployeeSelect;

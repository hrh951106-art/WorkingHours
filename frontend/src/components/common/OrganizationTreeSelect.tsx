import { useMemo } from 'react';
import { TreeSelect } from 'antd';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface OrganizationTreeSelectProps {
  value?: number | number[] | null;
  onChange?: (value: number | number[] | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  multiple?: boolean;
  size?: 'large' | 'middle' | 'small';
}

interface TreeNode {
  title: string;
  value: number;
  key: string;
  children?: TreeNode[];
}

const OrganizationTreeSelect: React.FC<OrganizationTreeSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '请选择组织',
  allowClear = true,
  style,
  multiple = false,
  size = 'middle',
}) => {
  // 获取组织架构树
  const { data: orgTree, isLoading } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 转换为 TreeSelect 需要的数据格式
  const convertToTreeData = (nodes: any[]): TreeNode[] => {
    return nodes.map((node) => ({
      title: node.name,
      value: node.id,
      key: `${node.id}`,
      children: node.children ? convertToTreeData(node.children) : undefined,
    }));
  };

  const treeData = useMemo(() => {
    if (!orgTree || orgTree.length === 0) return [];
    return convertToTreeData(orgTree);
  }, [orgTree]);

  return (
    <TreeSelect
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      allowClear={allowClear}
      style={style}
      multiple={multiple}
      treeCheckable={multiple}
      size={size}
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
      loading={isLoading}
      treeData={treeData}
    />
  );
};

export default OrganizationTreeSelect;

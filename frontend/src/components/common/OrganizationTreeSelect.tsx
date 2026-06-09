import { useMemo, useState, useEffect } from 'react';
import { Tree, Checkbox, Input, Button, Popover, Space, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, DownOutlined, CloseCircleFilled } from '@ant-design/icons';
import request from '@/utils/request';

interface OrganizationTreeSelectProps {
  value?: number | number[] | null;
  onChange?: (value: number | number[] | null, includeChildren?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  multiple?: boolean;
  size?: 'large' | 'middle' | 'small';
  showIncludeChildren?: boolean;
  includeChildren?: boolean;
  onIncludeChildrenChange?: (include: boolean) => void;
  showSelectAll?: boolean;
}

interface TreeNode {
  title: string;
  value: number;
  key: string;
  children?: TreeNode[];
  selectable?: boolean;
}

interface DataNode {
  title: string;
  value: number;
  key: string;
  children?: DataNode[];
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
  showIncludeChildren = false,
  includeChildren = false,
  onIncludeChildrenChange,
  showSelectAll = false,
}) => {
  console.log('=== OrganizationTreeSelect 组件渲染 ===');
  console.log('Props:', { value, disabled, placeholder, multiple, showIncludeChildren, showSelectAll });

  // 下拉弹窗状态
  const [popoverOpen, setPopoverOpen] = useState(false);
  // 搜索文本
  const [searchText, setSearchText] = useState('');
  // 树控件选中的keys
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);

  // 同步外部value到内部checkedKeys
  useEffect(() => {
    if (value) {
      const keys = Array.isArray(value) ? value.map(String) : [String(value)];
      setCheckedKeys(keys);
      console.log('同步value到checkedKeys:', value, '=>', keys);
    } else {
      setCheckedKeys([]);
    }
  }, [value]);

  // 获取组织架构树
  const { data: orgTree, isLoading, error } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: async () => {
      try {
        console.log('开始获取组织树数据...');
        const res = await request.get('/hr/organizations/tree');
        console.log('OrganizationTreeSelect 获取组织树数据成功:', res);
        console.log('数据类型:', typeof res);
        console.log('是否为数组:', Array.isArray(res));
        console.log('数据长度:', res?.length);
        return res || [];
      } catch (err) {
        console.error('获取组织树数据失败:', err);
        throw err;
      }
    },
  });

  // 打印错误信息
  if (error) {
    console.error('组织树查询错误:', error);
  }

  // 过滤组织树
  const filterOrgTree = (tree: any[], searchText: string): any[] => {
    if (!searchText) return tree;
    const lowerSearchText = searchText.toLowerCase();

    const filterNode = (node: any): any => {
      const matchesSearch = node.name?.toLowerCase().includes(lowerSearchText);
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((child: any) => child !== null);

      if (matchesSearch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren || [],
        };
      }
      return null;
    };

    return tree.map(filterNode).filter((node) => node !== null);
  };

  // 转换为 Tree 需要的数据格式
  const convertToTreeData = (nodes: any[]): DataNode[] => {
    return nodes.map((node) => ({
      title: node.name,
      value: node.id,
      key: `${node.id}`,
      children: node.children ? convertToTreeData(node.children) : undefined,
    }));
  };

  const treeData = useMemo(() => {
    console.log('OrganizationTreeSelect 计算 treeData, orgTree:', orgTree, 'searchText:', searchText);
    if (!orgTree || orgTree.length === 0) {
      console.log('orgTree 为空或长度为0');
      return [];
    }
    const filteredTree = filterOrgTree(orgTree, searchText);
    console.log('过滤后的树:', filteredTree);
    const result = convertToTreeData(filteredTree);
    console.log('最终 treeData:', result);
    return result;
  }, [orgTree, searchText]);

  // 获取所有组织节点的ID
  const getAllOrgIds = (nodes: any[]): number[] => {
    const ids: number[] = [];
    const traverse = (nodeList: any[]) => {
      nodeList.forEach((node) => {
        ids.push(node.id);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return ids;
  };

  // 处理全选
  const handleSelectAll = () => {
    const allIds = getAllOrgIds(orgTree || []);
    setCheckedKeys(allIds);
    if (onChange) {
      onChange(allIds, includeChildren);
    }
  };

  // 处理清空选择
  const handleClearAll = () => {
    setCheckedKeys([]);
    if (onChange) {
      onChange(multiple ? [] : null, includeChildren);
    }
  };

  // 处理树选择变化
  const handleTreeCheck = (checkedKeysValue: any) => {
    console.log('Tree onCheck触发，checkedKeysValue:', checkedKeysValue);

    // checkStrictly模式下，checkedKeys可能是对象或数组
    let keys: React.Key[] = [];

    if (Array.isArray(checkedKeysValue)) {
      keys = checkedKeysValue;
    } else if (checkedKeysValue && typeof checkedKeysValue === 'object') {
      // checkStrictly模式下，checkedKeys是 {checked: [], halfChecked: []} 格式
      keys = checkedKeysValue.checked || [];
    }

    console.log('处理后的keys:', keys);

    setCheckedKeys(keys);

    if (onChange) {
      const ids = keys.map((key) => Number(key));
      console.log('调用onChange，ids:', ids, 'multiple:', multiple);
      onChange(multiple ? ids : ids[0] || null, includeChildren);
      // 选择后自动关闭下拉菜单
      setTimeout(() => setPopoverOpen(false), 300);
    }
  };

  // 处理单个Tag关闭
  const handleTagClose = (name: string) => {
    if (disabled) return;

    if (!orgTree) return;

    // 根据名称找到对应的ID
    const findId = (nodes: any[], targetName: string): number | null => {
      for (const node of nodes) {
        if (node.name === targetName) {
          return node.id;
        }
        if (node.children) {
          const found = findId(node.children, targetName);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const idToRemove = findId(orgTree, name);
    if (idToRemove === null) return;

    if (multiple && Array.isArray(value)) {
      const newValue = value.filter((id) => id !== idToRemove);
      const newKeys = newValue.map(String);
      setCheckedKeys(newKeys);
      if (onChange) {
        onChange(newValue, includeChildren);
      }
    }
  };

  // 处理清空按钮
  const handleClear = () => {
    setCheckedKeys([]);
    if (onChange) {
      onChange(multiple ? [] : null, includeChildren);
    }
  };

  // 获取选中组织的名称
  const getSelectedNames = (): string[] => {
    if (!value || !orgTree) return [];
    const values = Array.isArray(value) ? value : [value];
    const names: string[] = [];

    const findName = (nodes: any[], targetId: number): string | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node.name;
        }
        if (node.children) {
          const found = findName(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    values.forEach((id) => {
      const name = findName(orgTree, id);
      if (name) names.push(name);
    });

    return names;
  };

  const selectedNames = getSelectedNames();

  console.log('=== OrganizationTreeSelect 渲染 ===');
  console.log('isLoading:', isLoading);
  console.log('orgTree:', orgTree);
  console.log('treeData:', treeData);
  console.log('selectedNames:', selectedNames);

  // 下拉内容
  const dropdownContent = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      {/* 搜索框 */}
      <Input
        placeholder="搜索组织"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        style={{ marginBottom: 8 }}
      />

      {/* 选项区域 */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {showIncludeChildren && (
          <Checkbox
            checked={includeChildren}
            onChange={(e) => onIncludeChildrenChange?.(e.target.checked)}
          >
            包含子组织
          </Checkbox>
        )}
        {showSelectAll && multiple && (
          <Space size={12}>
            <Checkbox
              checked={checkedKeys.length > 0 && checkedKeys.length === getAllOrgIds(orgTree || []).length}
              onChange={(e) => {
                if (e.target.checked) {
                  handleSelectAll();
                } else {
                  handleClearAll();
                }
              }}
            >
              全选
            </Checkbox>
          </Space>
        )}
      </div>

      {/* 组织树 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          加载中...
        </div>
      ) : treeData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          暂无组织数据
        </div>
      ) : (
        <Tree
          checkable
          checkStrictly
          checkedKeys={checkedKeys}
          onCheck={handleTreeCheck}
          treeData={treeData}
          showSearch={false}
          defaultExpandAll
          style={{ maxHeight: 300, overflow: 'auto' }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={dropdownContent}
      trigger="click"
      open={popoverOpen}
      onOpenChange={(open) => {
        if (!disabled) {
          setPopoverOpen(open);
        }
      }}
      placement="bottomLeft"
      overlayStyle={{ zIndex: 1050 }}
    >
      <div
        style={{
          ...style,
          position: 'relative',
        }}
      >
        <div
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: size === 'small' ? 4 : size === 'large' ? 8 : 6,
            padding: `4px ${size === 'small' ? 8 : size === 'large' ? 12 : 11}px`,
            minHeight: size === 'small' ? 24 : size === 'large' ? 40 : 32,
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: disabled ? '#f5f5f5' : '#fff',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            alignItems: 'center',
            opacity: disabled ? 0.6 : 1,
          }}
          onClick={() => !disabled && setPopoverOpen(!popoverOpen)}
        >
          {selectedNames.length === 0 ? (
            <span style={{ color: '#bfbfbf' }}>{placeholder}</span>
          ) : (
            selectedNames.map((name) => (
              <Tag
                key={name}
                closable={!disabled}
                onClose={(e) => {
                  e.stopPropagation();
                  handleTagClose(name);
                }}
              >
                {name}
              </Tag>
            ))
          )}
        </div>
        {allowClear && !disabled && selectedNames.length > 0 && (
          <CloseCircleFilled
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#bfbfbf',
              cursor: 'pointer',
              fontSize: 12,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
        <DownOutlined
          style={{
            position: 'absolute',
            right: allowClear && selectedNames.length > 0 ? 20 : 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#bfbfbf',
            pointerEvents: 'none',
          }}
        />
      </div>
    </Popover>
  );
};

export default OrganizationTreeSelect;

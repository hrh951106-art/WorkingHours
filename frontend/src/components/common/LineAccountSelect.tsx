import { useMemo, useState } from 'react';
import { Select, Button, Tag, message, Modal, Form, Tree, Tabs, Input } from 'antd';
import { PlusOutlined, ApartmentOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface Account {
  id: number;
  code: string;
  name: string;
  path: string;
  namePath: string;
  type: string;
  level: number;
  hierarchyValues?: string;
  createdAt: string;
  [key: string]: any;
}

interface LineAccountSelectProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  className?: string;
  showCreateButton?: boolean;
  onAccountCreated?: (accountId: number) => void;
  /** 点击选择框时直接打开创建窗口,不显示下拉列表 */
  directOpenCreate?: boolean;
  /** 是否显示"其他"页签，默认显示 */
  showOtherTab?: boolean;
}

const LineAccountSelect: React.FC<LineAccountSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '选择产线账户',
  allowClear = true,
  style,
  className,
  showCreateButton = true,
  onAccountCreated,
  directOpenCreate = false,
  showOtherTab = true,
}) => {
  const queryClient = useQueryClient();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedLevelValues, setSelectedLevelValues] = useState<Record<number, any>>({});
  const [currentOtherLevelId, setCurrentOtherLevelId] = useState<number | null>(null);
  const [orgSearchText, setOrgSearchText] = useState('');
  const [otherSearchText, setOtherSearchText] = useState('');

  // 获取 productionLineHierarchyLevel 配置（开线计划产线选择可选层级）
  const { data: productionLineHierarchyConfig } = useQuery({
    queryKey: ['systemConfig', 'productionLineHierarchyLevel'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => {
        const config = res?.find((c: any) => c.configKey === 'productionLineHierarchyLevel');
        return config?.configValue || ''; // 返回类似 "3" 的字符串
      }),
  });

  // 解析可选择的层级ID列表
  const selectableLevelIds = useMemo(() => {
    if (!productionLineHierarchyConfig) return [];
    return productionLineHierarchyConfig.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
  }, [productionLineHierarchyConfig]);

  // 获取最近创建的5个子劳动力账户
  const { data: recentAccounts, refetch: refetchRecentAccounts } = useQuery({
    queryKey: ['recent-accounts-line'],
    queryFn: () =>
      request.get('/account/accounts', {
        params: {
          type: 'SUB',
          usageType: 'SHIFT',
          pageSize: 50,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }).then((res: any) => res.items || []),
  });

  // 合并账户
  const accounts = useMemo(() => {
    return recentAccounts || [];
  }, [recentAccounts]);

  // 获取层级配置（包含层级明细）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-levels-with-details'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 获取组织架构树
  const { data: orgTree } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 创建子劳动力账户
  const createAccountMutation = useMutation({
    mutationFn: (data: any) => request.post('/account/accounts', data),
    onSuccess: async (response: any) => {
      const newAccount = response.data || response;
      message.success('创建成功');
      setAccountModalOpen(false);
      setSelectedLevelValues({});
      queryClient.invalidateQueries({ queryKey: ['recent-accounts-line'] });
      await refetchRecentAccounts();
      if (onChange) {
        onChange(newAccount.id);
      }
      if (onAccountCreated) {
        onAccountCreated(newAccount.id);
      }
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 构建账户显示名称
  const getAccountDisplayName = (acc: Account) => {
    if (!acc) return '';

    let hierarchyValuesData: any[] = [];
    if (acc.hierarchyValues) {
      if (typeof acc.hierarchyValues === 'string') {
        try {
          hierarchyValuesData = JSON.parse(acc.hierarchyValues);
        } catch (e) {
          console.error('解析 hierarchyValues 失败:', e);
        }
      } else if (Array.isArray(acc.hierarchyValues)) {
        hierarchyValuesData = acc.hierarchyValues;
      }
    }

    if (hierarchyValuesData.length > 0 && hierarchyLevels) {
      const sortedLevels = [...hierarchyLevels].sort((a: any, b: any) => a.level - b.level);
      const displayParts = sortedLevels.map((level: any) => {
        const hv = hierarchyValuesData.find((h: any) => h.levelId === level.id || h.level === level.level);
        return hv?.selectedValue?.name || '';
      });
      return displayParts.join('/');
    }

    if (acc.namePath) {
      let displayName = acc.namePath;
      displayName = displayName.replace(/\s*\/\s*/g, '/');
      return displayName;
    }

    return (acc.name || acc.path || '').replace(/\s*\/\s*/g, '/');
  };

  // 处理创建账户
  const handleCreateAccount = () => {
    setSelectedLevelValues({});
    setAccountModalOpen(true);
  };

  // 处理下拉菜单显示/隐藏（在直接创建模式下拦截）
  const handleDropdownVisibleChange = (open: boolean) => {
    if (directOpenCreate && open) {
      // 阻止下拉菜单显示，直接打开创建窗口
      return false;
    }
  };

  // 处理点击选择框（在直接创建模式下）
  const handleSelectClick = () => {
    if (directOpenCreate && !disabled) {
      handleCreateAccount();
    }
  };

  const handleCreateAccountOk = async () => {
    try {
      const selectedValues = Object.values(selectedLevelValues).filter(
        (v) => v !== undefined && v !== null
      );
      if (selectedValues.length === 0) {
        message.warning('请至少选择一个层级值');
        return;
      }

      const accountData: any = {
        code: `LINE-${Date.now()}`,
        name: selectedValues.map((v: any) => v?.name || v?.label || v).join('/'),
        type: 'SUB',
        level: Object.keys(selectedLevelValues).length,
        path: selectedValues.map((v: any) => v?.code || v?.value || v).join('/'),
        usageType: 'SHIFT',
      };

      const allLevels = hierarchyLevels || [];
      allLevels.sort((a: any, b: any) => a.level - b.level);

      // 设置父级账户
      for (let i = allLevels.length - 1; i > 0; i--) {
        const levelValue = selectedLevelValues[allLevels[i].id];
        if (levelValue) {
          accountData.parentId = levelValue.accountId;
          break;
        }
      }

      const namePathParts = allLevels.map((level: any) => {
        const selectedValue = selectedLevelValues[level.id];
        return selectedValue?.name || '';
      });
      accountData.namePath = namePathParts.join('/');

      const hierarchyValues = allLevels.map((level: any) => {
        const selectedValue = selectedLevelValues[level.id];
        return {
          levelId: level.id,
          level: level.level,
          name: level.name,
          mappingType: level.mappingType,
          mappingValue: level.mappingValue,
          selectedValue: selectedValue
            ? {
                id: selectedValue.id,
                name: selectedValue.name,
                code: selectedValue.code,
                type: selectedValue.type,
              }
            : null,
        };
      });
      accountData.hierarchyValues = JSON.stringify(hierarchyValues);

      createAccountMutation.mutate(accountData);
    } catch (error) {
      console.error('创建账户失败:', error);
    }
  };

  // 获取层级配置的显示值
  const getLevelValues = (level: any) => {
    if (level.mappingType === 'ORG' || level.mappingType === 'ORG_TYPE') {
      return flattenOrgTree(orgTree || []);
    } else if (level.mappingType?.startsWith('FIELD_') || level.mappingType?.startsWith('CUSTOM_')) {
      if (level.details && Array.isArray(level.details)) {
        return level.details
          .filter((detail: any) => detail.status === 'ACTIVE')
          .map((detail: any) => ({
            id: detail.id,
            name: detail.levelName,
            code: detail.levelCode,
            value: detail.id,
            label: detail.levelName,
          }));
      }
      return [];
    }
    return [];
  };

  // 扁平化组织树
  const flattenOrgTree = (orgs: any[]): any[] => {
    const result: any[] = [];
    orgs.forEach((org) => {
      result.push({
        id: org.id,
        name: org.name,
        code: org.code,
        value: org.code,
        label: org.name,
      });
      if (org.children) {
        result.push(...flattenOrgTree(org.children));
      }
    });
    return result;
  };

  // 过滤组织树（用于搜索）
  const filterOrgTree = (tree: any[], searchText: string): any[] => {
    if (!searchText) return tree;

    const filterNode = (node: any): any => {
      const matchesSearch = node.name?.toLowerCase().includes(searchText.toLowerCase());
      const filteredChildren = node.children?.map(filterNode).filter((child: any) => child !== null);

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

  // 在组织树中通过 ID 查找节点
  const findOrgNodeById = (orgs: any[], id: number): any => {
    for (const org of orgs) {
      if (org.id === id) {
        return org;
      }
      if (org.children && org.children.length > 0) {
        const found = findOrgNodeById(org.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 处理层级值选择（增加层级禁用逻辑）
  const handleLevelValueChange = (levelId: number, value: any) => {
    // 检查该层级是否在可选择的层级列表中
    if (value !== null && value !== undefined) {
      const level = hierarchyLevels?.find((l: any) => l.id === levelId);
      if (level) {
        // 使用层级序号（level.level）来判断是否可选
        const isSelectable = selectableLevelIds.includes(level.level);
        if (!isSelectable) {
          message.warning(`"${level.name}"层级不允许选择，请选择系统配置的产线层级`);
          return;
        }
      }
    }

    setSelectedLevelValues((prev) => {
      const newValues = { ...prev };

      if (value === null || value === undefined) {
        delete newValues[levelId];
        return newValues;
      }

      const level = hierarchyLevels?.find((l: any) => l.id === levelId);

      // 验证自定义字段类型
      if (level && (level.mappingType?.startsWith('FIELD_') || level.mappingType?.startsWith('CUSTOM_'))) {
        const isInDetails = level.details?.some((detail: any) =>
          detail.status === 'ACTIVE' && detail.id === value.id
        );

        if (!isInDetails) {
          message.warning(`选择的值不在${level.name}的层级明细中，请先刷新层级明细`);
          return prev;
        }
      }

      // 如果是组织类型，自动带上父级
      if ((level?.mappingType === 'ORG' || level?.mappingType === 'ORG_TYPE') && value) {
        let currentNodeId = value.parentId;
        let levelCount = 0;
        const maxLevel = 10;

        while (currentNodeId && levelCount < maxLevel) {
          const parentNode = findOrgNodeById(orgTree || [], currentNodeId);
          if (!parentNode) break;

          const parentLevel = hierarchyLevels?.find((l: any) => l.mappingValue === parentNode.type);
          if (parentLevel) {
            newValues[parentLevel.id] = {
              id: parentNode.id,
              name: parentNode.name,
              code: parentNode.code,
              type: parentNode.type,
            };
            currentNodeId = parentNode.parentId;
            levelCount++;
          } else {
            break;
          }
        }
      }

      newValues[levelId] = value;
      return newValues;
    });
  };

  // 构建组织树数据（带禁用状态，只显示映射到层级的组织或包含可选拥有孙节点的组织）
  const buildOrgTreeData = (orgs: any[]): any[] => {
    if (!orgs || orgs.length === 0) return [];

    const buildNode = (org: any): any => {
      // 查找该组织类型对应的层级配置
      const level = hierarchyLevels?.find((l: any) => l.mappingValue === org.type);

      // 使用层级序号（level.level）来判断是否可选
      const isSelectable = level ? selectableLevelIds.includes(level.level) : false;

      // 递归处理子节点
      const validChildren = org.children
        ? org.children.map(buildNode).filter((child: any) => child !== null)
        : [];

      // 如果当前节点映射到层级，或者有有效的子节点，则显示
      const shouldShow = level || validChildren.length > 0;

      if (!shouldShow) {
        return null;
      }

      const node = {
        ...org,
        key: org.id,
        title: org.name,
        value: org.id,
        data: org,
        disabled: !isSelectable,
        children: validChildren,
      };

      return node;
    };

    return orgs.map(buildNode).filter((node: any) => node !== null);
  };

  // 渲染层级选择项（只显示组织类型）
  const renderOrgLevelSelectors = () => {
    const orgLevels = hierarchyLevels
      ?.filter((l: any) => l.mappingType === 'ORG' || l.mappingType === 'ORG_TYPE')
      .sort((a: any, b:any) => a.level - b.level) || [];

    return orgLevels.map((level: any) => {
      // 使用层级序号（level.level）来判断是否可选
      const isSelectable = selectableLevelIds.includes(level.level);
      const selectedValue = selectedLevelValues[level.id];

      return (
        <div
          key={level.id}
          style={{
            padding: '12px',
            marginBottom: '8px',
            borderRadius: '6px',
            background: isSelectable ? '#f8fafc' : '#f3f4f6',
            border: `1px solid ${isSelectable ? '#e2e8f0' : '#d1d5db'}`,
            opacity: isSelectable ? 1 : 0.5,
            cursor: isSelectable && !selectedValue ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (isSelectable && !selectedValue) {
              setCurrentSelectingLevelId(level.id);
              setOrgTreeModalOpen(true);
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 500, fontSize: '14px', color: isSelectable ? '#1f2937' : '#9ca3af' }}>
              {level.name}
              {!isSelectable && (
                <Tag color="default" style={{ marginLeft: 8, fontSize: 12 }}>
                  不可选
                </Tag>
              )}
              {isSelectable && !selectedValue && (
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 12 }}>
                  点击选择
                </Tag>
              )}
            </span>
            {selectedValue && isSelectable && (
              <Button
                type="text"
                size="small"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleLevelValueChange(level.id, null);
                }}
                style={{ padding: '0 4px', fontSize: 12 }}
              >
                删除
              </Button>
            )}
          </div>
          <div style={{ color: isSelectable ? '#6366f1' : '#9ca3af', fontWeight: 500, fontSize: '13px' }}>
            {selectedValue?.name || '点击选择组织'}
          </div>
        </div>
      );
    });
  };

  // 渲染其他层级选择项（非组织类型）
  const renderOtherLevelSelectors = () => {
    const otherLevels = hierarchyLevels
      ?.filter((l: any) => l.mappingType?.startsWith('FIELD_') || l.mappingType?.startsWith('CUSTOM_'))
      .sort((a: any, b: any) => a.level - b.level) || [];

    return otherLevels.map((level: any) => {
      // 使用层级序号（level.level）来判断是否可选
      const isSelectable = selectableLevelIds.includes(level.level);
      const selectedValue = selectedLevelValues[level.id];
      const levelValues = getLevelValues(level);

      return (
        <div
          key={level.id}
          style={{
            padding: '12px',
            marginBottom: '8px',
            borderRadius: '6px',
            background: isSelectable ? '#f8fafc' : '#f3f4f6',
            border: `1px solid ${isSelectable ? '#e2e8f0' : '#d1d5db'}`,
            opacity: isSelectable ? 1 : 0.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 500, fontSize: '14px', color: isSelectable ? '#1f2937' : '#9ca3af' }}>
              {level.name}
              {!isSelectable && (
                <Tag color="default" style={{ marginLeft: 8, fontSize: 12 }}>
                  不可选
                </Tag>
              )}
            </span>
            {selectedValue && isSelectable && (
              <Button
                type="text"
                size="small"
                danger
                onClick={() => handleLevelValueChange(level.id, null)}
                style={{ padding: '0 4px', fontSize: 12 }}
              >
                删除
              </Button>
            )}
          </div>
          {isSelectable ? (
            <Select
              style={{ width: '100%' }}
              placeholder={`请选择${level.name}`}
              value={selectedValue?.id}
              onChange={(value) => {
                const selectedOption = levelValues.find((v: any) => v.id === value);
                if (selectedOption) {
                  handleLevelValueChange(level.id, selectedOption);
                }
              }}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!isSelectable}
            >
              {levelValues.map((item: any) => (
                <Select.Option key={item.id} value={item.id} label={item.name}>
                  {item.name}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <div style={{ color: isSelectable ? '#6366f1' : '#9ca3af', fontWeight: 500, fontSize: '13px' }}>
              {selectedValue?.name || '未选择'}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        allowClear={allowClear}
        showSearch
        optionFilterProp="label"
        disabled={disabled}
        style={style}
        optionLabelProp="label"
        notFoundContent="无匹配账户"
        className={className}
        open={directOpenCreate ? false : undefined}
        onDropdownVisibleChange={handleDropdownVisibleChange}
        onClick={directOpenCreate ? handleSelectClick : undefined}
        dropdownRender={(menu) => (
          <>
            {menu}
            {showCreateButton && (
              <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleCreateAccount}
                  disabled={disabled}
                  block
                >
                  新建产线账户
                </Button>
              </div>
            )}
          </>
        )}
      >
        {accounts?.map((acc: Account) => (
          <Select.Option key={acc.id} value={acc.id} label={getAccountDisplayName(acc)}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>{getAccountDisplayName(acc)}</span>
            </div>
          </Select.Option>
        ))}
      </Select>

      {/* 创建产线账户对话框 */}
      <Modal
        title="新建产线账户"
        open={accountModalOpen}
        onOk={handleCreateAccountOk}
        onCancel={() => {
          setAccountModalOpen(false);
          setSelectedLevelValues({});
        }}
        confirmLoading={createAccountMutation.isPending}
        width={800}
      >
        {/* 可选层级提示 */}
        {selectableLevelIds.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: '#eff6ff',
              borderRadius: 6,
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ fontSize: 13, color: '#1e40af' }}>
              <span style={{ fontWeight: 600 }}>可选层级： </span>
              {hierarchyLevels
                ?.filter((l: any) => selectableLevelIds.includes(l.level))
                .sort((a: any, b: any) => a.level - b.level)
                .map((level: any) => level.name)
                .join('、')}
            </div>
          </div>
        )}

        {/* 账户路径预览 - 显示所有层级合并结果 */}
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            borderRadius: 8,
            border: '1px solid #c7d2fe',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#4338ca' }}>
                子劳动力账户预览
              </div>
              <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 500, fontFamily: 'monospace' }}>
                {(() => {
                  const allLevels = hierarchyLevels
                    ?.sort((a: any, b: any) => a.level - b.level) || [];

                  const displayParts = allLevels.map((level: any) => {
                    const selectedValue = selectedLevelValues[level.id];
                    return selectedValue?.name || '';
                  }).filter((name: string) => name !== '');

                  return displayParts.join('/') || '尚未选择任何层级';
                })()}
              </div>
            </div>
            <Button
              size="small"
              danger
              onClick={() => setSelectedLevelValues({})}
              disabled={Object.keys(selectedLevelValues).length === 0}
              style={{ borderRadius: 6 }}
            >
              一键清空
            </Button>
          </div>
        </div>

        {/* Tabs 页签：组织 和 其他 */}
        <Tabs
          defaultActiveKey="org"
          items={[
            {
              key: 'org',
              label: (
                <span>
                  <ApartmentOutlined style={{ marginRight: 8 }} />
                  组织
                </span>
              ),
              children: (
                <div style={{ height: 650, overflow: 'auto' }}>
                  {/* 已选择的组织账户显示区域 */}
                  {(() => {
                    const orgLevels = hierarchyLevels
                      ?.filter((l: any) => l.mappingType === 'ORG' || l.mappingType === 'ORG_TYPE')
                      .sort((a: any, b: any) => a.level - b.level) || [];

                    const selectedOrgLevels = orgLevels.filter((level: any) => selectedLevelValues[level.id]);

                    if (selectedOrgLevels.length === 0) return null;

                    // 构建完整的组织账户路径
                    const buildOrgPath = (): string => {
                      const pathParts: string[] = [];

                      selectedOrgLevels.forEach((level: any) => {
                        const selectedValue = selectedLevelValues[level.id];
                        if (selectedValue) {
                          // 构建该组织的完整路径（包含父级）
                          const buildPath = (orgId: number): string => {
                            const org = flattenOrgTree(orgTree || []).find((o: any) => o.id === orgId);
                            if (!org) return '';
                            const parentPath = org.parentId ? buildPath(org.parentId) : '';
                            return parentPath ? `${parentPath}/${org.name}` : org.name;
                          };

                          const fullPath = buildPath(selectedValue.id);
                          // 只添加当前层级选择的组织，不重复父级
                          pathParts.push(fullPath);
                        }
                      });

                      // 去重并合并路径
                      const uniqueParts = Array.from(new Set(pathParts.join('/').split('/'))).join('/');

                      return uniqueParts;
                    };

                    const orgPath = buildOrgPath();

                    // 清空组织类型层级的选中
                    const handleClearOrgSelection = () => {
                      const newValues = { ...selectedLevelValues };
                      orgLevels.forEach((level: any) => {
                        delete newValues[level.id];
                      });
                      setSelectedLevelValues(newValues);
                    };

                    return (
                      <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 15, color: '#1f2937', fontWeight: 500, fontFamily: 'monospace', flex: 1 }}>
                            {orgPath || '尚未选择组织账户'}
                          </div>
                          <Button
                            size="small"
                            danger
                            onClick={handleClearOrgSelection}
                            style={{ marginLeft: 12, borderRadius: 6 }}
                          >
                            清空
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 搜索框 */}
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="搜索组织..."
                      prefix={<SearchOutlined />}
                      value={orgSearchText}
                      onChange={(e) => setOrgSearchText(e.target.value)}
                      allowClear
                    />
                  </div>

                  {/* 组织架构树 */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#ffffff', minHeight: 500 }}>
                    <Tree
                      treeData={buildOrgTreeData(filterOrgTree(orgTree || [], orgSearchText))}
                      defaultExpandAll
                      showLine
                      onSelect={(keys, info) => {
                        if (info.node.data && !info.node.disabled) {
                          const orgType = info.node.data.type;
                          const level = hierarchyLevels?.find((l: any) => l.mappingValue === orgType);
                          if (level) {
                            handleLevelValueChange(level.id, info.node.data);
                          }
                        }
                      }}
                      style={{ background: 'transparent' }}
                      titleRender={(nodeData: any) => {
                        const isDisabled = nodeData.disabled;
                        const orgType = nodeData.data?.type;
                        const level = hierarchyLevels?.find((l: any) => l.mappingValue === orgType);
                        const isSelectable = level ? selectableLevelIds.includes(level.level) : false;
                        const selectedValue = level ? selectedLevelValues[level.id] : null;
                        const isSelected = selectedValue?.id === nodeData.data?.id;

                        return (
                          <span
                            style={{
                              color: isDisabled ? '#d1d5db' : isSelected ? '#6366f1' : undefined,
                              fontWeight: isSelected ? 600 : 400,
                              cursor: isDisabled || !isSelectable ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {nodeData.title}
                          </span>
                        );
                      }}
                    />
                  </div>
                </div>
              ),
            },
            ...(showOtherTab ? [{
              key: 'other',
              label: (
                <span>
                  <ApartmentOutlined style={{ marginRight: 8 }} />
                  其他
                </span>
              ),
              children: (
                <div style={{ height: 650 }}>
                  {/* 已选择的其他账户路径显示 - 横跨整个宽度 */}
                  {(() => {
                    const otherLevels = hierarchyLevels
                      ?.filter((l: any) => l.mappingType?.startsWith('FIELD_') || l.mappingType?.startsWith('CUSTOM_'))
                      .sort((a: any, b: any) => a.level - b.level) || [];

                    const selectedOtherLevels = otherLevels.filter((level: any) => selectedLevelValues[level.id]);

                    if (selectedOtherLevels.length === 0) return null;

                    const otherPath = selectedOtherLevels
                      .map((level: any) => selectedLevelValues[level.id]?.name)
                      .filter((name: string) => name)
                      .join('/');

                    // 清空其他类型层级的选中
                    const handleClearOtherSelection = () => {
                      const newValues = { ...selectedLevelValues };
                      otherLevels.forEach((level: any) => {
                        delete newValues[level.id];
                      });
                      setSelectedLevelValues(newValues);
                    };

                    return (
                      <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 15, color: '#1f2937', fontWeight: 500, fontFamily: 'monospace', flex: 1 }}>
                            {otherPath || '尚未选择其他层级'}
                          </div>
                          <Button
                            size="small"
                            danger
                            onClick={handleClearOtherSelection}
                            style={{ marginLeft: 12, borderRadius: 6 }}
                          >
                            清空
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 左右分栏布局 */}
                  <div style={{ display: 'flex', gap: 24, height: 'calc(100% - 80px)' }}>
                    {/* 左侧：层级字段列表 */}
                    <div style={{ width: 280, borderRight: '1px solid #e2e8f0', paddingRight: 24, overflow: 'auto' }}>
                      <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15, color: '#6366f1' }}>
                        层级字段
                      </div>
                      {(() => {
                        const otherLevels = hierarchyLevels
                          ?.filter((l: any) => l.mappingType?.startsWith('FIELD_') || l.mappingType?.startsWith('CUSTOM_'))
                          .sort((a: any, b: any) => a.level - b.level) || [];

                        return otherLevels.map((level: any) => {
                          const isSelectable = selectableLevelIds.includes(level.level);
                          const selectedValue = selectedLevelValues[level.id];
                          const isActive = currentOtherLevelId === level.id;

                          return (
                            <div
                              key={level.id}
                              onClick={() => isSelectable && setCurrentOtherLevelId(level.id)}
                              style={{
                                padding: '12px',
                                marginBottom: '8px',
                                borderRadius: '6px',
                                background: isActive ? '#eef2ff' : '#ffffff',
                                border: `1px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                                cursor: isSelectable ? 'pointer' : 'not-allowed',
                                opacity: isSelectable ? 1 : 0.5,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontWeight: 500, fontSize: '14px', color: isSelectable ? '#1f2937' : '#9ca3af' }}>
                                  {level.name}
                                </div>
                                {selectedValue && isSelectable && (
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLevelValueChange(level.id, null);
                                    }}
                                    style={{ padding: '0 4px', fontSize: 12 }}
                                  >
                                    清空
                                  </Button>
                                )}
                              </div>
                              {selectedValue && (
                                <div style={{ fontSize: 12, color: '#6366f1' }}>
                                  ✓ {selectedValue.name}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* 右侧：层级选择值列表 */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      {currentOtherLevelId ? (
                        (() => {
                          const currentLevel = hierarchyLevels?.find((l: any) => l.id === currentOtherLevelId);
                          if (!currentLevel) return null;

                          const levelValues = getLevelValues(currentLevel);
                          const selectedValue = selectedLevelValues[currentOtherLevelId];

                          // 过滤层级明细
                          const filteredLevelValues = levelValues.filter((item: any) =>
                            item.name?.toLowerCase().includes(otherSearchText.toLowerCase())
                          );

                          return (
                            <>
                              <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15, color: '#6366f1' }}>
                                {currentLevel.name} - 选择值
                              </div>
                              {/* 搜索框 */}
                              <div style={{ marginBottom: 16 }}>
                                <Input
                                  placeholder="搜索层级明细..."
                                  prefix={<SearchOutlined />}
                                  value={otherSearchText}
                                  onChange={(e) => setOtherSearchText(e.target.value)}
                                  allowClear
                                />
                              </div>
                              <div>
                                {filteredLevelValues.length === 0 ? (
                                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 32 }}>
                                    未找到匹配的层级明细
                                  </div>
                                ) : (
                                  filteredLevelValues.map((item: any) => {
                                    const isSelected = selectedValue?.id === item.id;
                                    return (
                                      <div
                                        key={item.id}
                                        onClick={() => handleLevelValueChange(currentOtherLevelId, item)}
                                        style={{
                                          padding: '12px 16px',
                                          marginBottom: '8px',
                                          borderRadius: '8px',
                                          border: '1px solid #e2e8f0',
                                          background: isSelected ? '#eef2ff' : '#ffffff',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          ...(isSelected ? { borderColor: '#6366f1', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)' } : {}),
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = isSelected ? '#eef2ff' : '#f8fafc';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = isSelected ? '#eef2ff' : '#ffffff';
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>
                                            {item.name}
                                          </div>
                                          {isSelected && (
                                            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                                              ✓
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
                          请从左侧选择一个层级字段
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ),
            }] : []),
          ]}
        />
      </Modal>
    </>
  );
};

export default LineAccountSelect;

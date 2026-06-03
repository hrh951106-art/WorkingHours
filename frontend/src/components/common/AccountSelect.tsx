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
  type: string;
  level: number;
  createdAt: string;
  [key: string]: any;
}

interface AccountSelectProps {
  value?: number | number[] | null;
  onChange?: (value: number | number[] | null, account?: Account | Account[]) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  className?: string;
  showCreateButton?: boolean;
  onAccountCreated?: (accountId: number) => void;
  // 仅编辑模式需要的props
  segmentAccountIds?: number[];
  isEdit?: boolean;
  // 用途类型过滤：SHIFT-排班/班次转移, DEVICE-设备绑定, PUNCH-打卡记录
  usageType?: 'SHIFT' | 'DEVICE' | 'PUNCH' | null;
  // 多选模式
  mode?: 'multiple' | 'tags';
  // 外部传入的账户列表（优先使用）
  externalAccounts?: Account[];
  /** 是否显示"其他"页签，默认显示 */
  showOtherTab?: boolean;
}

const AccountSelect: React.FC<AccountSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '选择子账户',
  allowClear = true,
  style,
  className,
  showCreateButton = true,
  onAccountCreated,
  segmentAccountIds = [],
  isEdit = false,
  usageType = null,
  mode,
  externalAccounts,
  showOtherTab = true,
}) => {
  const queryClient = useQueryClient();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  const [selectedLevelValues, setSelectedLevelValues] = useState<Record<number, any>>({});
  const [currentOtherLevelId, setCurrentOtherLevelId] = useState<number | null>(null);
  const [orgSearchText, setOrgSearchText] = useState('');
  const [otherSearchText, setOtherSearchText] = useState('');

  // 获取最近创建的5个子劳动力账户，按usageType过滤
  const { data: recentAccounts, refetch: refetchRecentAccounts, isLoading: isLoadingRecent, error: recentError } = useQuery({
    queryKey: ['recent-accounts', usageType],
    queryFn: () => {
      console.log('[AccountSelect] 正在获取账户列表...', { usageType });
      return request.get('/account/accounts', {
        params: {
          type: 'SUB',
          usageType,
          pageSize: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }).then((res: any) => {
        console.log('[AccountSelect] API返回:', res);
        const items = res?.items || [];
        console.log('[AccountSelect] 提取的账户列表:', items);
        return items;
      }).catch((error) => {
        console.error('[AccountSelect] 获取账户失败:', error);
        throw error;
      });
    },
    staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜，不会重新请求
    gcTime: 10 * 60 * 1000, // 10分钟后清理缓存
    refetchOnMount: false, // 组件挂载时不会总是重新查询
    refetchOnWindowFocus: false, // 窗口聚焦时不重新查询
  });

  // 在编辑模式下，收集当前班次所有segments中的accountId，并查询这些账户
  const { data: segmentAccounts } = useQuery({
    queryKey: ['segment-accounts', segmentAccountIds],
    queryFn: async () => {
      if (segmentAccountIds.length === 0) return [];
      // 批量查询账户详情
      const accountPromises = segmentAccountIds.map((id: number) =>
        request.get(`/account/accounts/${id}`).catch(() => null)
      );
      const results = await Promise.all(accountPromises);
      return results.filter((acc: any) => acc != null);
    },
    enabled: isEdit && segmentAccountIds.length > 0,
  });

  // 合并最近账户和segments关联的账户，去重
  const accounts = useMemo(() => {
    // 优先使用外部传入的账户列表
    if (externalAccounts && externalAccounts.length > 0) {
      console.log('[AccountSelect] 使用外部传入的账户列表:', externalAccounts);
      return externalAccounts;
    }

    const allAccounts = [...(recentAccounts || []), ...(segmentAccounts || [])];
    console.log('[AccountSelect] 合并前的账户列表:', { recentAccounts, segmentAccounts, allAccounts });

    // 使用 namePath 去重，如果 namePath 相同则只保留一个
    const uniqueAccounts = Array.from(
      new Map(allAccounts.map((acc: Account) => {
        // 优先使用 namePath 作为去重键，如果为空则使用 id
        const dedupeKey = acc.namePath || acc.path || String(acc.id);
        return [dedupeKey, acc];
      })).values()
    );
    console.log('[AccountSelect] 去重后的账户列表:', uniqueAccounts);

    // 按创建时间倒序排序，最近创建的在前
    const sortedAccounts = uniqueAccounts.sort((a: Account, b: Account) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    console.log('[AccountSelect] 最终的账户列表:', sortedAccounts);
    return sortedAccounts;
  }, [recentAccounts, segmentAccounts, externalAccounts]);

  // 获取层级配置（包含层级明细）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-levels-with-details'],
    queryFn: () => request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 获取组织架构树
  const { data: orgTree } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 获取人事信息配置
  const { data: employeeInfoConfigs } = useQuery({
    queryKey: ['employee-info-configs'],
    queryFn: () => request.get('/hr/employee-info-configs').then((res: any) => res || []),
  });

  // 获取自定义字段配置
  const { data: customFields } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 创建子劳动力账户
  const createAccountMutation = useMutation({
    mutationFn: (data: any) => request.post('/account/accounts', data),
    onSuccess: async (response: any) => {
      const newAccount = response.data || response;
      message.success('创建成功');
      setAccountModalOpen(false);
      accountForm.resetFields();
      setSelectedLevelValues({});
      // 刷新账户列表并等待完成
      queryClient.invalidateQueries({ queryKey: ['recent-accounts'] });
      await refetchRecentAccounts();
      // 自动选中刚创建的账户
      if (onChange) {
        onChange(newAccount.id);
      }
      // 调用外部回调
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

    // 检查是否有 hierarchyValues（包含层级详细信息）
    let hierarchyValuesData: any[] = [];
    if (acc.hierarchyValues) {
      // hierarchyValues 可能是 JSON 字符串或数组
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
      // 按层级序号排序所有层级配置
      const sortedLevels = [...hierarchyLevels].sort((a: any, b: any) => a.level - b.level);

      // 为每个层级构建显示值
      const displayParts = sortedLevels.map((level: any) => {
        // 从 hierarchyValues 中找到对应层级的值
        const hv = hierarchyValuesData.find((h: any) => h.levelId === level.id || h.level === level.level);
        return hv?.selectedValue?.name || '';
      });

      // 用 "/" 连接，空层级自动形成 //
      return displayParts.join('/');
    }

    // 如果没有 hierarchyValues，使用 namePath
    if (acc.namePath) {
      // 标准化分隔符：统一使用 / 而不是 ' / '
      let displayName = acc.namePath;
      displayName = displayName.replace(/\s*\/\s*/g, '/');
      return displayName;
    }

    // 最后使用 path 或 name
    return (acc.name || acc.path || '').replace(/\s*\/\s*/g, '/');
  };

  // 处理账户选择变更
  const handleSelectChange = (value: number | number[] | null) => {
    if (onChange) {
      // 如果是单选，返回选中的完整账户对象
      if (!mode && typeof value === 'number') {
        const account = accounts.find((acc: Account) => acc.id === value);
        onChange(value, account);
      }
      // 如果是多选，返回所有选中的完整账户对象
      else if (mode && Array.isArray(value)) {
        const selectedAccounts = value.map((id: number) =>
          accounts.find((acc: Account) => acc.id === id)
        ).filter((acc: Account | undefined) => acc !== undefined);
        onChange(value, selectedAccounts);
      }
      // 清空选择
      else {
        onChange(value, undefined);
      }
    }
  };

  // 处理创建账户
  const handleCreateAccount = () => {
    setSelectedLevelValues({});
    setAccountModalOpen(true);
  };

  const handleCreateAccountOk = async () => {
    try {
      // 检查是否至少选择了一个层级值
      const selectedValues = Object.values(selectedLevelValues).filter(v => v !== undefined && v !== null);
      if (selectedValues.length === 0) {
        message.warning('请至少选择一个层级值');
        return;
      }

      // 构建账户数据
      const accountData: any = {
        code: `AUTO-${Date.now()}`,
        name: selectedValues.map((v: any) => v?.name || v?.label || v).join('/'),
        type: 'SUB',
        level: Object.keys(selectedLevelValues).length,
        path: selectedValues.map((v: any) => v?.code || v?.value || v).join('/'),
        usageType: usageType || 'SHIFT', // 添加用途类型，默认为SHIFT
      };

      // 根据层级配置构建账户
      const orgLevels = hierarchyLevels?.filter((l: any) => l.mappingType === 'ORG' || l.mappingType === 'ORG_TYPE') || [];
      const otherLevels = hierarchyLevels?.filter((l: any) => l.mappingType !== 'ORG' && l.mappingType !== 'ORG_TYPE') || [];

      const allLevels = [...orgLevels, ...otherLevels];

      // 按层级序号排序
      allLevels.sort((a: any, b: any) => a.level - b.level);

      // 设置父级账户（找到上一层级的账户）
      for (let i = allLevels.length - 1; i > 0; i--) {
        const levelValue = selectedLevelValues[allLevels[i].id];
        if (levelValue) {
          accountData.parentId = levelValue.accountId;
          break;
        }
      }

      // 构建 path（层级代码路径）- 必须包含所有层级，未选择的用空字符串占位
      const pathParts = allLevels.map((level: any) => {
        const selectedValue = selectedLevelValues[level.id];
        return selectedValue?.code || '';
      });
      // 用 "/" 连接所有层级，未选择的显示为空（会自动形成//）
      accountData.path = pathParts.join('/');

      // 构建 namePath（层级名称路径）
      // 为所有层级（包括未选择的）构建显示路径
      const namePathParts = allLevels.map((level: any) => {
        const selectedValue = selectedLevelValues[level.id];
        return selectedValue?.name || '';
      });

      // 用 "/" 连接所有层级，未选择的显示为空（会自动形成//）
      accountData.namePath = namePathParts.join('/');

      // 构建 hierarchyValues（保存完整的层级选择信息，用于后续重建完整显示）
      const hierarchyValues = allLevels.map((level: any) => {
        const selectedValue = selectedLevelValues[level.id];
        return {
          levelId: level.id,
          level: level.level,
          name: level.name,
          mappingType: level.mappingType,
          mappingValue: level.mappingValue,
          selectedValue: selectedValue ? {
            id: selectedValue.id,
            name: selectedValue.name,
            code: selectedValue.code,
            type: selectedValue.type,
          } : null,
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
    // 组织类型：返回组织树（保持原有逻辑，需要树形结构和父子关系）
    if (level.mappingType === 'ORG' || level.mappingType === 'ORG_TYPE') {
      return flattenOrgTree(orgTree || []);
    }
    // 自定义字段类型：从层级明细中获取（确保数据一致性）
    // mappingType 可能是 "FIELD_XXX" 或 "CUSTOM_XXX" 格式
    else if (level.mappingType?.startsWith('FIELD_') || level.mappingType?.startsWith('CUSTOM_')) {
      // ✅ 修复：使用 details 字段而不是 levelDetails
      if (level.details && Array.isArray(level.details)) {
        return level.details
          .filter((detail: any) => detail.status === 'ACTIVE')
          .map((detail: any) => ({
            id: detail.id,  // ✅ 修复：使用 id 而不是 optionId
            name: detail.levelName,  // ✅ 修复：使用 levelName 而不是 optionLabel
            code: detail.levelCode,  // ✅ 修复：使用 levelCode 而不是 optionCode
            value: detail.id,  // ✅ 修复：使用 id 而不是 optionId
            label: detail.levelName,  // ✅ 修复：使用 levelName 而不是 optionLabel
          }));
      }
      return [];
    }
    // 人事信息类型：保持原有逻辑
    else if (level.mappingType === 'EMPLOYEE_INFO') {
      const config = employeeInfoConfigs?.find((c: any) => c.field === level.mappingValue);
      if (config?.options) {
        return config.options;
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

  // 在组织树中通过 ID 查找节点（包含父子关系）
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

  // 处理层级值选择
  const handleLevelValueChange = (levelId: number, value: any) => {
    setSelectedLevelValues((prev) => {
      const newValues = { ...prev };

      // 如果是清空操作（value 为 null），删除该层级
      if (value === null || value === undefined) {
        delete newValues[levelId];
        return newValues;
      }

      // 获取当前层级配置
      const level = hierarchyLevels?.find((l: any) => l.id === levelId);

      // 验证自定义字段类型选择的值是否在层级明细中
      if (level && (level.mappingType?.startsWith('FIELD_') || level.mappingType?.startsWith('CUSTOM_'))) {
        // ✅ 修复：使用 details 字段而不是 levelDetails
        const isInDetails = level.details?.some((detail: any) =>
          detail.status === 'ACTIVE' && detail.id === value.id  // ✅ 修复：使用 id 而不是 optionId
        );

        if (!isInDetails) {
          message.warning(`选择的值不在${level.name}的层级明细中，请先刷新层级明细`);
          return prev;
        }
      }

      // 如果是组织类型，选择某个节点时，自动带上其所有父级节点
      if ((level?.mappingType === 'ORG' || level?.mappingType === 'ORG_TYPE') && value) {
        // 通过 parentId 在组织树中递归查找所有父级节点
        let currentNodeId = value.parentId;
        let levelCount = 0;
        const maxLevel = 10; // 防止无限循环

        while (currentNodeId && levelCount < maxLevel) {
          // 在组织树中查找父节点
          const parentNode = findOrgNodeById(orgTree || [], currentNodeId);

          if (!parentNode) break;

          // 找到父节点对应的层级配置
          const parentLevel = hierarchyLevels?.find((l: any) => l.mappingValue === parentNode.type);

          if (parentLevel) {
            newValues[parentLevel.id] = {
              id: parentNode.id,
              name: parentNode.name,
              code: parentNode.code,
              type: parentNode.type,
            };

            // 继续向上查找
            currentNodeId = parentNode.parentId;
            levelCount++;
          } else {
            break;
          }
        }
      }

      // 设置当前选择的值
      newValues[levelId] = value;
      return newValues;
    });
  };

  // 构建组织树数据（带父子关系）
  const buildOrgTreeData = (orgs: any[]): any[] => {
    if (!orgs || orgs.length === 0) return [];

    const buildNode = (org: any): any => {
      const node = {
        ...org,
        key: org.id,
        title: org.name,
        value: org.id,
        data: org,
        children: org.children ? org.children.map(buildNode) : [],
      };
      return node;
    };

    return orgs.map(buildNode);
  };

  return (
    <>
      {/* Select 和新建按钮 */}
      {!showCreateButton ? (
        <Select
          value={value}
          onChange={handleSelectChange}
          placeholder={placeholder}
          allowClear={allowClear}
          showSearch
          optionFilterProp="label"
          disabled={disabled || isLoadingRecent}
          style={style}
          optionLabelProp="label"
          notFoundContent={recentError ? `加载失败: ${recentError.message}` : (isLoadingRecent ? '加载中...' : '无匹配账户')}
          className={className}
          mode={mode}
          status={recentError ? 'error' : undefined}
        >
          {accounts?.map((acc: Account) => (
            <Select.Option
              key={acc.id}
              value={acc.id}
              label={getAccountDisplayName(acc)}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{getAccountDisplayName(acc)}</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      ) : (
        <Select
          value={value}
          onChange={handleSelectChange}
          placeholder={placeholder}
          allowClear={allowClear}
          showSearch
          optionFilterProp="label"
          disabled={disabled || isLoadingRecent}
          style={style}
          optionLabelProp="label"
          notFoundContent={recentError ? `加载失败: ${recentError.message}` : (isLoadingRecent ? '加载中...' : '无匹配账户')}
          className={className}
          mode={mode}
          status={recentError ? 'error' : undefined}
          dropdownRender={(menu) => (
            <>
              {menu}
              <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleCreateAccount}
                  disabled={disabled}
                  block
                >
                  新建子劳动力账户
                </Button>
              </div>
            </>
          )}
        >
          {accounts?.map((acc: Account) => (
            <Select.Option
              key={acc.id}
              value={acc.id}
              label={getAccountDisplayName(acc)}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{getAccountDisplayName(acc)}</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      )}

      {/* 创建子劳动力账户对话框 */}
      <Modal
        title="新建子劳动力账户"
        open={accountModalOpen}
        onOk={handleCreateAccountOk}
        onCancel={() => {
          setAccountModalOpen(false);
          setSelectedLevelValues({});
        }}
        confirmLoading={createAccountMutation.isPending}
        width={1000}
      >
        {/* 账户路径预览 */}
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
                        if (info.node.data) {
                          const orgType = info.node.data.type;
                          const level = hierarchyLevels?.find((l: any) => l.mappingValue === orgType);
                          if (level) {
                            handleLevelValueChange(level.id, info.node.data);
                          }
                        }
                      }}
                      style={{ background: 'transparent' }}
                      titleRender={(nodeData: any) => {
                        const orgType = nodeData.data?.type;
                        const level = hierarchyLevels?.find((l: any) => l.mappingValue === orgType);
                        const selectedValue = level ? selectedLevelValues[level.id] : null;
                        const isSelected = selectedValue?.id === nodeData.data?.id;

                        return (
                          <span
                            style={{
                              color: isSelected ? '#6366f1' : undefined,
                              fontWeight: isSelected ? 600 : 400,
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
                          const selectedValue = selectedLevelValues[level.id];
                          const isActive = currentOtherLevelId === level.id;

                          return (
                            <div
                              key={level.id}
                              onClick={() => setCurrentOtherLevelId(level.id)}
                              style={{
                                padding: '12px',
                                marginBottom: '8px',
                                borderRadius: '6px',
                                background: isActive ? '#eef2ff' : '#ffffff',
                                border: `1px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontWeight: 500, fontSize: '14px', color: '#1f2937' }}>
                                  {level.name}
                                </div>
                                {selectedValue && (
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

export default AccountSelect;

import { useMemo, useState } from 'react';
import { Select, Button, Tag, message, Modal, Form, Tree } from 'antd';
import { PlusOutlined, ApartmentOutlined } from '@ant-design/icons';
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
  value?: number | null;
  onChange?: (value: number | null) => void;
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
}) => {
  const queryClient = useQueryClient();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  const [selectedLevelValues, setSelectedLevelValues] = useState<Record<number, any>>({});

  // 获取最近创建的5个子劳动力账户，按usageType过滤
  const { data: recentAccounts, refetch: refetchRecentAccounts } = useQuery({
    queryKey: ['recent-accounts', usageType],
    queryFn: () => request.get('/account/accounts', {
      params: {
        type: 'SUB',
        usageType,
        pageSize: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    }).then((res: any) => res.items || []),
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
    const allAccounts = [...(recentAccounts || []), ...(segmentAccounts || [])];
    const uniqueAccounts = Array.from(
      new Map(allAccounts.map((acc: Account) => [acc.id, acc])).values()
    );
    // 按创建时间倒序排序，最近创建的在前
    return uniqueAccounts.sort((a: Account, b: Account) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [recentAccounts, segmentAccounts]);

  // 获取层级配置
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () => request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
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
      const orgLevels = hierarchyLevels?.filter((l: any) => l.mappingType === 'ORG_TYPE') || [];
      const otherLevels = hierarchyLevels?.filter((l: any) => l.mappingType !== 'ORG_TYPE') || [];

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
    if (level.mappingType === 'ORG_TYPE') {
      // 组织类型，返回组织树
      return flattenOrgTree(orgTree || []);
    } else if (level.mappingType === 'EMPLOYEE_INFO') {
      // 人事信息类型，返回对应字段的所有值
      const config = employeeInfoConfigs?.find((c: any) => c.field === level.mappingValue);
      if (config?.options) {
        return config.options;
      }
      return [];
    } else if (level.mappingType?.startsWith('CUSTOM_')) {
      // 自定义字段类型，从 customFields 中查找对应的字段配置
      const fieldCode = level.mappingType.replace('CUSTOM_', '');
      const field = customFields?.find((f: any) => f.code === fieldCode);

      if (field?.dataSource?.options) {
        // 转换选项格式为需要的格式 {id, label/name, value/code}
        const options = field.dataSource.options.map((opt: any) => ({
          id: opt.value,
          name: opt.label,
          value: opt.value,
          label: opt.label,
          code: opt.value,
        }));
        return options;
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

      // 如果是组织类型，选择某个节点时，自动带上其所有父级节点
      const level = hierarchyLevels?.find((l: any) => l.id === levelId);

      if (level?.mappingType === 'ORG_TYPE' && value) {
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
                  // 获取所有组织类型的层级，按层级序号排序
                  const orgLevels = hierarchyLevels
                    ?.filter((l: any) => l.mappingType === 'ORG_TYPE')
                    .sort((a: any, b: any) => a.level - b.level) || [];

                  // 生成显示数组，每个层级都显示
                  const displayParts = orgLevels.map((level: any) => {
                    const selectedValue = selectedLevelValues[level.id];
                    return selectedValue?.name || '';
                  });

                  // 获取非组织类型的层级
                  const otherLevels = hierarchyLevels
                    ?.filter((l: any) => l.mappingType !== 'ORG_TYPE')
                    .sort((a: any, b: any) => a.level - b.level) || [];

                  const otherDisplayParts = otherLevels.map((level: any) => {
                    const selectedValue = selectedLevelValues[level.id];
                    return selectedValue?.name || '';
                  });

                  // 合并组织类型和非组织类型的层级
                  const allParts = [...displayParts, ...otherDisplayParts];

                  // 用 "/" 连接所有层级，未选择的显示为空（会自动形成//）
                  return allParts.join('/');
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

        <div style={{ display: 'flex', gap: 24, height: 550 }}>
          {/* 左侧：所有层级列表 + 组织树 */}
          <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 组织架构部分 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 15, color: '#6366f1' }}>
                <ApartmentOutlined style={{ marginRight: 8 }} />
                组织架构选择
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginTop: 4 }}>
                  （选择节点自动带出父级）
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <Tree
                  treeData={buildOrgTreeData(orgTree || [])}
                  defaultExpandAll
                  showLine
                  onSelect={(keys, info) => {
                    if (info.node.data) {
                      // 找到对应的组织层级配置
                      const orgType = info.node.data.type;
                      const level = hierarchyLevels?.find((l: any) => l.mappingValue === orgType);
                      if (level) {
                        handleLevelValueChange(level.id, info.node.data);
                      }
                    }
                  }}
                  style={{ background: 'transparent' }}
                />
              </div>
            </div>

            {/* 已选择的层级 */}
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                已选择的层级
              </div>
              {hierarchyLevels
                ?.filter((l: any) => l.mappingType === 'ORG_TYPE')
                .map((level: any) => (
                  <div
                    key={level.id}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 4,
                      borderRadius: 6,
                      background: selectedLevelValues[level.id] ? '#eef2ff' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{level.name}:</span>
                    <span style={{ marginLeft: 8, color: selectedLevelValues[level.id] ? '#6366f1' : '#94a3b8', flex: 1 }}>
                      {selectedLevelValues[level.id]?.name || '未选择'}
                    </span>
                    {selectedLevelValues[level.id] && (
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
                ))}
            </div>
          </div>

          {/* 右侧：非组织类型层级选择 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15 }}>
              其他层级字段
            </div>

            {hierarchyLevels
              ?.filter((l: any) => l.mappingType !== 'ORG_TYPE')
              .map((level: any) => (
                <div key={level.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>
                      {level.name}
                    </span>
                    {selectedLevelValues[level.id] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color="blue">
                          {selectedLevelValues[level.id]?.name}
                        </Tag>
                        <Button
                          type="text"
                          size="small"
                          danger
                          onClick={() => handleLevelValueChange(level.id, null)}
                          style={{ padding: '0 4px', fontSize: 12 }}
                        >
                          删除
                        </Button>
                      </div>
                    )}
                  </div>
                  <Select
                    showSearch
                    allowClear
                    placeholder={`请选择${level.name}`}
                    value={selectedLevelValues[level.id]?.id}
                    onChange={(value) => {
                      const option = getLevelValues(level).find((v: any) => v.id === value);
                      if (option) {
                        handleLevelValueChange(level.id, option);
                      } else {
                        handleLevelValueChange(level.id, null);
                      }
                    }}
                    style={{ width: '100%' }}
                    options={getLevelValues(level).map((v: any) => ({
                      label: v.label || v.name,
                      value: v.id,
                    }))}
                  />
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AccountSelect;

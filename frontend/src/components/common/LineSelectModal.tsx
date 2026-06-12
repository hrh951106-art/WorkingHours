import { useState, useMemo, useEffect } from 'react';
import { Modal, Tabs, Tree, Checkbox, Input, Button, Space, Tag, Empty, List } from 'antd';
import { ApartmentOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

const { TabPane } = Tabs;

interface LevelOption {
  id: number;
  name: string;
  code: string;
  value: number;
  label: string;
}

interface HierarchyLevel {
  id: number;
  name: string;
  level: number;
  status: string;
  details?: Array<{
    id: number;
    levelName: string;
    levelCode: string;
    status: string;
  }>;
}

interface OrganizationNode {
  id: number;
  name: string;
  key: string;
  title: string;
  value: number;
  children?: OrganizationNode[];
}

interface LineSelectModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (selectedOrgs: number[], selectedLevels: Record<number, LevelOption[]>) => void;
  selectedOrgIds?: number[];
  selectedLevels?: Record<number, LevelOption[]>;
  width?: number;
}

const LineSelectModal: React.FC<LineSelectModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  selectedOrgIds = [],
  selectedLevels = {},
  width = 1000,
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'org' | 'other'>('org');
  const [orgCheckedKeys, setOrgCheckedKeys] = useState<React.Key[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [levelSelections, setLevelSelections] = useState<Record<number, LevelOption[]>>({});
  const [orgSearchText, setOrgSearchText] = useState('');
  const [levelSearchText, setLevelSearchText] = useState('');

  // 初始化选中状态
  useEffect(() => {
    if (visible) {
      setOrgCheckedKeys(selectedOrgIds.map(String));
      setLevelSelections(selectedLevels);
      setOrgSearchText('');
      setLevelSearchText('');
      setSelectedLevelId(null);
    }
  }, [visible, selectedOrgIds, selectedLevels]);

  // 获取组织架构树
  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: async () => {
      const res = await request.get('/hr/organizations/tree');
      return res || [];
    },
    enabled: visible,
  });

  // 获取层级配置
  const { data: hierarchyLevels = [] } = useQuery({
    queryKey: ['hierarchy-levels-with-details'],
    queryFn: () => request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
    enabled: visible,
  });

  // 按层级序号排序，并过滤掉组织类型的层级
  const sortedLevels = useMemo(() => {
    if (!hierarchyLevels) return [];
    return [...hierarchyLevels]
      .filter((level: any) => level.mappingType !== 'ORG')  // 过滤掉组织类型的层级（工厂、车间、产线等）
      .sort((a: any, b: any) => a.level - b.level);
  }, [hierarchyLevels]);

  // 获取层级配置的显示值
  const getLevelValues = (level: HierarchyLevel): LevelOption[] => {
    if (level.details && Array.isArray(level.details)) {
      const activeDetails = level.details.filter((detail: any) => detail.status === 'ACTIVE');
      return activeDetails.map((detail: any) => ({
        id: detail.id,
        name: detail.levelName,
        code: detail.levelCode,
        value: detail.id,
        label: detail.levelName,
      }));
    }
    return [];
  };

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

  // 转换为Tree需要的数据格式
  const convertToTreeData = (nodes: any[]): any[] => {
    return nodes.map((node) => ({
      title: node.name,
      value: node.id,
      key: `${node.id}`,
      children: node.children ? convertToTreeData(node.children) : undefined,
    }));
  };

  const treeData = useMemo(() => {
    if (!orgTree || orgTree.length === 0) return [];
    const filteredTree = filterOrgTree(orgTree, orgSearchText);
    return convertToTreeData(filteredTree);
  }, [orgTree, orgSearchText]);

  // 处理组织树选择变化
  const handleOrgTreeCheck = (checkedKeysValue: any) => {
    let keys: React.Key[] = [];
    if (Array.isArray(checkedKeysValue)) {
      keys = checkedKeysValue;
    } else if (checkedKeysValue && typeof checkedKeysValue === 'object') {
      keys = checkedKeysValue.checked || [];
    }
    setOrgCheckedKeys(keys);
  };

  // 处理层级选项选择
  const handleLevelCheckboxChange = (levelId: number, option: LevelOption, checked: boolean) => {
    const currentSelected = Array.from(levelSelections[levelId] || []);
    let newSelected: LevelOption[];

    if (checked) {
      newSelected = [...currentSelected, option];
    } else {
      newSelected = currentSelected.filter((item: LevelOption) => item.id !== option.id);
    }

    setLevelSelections((prev) => ({
      ...prev,
      [levelId]: newSelected,
    }));
  };

  // 全选/取消全选层级选项
  const handleSelectAllLevelOptions = (levelId: number, levelOptions: LevelOption[], selectAll: boolean) => {
    setLevelSelections((prev) => ({
      ...prev,
      [levelId]: selectAll ? levelOptions : [],
    }));
  };

  // 清空某个层级的选择
  const handleClearLevel = (levelId: number) => {
    setLevelSelections((prev) => ({
      ...prev,
      [levelId]: [],
    }));
  };

  // 获取层级选中数量
  const getSelectedCount = (levelId: number) => {
    return (levelSelections[levelId] || []).length;
  };

  // 确认选择
  const handleConfirm = () => {
    const selectedOrgIds = orgCheckedKeys.map((key) => Number(key));
    onConfirm(selectedOrgIds, levelSelections);
  };

  // 取消弹窗
  const handleCancel = () => {
    setOrgCheckedKeys(selectedOrgIds.map(String));
    setLevelSelections(selectedLevels);
    onCancel();
  };

  return (
    <Modal
      title="选择"
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      width={width}
      okText="确定"
      cancelText="取消"
      destroyOnClose
      centered
      styles={{
        body: {
          padding: '24px 12px'
        },
        footer: {
          height: '64px',
          borderTop: '1px solid #f0f0f0',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
        }
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'org' | 'other')}
        style={{ marginTop: 16 }}
      >
        {/* 组织页签 */}
        <TabPane tab="组织" key="org">
          <div style={{ padding: '16px 0' }}>
            {/* 搜索框 */}
            <Input
              placeholder="搜索组织..."
              prefix={<SearchOutlined />}
              value={orgSearchText}
              onChange={(e) => setOrgSearchText(e.target.value)}
              allowClear
              style={{ marginBottom: 16 }}
            />

            {/* 组织树 */}
            {orgLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                加载中...
              </div>
            ) : treeData.length === 0 ? (
              <Empty description="暂无组织数据" style={{ marginTop: 40 }} />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                <Tree
                  checkable
                  checkStrictly
                  checkedKeys={orgCheckedKeys}
                  onCheck={handleOrgTreeCheck}
                  treeData={treeData}
                  defaultExpandAll
                  showSearch={false}
                />
              </div>
            )}
          </div>
        </TabPane>

        {/* 其他页签 */}
        <TabPane tab="其他" key="other">
          <div style={{ height: 480 }}>
            <div style={{ display: 'flex', height: '100%', border: '1px solid #f0f0f0', borderRadius: 6 }}>
              {/* 左侧：层级列表 */}
              <div
                style={{
                  width: 240,
                  borderRight: '1px solid #f0f0f0',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>
                  <ApartmentOutlined style={{ marginRight: 8 }} />
                  层级列表
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <List
                    dataSource={sortedLevels}
                    renderItem={(level: any) => {
                      const selectedCount = getSelectedCount(level.id);
                      const isSelected = selectedLevelId === level.id;

                      return (
                        <List.Item
                          onClick={() => {
                            setSelectedLevelId(level.id);
                            setLevelSearchText('');
                          }}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 16px',
                            marginBottom: 0,
                            borderRadius: 0,
                            backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                            borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                            transition: 'all 0.3s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontWeight: isSelected ? 500 : 400 }}>{level.name}</span>
                            {selectedCount > 0 && (
                              <Tag color={isSelected ? 'blue' : 'default'}>{selectedCount}</Tag>
                            )}
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </div>

              {/* 右侧：选项列表 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedLevelId ? (
                  sortedLevels.map((level: any) => {
                    if (level.id !== selectedLevelId) return null;

                    const levelOptions = getLevelValues(level);
                    const selectedInLevel = levelSelections[level.id] || [];
                    const selectedCount = selectedInLevel.length;

                    // 过滤选项
                    const filteredOptions = levelSearchText
                      ? levelOptions.filter((opt: LevelOption) =>
                          (opt.label || opt.name || '').toLowerCase().includes(levelSearchText.toLowerCase())
                        )
                      : levelOptions;

                    const allSelected = filteredOptions.length > 0 && selectedCount === filteredOptions.length;
                    const someSelected = selectedCount > 0 && !allSelected;

                    return (
                      <div key={level.id} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* 层级标题和操作栏 */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>
                              {level.name}
                              {selectedCount > 0 && (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                  已选 {selectedCount} / {levelOptions.length}
                                </Tag>
                              )}
                            </span>
                            <Space>
                              {filteredOptions.length > 0 && (
                                <Checkbox
                                  checked={allSelected}
                                  indeterminate={someSelected}
                                  onChange={(e) => handleSelectAllLevelOptions(level.id, filteredOptions, e.target.checked)}
                                >
                                  全选
                                </Checkbox>
                              )}
                              {selectedCount > 0 && (
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleClearLevel(level.id)}
                                >
                                  清空
                                </Button>
                              )}
                            </Space>
                          </div>
                        </div>

                        {/* 搜索框 */}
                        <div style={{ padding: '12px 16px' }}>
                          <Input
                            placeholder={`搜索${level.name}...`}
                            prefix={<SearchOutlined />}
                            value={levelSearchText}
                            onChange={(e) => setLevelSearchText(e.target.value)}
                            allowClear
                          />
                        </div>

                        {/* 选项列表 */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                          {filteredOptions.length === 0 ? (
                            <Empty
                              description={levelSearchText ? '未找到匹配的选项' : '该层级暂无可选项'}
                              style={{ marginTop: 40 }}
                            />
                          ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                              {filteredOptions.map((opt: LevelOption) => {
                                const isChecked = selectedInLevel.some((item: LevelOption) => item.id === opt.id);

                                return (
                                  <div
                                    key={opt.id}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: 4,
                                      border: '1px solid #f0f0f0',
                                      transition: 'all 0.2s',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={(e) => {
                                        handleLevelCheckboxChange(level.id, opt, e.target.checked);
                                      }}
                                      style={{ width: '100%' }}
                                    >
                                      <span style={{ fontSize: 14 }}>
                                        {opt.label || opt.name}
                                        {opt.code && (
                                          <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                                            ({opt.code})
                                          </span>
                                        )}
                                      </span>
                                    </Checkbox>
                                  </div>
                                );
                              })}
                            </Space>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="请从左侧选择一个层级" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default LineSelectModal;

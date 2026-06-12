import { useState, useMemo } from 'react';
import { Button, Tag, Modal, Space, Row, Col, List, Empty, Divider, Input, Checkbox } from 'antd';
import { DeleteOutlined, ApartmentOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface Account {
  id: number;
  code: string;
  name: string;
  path: string;
  type: string;
  level: number;
  namePath?: string;
  hierarchyValues?: string | any[];
  createdAt: string;
  [key: string]: any;
}

interface AccountMultiSelectProps {
  value?: number[] | Record<number, any[]>;  // 支持旧的账户ID数组或新的层级选项对象
  onChange?: (value: number[] | Record<number, any[]>) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const AccountMultiSelect: React.FC<AccountMultiSelectProps> = ({
  value = [],
  onChange,
  disabled = false,
  placeholder = '选择产线',
  allowClear = true,
  style,
  className,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // 存储层级选项选择（新的数据结构）
  const [levelSelections, setLevelSelections] = useState<Record<number, any[]>>({});

  // 兼容旧的数据结构（如果是数组，则转换为对象）
  const normalizedValue = useMemo(() => {
    if (Array.isArray(value)) {
      // 旧的数据结构：账户ID数组
      return {};
    }
    return value || {};
  }, [value]);

  // 获取所有子账户
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-sub-accounts-multi'],
    queryFn: async () => {
      const result = await request.get('/account/accounts', {
        params: { type: 'SUB', pageSize: 1000 }
      });
      return result?.items || result || [];
    },
  });

  // 获取层级配置（包含层级明细）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-levels-with-details-multi'],
    queryFn: () => request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 按层级序号排序
  const sortedLevels = useMemo(() => {
    if (!hierarchyLevels) return [];
    return [...hierarchyLevels].sort((a: any, b: any) => a.level - b.level);
  }, [hierarchyLevels]);

  // 获取层级配置的显示值（统一从层级明细获取）
  const getLevelValues = (level: any) => {
    console.log(`🔍 getLevelValues 被调用，层级: ${level.name}`, level);
    if (level.details && Array.isArray(level.details)) {
      console.log(`✅ 层级 [${level.name}] 有 ${level.details.length} 条明细`);
      const activeDetails = level.details.filter((detail: any) => detail.status === 'ACTIVE');
      console.log(`🎯 过滤后的活跃明细:`, activeDetails);
      const options = activeDetails.map((detail: any) => ({
        id: detail.id,
        name: detail.levelName,
        code: detail.levelCode,
        value: detail.id,
        label: detail.levelName,
      }));
      console.log(`📦 最终选项:`, options);
      return options;
    }
    console.warn(`⚠️ 层级 [${level.name}] 没有 details 或不是数组`, level);
    return [];
  };

  // 获取当前层级的选中选项
  const getSelectedValuesByLevel = useMemo(() => {
    const selections: Record<number, any[]> = {};

    sortedLevels.forEach((level: any) => {
      selections[level.id] = levelSelections[level.id] || [];
    });

    return selections;
  }, [levelSelections, sortedLevels]);

  // 处理层级值选择变化（不再匹配账户）
  const handleLevelValueChange = (levelId: number, selectedOptions: any[]) => {
    console.log(`🔄 层级 ${levelId} 选项变化:`, selectedOptions);

    // 更新层级选择
    setLevelSelections((prev) => ({
      ...prev,
      [levelId]: selectedOptions,
    }));

    // 计算总选择数量
    const totalCount = Object.values({
      ...levelSelections,
      [levelId]: selectedOptions,
    }).flat().length;

    // 触发 onChange（传递层级选项对象）
    onChange?.({
      ...levelSelections,
      [levelId]: selectedOptions,
    } as any);
  };

  // 清除某个层级的选择
  const handleClearLevel = (levelId: number) => {
    handleLevelValueChange(levelId, []);
  };

  // 全部清除
  const handleClearAll = () => {
    setLevelSelections({});
    setSearchText('');
    onChange?.({});
  };

  // 计算每个层级选中的数量
  const getSelectedCount = (levelId: number) => {
    return (levelSelections[levelId] || []).length;
  };

  // 获取总的选项选择数量
  const totalSelectedCount = Object.values(levelSelections).flat().length;

  // 打开弹窗时默认选中第一个层级
  const handleOpenModal = () => {
    if (sortedLevels.length > 0 && !selectedLevelId) {
      setSelectedLevelId(sortedLevels[0].id);
    }
    setModalVisible(true);
    // 初始化 levelSelections（如果是旧的数据格式）
    if (Array.isArray(value) && value.length > 0) {
      // 如果是旧的账户ID数组，清空选择
      setLevelSelections({});
    }
  };

  // 处理单个选项的复选框变化
  const handleCheckboxChange = (levelId: number, option: any, checked: boolean) => {
    const currentSelected = Array.from(getSelectedValuesByLevel[levelId] || []);
    let newSelected: any[];

    if (checked) {
      // 添加选项
      newSelected = [...currentSelected, option];
    } else {
      // 移除选项
      newSelected = currentSelected.filter((item: any) => {
        const itemId = typeof item === 'object' ? item.id : item;
        const optionId = typeof option === 'object' ? option.id : option;
        return itemId !== optionId;
      });
    }

    handleLevelValueChange(levelId, newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = (levelId: number, levelOptions: any[], selectAll: boolean) => {
    if (selectAll) {
      handleLevelValueChange(levelId, levelOptions);
    } else {
      handleLevelValueChange(levelId, []);
    }
  };

  return (
    <>
      {/* 触发按钮 */}
      <Button
        icon={<FilterOutlined />}
        onClick={handleOpenModal}
        disabled={disabled}
        style={style}
        className={className}
      >
        {placeholder}
        {totalSelectedCount > 0 && (
          <Tag color="blue" style={{ marginLeft: 8 }}>
            已选 {totalSelectedCount} 项
          </Tag>
        )}
      </Button>

      {/* 弹出框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FilterOutlined style={{ marginRight: 8 }} />
              <span>选择产线（按层级筛选）</span>
              {totalSelectedCount > 0 && (
                <Tag color="blue" style={{ marginLeft: 12 }}>
                  已选 {totalSelectedCount} 项
                </Tag>
              )}
            </div>
            {totalSelectedCount > 0 && (
              <Button
                danger
                size="small"
                onClick={handleClearAll}
                icon={<DeleteOutlined />}
              >
                清空全部
              </Button>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSearchText('');
        }}
        width={1000}
        centered
        footer={null}
        styles={{
          body: {
            padding: '24px 12px'
          }
        }}
      >
        <Row gutter={16} style={{ height: 500 }}>
          {/* 左侧：层级列表 */}
          <Col span={6}>
            <div
              style={{
                height: '100%',
                borderRight: '1px solid #f0f0f0',
                paddingRight: 16,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
                <ApartmentOutlined style={{ marginRight: 8 }} />
                层级列表
              </div>
              <List
                style={{ flex: 1, overflow: 'auto' }}
                dataSource={sortedLevels}
                renderItem={(level: any) => {
                  const selectedCount = getSelectedCount(level.id);
                  const isSelected = selectedLevelId === level.id;

                  return (
                    <List.Item
                      onClick={() => {
                        setSelectedLevelId(level.id);
                        setSearchText('');
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        marginBottom: 4,
                        borderRadius: 6,
                        backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                        border: isSelected ? '1px solid #91d5ff' : '1px solid transparent',
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
          </Col>

          {/* 右侧：复选框列表 */}
          <Col span={18}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {selectedLevelId ? (
                <>
                  {sortedLevels.map((level: any) => {
                    if (level.id !== selectedLevelId) return null;

                    const levelOptions = getLevelValues(level);
                    const selectedInLevel = levelSelections[level.id] || [];
                    const selectedCount = selectedInLevel.length;

                    console.log(`🎨 渲染层级 [${level.name}]，levelOptions:`, levelOptions);
                    console.log(`🎨 levelOptions 长度:`, levelOptions.length);
                    console.log(`🎨 selectedInLevel:`, selectedInLevel);

                    // 过滤选项
                    const filteredOptions = searchText
                      ? levelOptions.filter((opt: any) =>
                          (opt.label || opt.name || '').toLowerCase().includes(searchText.toLowerCase())
                        )
                      : levelOptions;

                    const allSelected = filteredOptions.length > 0 && selectedCount === filteredOptions.length;
                    const someSelected = selectedCount > 0 && !allSelected;

                    return (
                      <div key={level.id} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* 层级标题和操作栏 */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>
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
                                  onChange={(e) => handleSelectAll(level.id, filteredOptions, e.target.checked)}
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
                          <Divider style={{ margin: 0 }} />
                        </div>

                        {/* 搜索框 */}
                        <div style={{ marginBottom: 12 }}>
                          <Input
                            placeholder={`搜索${level.name}...`}
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                          />
                        </div>

                        {/* 复选框列表 */}
                        <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                          {filteredOptions.length === 0 ? (
                            <Empty
                              description={searchText ? '未找到匹配的选项' : '该层级暂无可选项'}
                              style={{ marginTop: 40 }}
                            />
                          ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                              {filteredOptions.map((opt: any) => {
                                // 检查是否已选中（需要确保类型一致）
                                const isChecked = selectedInLevel.some((item: any) => {
                                  const itemId = typeof item === 'object' ? item.id : String(item);
                                  const optId = String(opt.id);
                                  return itemId === optId;
                                });

                                return (
                                  <div
                                    key={opt.id}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={(e) => {
                                        handleCheckboxChange(level.id, opt, e.target.checked);
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
                  })}
                </>
              ) : (
                <Empty
                  description="请从左侧选择一个层级"
                  style={{ marginTop: 100 }}
                />
              )}
            </div>
          </Col>
        </Row>
        <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: '24px -12px -12px -12px', width: 'calc(100% + 24px)' }}>
          <Button onClick={() => {
            setModalVisible(false);
            setSearchText('');
          }}>取消</Button>
          <Button type="primary" onClick={() => {
            setModalVisible(false);
            setSearchText('');
          }}>确定</Button>
        </div>
      </Modal>
    </>
  );
};

export default AccountMultiSelect;

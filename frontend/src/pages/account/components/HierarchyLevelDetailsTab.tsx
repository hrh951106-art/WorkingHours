import { useState } from 'react';
import {
  Card,
  Select,
  Table,
  Button,
  Space,
  Tag,
  Empty,
  Row,
  Col,
  Statistic,
  Alert,
  message,
} from 'antd';
import {
  ReloadOutlined,
  ApartmentOutlined,
  DatabaseOutlined,
  FilterOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const HierarchyLevelDetailsTab: React.FC = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // 获取层级配置列表（包含明细）
  const { data: hierarchyConfigsWithDetails = [], isLoading } = useQuery({
    queryKey: ['hierarchyConfigWithDetails'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 刷新选中的层级明细
  const refreshSelectedLevel = async () => {
    if (!selectedLevelId) {
      message.warning('请先选择要刷新的层级');
      return;
    }

    setRefreshing(true);
    try {
      const result = await request.post(`/account/hierarchy-config/levels/${selectedLevelId}/refresh-details`);

      // 更新本地缓存数据
      queryClient.setQueryData(['hierarchyConfigWithDetails'], (old: any[]) => {
        if (!old || !Array.isArray(old)) return [result];

        return old.map((level: any) =>
          level.id === selectedLevelId ? result : level
        );
      });

      message.success('层级明细刷新成功');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || '刷新失败';
      message.error(errorMsg);
    } finally {
      setRefreshing(false);
    }
  };

  // 刷新所有层级明细
  const refreshAllLevels = async () => {
    setRefreshing(true);
    try {
      const results = await request.post('/account/hierarchy-config/refresh-all-details');

      // 更新本地缓存数据
      queryClient.setQueryData(['hierarchyConfigWithDetails'], results);

      message.success('所有层级明细刷新成功');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || '刷新失败';
      message.error(errorMsg);
    } finally {
      setRefreshing(false);
    }
  };

  // 获取选中的层级信息
  const selectedLevel = hierarchyConfigsWithDetails.find((level: any) => level.id === selectedLevelId);

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '选项值',
      dataIndex: 'levelCode',
      key: 'levelCode',
      width: 150,
      render: (text: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: '选项名称',
      dataIndex: 'levelName',
      key: 'levelName',
      width: 250,
      ellipsis: true,
    },
    {
      title: '选项ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text: string) => (
        <span style={{ color: '#999', fontSize: 12, fontFamily: 'monospace' }}>
          {text}
        </span>
      ),
    },
    {
      title: '排序',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center' as const,
      render: (value: number) => (
        <Tag color="default">{value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '激活' : '停用'}
        </Tag>
      ),
    },
  ];

  // 计算统计信息
  const stats = {
    totalLevels: hierarchyConfigsWithDetails.length || 0,
    totalDetails: selectedLevel?.details?.length || 0,
    activeDetails: selectedLevel?.details?.filter((d: any) => d.status === 'ACTIVE').length || 0,
  };

  return (
    <div>
      <Card
        title="层级明细管理"
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={refreshSelectedLevel}
              loading={refreshing}
              disabled={!selectedLevelId}
            >
              刷新选中层级
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshAllLevels}
              loading={refreshing}
            >
              刷新全部
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 筛选条件 */}
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Space style={{ width: '100%' }}>
                <FilterOutlined />
                <span style={{ fontWeight: 500 }}>选择层级：</span>
                <Select
                  style={{ width: 400 }}
                  placeholder="请选择要查看明细的层级"
                  value={selectedLevelId}
                  onChange={setSelectedLevelId}
                  loading={isLoading}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                >
                  {hierarchyConfigsWithDetails
                    .filter((level: any) => level.status === 'ACTIVE')
                    .map((level: any) => (
                      <Select.Option
                        key={level.id}
                        value={level.id}
                        label={level.name}
                      >
                        <Space>
                          <span>{level.name}</span>
                          <Tag color="blue">层级 {level.level}</Tag>
                          <Tag color="purple">{level.mappingType}</Tag>
                          {level.mappingValue && (
                            <Tag color="green">{level.mappingValue}</Tag>
                          )}
                          <span style={{ color: '#999', fontSize: 12 }}>
                            ({level.details?.length || 0} 项明细)
                          </span>
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
              </Space>
            </Col>
          </Row>

          {/* 统计信息 */}
          {selectedLevelId && (
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="层级名称"
                    value={selectedLevel?.name || '-'}
                    prefix={<ApartmentOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="明细总数"
                    value={stats.totalDetails}
                    prefix={<DatabaseOutlined />}
                    suffix="项"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="激活明细"
                    value={stats.activeDetails}
                    valueStyle={{ color: '#3f8600' }}
                    suffix={`/ ${stats.totalDetails}`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="映射类型"
                    value={selectedLevel?.mappingType || '-'}
                    valueStyle={{ fontSize: 16, fontWeight: 'normal' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 说明信息 */}
          {!selectedLevelId && (
            <Alert
              message="层级明细说明"
              description={
                <div>
                  <div>• 层级明细是层级配置映射的数据源选项的快照</div>
                  <div>• 当层级配置映射到数据源时，系统会自动将数据源选项同步到此表</div>
                  <div>• 数据源选项变更时，层级明细会自动更新</div>
                  <div>• 选择上方层级下拉框，可查看该层级的所有明细数据</div>
                </div>
              }
              type="info"
              showIcon
            />
          )}

          {/* 数据表格 */}
          {!selectedLevelId ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <FilterOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999', fontSize: 16 }}>
                请选择要查看明细的层级
              </div>
            </div>
          ) : selectedLevel?.details && selectedLevel.details.length > 0 ? (
            <Table
              columns={columns}
              dataSource={selectedLevel.details}
              rowKey="id"
              loading={isLoading}
              pagination={{
                total: selectedLevel.details.length,
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条明细`,
              }}
              scroll={{ x: 1000 }}
            />
          ) : (
            <Empty
              description="该层级暂无明细数据"
              style={{ padding: '60px 0' }}
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default HierarchyLevelDetailsTab;

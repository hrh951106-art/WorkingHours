import { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Space,
  Tag,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Empty,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 注册 dayjs 插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

import request from '@/utils/request';

const { Title, Text } = Typography;

const HierarchyDetailTab: React.FC = () => {
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // 获取层级配置列表
  const { data: hierarchyLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['hierarchyConfig'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取选中的层级信息
  const selectedLevel = hierarchyLevels.find((level: any) => level.id === selectedLevelId);

  // 获取自定义字段列表
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () =>
      request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 获取所有组织（用于自定义字段层级的数据过滤）
  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: () =>
      request.get('/hr/organizations').then((res: any) => res || []),
  });

  // 获取所有员工（用于自定义字段层级）
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () =>
      request.get('/hr/employees').then((res: any) => res?.items || []),
  });

  // 获取选中层级的组织数据（仅用于ORG_TYPE映射）
  const { data: organizationsByLevel = [], isLoading: orgLoading, refetch } = useQuery({
    queryKey: ['organizationsByLevel', selectedLevelId],
    queryFn: () =>
      request.get(`/hr/organizations/by-hierarchy-level/${selectedLevelId}`)
        .then((res: any) => res || []),
    enabled: !!selectedLevelId && selectedLevel?.mappingType === 'ORG_TYPE',
  });

  // 使用 useMemo 动态生成表格列定义
  const columns = useMemo(() => [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: any) => {
        const isEmployee = record.employeeNo !== undefined;
        return (
          <Space>
            {isEmployee ? <UserOutlined /> : <ApartmentOutlined />}
            <span>{text}</span>
          </Space>
        );
      },
    },
    {
      title: '编码',
      key: 'code',
      width: 150,
      render: (_: any, record: any) => {
        const isEmployee = record.employeeNo !== undefined;
        return isEmployee ? (record.employeeNo || '-') : (record.code || '-');
      },
    },
    {
      title: '类型',
      key: 'type',
      width: 120,
      render: (_: any, record: any) => {
        const isEmployee = record.employeeNo !== undefined;
        return (
          <Tag color={isEmployee ? 'green' : 'blue'}>
            {isEmployee ? '员工' : '组织'}
          </Tag>
        );
      },
    },
    {
      title: '层级',
      key: 'level',
      width: 150,
      render: () => selectedLevel?.name || '-',
    },
    {
      title: '路径',
      key: 'path',
      ellipsis: true,
      render: (_: any, record: any) => {
        if (record.path) return record.path;
        if (record.orgPath) return record.orgPath;
        return '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          ACTIVE: { text: '激活', color: 'success' },
          INACTIVE: { text: '停用', color: 'default' },
          EMPLOYED: { text: '在职', color: 'success' },
          RESIGNED: { text: '离职', color: 'default' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ], [selectedLevel]);

  // 根据层级映射类型处理数据
  let displayData: any[] = [];
  let dataSource = '';
  let isLoading = false;

  if (selectedLevel) {
    if (selectedLevel.mappingType === 'ORG_TYPE') {
      // 组织类型映射：使用后端接口直接返回的数据
      displayData = organizationsByLevel;
      dataSource = `组织（类型：${selectedLevel.mappingValue}）`;
      isLoading = orgLoading;
    } else if (selectedLevel.mappingType?.startsWith('CUSTOM_')) {
      // 自定义字段映射：在前端根据字段值过滤数据
      const fieldCode = selectedLevel.mappingType.replace('CUSTOM_', '');
      const field = customFields.find((f: any) => f.code === fieldCode);

      if (field) {
        // 根据字段类型决定数据源和过滤逻辑
        if (field.dataSource) {
          // 字段关联了组织类型（查找项）→ 过滤组织数据
          const orgTypeCode = typeof field.dataSource === 'string'
            ? field.dataSource
            : field.dataSource?.code;
          const filteredOrgs = allOrganizations.filter((org: any) =>
            org.orgType?.code === orgTypeCode
          );
          displayData = filteredOrgs;
          const dataSourceName = typeof field.dataSource === 'string'
            ? field.dataSource
            : field.dataSource?.name || field.dataSource?.code || '';
          dataSource = `组织（${field.name} = ${dataSourceName}）`;
        } else {
          // 字段未关联数据源 → 过滤员工数据
          // 获取该字段在员工自定义字段中的值
          const filteredEmployees = allEmployees.filter((emp: any) => {
            if (!emp.customFields) return false;

            // customFields是JSON对象，查找对应字段的值
            const fieldValue = emp.customFields[fieldCode];

            // 如果字段有值，就包含这个员工
            // 这里假设字段值等于层级名称或者包含层级名称
            return fieldValue && (
              fieldValue === selectedLevel.name ||
              (typeof fieldValue === 'string' && fieldValue.includes(selectedLevel.name)) ||
              (Array.isArray(fieldValue) && fieldValue.includes(selectedLevel.name))
            );
          });

          displayData = filteredEmployees;
          dataSource = `员工（${field.name} = ${selectedLevel.name}）`;
        }
      }
    }
  }

  // 计算统计信息
  const stats = {
    total: displayData.length || 0,
    active: displayData.filter((item: any) => item.status === 'ACTIVE').length,
    inactive: displayData.filter((item: any) => item.status !== 'ACTIVE').length,
    lastSyncTime: displayData.length > 0 ? displayData[0]?.updatedAt : null,
  };

  const isCustomFieldMapping = selectedLevel?.mappingType?.startsWith('CUSTOM_');

  return (
    <div>
      <Card
        title="层级明细管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              disabled={!selectedLevelId}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 筛选条件 */}
          <Row gutter={16} align="middle">
            <Col span={12}>
              <div>
                <Text strong style={{ marginRight: 8 }}>
                  选择层级：
                </Text>
                <Select
                  style={{ width: 400 }}
                  placeholder="请选择要查看的层级"
                  value={selectedLevelId}
                  onChange={setSelectedLevelId}
                  loading={levelsLoading}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                >
                  {hierarchyLevels
                    .filter((level: any) => level.status === 'ACTIVE')
                    .map((level: any) => (
                      <Select.Option
                        key={level.id}
                        value={level.id}
                        label={level.name}
                      >
                        <Space>
                          <span>{level.name}</span>
                          <Tag color="blue">{level.mappingType}</Tag>
                          {level.mappingValue && (
                            <Tag color="green">{level.mappingValue}</Tag>
                          )}
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
              </div>
            </Col>
          </Row>

          {/* 自定义字段映射提示 */}
          {isCustomFieldMapping && (
            <Alert
              message="自定义字段层级"
              description={
                <div>
                  <div>当前层级映射到自定义字段，显示所有{dataSource.includes('组织') ? '组织' : '员工'}数据。</div>
                  <div style={{ marginTop: 8 }}>
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    <Text type="secondary">
                      提示：如需按字段值筛选数据，请联系管理员配置后端过滤功能
                    </Text>
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          )}

          {/* 统计信息 */}
          {selectedLevelId && displayData.length > 0 && (
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={`${dataSource.includes('员工') ? '员工' : '组织'}总数`}
                    value={stats.total}
                    prefix={dataSource.includes('员工') ? <UserOutlined /> : <ApartmentOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="激活"
                    value={stats.active}
                    valueStyle={{ color: '#3f8600' }}
                    suffix={`/ ${stats.total}`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="停用"
                    value={stats.inactive}
                    valueStyle={{ color: '#cf1322' }}
                    suffix={`/ ${stats.total}`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最后更新"
                    value={stats.lastSyncTime ? dayjs(stats.lastSyncTime).fromNow() : '-'}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
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
              <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999', fontSize: 16 }}>
                请选择要查看的层级
              </div>
            </div>
          ) : displayData.length === 0 && !isLoading ? (
            <Empty
              description="该层级下暂无数据"
              style={{ padding: '60px 0' }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={displayData}
              rowKey="id"
              loading={isLoading}
              pagination={{
                total: displayData.length,
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Space>
      </Card>

      {/* 使用说明 */}
      <Card
        title="使用说明"
        style={{ marginTop: 16 }}
        type="inner"
      >
        <Space direction="vertical">
          <div>
            <Text strong>• 选择层级：</Text>
            <Text>
              从下拉列表中选择要查看的层级，系统根据层级映射类型显示相应数据
            </Text>
          </div>
          <div>
            <Text strong>• 组织类型映射：</Text>
            <Text>
              层级映射到组织类型时，显示该类型的所有组织数据（如：车间、产线、班组等）
            </Text>
          </div>
          <div>
            <Text strong>• 自定义字段映射：</Text>
            <Text>
              层级映射到人事自定义字段时，显示所有{dataSource.includes('组织') ? '组织' : '员工'}数据
            </Text>
          </div>
          <div>
            <Text strong>• 数据刷新：</Text>
            <Text>
              点击"刷新"按钮可重新获取最新数据
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default HierarchyDetailTab;

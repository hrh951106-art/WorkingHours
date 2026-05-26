import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Descriptions,
  Tag,
  message,
  Tabs,
  Typography,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  TableOutlined,
  EyeOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

const { Search } = Input;
const { Title, Text } = Typography;

interface TableInfo {
  tableName: string;
  sql: string;
  name?: string;
  description?: string;
  category?: string;
  hasMetadata?: boolean;
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isRequired: boolean;
  defaultValue?: any;
  displayName?: string;
  description?: string;
  fieldType?: 'dimension' | 'measure';
}

interface TableStructure {
  tableName: string;
  displayName?: string;
  description?: string;
  category?: string;
  hasMetadata?: boolean;
  columns: ColumnInfo[];
  primaryKeys: { columnName: string }[];
  indexes: { indexName: string; indexSql: string }[];
  rowCount: number;
}

const DataSourceManagePage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isStructureModalVisible, setIsStructureModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('structure');

  // 获取所有表
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['biDatasourceTables'],
    queryFn: async () => {
      const response = await request.get('/bi-report/datasource/tables');
      return response as TableInfo[];
    },
  });

  // 搜索表
  const { data: searchResults = [] } = useQuery({
    queryKey: ['biDatasourceSearch', searchKeyword],
    queryFn: async () => {
      if (!searchKeyword) return [];
      const response = await request.get('/bi-report/datasource/tables/search', {
        params: { keyword: searchKeyword },
      });
      return response as TableInfo[];
    },
    enabled: searchKeyword.length > 0,
  });

  // 获取表结构
  const { data: tableStructure, isLoading: isLoadingStructure } = useQuery({
    queryKey: ['biTableStructure', selectedTable],
    queryFn: async () => {
      const response = await request.get(`/bi-report/datasource/tables/${selectedTable}/structure`);
      return response as TableStructure;
    },
    enabled: !!selectedTable && isStructureModalVisible,
  });

  // 预览表数据
  const { data: previewData = [], isLoading: isLoadingPreview } = useQuery({
    queryKey: ['biTablePreview', selectedTable],
    queryFn: async () => {
      const response = await request.get(`/bi-report/datasource/tables/${selectedTable}/preview`, {
        params: { limit: 20 },
      });
      return response;
    },
    enabled: !!selectedTable && isPreviewModalVisible,
  });

  // 查看表结构
  const handleViewStructure = (tableName: string) => {
    setSelectedTable(tableName);
    setIsStructureModalVisible(true);
    setActiveTab('structure');
  };

  // 预览数据
  const handleViewPreview = (tableName: string) => {
    setSelectedTable(tableName);
    setIsPreviewModalVisible(true);
  };

  // 过滤后的表列表
  const displayTables = searchKeyword.length > 0 ? searchResults : tables;

  const columns = [
    {
      title: '表名',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 200,
      render: (name: string, record: TableInfo) => (
        <Space>
          <TableOutlined />
          <div>
            <Text strong style={{ display: 'block' }}>{record.name || name}</Text>
            {record.hasMetadata && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {name}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category?: string) => category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description?: string, record: TableInfo) => (
        <Tooltip title={description || record.tableName}>
          <Text type={description ? 'default' : 'secondary'}>
            {description || '数据库表'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: TableInfo) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewStructure(record.tableName)}
          >
            结构
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CodeOutlined />}
            onClick={() => handleViewPreview(record.tableName)}
          >
            数据预览
          </Button>
        </Space>
      ),
    },
  ];

  const structureColumns = [
    {
      title: '字段名',
      dataIndex: 'columnName',
      key: 'columnName',
      width: 220,
      render: (name: string, record: ColumnInfo) => {
        const isPk = tableStructure?.primaryKeys?.some(pk => pk.columnName === name) || false;
        return (
          <Space direction="vertical" size={0}>
            <Space>
              {isPk && <Tag color="gold">PK</Tag>}
              <Text strong={isPk}>{record.displayName || name}</Text>
            </Space>
            {record.displayName && record.displayName !== name && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {name}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '字段说明',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
      render: (description?: string) => {
        if (!description) {
          return <Text type="secondary">暂无说明</Text>;
        }
        return (
          <Tooltip title={description} placement="left">
            <Text style={{ fontSize: 13 }}>{description}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 100,
      render: (type?: 'dimension' | 'measure') => {
        if (type === 'dimension') return <Tag color="blue">维度</Tag>;
        if (type === 'measure') return <Tag color="green">度量</Tag>;
        return <Tag type="default">未分类</Tag>;
      },
    },
    {
      title: '必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 80,
      render: (required: boolean) => required ? <Tag color="red">必填</Tag> : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4}>数据源管理</Title>
            <Text type="secondary">浏览和管理数据库表，查看表结构和数据</Text>
          </Col>
          <Col span={6}>
            <Search
              placeholder="搜索表名"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={displayTables}
          loading={isLoading}
          rowKey="tableName"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 表结构弹窗 */}
      <Modal
        title={`表结构 - ${tableStructure?.displayName || tableStructure?.tableName || selectedTable || ''}`}
        open={isStructureModalVisible}
        onCancel={() => {
          setIsStructureModalVisible(false);
          setSelectedTable(null);
        }}
        footer={null}
        width={1000}
      >
        {tableStructure && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="表名">{tableStructure.tableName}</Descriptions.Item>
              <Descriptions.Item label="中文名称">{tableStructure.displayName || '-'}</Descriptions.Item>
              <Descriptions.Item label="分类">
                {tableStructure.category ? <Tag color="blue">{tableStructure.category}</Tag> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="记录数">{tableStructure.rowCount}</Descriptions.Item>
              <Descriptions.Item label="字段数">{tableStructure.columns.length}</Descriptions.Item>
              <Descriptions.Item label="说明" span={2}>
                {tableStructure.description || '暂无说明'}
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'structure',
                  label: '字段结构',
                  children: (
                    <Table
                      columns={structureColumns}
                      dataSource={tableStructure.columns}
                      rowKey="columnName"
                      loading={isLoadingStructure}
                      pagination={false}
                      size="small"
                    />
                  ),
                },
                {
                  key: 'indexes',
                  label: '索引信息',
                  children: (
                    <Table
                      columns={[
                        { title: '索引名', dataIndex: 'indexName', key: 'indexName' },
                        { title: '索引定义', dataIndex: 'indexSql', key: 'indexSql' },
                      ]}
                      dataSource={tableStructure.indexes}
                      rowKey="indexName"
                      pagination={false}
                      size="small"
                    />
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 数据预览弹窗 */}
      <Modal
        title={`数据预览 - ${selectedTable}`}
        open={isPreviewModalVisible}
        onCancel={() => {
          setIsPreviewModalVisible(false);
          setSelectedTable(null);
        }}
        footer={null}
        width={1200}
      >
        <Table
          columns={previewData.length > 0 ? Object.keys(previewData[0]).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            width: 150,
            ellipsis: true,
          })) : []}
          dataSource={previewData}
          loading={isLoadingPreview}
          rowKey={(record, index) => index}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 1000 }}
        />
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          仅显示前 20 条数据
        </Text>
      </Modal>
    </div>
  );
};

export default DataSourceManagePage;

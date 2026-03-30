import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Row,
  Col,
  TreeSelect,
  Upload,
  Alert,
  Progress,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, UploadOutlined, FileExcelOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Dragger } = Upload;

interface ProductionRecord {
  id?: number;
  orgId: number;
  orgName?: string;
  lineId?: number;
  lineName?: string;
  shiftId: number;
  shiftName?: string;
  productId: number;
  productCode?: string;
  productName?: string;
  recordDate: string;
  plannedQty: number;
  actualQty: number;
  qualifiedQty: number;
  unqualifiedQty?: number;
  standardHours: number;
  totalStdHours: number;
  workHours?: number;
  source?: string;
  recorderId: number;
  recorderName?: string;
  // conversionFactor: number;  // 已从界面隐藏，但后端仍返回
  // convertedQty: number;  // 已从界面隐藏，但后端仍返回
  status?: string;
  description?: string;
}

const ProductionRecordPage: React.FC = () => {
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(7, 'day'), dayjs()] as any,
    orgId: null as number | null,
    shiftId: null as number | null,
    productId: null as number | null,
  });

  // 获取系统配置 - 产线对应层级和产线班次
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 根据层级ID获取产线组织列表
  const productionLineHierarchyLevelId = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineHierarchyLevel'
  )?.configValue;

  // 获取配置的产线开线班次属性(优先使用属性配置)
  const configuredShiftPropertyKeys = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftPropertyKeys'
  )?.configValue?.split(',').filter((key: string) => key) || [];

  // 获取配置的产线班次ID列表(兼容旧数据)
  const configuredShiftIds = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftIds'
  )?.configValue?.split(',').map((id: string) => parseInt(id)) || [];

  const { data: productionLineOrgs = [] } = useQuery({
    queryKey: ['productionLineOrgs', productionLineHierarchyLevelId],
    queryFn: () =>
      request.get(`/hr/organizations/by-hierarchy-level/${productionLineHierarchyLevelId}`)
        .then((res: any) => res || []),
    enabled: !!productionLineHierarchyLevelId,
  });

  // 获取产量记录列表
  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['productionRecords', filters],
    queryFn: () =>
      request.get('/allocation/production-records', {
        params: {
          startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
          orgId: filters.orgId,
          shiftId: filters.shiftId,
          productId: filters.productId,
        },
      }).then((res: any) => res?.items || []),
  });

  // 获取产线树（当没有配置层级时使用）
  const { data: orgTree } = useQuery({
    queryKey: ['hrOrganizationTree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res),
    enabled: !productionLineHierarchyLevelId,
  });

  // 获取所有班次及其属性
  const { data: allShifts } = useQuery({
    queryKey: ['allShiftsForProductionWithProperties'],
    queryFn: async () => {
      const shifts = await request.get('/shift/shifts').then((res: any) => res?.items || res || []);

      // 为每个班次获取属性
      const shiftsWithProperties = await Promise.all(
        shifts.map(async (shift: any) => {
          try {
            const properties = await request.get(`/shift/shifts/${shift.id}/properties`).then((res: any) => res || []);
            const propertyKeys = properties.map((p: any) => p.propertyKey);
            return {
              ...shift,
              propertyKeys,
            };
          } catch (error) {
            return {
              ...shift,
              propertyKeys: [],
            };
          }
        })
      );

      return shiftsWithProperties;
    },
  });

  // 根据配置过滤班次(优先使用属性,其次使用ID列表)
  const shifts = configuredShiftPropertyKeys.length > 0
    ? allShifts?.filter((s: any) =>
        configuredShiftPropertyKeys.some((key: string) => s.propertyKeys?.includes(key))
      )
    : configuredShiftIds.length > 0
    ? allShifts?.filter((s: any) => configuredShiftIds.includes(s.id))
    : allShifts;

  // 获取产品列表
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      request.get('/allocation/products').then((res: any) => res?.items || []),
  });

  // 批量导入
  const batchImportMutation = useMutation({
    mutationFn: (records: any[]) =>
      request.post('/allocation/production-records/batch', { records }),
    onSuccess: (result: any) => {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });

      const { success, updated, failed, errors } = result;

      if (failed === 0) {
        message.success(`批量导入成功！新增 ${success} 条，更新 ${updated} 条`);
        handleImportCancel();
      } else {
        message.warning(`导入完成！新增 ${success} 条，更新 ${updated} 条，失败 ${failed} 条`);
        setValidationErrors(errors);
      }
    },
    onError: (error: any) => {
      setIsUploading(false);
      message.error(error.response?.data?.message || '批量导入失败');
    },
  });

  const handleImportOpen = () => {
    setIsImportModalVisible(true);
    setUploadFileList([]);
    setParsedData([]);
    setValidationErrors([]);
  };

  const handleImportCancel = () => {
    setIsImportModalVisible(false);
    setUploadFileList([]);
    setParsedData([]);
    setValidationErrors([]);
  };

  // 递归查找产线
  const findOrgById = (nodes: any[], id: number): any => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findOrgById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 渲染产线树节点
  const renderTreeNodes = (nodes: any[]): any[] => {
    if (!nodes) return [];
    return nodes.map((node) => ({
      title: node.name,
      value: node.id,
      children: node.children && node.children.length > 0 ? renderTreeNodes(node.children) : undefined,
    }));
  };

  // 处理文件上传
  const handleFileUpload = (file: any) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          message.error('Excel文件为空');
          return;
        }

        // 验证和转换数据
        const validatedData = jsonData.map((row: any, index: number) => {
          const errors: string[] = [];

          // 验证必填字段
          if (!row['日期']) errors.push('缺少日期');
          if (!row['产线']) errors.push('缺少产线');
          if (!row['产线ID'] && !row['产线名称']) errors.push('缺少产线ID或产线名称');
          if (!row['班次']) errors.push('缺少班次');
          if (!row['班次ID'] && !row['班次名称']) errors.push('缺少班次ID或班次名称');
          if (!row['产品']) errors.push('缺少产品');
          if (!row['产品ID'] && !row['产品名称']) errors.push('缺少产品ID或产品名称');
          if (!row['实际产量'] && row['实际产量'] !== 0) errors.push('缺少实际产量');

          return {
            rowIndex: index + 2, // Excel行号（从1开始，加上表头）
            data: row,
            errors,
            valid: errors.length === 0,
          };
        });

        const validData = validatedData.filter((item: any) => item.valid);
        const invalidData = validatedData.filter((item: any) => !item.valid);

        setParsedData(validData.map((item: any) => item.data));
        setValidationErrors(invalidData);

        if (invalidData.length > 0) {
          message.warning(`发现 ${invalidData.length} 条数据有错误，请检查`);
        } else {
          message.success(`成功解析 ${validData.length} 条数据`);
        }
      } catch (error) {
        message.error('文件解析失败，请确保文件格式正确');
        console.error('解析错误:', error);
      }
    };
    reader.readAsBinaryString(file);
    return false; // 阻止自动上传
  };

  // 执行批量导入
  const handleBatchImport = async () => {
    if (parsedData.length === 0) {
      message.error('没有可导入的数据');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: parsedData.length });

    // 转换数据格式
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    const records = parsedData.map((row: any) => {
      // 查找产线
      const orgInfo = productionLineOrgs.find((org: any) => org.name === row['产线'] || org.id == row['产线ID'])
        || (orgTree && findOrgById(orgTree, row['产线ID']));

      // 查找班次
      const shiftInfo = shifts?.find((s: any) => s.name === row['班次'] || s.id == row['班次ID']);

      // 查找产品
      const productInfo = products?.find((p: any) => p.name === row['产品'] || p.code === row['产品'] || p.id == row['产品ID']);

      // 解析日期
      const recordDate = row['日期'] instanceof Date
        ? dayjs(row['日期']).format('YYYY-MM-DD')
        : dayjs(row['日期'], 'YYYY-MM-DD').format('YYYY-MM-DD');

      return {
        recordDate,
        orgId: orgInfo?.id || row['产线ID'],
        orgName: orgInfo?.name || row['产线'],
        shiftId: shiftInfo?.id || row['班次ID'],
        shiftName: shiftInfo?.name || row['班次'],
        productId: productInfo?.id || row['产品ID'],
        productCode: productInfo?.code || '',
        productName: productInfo?.name || row['产品'],
        plannedQty: row['计划产量'] || 0,
        actualQty: row['实际产量'] || 0,
        qualifiedQty: row['合格产量'] || row['实际产量'] || 0,
        unqualifiedQty: row['不合格产量'] || 0,
        standardHours: productInfo?.standardHours || 0,
        totalStdHours: (row['实际产量'] || 0) * (productInfo?.standardHours || 0),
        workHours: row['工作工时'] || null,
        source: 'BATCH_IMPORT',
        recorderId: user?.id || 1,
        recorderName: user?.name || '系统管理员',
        description: row['备注'] || row['描述'] || '',
      };
    });

    batchImportMutation.mutate(records);
  };

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      dateRange: [dayjs().subtract(7, 'day'), dayjs()],
      orgId: null,
      shiftId: null,
      productId: null,
    });
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      fixed: 'left' as const,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '产线',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 200,
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 100,
    },
    {
      title: '产品',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
    },
    {
      title: '实际产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 120,
      align: 'right' as const,
      render: (qty: number) => qty.toLocaleString(),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
  ];

  // 下载Excel模板
  const downloadTemplate = () => {
    const template = [
      {
        '日期': '2024-01-15',
        '产线': '产线A',
        '产线ID': '1',
        '班次': '白班',
        '班次ID': '1',
        '产品': '产品A',
        '产品ID': '1',
        '计划产量': 1000,
        '实际产量': 950,
        '合格产量': 950,
        '不合格产量': 0,
        '备注': '示例数据',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '产量记录');
    XLSX.writeFile(workbook, '产量记录导入模板.xlsx');
  };

  return (
    <div>
      <Card
        title="产量记录"
        extra={
          <Button type="primary" icon={<UploadOutlined />} onClick={handleImportOpen}>
            批量导入
          </Button>
        }
      >
        {/* 查询条件 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="日期范围">
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </Form.Item>
          <Form.Item label="产线">
            {productionLineHierarchyLevelId && productionLineOrgs.length > 0 ? (
              <Select
                placeholder="请选择产线"
                value={filters.orgId}
                onChange={(value) => setFilters({ ...filters, orgId: value })}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 300 }}
              >
                {productionLineOrgs.map((org: any) => (
                  <Select.Option key={org.id} value={org.id} label={org.name}>
                    {org.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <TreeSelect
                placeholder="请选择产线"
                value={filters.orgId}
                onChange={(value) => setFilters({ ...filters, orgId: value })}
                allowClear
                style={{ width: 300 }}
                treeData={orgTree ? renderTreeNodes(orgTree) : []}
                showSearch
              />
            )}
          </Form.Item>
          <Form.Item label="班次">
            <Select
              placeholder="请选择班次"
              value={filters.shiftId}
              onChange={(value) => setFilters({ ...filters, shiftId: value })}
              allowClear
              style={{ width: 150 }}
            >
              {shifts?.map((shift: any) => (
                <Select.Option key={shift.id} value={shift.id}>
                  {shift.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="产品">
            <Select
              placeholder="请选择产品"
              value={filters.productId}
              onChange={(value) => setFilters({ ...filters, productId: value })}
              allowClear
              style={{ width: 200 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {products?.map((product: any) => (
                <Select.Option key={product.id} value={product.id} label={product.name}>
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => refetch()}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={records}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入产量记录"
        open={isImportModalVisible}
        onCancel={handleImportCancel}
        width={800}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 步骤说明 */}
          <Alert
            message="导入说明"
            description={
              <div>
                <p>1. 下载Excel模板，按照模板格式填写数据</p>
                <p>2. 上传填写好的Excel文件</p>
                <p>3. 系统自动验证数据，同一天同一产线同一班次同一产品的记录会被更新，否则新增</p>
                <p>4. 确认无误后点击"开始导入"</p>
              </div>
            }
            type="info"
            showIcon
          />

          {/* 下载模板 */}
          <Button
            type="default"
            icon={<FileExcelOutlined />}
            onClick={downloadTemplate}
          >
            下载Excel模板
          </Button>

          {/* 文件上传 */}
          <Dragger
            fileList={uploadFileList}
            beforeUpload={handleFileUpload}
            onRemove={() => {
              setUploadFileList([]);
              setParsedData([]);
              setValidationErrors([]);
            }}
            accept=".xlsx,.xls"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 .xlsx 或 .xls 格式的Excel文件</p>
          </Dragger>

          {/* 数据验证结果 */}
          {parsedData.length > 0 && (
            <Alert
              message={`成功解析 ${parsedData.length} 条数据`}
              type="success"
              showIcon
            />
          )}

          {validationErrors.length > 0 && (
            <Alert
              message={`发现 ${validationErrors.length} 条数据有错误`}
              description={
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {validationErrors.map((error: any, index: number) => (
                    <div key={index} style={{ marginBottom: 8 }}>
                      <Tag color="red">第 {error.rowIndex} 行</Tag>
                      {error.errors.join(', ')}
                    </div>
                  ))}
                </div>
              }
              type="error"
              showIcon
            />
          )}

          {/* 导入进度 */}
          {isUploading && (
            <div>
              <div style={{ marginBottom: 8 }}>
                正在导入数据... ({parsedData.length} 条)
              </div>
              <Progress
                percent={Math.round((uploadProgress.current / uploadProgress.total) * 100)}
                status="active"
              />
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleImportCancel}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleBatchImport}
                disabled={parsedData.length === 0 || isUploading}
                loading={isUploading}
              >
                开始导入
              </Button>
            </Space>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default ProductionRecordPage;

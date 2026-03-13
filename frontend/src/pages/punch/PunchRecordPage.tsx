import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Select, message, Space, Tag, Popconfirm, DatePicker, Upload, Alert, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import AccountSelect from '@/components/common/AccountSelect';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';
import type { UploadFile } from 'antd/es/upload/interface';

// 绑定账户选择器组件（包含新建功能）
const BindingAccountSelect: React.FC<{
  value?: number;
  onChange?: (value: number | null) => void;
  usageType: string;
}> = ({ value, onChange, usageType }) => {
  const queryClient = useQueryClient();

  const handleAccountCreated = (newAccountId: number) => {
    // 刷新账户列表
    queryClient.invalidateQueries({ queryKey: ['device-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['punch-accounts'] });
    // 自动选中新创建的账户
    onChange?.(newAccountId);
  };

  return (
    <AccountSelect
      value={value}
      onChange={onChange}
      usageType={usageType}
      placeholder="选择账户"
      allowClear={true}
      showCreateButton={true}
      onAccountCreated={handleAccountCreated}
    />
  );
};

const PunchRecordPage: React.FC = () => {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dateRange, setDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>({
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [recordForm] = Form.useForm();
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const [searchForm] = useState<any>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  const { data: devices } = useQuery({
    queryKey: ['punchDevices'],
    queryFn: () => request.get('/punch/devices').then((res: any) => res),
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['punchRecords', dateRange, dynamicFilters],
    queryFn: () => request.get('/punch/records', {
      params: {
        startDate: dateRange.start.format('YYYY-MM-DD'),
        endDate: dateRange.end.format('YYYY-MM-DD'),
        ...dynamicFilters,
      }
    }).then((res: any) => res),
  });

  const createRecordMutation = useMutation({
    mutationFn: (data: any) => {
      const requestData = {
        ...data,
        punchTime: data.punchTime.format('YYYY-MM-DD HH:mm:ss'),
      };
      return request.post('/punch/records', requestData);
    },
    onSuccess: () => {
      message.success('补录成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '补录失败';
      message.error(errorMsg);
      console.error('补录打卡记录失败:', error);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const requestData = {
        ...data,
        punchTime: data.punchTime.format('YYYY-MM-DD HH:mm:ss'),
      };
      return request.put(`/punch/records/${id}`, requestData);
    },
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新打卡记录失败:', error);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/punch/records/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除打卡记录失败:', error);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map(id => request.delete(`/punch/records/${id}`))),
    onSuccess: () => {
      message.success(`成功删除 ${selectedRowKeys.length} 条记录`);
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setSelectedRowKeys([]);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '批量删除失败';
      message.error(errorMsg);
      console.error('批量删除打卡记录失败:', error);
    },
  });

  const importRecordsMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request.post('/punch/records/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setImportProgress(percentCompleted);
        },
      });
    },
    onSuccess: (response: any) => {
      message.success('导入成功');
      setImportResult(response);
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setImporting(false);
      setImportFileList([]);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '导入失败';
      message.error(errorMsg);
      console.error('导入打卡记录失败:', error);
      setImporting(false);
    },
  });

  const getAccountDisplayName = (acc: any) => {
    if (!acc) return '';
    if (acc.namePath) {
      return acc.namePath.replace(/\s*\/\s*/g, '/');
    }
    return acc.name || acc.path || '';
  };

  const recordColumns = [
    { title: '员工编号', dataIndex: 'employeeNo', key: 'employeeNo' },
    {
      title: '员工姓名',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee?.name || '-',
    },
    {
      title: '打卡时间',
      dataIndex: 'punchTime',
      key: 'punchTime',
      render: (time: string) => {
        if (!time) return '-';
        return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      render: (device: any) => device?.name || '-',
    },
    {
      title: '打卡类型',
      dataIndex: 'punchType',
      key: 'punchType',
      render: (type: string) => {
        const typeMap: any = {
          IN: '签入',
          OUT: '签出',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '子账户',
      dataIndex: 'account',
      key: 'account',
      render: (account: any) => {
        if (!account) return '-';
        return getAccountDisplayName(account);
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => {
        const sourceMap: any = {
          AUTO: '自动',
          MANUAL: '手动',
        };
        return <Tag color={source === 'MANUAL' ? 'blue' : 'green'}>{sourceMap[source] || source}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditRecord(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条打卡记录吗？"
            onConfirm={() => handleDeleteRecord(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddRecord = () => {
    setSelectedRecord(null);
    recordForm.resetFields();
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    recordForm.setFieldsValue({
      employeeNo: record.employeeNo,
      punchTime: dayjs(record.punchTime),
      deviceId: record.deviceId,
      punchType: record.punchType,
      accountId: record.accountId,
    });
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (id: number) => {
    deleteRecordMutation.mutate(id);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedRowKeys.length} 条打卡记录吗？`)) {
      batchDeleteMutation.mutate(selectedRowKeys as number[]);
    }
  };

  // 过滤打卡记录
  const filteredRecords = (records?.items || []).filter((record: any) => {
    if (!dynamicFilters || Object.keys(dynamicFilters).length === 0) return true;

    // 简单过滤：如果dynamicFilters中有值，则进行匹配
    return Object.keys(dynamicFilters).every((key) => {
      if (!dynamicFilters[key]) return true;

      const searchValue = dynamicFilters[key].toLowerCase();
      return (
        record.employeeNo?.toLowerCase().includes(searchValue) ||
        record.employee?.name?.toLowerCase().includes(searchValue) ||
        record.device?.name?.toLowerCase().includes(searchValue) ||
        record.device?.code?.toLowerCase().includes(searchValue) ||
        record.punchType?.toLowerCase().includes(searchValue)
      );
    });
  });

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const handleRecordModalOk = async () => {
    try {
      const values = await recordForm.validateFields();
      if (selectedRecord) {
        updateRecordMutation.mutate({ id: selectedRecord.id, data: values });
      } else {
        createRecordMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleRecordModalCancel = () => {
    setIsRecordModalOpen(false);
    recordForm.resetFields();
    setSelectedRecord(null);
  };

  const handleImportModalOpen = () => {
    setIsImportModalOpen(true);
    setImportFileList([]);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleImportModalCancel = () => {
    setIsImportModalOpen(false);
    setImportFileList([]);
    setImportProgress(0);
    setImportResult(null);
    setImporting(false);
  };

  const handleDownloadTemplate = () => {
    // 创建Excel模板数据
    const template = [
      ['员工工号', '打卡时间', '刷卡设备代码', '刷卡类型'],
      ['A01', '2026-03-11 08:00:00', 'DEV001', '签入'],
      ['A01', '2026-03-11 18:00:00', 'DEV001', '签出'],
    ];

    // 创建CSV内容
    const csvContent = template.map((row) => row.join(',')).join('\n');

    // 添加BOM以支持Excel打开UTF-8编码的CSV
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `打卡记录导入模板_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    if (importFileList.length === 0) {
      message.warning('请选择要导入的文件');
      return;
    }

    const file = importFileList[0].originFileObj;
    if (!file) {
      message.error('文件读取失败');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);
    importRecordsMutation.mutate(file);
  };

  return (
    <div>
      <Card
        title="打卡记录"
        extra={
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button icon={<UploadOutlined />} onClick={handleImportModalOpen}>
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRecord}>
              补录打卡
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 24 }}>
          <DynamicSearchConditions
            pageCode="punch-records"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ dateRange }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'dateRange' && value && value[0] && value[1]) {
                setDateRange({ start: value[0], end: value[1] });
              }
            }}
          />
        </div>
        <Table
          columns={recordColumns}
          dataSource={filteredRecords}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            total: filteredRecords.length,
            pageSize: 10,
            current: 1,
          }}
        />
      </Card>

      {/* 补录打卡记录弹窗 */}
      <Modal
        title={selectedRecord ? '编辑打卡记录' : '补录打卡记录'}
        open={isRecordModalOpen}
        onOk={handleRecordModalOk}
        onCancel={handleRecordModalCancel}
        confirmLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={recordForm} layout="vertical">
          <Form.Item name="employeeNo" label="员工" rules={[{ required: true, message: '请选择员工' }]}>
            <Select placeholder="请选择员工" showSearch optionFilterProp="children">
              {employees?.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.employeeNo}>
                  {emp.name} ({emp.employeeNo})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="punchTime"
            label="打卡时间"
            rules={[{ required: true, message: '请选择打卡时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder="请选择打卡时间"
            />
          </Form.Item>

          <Form.Item name="deviceId" label="刷卡设备" rules={[{ required: true, message: '请选择刷卡设备' }]}>
            <Select placeholder="请选择刷卡设备">
              {devices?.map((device: any) => (
                <Select.Option key={device.id} value={device.id}>
                  {device.name} ({device.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="punchType" label="刷卡标签" rules={[{ required: true, message: '请选择刷卡标签' }]}>
            <Select placeholder="请选择刷卡标签">
              <Select.Option value="IN">签入</Select.Option>
              <Select.Option value="OUT">签出</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="accountId" label="子劳动力账户">
            <BindingAccountSelect usageType="PUNCH" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入Modal */}
      <Modal
        title="批量导入打卡记录"
        open={isImportModalOpen}
        onCancel={handleImportModalCancel}
        footer={[
          <Button key="cancel" onClick={handleImportModalCancel}>
            取消
          </Button>,
          <Button key="template" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleImport}
            loading={importing}
            disabled={importFileList.length === 0}
          >
            开始导入
          </Button>,
        ]}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                <div>• 请先下载模板，按照模板格式填写数据</div>
                <div>• 支持导入CSV文件，文件大小不超过10MB</div>
                <div>• 根据员工工号和设备代码自动匹配数据</div>
                <div>• 刷卡类型：签入/签出</div>
                <div>• 打卡时间格式：YYYY-MM-DD HH:mm:ss</div>
              </div>
            }
            type="info"
            showIcon
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Upload
            fileList={importFileList}
            onChange={({ fileList }) => setImportFileList(fileList)}
            beforeUpload={(file) => {
              const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
              if (!isCSV) {
                message.error('只能上传CSV文件');
                return Upload.LIST_IGNORE;
              }
              const isLt10M = file.size / 1024 / 1024 < 10;
              if (!isLt10M) {
                message.error('文件大小不能超过10MB');
                return Upload.LIST_IGNORE;
              }
              return false; // 阻止自动上传
            }}
            onRemove={() => setImportFileList([])}
            maxCount={1}
            accept=".csv"
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
        </div>

        {importing && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={importProgress} status={importProgress === 100 ? 'success' : 'active'} />
          </div>
        )}

        {importResult && (
          <Alert
            message="导入完成"
            description={
              <div>
                <div>成功导入：{importResult.successCount} 条</div>
                {importResult.failedCount > 0 && (
                  <div style={{ color: '#ff4d4f' }}>
                    失败：{importResult.failedCount} 条
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 'bold' }}>错误详情：</div>
                    {importResult.errors.map((error: any, index: number) => (
                      <div key={index} style={{ fontSize: 12, color: '#ff4d4f' }}>
                        第 {error.row} 行：{error.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
            type={importResult.failedCount > 0 ? 'warning' : 'success'}
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default PunchRecordPage;

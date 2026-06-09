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
  Select,
  DatePicker,
  message,
  Row,
  Col,
  Typography,
  Tag,
  Upload,
  Tabs,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, LeftOutlined, RightOutlined, UploadOutlined, ImportOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import AccountSelect from '@/components/common/AccountSelect';
import AccountMultiSelect from '@/components/common/AccountMultiSelect';
import EmployeeSelect from '@/components/common/EmployeeSelect';

const { Text } = Typography;
const { TabPane } = Tabs;

interface ProductionRecord {
  id?: number;
  accountId?: number;
  accountCode?: string;
  accountName?: string;
  productId: number;
  productCode?: string;
  productName?: string;
  recordDate: string;
  shiftId?: number;
  shiftName?: string;
  actualQty: number;
  standardHours?: number;
  totalStdHours?: number;
  recorderId: number;
  recorderName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PersonalProductionRecord {
  id?: number;
  recordDate: string;
  employeeNo: string;
  employeeName?: string;
  orgId?: number;
  orgName?: string;
  lineId?: number;
  lineName?: string;
  shiftId?: number;
  shiftName?: string;
  productId: number;
  productCode?: string;
  productName?: string;
  actualQty: number;
  standardHours?: number;
  earnedHours?: number;
  unit?: string;
  recorderId: number;
  recorderName?: string;
  createdAt?: string;
  updatedAt?: string;
}

const NewProductionRecordPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [personalForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPersonalModalVisible, setIsPersonalModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [editingPersonalRecord, setEditingPersonalRecord] = useState<PersonalProductionRecord | null>(null);
  const [activeTab, setActiveTab] = useState('team');

  // 查询条件 - 默认为当天
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [selectedEmployeeNo, setSelectedEmployeeNo] = useState<string>('');

  // 获取产品列表（从数据源获取，与产品配置页面保持一致）
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        // 先获取产品数据源ID
        const dataSources = await request.get('/hr/data-sources');
        const productDataSource = dataSources.find((ds: any) => ds.code === 'PRODUCT');

        if (productDataSource) {
          // 从数据源获取产品选项
          const options = await request.get(`/hr/data-sources/${productDataSource.id}/options`);
          return options.map((item: any) => ({
            id: item.id,
            label: item.label,
            value: item.id,
            name: item.label.split(' - ')[1] || item.label,
            code: item.value,
          }));
        } else {
          console.warn('未找到产品数据源');
          return [];
        }
      } catch (error) {
        console.error('获取产品列表失败:', error);
        return [];
      }
    },
  });

  // 获取班次列表
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const result = await request.get('/shift/shifts');
      return result?.items || result || [];
    },
  });

  // 获取产量记录列表
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['productionRecords', currentDate, selectedAccountIds, selectedProductId, selectedShiftId],
    queryFn: async () => {
      const params: any = {
        recordDate: currentDate.format('YYYY-MM-DD'),
      };

      if (selectedAccountIds.length > 0) {
        // 支持多个产线查询
        params.orgIds = selectedAccountIds.join(',');
      }

      if (selectedProductId) {
        params.productId = selectedProductId;
      }

      if (selectedShiftId) {
        params.shiftId = selectedShiftId;
      }

      const result = await request.get('/allocation/production-records', { params });
      return result?.items || result || [];
    },
    enabled: !!currentDate && activeTab === 'team',
  });

  // 获取个人产量记录列表
  const { data: personalRecords = [], isLoading: isPersonalLoading, refetch: refetchPersonal } = useQuery({
    queryKey: ['personalProductionRecords', currentDate, selectedEmployeeNo, selectedAccountIds, selectedProductId, selectedShiftId],
    queryFn: async () => {
      const params: any = {
        recordDate: currentDate.format('YYYY-MM-DD'),
      };

      if (selectedEmployeeNo) {
        params.employeeNo = selectedEmployeeNo;
      }

      if (selectedAccountIds.length > 0) {
        params.orgIds = selectedAccountIds.join(',');
      }

      if (selectedProductId) {
        params.productId = selectedProductId;
      }

      if (selectedShiftId) {
        params.shiftId = selectedShiftId;
      }

      const result = await request.get('/allocation/personal-production-records', { params });
      return result?.items || result || [];
    },
    enabled: !!currentDate && activeTab === 'personal',
  });

  // 创建或更新产量记录
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // 查找产品（现在 products 来自 Product 表）
      const product = products.find((p: any) => p.id === values.productId);
      const shift = shifts.find((s: any) => s.id === values.shiftId);

      // 获取产线账户信息
      let accountName = '';
      let accountCode = '';
      let accountId = values.accountId;

      if (values.accountId) {
        try {
          // 尝试通过账户ID获取账户信息
          const account = await request.get(`/account/accounts/${values.accountId}`);
          // 优先使用 namePath（完整的层级路径），如果没有则使用 name
          accountName = account.namePath || account.name || '';
          accountCode = account.code || '';
        } catch (error) {
          console.error('获取产线信息失败:', error);
          // 如果获取失败，使用默认值
          accountName = '产线';
          accountCode = '';
        }
      }

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        recordDate: values.recordDate ? values.recordDate.format('YYYY-MM-DD') : currentDate.format('YYYY-MM-DD'),
        orgId: accountId || null,  // 劳动力账户ID
        orgName: accountName || '',  // 劳动力账户名称路径（如：杭州工厂/W1总装车间/W1总装L2产线//焊接）
        lineId: null,  // 暂时不使用
        lineName: accountName || '',  // 劳动力账户名称路径（冗余字段，与orgName相同）
        shiftId: values.shiftId || null,
        shiftName: shift?.name || '',
        productId: product?.id || values.productId,
        productCode: product?.code || '',
        productName: product?.name || '',
        plannedQty: parseInt(values.actualQty) || 0,
        actualQty: parseInt(values.actualQty) || 0,
        qualifiedQty: parseInt(values.actualQty) || 0,
        unqualifiedQty: 0,
        standardHours: 0,
        totalStdHours: 0,
        workHours: 0,
        source: 'MANUAL',
        recorderId: user?.id || 1,
        recorderName: user?.name || 'Admin',
      };

      console.log('保存产量记录，payload:', payload);

      if (editingRecord?.id) {
        return request.put(`/allocation/production-records/${editingRecord.id}`, payload);
      } else {
        return request.post('/allocation/production-records', payload);
      }
    },
    onSuccess: () => {
      message.success(editingRecord ? '更新成功' : '新增成功');
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });
      handleModalCancel();
    },
    onError: (error: any) => {
      console.error('保存失败，错误信息:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '操作失败';
      message.error(errorMsg);
    },
  });

  // 删除产量记录
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/allocation/production-records/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 创建或更新个人产量记录
  const savePersonalMutation = useMutation({
    mutationFn: async (values: any) => {
      const product = products.find((p: any) => p.id === values.productId);
      const shift = shifts.find((s: any) => s.id === values.shiftId);

      // 获取员工信息
      let employeeNo = '';
      let employeeName = '';
      if (values.employeeObj) {
        employeeNo = values.employeeObj.employeeNo || '';
        employeeName = values.employeeObj.name || '';
      }

      // 获取产线账户信息
      let accountName = '';
      let accountId = values.lineId;
      if (values.lineId) {
        try {
          const account = await request.get(`/account/accounts/${values.lineId}`);
          // 优先使用 namePath（完整的层级路径），如果没有则使用 name
          accountName = account.namePath || account.name || '';
        } catch (error) {
          console.error('获取产线信息失败:', error);
        }
      }

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        recordDate: values.recordDate ? values.recordDate.format('YYYY-MM-DD') : currentDate.format('YYYY-MM-DD'),
        employeeNo: employeeNo,
        employeeName: employeeName,
        orgId: accountId || null,  // 劳动力账户ID
        orgName: accountName || '',  // 劳动力账户名称路径
        lineId: null,  // 暂时不使用
        lineName: accountName || '',  // 劳动力账户名称路径（冗余字段）
        shiftId: values.shiftId || null,
        shiftName: shift?.name || '',
        productId: product?.id || values.productId,
        productCode: product?.code || '',
        productName: product?.name || '',
        actualQty: parseInt(values.actualQty) || 0,
        standardHours: 0, // 将从产品信息中获取
        source: 'MANUAL',
        recorderId: user?.id || 1,
        recorderName: user?.name || 'Admin',
      };

      if (editingPersonalRecord?.id) {
        return request.put(`/allocation/personal-production-records/${editingPersonalRecord.id}`, payload);
      } else {
        return request.post('/allocation/personal-production-records', payload);
      }
    },
    onSuccess: () => {
      message.success(editingPersonalRecord ? '更新成功' : '新增成功');
      queryClient.invalidateQueries({ queryKey: ['personalProductionRecords'] });
      handlePersonalModalCancel();
    },
    onError: (error: any) => {
      console.error('保存失败，错误信息:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '操作失败';
      message.error(errorMsg);
    },
  });

  // 删除个人产量记录
  const deletePersonalMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/allocation/personal-production-records/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['personalProductionRecords'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 切换到前一天
  const handlePreviousDay = () => {
    setCurrentDate(currentDate.subtract(1, 'day'));
  };

  // 切换到后一天
  const handleNextDay = () => {
    const nextDay = currentDate.add(1, 'day');
    if (nextDay.isAfter(dayjs(), 'day')) {
      message.warning('不能选择未来日期');
      return;
    }
    setCurrentDate(nextDay);
  };

  // 日期改变
  const handleDateChange = (date: any) => {
    if (date) {
      if (date.isAfter(dayjs(), 'day')) {
        message.warning('不能选择未来日期');
        return;
      }
      setCurrentDate(date);
    }
  };

  // 新增记录
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑记录
  const handleEdit = (record: ProductionRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      recordDate: dayjs(record.recordDate),
      shiftId: record.shiftId,
      accountId: record.lineId || record.orgId,
      productId: record.productId,
      actualQty: record.actualQty,
    });
    setIsModalVisible(true);
  };

  // 删除记录
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条产量记录吗？',
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  // 取消弹窗
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 刷新查询
  const handleRefresh = () => {
    if (activeTab === 'team') {
      refetch();
    } else {
      refetchPersonal();
    }
  };

  // 查询
  const handleSearch = () => {
    if (activeTab === 'team') {
      refetch();
    } else {
      refetchPersonal();
    }
  };

  // 新增个人记录
  const handleAddPersonal = () => {
    setEditingPersonalRecord(null);
    personalForm.resetFields();
    // 设置默认日期为当前选择的日期
    personalForm.setFieldsValue({
      recordDate: currentDate,
    });
    setIsPersonalModalVisible(true);
  };

  // 编辑个人记录
  const handleEditPersonal = async (record: PersonalProductionRecord) => {
    setEditingPersonalRecord(record);

    // 通过employeeNo查询员工信息，获取员工ID
    let employeeId = null;
    let employeeObj = null;
    if (record.employeeNo) {
      try {
        const employee = await request.get(`/hr/employees/${record.employeeNo}`);
        employeeId = employee.id;
        employeeObj = employee;
      } catch (error) {
        console.error('获取员工信息失败:', error);
      }
    }

    personalForm.setFieldsValue({
      recordDate: dayjs(record.recordDate),
      employeeId: employeeId,
      employeeObj: employeeObj,
      shiftId: record.shiftId,
      lineId: record.lineId || record.orgId,
      productId: record.productId,
      actualQty: record.actualQty,
    });
    setIsPersonalModalVisible(true);
  };

  // 删除个人记录
  const handleDeletePersonal = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条个人产量记录吗？',
      onOk: () => {
        deletePersonalMutation.mutate(id);
      },
    });
  };

  // 取消个人记录弹窗
  const handlePersonalModalCancel = () => {
    setIsPersonalModalVisible(false);
    setEditingPersonalRecord(null);
    personalForm.resetFields();
  };

  // 提交个人记录表单
  const handlePersonalModalOk = async () => {
    try {
      const values = await personalForm.validateFields();
      savePersonalMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD') : '-',
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 100,
    },
    {
      title: '产线',
      dataIndex: 'lineName',
      key: 'lineName',
      width: 200,
      render: (text: string, record: ProductionRecord) => {
        const displayName = text || record.orgName || '-';
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{displayName}</div>
          </div>
        );
      },
    },
    {
      title: '产品',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      render: (text: string, record: ProductionRecord) => {
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{text || '-'}</div>
            {record.productCode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.productCode}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '实际产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 120,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>{value}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ProductionRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.id!)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 个人产量记录表格列定义
  const personalColumns = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD') : '-',
    },
    {
      title: '员工',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120,
      render: (text: string, record: PersonalProductionRecord) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{text || '-'}</div>
            {record.employeeNo && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.employeeNo}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 100,
    },
    {
      title: '产线',
      dataIndex: 'lineName',
      key: 'lineName',
      width: 200,
      render: (text: string) => text || '-',
    },
    {
      title: '产品',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      render: (text: string, record: PersonalProductionRecord) => {
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{text || '-'}</div>
            {record.productCode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.productCode}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '实际产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>{value}</span>
      ),
    },
    {
      title: '挣得',
      dataIndex: 'earnedHours',
      key: 'earnedHours',
      width: 100,
      align: 'right' as const,
      render: (value: number, record: PersonalProductionRecord) => {
        const unit = record.unit || '小时';
        return (
          <span style={{ fontWeight: 600, color: '#52c41a' }}>
            {value !== undefined && value !== null ? value.toFixed(2) : '-'} {unit}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: PersonalProductionRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleEditPersonal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeletePersonal(record.id!)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="产量记录"
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            // 切换页签时刷新数据
            if (key === 'team') {
              refetch();
            } else {
              refetchPersonal();
            }
          }}
          tabBarExtraContent={
            <Space>
              {activeTab === 'team' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  新增团队产量
                </Button>
              )}
              {activeTab === 'personal' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPersonal}>
                  新增个人产量
                </Button>
              )}
            </Space>
          }
        >
          <TabPane tab="团队产量" key="team">
        {/* 查询条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
          {/* 日期选择 */}
          <Col>
            <Space size="small">
              <Button
                icon={<LeftOutlined />}
                onClick={handlePreviousDay}
              />
              <DatePicker
                value={currentDate}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
                style={{ width: 130 }}
                allowClear={false}
                disabledDate={(current) => {
                  return current && current.isAfter(dayjs(), 'day');
                }}
              />
              <Button
                icon={<RightOutlined />}
                onClick={handleNextDay}
              />
            </Space>
          </Col>

          {/* 产线选择 */}
          <Col style={{ minWidth: 300 }}>
            <Space>
              <Text strong>产线：</Text>
              <AccountMultiSelect
                value={selectedAccountIds}
                onChange={setSelectedAccountIds}
                placeholder="请选择"
                allowClear
                style={{ minWidth: 220 }}
              />
            </Space>
          </Col>

          {/* 产品选择 */}
          <Col>
            <Space>
              <Text strong>产品：</Text>
              <Select
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder="请选择"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 180 }}
                options={products.map((p: any) => ({
                  label: p.label,
                  value: p.id,
                }))}
              />
            </Space>
          </Col>

          {/* 班次选择 */}
          <Col>
            <Space>
              <Text strong>班次：</Text>
              <Select
                value={selectedShiftId}
                onChange={setSelectedShiftId}
                placeholder="请选择"
                allowClear
                style={{ width: 150 }}
                options={shifts.map((s: any) => ({
                  label: s.name,
                  value: s.id,
                }))}
              />
            </Space>
          </Col>

          {/* 操作按钮 */}
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={records}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: 1,
          }}
          scroll={{ x: 1000 }}
        />
          </TabPane>

          <TabPane tab="个人产量" key="personal">
        {/* 查询条件 */}
        <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
          {/* 日期选择 */}
          <Col>
            <Space size="small">
              <Button
                icon={<LeftOutlined />}
                onClick={handlePreviousDay}
              />
              <DatePicker
                value={currentDate}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
                style={{ width: 130 }}
                allowClear={false}
                disabledDate={(current) => {
                  return current && current.isAfter(dayjs(), 'day');
                }}
              />
              <Button
                icon={<RightOutlined />}
                onClick={handleNextDay}
              />
            </Space>
          </Col>

          {/* 员工选择 */}
          <Col style={{ minWidth: 220 }}>
            <Space>
              <Text strong>员工：</Text>
              <EmployeeSelect
                value={selectedEmployeeNo}
                onChange={setSelectedEmployeeNo}
                placeholder="请选择员工"
                allowClear
                style={{ minWidth: 150 }}
              />
            </Space>
          </Col>

          {/* 产线选择 */}
          <Col style={{ minWidth: 300 }}>
            <Space>
              <Text strong>产线：</Text>
              <AccountMultiSelect
                value={selectedAccountIds}
                onChange={setSelectedAccountIds}
                placeholder="请选择"
                allowClear
                style={{ minWidth: 220 }}
              />
            </Space>
          </Col>

          {/* 产品选择 */}
          <Col>
            <Space>
              <Text strong>产品：</Text>
              <Select
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder="请选择"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 180 }}
                options={products.map((p: any) => ({
                  label: p.label,
                  value: p.id,
                }))}
              />
            </Space>
          </Col>

          {/* 班次选择 */}
          <Col>
            <Space>
              <Text strong>班次：</Text>
              <Select
                value={selectedShiftId}
                onChange={setSelectedShiftId}
                placeholder="请选择"
                allowClear
                style={{ width: 150 }}
                options={shifts.map((s: any) => ({
                  label: s.name,
                  value: s.id,
                }))}
              />
            </Space>
          </Col>

          {/* 操作按钮 */}
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 个人产量数据表格 */}
        <Table
          columns={personalColumns}
          dataSource={personalRecords}
          loading={isPersonalLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: 1,
          }}
          scroll={{ x: 1200 }}
        />
          </TabPane>
        </Tabs>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑产量记录' : '新增产量记录'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={saveMutation.isPending}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="记录日期"
            name="recordDate"
            rules={[{ required: true, message: '请选择记录日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => {
                return current && current.isAfter(dayjs(), 'day');
              }}
            />
          </Form.Item>

          <Form.Item
            label="班次"
            name="shiftId"
          >
            <Select
              placeholder="请选择班次"
              allowClear
              options={shifts.map((s: any) => ({
                label: s.name,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="产线"
            name="accountId"
            rules={[{ required: true, message: '请选择产线' }]}
          >
            <AccountSelect
              placeholder="请选择产线"
              allowClear
              showCreateButton
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="产品"
            name="productId"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select
              placeholder="请选择产品"
              showSearch
              optionFilterProp="label"
              options={products.map((p: any) => ({
                label: p.label,
                value: p.id, // 保持原始类型（可能是字符串或数字）
              }))}
            />
          </Form.Item>

          <Form.Item
            label="实际产量"
            name="actualQty"
            rules={[
              { required: true, message: '请输入实际产量' },
              { type: 'number', min: 0, message: '产量不能为负数' },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              placeholder="请输入实际产量"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增/编辑个人产量记录弹窗 */}
      <Modal
        title={editingPersonalRecord ? '编辑个人产量记录' : '新增个人产量记录'}
        open={isPersonalModalVisible}
        onOk={handlePersonalModalOk}
        onCancel={handlePersonalModalCancel}
        confirmLoading={savePersonalMutation.isPending}
        width={600}
        destroyOnClose
      >
        <Form
          form={personalForm}
          layout="vertical"
        >
          <Form.Item
            label="记录日期"
            name="recordDate"
            rules={[{ required: true, message: '请选择记录日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => {
                return current && current.isAfter(dayjs(), 'day');
              }}
            />
          </Form.Item>

          <Form.Item
            label="员工"
            name="employeeId"
            rules={[{ required: true, message: '请选择员工' }]}
          >
            <EmployeeSelect
              placeholder="请选择员工"
              disabled={!!editingPersonalRecord}
              onChange={(value, employee) => {
                // 当选择员工时，更新表单的两个字段
                personalForm.setFieldsValue({
                  employeeId: value,
                  employeeObj: employee,
                });
              }}
            />
          </Form.Item>
          <Form.Item name="employeeObj" hidden>
            <input type="hidden" />
          </Form.Item>

          <Form.Item
            label="班次"
            name="shiftId"
          >
            <Select
              placeholder="请选择班次"
              allowClear
              options={shifts.map((s: any) => ({
                label: s.name,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="产线"
            name="lineId"
            rules={[{ required: true, message: '请选择产线' }]}
          >
            <AccountSelect
              placeholder="请选择产线"
              allowClear
              showCreateButton
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="产品"
            name="productId"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select
              placeholder="请选择产品"
              showSearch
              optionFilterProp="label"
              options={products.map((p: any) => ({
                label: p.label,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="实际产量"
            name="actualQty"
            rules={[
              { required: true, message: '请输入实际产量' },
              { type: 'number', min: 0, message: '产量不能为负数' },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              placeholder="请输入实际产量"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewProductionRecordPage;

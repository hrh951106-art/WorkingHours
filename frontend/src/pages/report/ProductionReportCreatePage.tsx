import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  Alert,
  Divider,
  Statistic,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';

const { TextArea } = Input;
const { Option } = Select;

const ProductionReportCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // 监听表单字段变化，实时计算总标准工时
  const qualifiedQty = Form.useWatch('qualifiedQty', form);
  const standardHours = Form.useWatch('standardHours', form);

  // 获取产品列表
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return request.get('/allocation/products');
    },
  });

  // 获取班次列表
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      return request.get('/shift/shifts');
    },
  });

  // 获取已发布的工作流定义
  const { data: workflows } = useQuery({
    queryKey: ['workflowDefinitions', 'PRODUCTION_REPORT', 'PUBLISHED'],
    queryFn: async () => {
      return request.get('/workflow/definitions', {
        params: { category: 'PRODUCTION_REPORT', status: 'PUBLISHED' },
      });
    },
  });

  // 创建报工申请
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/report/requests', data),
    onSuccess: () => {
      message.success('报工申请创建成功');
      navigate('/report/list');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
      setLoading(false);
    },
  });

  // 产品选择变更
  const handleProductChange = (value: number, option: any) => {
    setSelectedProduct(option);
    form.setFieldValue('productCode', option.code);
    form.setFieldValue('productName', option.name);
    form.setFieldValue('standardHours', option.standardHours);
    // 重新计算总标准工时
    const currentQualifiedQty = form.getFieldValue('qualifiedQty');
    if (currentQualifiedQty && option.standardHours) {
      form.setFieldValue('totalStdHours', currentQualifiedQty * option.standardHours);
    }
  };

  // 合格数量变更
  const handleQualifiedQtyChange = (value: number) => {
    const currentStandardHours = form.getFieldValue('standardHours');
    if (value && currentStandardHours) {
      form.setFieldValue('totalStdHours', value * currentStandardHours);
    }
  };

  // 实时计算总标准工时
  useEffect(() => {
    if (qualifiedQty && standardHours) {
      const total = (parseFloat(qualifiedQty) || 0) * (parseFloat(standardHours) || 0);
      form.setFieldValue('totalStdHours', parseFloat(total.toFixed(2)));
    }
  }, [qualifiedQty, standardHours, form]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    // 验证实际数量和合格数量的关系
    if (values.actualQty < values.qualifiedQty) {
      message.warning('合格数量不能大于实际数量');
      setLoading(false);
      return;
    }

    // 验证计划数量
    if (values.plannedQty && values.actualQty > values.plannedQty * 1.2) {
      message.warning('实际数量超过计划数量20%，请确认是否正确');
    }

    setLoading(true);

    // 自动计算不合格数量
    const unqualifiedQty = values.actualQty - values.qualifiedQty;

    const data = {
      workflowCode: values.workflowCode,
      title: values.title || `报工申请 - ${values.productName}`,
      reportDate: values.reportDate.format('YYYY-MM-DD'),
      reportType: values.reportType,
      reporterLineId: values.reporterLineId,
      reporterLineName: values.reporterLineName,
      shiftId: values.shiftId,
      shiftName: values.shiftName,
      productId: values.productId,
      productCode: values.productCode,
      productName: values.productName,
      processId: values.processId,
      processName: values.processName,
      plannedQty: values.plannedQty,
      actualQty: values.actualQty,
      qualifiedQty: values.qualifiedQty,
      unqualifiedQty: unqualifiedQty > 0 ? unqualifiedQty : 0,
      standardHours: values.standardHours,
      totalStdHours: values.totalStdHours,
      workHours: values.workHours,
      unqualifiedReason: values.unqualifiedReason,
      rectificationQty: values.rectificationQty,
      attachments: values.attachments,
      remarks: values.remarks,
    };
    createMutation.mutate(data);
  };

  // 计算显示数据
  const displayData = {
    totalStdHours: (parseFloat(qualifiedQty) || 0) * (parseFloat(standardHours) || 0),
    qualifiedRate: form.getFieldValue('actualQty')
      ? ((parseFloat(qualifiedQty) || 0) / parseFloat(form.getFieldValue('actualQty')) * 100).toFixed(1)
      : '0.0',
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="创建报工申请"
        extra={
          <Button onClick={() => navigate('/report/list')}>
            返回列表
          </Button>
        }
      >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          reportDate: dayjs(),
          reportType: '正常报工',
          workflowCode: workflows?.items?.[0]?.code,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="审批流程"
              name="workflowCode"
              rules={[{ required: true, message: '请选择审批流程' }]}
              tooltip="选择该申请使用的审批流程"
            >
              <Select placeholder="请选择审批流程">
                {workflows?.items?.map((workflow: any) => (
                  <Option key={workflow.code} value={workflow.code}>
                    {workflow.name} (v{workflow.version})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="申请标题"
              name="title"
              rules={[{ required: true, message: '请输入申请标题' }]}
            >
              <Input placeholder="请输入申请标题" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="报工日期"
              name="reportDate"
              rules={[{ required: true, message: '请选择报工日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="报工类型"
              name="reportType"
              rules={[{ required: true, message: '请选择报工类型' }]}
            >
              <Select placeholder="请选择报工类型">
                <Option value="正常报工">正常报工</Option>
                <Option value="返工报工">返工报工</Option>
                <Option value="试生产报工">试生产报工</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="产线" name="reporterLineId">
              <Select
                placeholder="请选择产线"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(_, option) => {
                  form.setFieldValue('reporterLineName', option?.label);
                }}
              >
                {/* 这里需要从后端获取产线列表 */}
                <Option value={1}>产线A</Option>
                <Option value={2}>产线B</Option>
              </Select>
            </Form.Item>
            <Form.Item name="reporterLineName" hidden>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="班次" name="shiftId">
              <Select
                placeholder="请选择班次"
                allowClear
                onChange={(_, option) => {
                  form.setFieldValue('shiftName', option?.label);
                }}
              >
                {shifts?.map((shift: any) => (
                  <Option key={shift.id} value={shift.id} label={shift.name}>
                    {shift.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="shiftName" hidden>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="产品"
              name="productId"
              rules={[{ required: true, message: '请选择产品' }]}
            >
              <Select
                placeholder="请选择产品"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={handleProductChange}
              >
                {products?.map((product: any) => (
                  <Option
                    key={product.id}
                    value={product.id}
                    label={product.name}
                    code={product.code}
                    name={product.name}
                    standardHours={product.standardHours}
                  >
                    {product.name} ({product.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="productCode" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="productName" hidden>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">生产数量</Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="计划数量"
              name="plannedQty"
              rules={[{ required: true, message: '请输入计划数量' }]}
              tooltip="预期的生产数量"
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="请输入计划数量"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="实际数量"
              name="actualQty"
              rules={[
                { required: true, message: '请输入实际数量' },
                { type: 'number', min: 0, message: '实际数量不能为负数' },
              ]}
              tooltip="实际生产的总数量"
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="请输入实际数量"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="合格数量"
              name="qualifiedQty"
              rules={[
                { required: true, message: '请输入合格数量' },
                { type: 'number', min: 0, message: '合格数量不能为负数' },
              ]}
              tooltip="质量检验合格的数量"
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="请输入合格数量"
                onChange={handleQualifiedQtyChange}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">工时统计</Divider>

        {selectedProduct && (
          <Alert
            message={`当前选择产品：${selectedProduct.name}（标准工时：${selectedProduct.standardHours || 0} 小时/件）`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="标准工时"
              name="standardHours"
              rules={[{ required: true, message: '请输入标准工时' }]}
              tooltip="单位产品的标准工时消耗"
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonAfter="小时/件"
                placeholder="请输入标准工时"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="总标准工时"
              name="totalStdHours"
              rules={[{ required: true, message: '总标准工时会自动计算' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonAfter="小时"
                placeholder="自动计算"
                readOnly
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="实际工时" name="workHours">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonAfter="小时"
                placeholder="可选"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 实时统计面板 */}
        {(qualifiedQty || standardHours) && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Statistic
                title="总标准工时"
                value={displayData.totalStdHours.toFixed(2)}
                suffix="小时"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="合格率"
                value={displayData.qualifiedRate}
                suffix="%"
                precision={1}
                valueStyle={{ color: parseFloat(displayData.qualifiedRate) >= 95 ? '#52c41a' : '#faad14' }}
              />
            </Col>
          </Row>
        )}

        <Divider orientation="left">其他信息</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="返工数量" name="rectificationQty">
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="可选"
              />
            </Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        <Form.Item
          label="不合格原因"
          name="unqualifiedReason"
          tooltip="当存在不合格产品时，建议填写不合格原因"
        >
          <TextArea
            rows={3}
            placeholder="请描述不合格原因（当合格数量小于实际数量时建议填写）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remarks"
        >
          <TextArea
            rows={3}
            placeholder="请输入备注信息（可选）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading || createMutation.isPending} block size="large">
            提交申请
          </Button>
        </Form.Item>
      </Form>
    </Card>
    </div>
  );
};

export default ProductionReportCreatePage;

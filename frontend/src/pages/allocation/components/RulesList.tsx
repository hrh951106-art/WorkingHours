import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Divider,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Rule {
  id?: number;
  ruleName: string;
  ruleType: string;
  allocationBasis: string;
  priority: number;
  sortOrder: number;
  status: string;
  description?: string;
  targets: Target[];
}

interface Target {
  id?: number;
  targetType: string;
  targetId: number;
  targetName: string;
  targetCode?: string;
  weight: number;
  targetAccountId?: number;
  targetAccountName?: string;
}

interface RulesListProps {
  value?: Rule[];
  onChange?: (rules: Rule[]) => void;
  attendanceCodes?: any[];
}

const RulesList: React.FC<RulesListProps> = ({ value = [], onChange, attendanceCodes = [] }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      ruleType: 'PROPORTIONAL',
      allocationBasis: 'ACTUAL_HOURS',
      priority: 0,
      sortOrder: value.length,
      status: 'ACTIVE',
      targets: [],
    });
    setIsModalVisible(true);
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setIsModalVisible(true);
  };

  const handleDelete = (index: number) => {
    const newRules = [...value];
    newRules.splice(index, 1);
    // 重新排序
    newRules.forEach((rule, i) => {
      rule.sortOrder = i;
    });
    onChange?.(newRules);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const newRule: Rule = {
        ...values,
        targets: values.targets || [],
      };

      let newRules: Rule[];
      if (editingRule) {
        // 更新现有规则
        newRules = value.map((rule) =>
          rule.id === editingRule.id || rule.ruleName === editingRule.ruleName ? newRule : rule
        );
      } else {
        // 添加新规则
        newRules = [...value, newRule];
      }

      onChange?.(newRules);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const ruleTypeOptions = [
    { label: '按比例分摊', value: 'PROPORTIONAL' },
    { label: '平均分摊', value: 'EQUAL' },
    { label: '固定值分摊', value: 'FIXED' },
  ];

  const basisOptions = [
    { label: '实际工时', value: 'ACTUAL_HOURS' },
    { label: '标准工时', value: 'STD_HOURS' },
    { label: '实际产量', value: 'ACTUAL_YIELDS' },
    { label: '产品标准工时', value: 'PRODUCT_STD_HOURS' },
  ];

  const targetTypeOptions = [
    { label: '产线', value: 'LINE' },
    { label: '车间', value: 'WORKSHOP' },
    { label: '班组', value: 'TEAM' },
    { label: '劳动力账户', value: 'ACCOUNT' },
    { label: '成本中心', value: 'COST_CENTER' },
  ];

  const columns = [
    { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName', width: 150 },
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          PROPORTIONAL: { text: '按比例', color: 'blue' },
          EQUAL: { text: '平均分摊', color: 'green' },
          FIXED: { text: '固定值', color: 'orange' },
        };
        const info = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '分摊依据',
      dataIndex: 'allocationBasis',
      key: 'allocationBasis',
      width: 120,
      render: (basis: string) => {
        const basisMap: Record<string, string> = {
          ACTUAL_HOURS: '实际工时',
          STD_HOURS: '标准工时',
          ACTUAL_YIELDS: '实际产量',
          PRODUCT_STD_HOURS: '产品标准工时',
        };
        return basisMap[basis] || basis;
      },
    },
    {
      title: '目标数',
      key: 'targetCount',
      width: 80,
      render: (_: any, record: Rule) => record.targets?.length || 0,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Rule, index: number) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除此规则吗？"
            onConfirm={() => handleDelete(index)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {value.length === 0 ? (
        <Empty description="暂无分摊规则">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加第一条规则
          </Button>
        </Empty>
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={value}
            rowKey={(record) => record.id || record.ruleName}
            pagination={false}
            size="small"
          />
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} block style={{ marginTop: 16 }}>
            添加分摊规则
          </Button>
        </>
      )}

      {/* 规则编辑模态框 */}
      <Modal
        title={editingRule ? '编辑分摊规则' : '添加分摊规则'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={900}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="规则名称"
                name="ruleName"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="规则类型"
                name="ruleType"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select options={ruleTypeOptions} placeholder="请选择规则类型" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="分摊依据"
                name="allocationBasis"
                rules={[{ required: true, message: '请选择分摊依据' }]}
              >
                <Select options={basisOptions} placeholder="请选择分摊依据" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="数字越大优先级越高" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="排序" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="请输入规则描述" />
          </Form.Item>

          <Divider>分摊目标配置</Divider>

          <Form.List name="targets">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 16 }}
                    extra={
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetType']}
                          label="目标类型"
                          rules={[{ required: true, message: '请选择目标类型' }]}
                        >
                          <Select placeholder="请选择">
                            {targetTypeOptions.map((opt) => (
                              <Select.Option key={opt.value} value={opt.value}>
                                {opt.label}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetName']}
                          label="目标名称"
                          rules={[{ required: true, message: '请输入目标名称' }]}
                        >
                          <Input placeholder="如：产线A、车间B" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetId']}
                          label="目标ID"
                          rules={[{ required: true, message: '请输入目标ID' }]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入ID" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'weight']}
                          label="权重/比例"
                          rules={[{ required: true, message: '请输入权重' }]}
                          extra="按比例分摊时填比例，固定值时分摊的工时数"
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0-100" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetAccountName']}
                          label="存储账户名称"
                          rules={[{ required: true, message: '请输入存储账户名称' }]}
                          extra="分摊后的工时存到此账户"
                        >
                          <Input placeholder="如：产线A间接工时" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetAccountId']}
                          label="存储账户ID"
                          rules={[{ required: true, message: '请输入账户ID' }]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入账户ID" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加分摊目标
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ marginTop: 16, padding: 16, background: '#f0f5ff', borderRadius: 4, border: '1px solid #adc6ff' }}>
            <p style={{ marginBottom: 8, fontWeight: 500, color: '#0050b3' }}>
              💡 配置说明
            </p>
            <ul style={{ marginBottom: 0, paddingLeft: 20, color: '#0050b3' }}>
              <li><strong>按比例分摊</strong>：根据各目标的权重比例分配工时（所有目标权重之和为100）</li>
              <li><strong>平均分摊</strong>：将工时平均分配给所有目标</li>
              <li><strong>固定值分摊</strong>：每个目标分配固定数量的工时</li>
              <li><strong>存储账户</strong>：每个目标必须指定一个劳动力账户，用于存储分摊后的工时</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RulesList;

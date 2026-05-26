import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, InputNumber, Select, Space, Tag } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import request from '@/utils/request';
import ParticipantConfigModal from '@/components/workflow/ParticipantConfigModal';

const WorkflowParticipantFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // 获取详情（编辑模式）
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['workflowParticipant', id],
    queryFn: async () => {
      if (id) {
        return request.get(`/workflow/participants/${id}`);
      }
      return null;
    },
    enabled: isEdit,
  });

  // 加载表单数据
  useEffect(() => {
    if (detailData) {
      form.setFieldsValue({
        code: detailData.code,
        name: detailData.name,
        description: detailData.description,
        sortOrder: detailData.sortOrder,
      });
      try {
        const parsedParticipants = JSON.parse(detailData.participants);
        setParticipants(parsedParticipants);
      } catch (e) {
        console.error('解析参与人数据失败:', e);
      }
    }
  }, [detailData, form]);

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/workflow/participants', data),
    onSuccess: () => {
      message.success('创建成功');
      navigate('/workflow/participants');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
      setLoading(false);
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/workflow/participants/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      navigate('/workflow/participants');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
      setLoading(false);
    },
  });

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (participants.length === 0) {
      message.warning('请至少添加一个参与人配置');
      return;
    }

    setLoading(true);
    const data = {
      ...values,
      type: participants.length === 1 && participants[0].type === 'FIXED_USER' ? 'FIXED_USER' : 'ORG_MANAGER',
      participants: JSON.stringify(participants),
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 保存参与人配置
  const handleParticipantOk = (newParticipants: any[]) => {
    setParticipants(newParticipants);
    setParticipantModalVisible(false);
  };

  // 渲染参与人配置摘要
  const renderParticipantSummary = (participant: any, index: number) => {
    if (participant.type === 'FIXED_USER') {
      return (
        <Tag key={index} color="blue">
          固定人员: {participant.userNames?.join('、')}
        </Tag>
      );
    } else {
      return (
        <Tag key={index} color="green">
          {participant.orgLevelName}
        </Tag>
      );
    }
  };

  if (isEdit && isDetailLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card
      title={isEdit ? '编辑参与人配置' : '新增参与人配置'}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflow/participants')}>
          返回列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          sortOrder: 0,
        }}
      >
        <Form.Item
          label="配置代码"
          name="code"
          rules={[
            { required: true, message: '请输入配置代码' },
            { pattern: /^[A-Z0-9_]+$/, message: '只能包含大写字母、数字和下划线' },
          ]}
          tooltip="全局唯一标识，用于系统内部引用"
        >
          <Input placeholder="如：DEPT_MANAGER" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          label="配置名称"
          name="name"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="如：部门经理" />
        </Form.Item>

        <Form.Item label="参与人配置">
          <Button
            type="dashed"
            block
            onClick={() => setParticipantModalVisible(true)}
          >
            {participants.length > 0
              ? `已配置 ${participants.length} 项`
              : '点击配置参与人'}
          </Button>
          {participants.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size="small">
                {participants.map((p, idx) => (
                  <div key={idx}>
                    <span style={{ marginRight: 8, fontWeight: 500 }}>{idx + 1}.</span>
                    {renderParticipantSummary(p, idx)}
                  </div>
                ))}
              </Space>
            </div>
          )}
        </Form.Item>

        <Form.Item label="描述" name="description">
          <Input.TextArea rows={3} placeholder="请输入描述（可选）" />
        </Form.Item>

        <Form.Item
          label="排序"
          name="sortOrder"
          rules={[{ required: true, message: '请输入排序号' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存
            </Button>
            <Button onClick={() => navigate('/workflow/participants')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 参与人配置弹窗 */}
      <ParticipantConfigModal
        visible={participantModalVisible}
        onCancel={() => setParticipantModalVisible(false)}
        onOk={handleParticipantOk}
        initialValue={participants}
        title="配置参与人"
      />
    </Card>
  );
};

export default WorkflowParticipantFormPage;

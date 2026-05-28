import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface FormConfig {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  status: 'configured' | 'not_configured';
  workflowCount: number;
  activeWorkflowId?: number;
}

const FORMS: FormConfig[] = [
  {
    key: 'SUPPORT_REQUEST',
    name: '支援申请',
    description: '车间支援申请流程，用于申请跨车间人员支援',
    category: 'SUPPORT_REQUEST',
    icon: '👥',
    color: '#1890ff',
    status: 'not_configured',
    workflowCount: 0,
  },
  {
    key: 'LABOR_HOUR_REPORT',
    name: '工时报工',
    description: '工时报工申请流程，用于记录和审批工时投入',
    category: 'LABOR_HOUR_REPORT',
    icon: '⏱️',
    color: '#fa8c16',
    status: 'not_configured',
    workflowCount: 0,
  },
];

const FormWorkflowConfigPage: React.FC = () => {
  const navigate = useNavigate();

  // 获取所有流程定义，用于显示配置状态
  const { data: workflowsData } = useQuery({
    queryKey: ['workflowDefinitions'],
    queryFn: async () => {
      return request.get('/workflow/definitions', {
        params: { page: 1, pageSize: 100 },
      });
    },
  });

  // 更新表单配置状态
  const getFormsWithStatus = () => {
    if (!workflowsData?.items) return FORMS;

    return FORMS.map((form) => {
      const categoryWorkflows = workflowsData.items.filter(
        (w: any) => w.category === form.category
      );

      const activeWorkflow = categoryWorkflows.find((w: any) => w.status === 'PUBLISHED');
      const draftWorkflows = categoryWorkflows.filter((w: any) => w.status === 'DRAFT');

      return {
        ...form,
        status: activeWorkflow ? 'configured' : 'not_configured',
        workflowCount: categoryWorkflows.length,
        activeWorkflowId: activeWorkflow?.id,
        hasDraft: draftWorkflows.length > 0,
      };
    });
  };

  const formsWithStatus = getFormsWithStatus();

  const handleConfigure = (form: FormConfig) => {
    // 导航到表单流程配置详情页（使用 embed 路径，不带主布局）
    navigate(`/embed/workflow/form-config/${form.key}`);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>流程配置管理</h2>
        <p style={{ margin: 0, color: '#666' }}>
          配置各业务表单的审批流程和参与人
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {formsWithStatus.map((form) => (
          <Col key={form.key} xs={24} sm={12} lg={8} xl={6}>
            <Card
              hoverable
              style={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              {/* 状态指示条 */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: form.status === 'configured' ? '#52c41a' : '#d9d9d9',
                }}
              />

              {/* 头部 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                  {form.icon}
                </div>
                <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '18px' }}>
                  {form.name}
                  {form.status === 'configured' && (
                    <CheckCircleOutlined
                      style={{
                        color: '#52c41a',
                        marginLeft: '8px',
                        fontSize: '16px',
                      }}
                    />
                  )}
                  {form.hasDraft && (
                    <Tooltip title="存在草稿版本">
                      <ClockCircleOutlined
                        style={{
                          color: '#faad14',
                          marginLeft: '8px',
                          fontSize: '16px',
                        }}
                      />
                    </Tooltip>
                  )}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    minHeight: '40px',
                  }}
                >
                  {form.description}
                </p>
              </div>

              {/* 标签 */}
              <div style={{ marginBottom: '16px' }}>
                <Space size={8} wrap>
                  <Tag color={form.color}>
                    {form.category === 'SUPPORT_REQUEST' ? '支援申请' :
                     form.category === 'LABOR_HOUR_REPORT' ? '工时报工' : form.category}
                  </Tag>
                  {form.workflowCount > 0 && (
                    <Tag color="default">共 {form.workflowCount} 个版本</Tag>
                  )}
                  {form.status === 'configured' && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      已发布
                    </Tag>
                  )}
                  {form.hasDraft && (
                    <Tag color="warning" icon={<ClockCircleOutlined />}>
                      有草稿
                    </Tag>
                  )}
                </Space>
              </div>

              {/* 生效版本信息 */}
              {form.status === 'configured' && (
                <div style={{
                  padding: '8px 12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '12px',
                }}>
                  <div style={{ color: '#52c41a', marginBottom: '4px', fontWeight: 500 }}>
                    当前生效版本
                  </div>
                  <div style={{ color: '#666' }}>
                    点击"编辑配置"可查看或修改流程
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <Button
                type="primary"
                icon={form.status === 'configured' ? <EditOutlined /> : <PlusOutlined />}
                onClick={() => handleConfigure(form)}
                block
                size="large"
                style={{
                  background: form.status === 'configured' ? form.color : undefined,
                  borderColor: form.color,
                }}
              >
                {form.status === 'configured' ? '编辑配置' : '开始配置'}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default FormWorkflowConfigPage;

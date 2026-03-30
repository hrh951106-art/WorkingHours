import { useState, useMemo } from 'react';
import {
  Tree,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Card,
  Space,
  Row,
  Col,
} from 'antd';
import {
  ApartmentOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import request from '@/utils/request';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';

interface Organization {
  id: number;
  code: string;
  name: string;
  type: string;
  level: number;
  parentId?: number;
  leaderId?: number;
  leaderName?: string;
  effectiveDate: string;
  expiryDate?: string;
  status: string;
  children?: Organization[];
}

interface OrgType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

const OrganizationPage: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 获取员工列表（用于负责人选择）
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-leader'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  const { data: orgTypes = [] } = useQuery({
    queryKey: ['orgTypes'],
    queryFn: () => request.get('/hr/org-types').then((res: any) => res || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/organizations', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      handleCancel();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建组织失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/hr/organizations/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新组织失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/hr/organizations/${id}`),
    onSuccess: (_, deletedId) => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      if (selectedOrg?.id === deletedId) {
        setSelectedOrg(null);
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除组织失败:', error);
    },
  });

  const handleAdd = () => {
    setSelectedOrg({
      id: 0,
      code: '',
      name: '',
      type: '',
      level: 1,
      effectiveDate: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'), // 存储为字符串
      status: 'ACTIVE',
    } as any);
    setIsEditing(true);
    form.resetFields();
    // 设置表单默认值，日期字段使用 dayjs 对象
    form.setFieldsValue({
      effectiveDate: dayjs(),
      status: 'ACTIVE'
    });
  };

  const handleSelect = (org: Organization) => {
    setSelectedOrg(org);
    setIsEditing(false);
    form.setFieldsValue({
      ...org,
      effectiveDate: org.effectiveDate ? dayjs(org.effectiveDate) : undefined,
      expiryDate: org.expiryDate ? dayjs(org.expiryDate) : undefined,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('确定要删除这个组织吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setSelectedOrg(null);
    setIsEditing(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 转换日期为 ISO 8601 格式（包含时间部分）
      if (values.effectiveDate) {
        values.effectiveDate = values.effectiveDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      }
      if (values.expiryDate) {
        values.expiryDate = values.expiryDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      }

      // 移除 level 字段，后端会自动计算
      delete values.level;

      // 如果选择了 leaderId，确保 leaderName 也被设置
      if (values.leaderId && !values.leaderName) {
        const employee = employees.find((e: any) => e.id === values.leaderId);
        if (employee) {
          values.leaderName = employee.name;
        }
      }

      if (selectedOrg?.id === 0) {
        // 创建组织时，只允许 CreateOrganizationDto 中定义的字段
        const createData = {
          code: values.code,
          name: values.name,
          type: values.type,
          parentId: values.parentId,
          leaderId: values.leaderId,
          leaderName: values.leaderName,
          effectiveDate: values.effectiveDate,
        };
        createMutation.mutate(createData);
      } else {
        // 更新组织时，只允许 UpdateOrganizationDto 中定义的字段
        const updateData = {
          name: values.name,
          type: values.type,
          parentId: values.parentId,
          leaderId: values.leaderId,
          leaderName: values.leaderName,
          status: values.status,
        };
        updateMutation.mutate({ id: selectedOrg!.id, data: updateData });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const buildTreeData = (orgs: Organization[]): any[] => {
    return orgs.map((org) => ({
      title: `${org.name} (${org.code})`,
      key: org.id,
      value: org.id,
      children: org.children ? buildTreeData(org.children) : undefined,
      data: org,
    }));
  };

  // 过滤树节点
  const filterTreeData = (treeData: any[], searchValue: string): any[] => {
    if (!searchValue) return treeData;

    const filterNode = (nodes: any[]): any[] => {
      return nodes
        .map((node) => {
          const isMatch = node.title.toLowerCase().includes(searchValue.toLowerCase());
          const filteredChildren = node.children ? filterTreeData(node.children, searchValue) : [];

          if (isMatch || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }

          return null;
        })
        .filter((node) => node !== null);
    };

    return filterNode(treeData);
  };

  const filteredTreeData = useMemo(() => {
    const treeData = buildTreeData(orgs);
    return filterTreeData(treeData, searchText);
  }, [orgs, searchText]);

  const flattenOrgs = (orgs: Organization[]): Organization[] => {
    const result: Organization[] = [];
    orgs.forEach((org) => {
      result.push(org);
      if (org.children) {
        result.push(...flattenOrgs(org.children));
      }
    });
    return result;
  };

  return (
    <ModernPageLayout
      title="组织管理"
      description="管理企业的组织架构，支持多层级组织结构管理"
      breadcrumb={[
        { label: '人事管理', path: '/hr' },
        { label: '组织管理', path: '/hr/organizations' },
      ]}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{
            background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
            border: 'none',
            borderRadius: 8,
            height: 40,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(34, 185, 112, 0.3)',
          }}
        >
          新建组织
        </Button>
      }
      stats={[
        {
          title: '组织总数',
          value: flattenOrgs(orgs).length,
          prefix: <ApartmentOutlined style={{ color: '#22B970' }} />,
          color: '#22B970',
        },
        {
          title: '激活组织',
          value: flattenOrgs(orgs).filter((o: any) => o.status === 'ACTIVE').length,
          color: '#10b981',
        },
        {
          title: '最大层级',
          value: Math.max(...flattenOrgs(orgs).map((o: any) => o.level), 0),
          color: '#f59e0b',
        },
      ]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Row gutter={24}>
          <Col span={8}>
            <Card
              title={
                <Space>
                  <span>组织树</span>
                  <Input
                    placeholder="搜索组织"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 200 }}
                    allowClear
                  />
                </Space>
              }
              size="small"
              style={{
                height: 600,
                overflow: 'auto',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
              headStyle={{
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 600,
              }}
            >
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  加载中...
                </div>
              ) : (
                <Tree
                  treeData={filteredTreeData}
                  showLine
                  switcherIcon={<DownOutlined />}
                  onSelect={(_, info) => {
                    if (info.node.data) {
                      handleSelect(info.node.data);
                    }
                  }}
                  titleRender={(nodeData: any) => (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingRight: 16,
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{nodeData.title}</span>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(nodeData.data);
                            handleEdit();
                          }}
                          style={{ color: '#22B970' }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(nodeData.data.id);
                          }}
                        />
                      </Space>
                    </div>
                  )}
                />
              )}
            </Card>
          </Col>

          <Col span={16}>
            <Card
              title={selectedOrg?.id === 0 ? '新建组织' : isEditing ? '编辑组织' : '组织详情'}
              size="small"
              extra={
                selectedOrg && (
                  <Space>
                    {!isEditing && selectedOrg.id !== 0 && (
                      <>
                        <Button
                          icon={<EditOutlined />}
                          onClick={handleEdit}
                          style={{ borderRadius: 8 }}
                        >
                          编辑
                        </Button>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(selectedOrg.id)}
                          style={{ borderRadius: 8 }}
                        >
                          删除
                        </Button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <Button onClick={handleCancel} style={{ borderRadius: 8 }}>
                          取消
                        </Button>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={handleSubmit}
                          loading={createMutation.isPending || updateMutation.isPending}
                          style={{
                            background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
                            border: 'none',
                            borderRadius: 8,
                          }}
                        >
                          保存
                        </Button>
                      </>
                    )}
                  </Space>
                )
              }
              style={{
                height: 600,
                overflow: 'auto',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
              headStyle={{
                borderBottom: '2px solid #e2e8f0',
                fontWeight: 600,
              }}
            >
              {selectedOrg ? (
                <Form
                  form={form}
                  layout="vertical"
                  disabled={!isEditing}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="code"
                        label="组织编码"
                        rules={[{ required: true, message: '请输入组织编码' }]}
                      >
                        <Input
                          placeholder="请输入组织编码"
                          style={{ borderRadius: 8 }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="name"
                        label="组织名称"
                        rules={[{ required: true, message: '请输入组织名称' }]}
                      >
                        <Input
                          placeholder="请输入组织名称"
                          style={{ borderRadius: 8 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="type"
                        label="组织类型"
                        rules={[{ required: true, message: '请选择组织类型' }]}
                      >
                        <Select
                          placeholder="请选择组织类型"
                          disabled={!isEditing}
                          style={{ borderRadius: 8 }}
                        >
                          {orgTypes.map((type: OrgType) => (
                            <Select.Option key={type.id} value={type.code}>
                              {type.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="parentId" label="上级组织">
                        <Select
                          placeholder="请选择上级组织"
                          allowClear
                          style={{ borderRadius: 8 }}
                        >
                          {flattenOrgs(orgs)
                            .filter((o) => o.id !== selectedOrg?.id)
                            .map((org) => (
                              <Select.Option key={org.id} value={org.id}>
                                {org.name}
                              </Select.Option>
                            ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="leaderId" label="负责人">
                        <Select
                          showSearch
                          placeholder="请搜索并选择负责人"
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          allowClear
                          style={{ borderRadius: 8 }}
                          onChange={(value) => {
                            // 当选择员工时，同步更新 leaderName
                            if (value) {
                              const employee = employees.find((e: any) => e.id === value);
                              if (employee) {
                                form.setFieldValue('leaderName', employee.name);
                              }
                            } else {
                              form.setFieldValue('leaderName', undefined);
                            }
                          }}
                        >
                          {employees.map((emp: any) => (
                            <Select.Option
                              key={emp.id}
                              value={emp.id}
                              label={`${emp.name} (${emp.employeeNo})`}
                            >
                              {emp.name} ({emp.employeeNo})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      {/* 隐藏字段，用于存储负责人姓名 */}
                      <Form.Item name="leaderName" hidden>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="level" label="层级">
                        <Input disabled style={{ borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="effectiveDate"
                        label="生效日期"
                        rules={[{ required: true, message: '请选择生效日期' }]}
                      >
                        <DatePicker style={{ width: '100%', borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                    {selectedOrg?.id !== 0 && (
                      <Col span={12}>
                        <Form.Item name="expiryDate" label="失效日期">
                          <DatePicker style={{ width: '100%', borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    )}
                  </Row>

                  {selectedOrg?.id !== 0 && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="status" label="状态">
                          <Select style={{ borderRadius: 8 }}>
                            <Select.Option value="ACTIVE">激活</Select.Option>
                            <Select.Option value="INACTIVE">停用</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                </Form>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                >
                  <ApartmentOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                  请从左侧选择组织或新建组织
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </ModernPageLayout>
  );
};

export default OrganizationPage;

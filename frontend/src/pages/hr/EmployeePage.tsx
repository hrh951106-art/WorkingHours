import { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Space,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  gender: string;
  phone: string;
  email?: string;
  org: { name: string };
  status: string;
}

const EmployeePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', pagination.page, pagination.pageSize, searchKeyword],
    queryFn: () =>
      request.get('/hr/employees', {
        params: { ...pagination, keyword: searchKeyword },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/employees', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      form.resetFields();
    },
  });

  const columns = [
    { title: '员工号', dataIndex: 'employeeNo', key: 'employeeNo' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => (gender === 'MALE' ? '男' : '女'),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '所属组织', dataIndex: ['org', 'name'], key: 'org' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '在职' : '离职'}
        </Tag>
      ),
    },
  ];

  const handleAdd = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(values);
  };

  return (
    <div>
      <Card
        title="人员管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建人员
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索员工号或姓名"
            allowClear
            onSearch={setSearchKeyword}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: data?.page || 1,
            pageSize: data?.pageSize || 10,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) =>
              setPagination({ page, pageSize }),
          }}
        />
      </Card>

      <Modal
        title="新建人员"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="employeeNo"
            label="员工号"
            rules={[{ required: true, message: '请输入员工号' }]}
          >
            <Input placeholder="请输入员工号" />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <Select placeholder="请选择性别">
              <Select.Option value="MALE">男</Select.Option>
              <Select.Option value="FEMALE">女</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="idCard"
            label="身份证号"
            rules={[{ required: true, message: '请输入身份证号' }]}
          >
            <Input placeholder="请输入身份证号" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="orgId"
            label="所属组织"
            rules={[{ required: true, message: '请选择所属组织' }]}
          >
            <Select placeholder="请选择所属组织">
              <Select.Option value={1}>技术部</Select.Option>
              <Select.Option value={2}>人力资源部</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="entryDate"
            label="入职日期"
            rules={[{ required: true, message: '请选择入职日期' }]}
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeePage;

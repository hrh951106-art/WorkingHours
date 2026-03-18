import { useState } from 'react';
import {
  Card,
  Tabs,
  DatePicker,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Row,
  Col,
  Divider,
  Tooltip,
} from 'antd';
import {
  ClockCircleOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  AppstoreOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';
import PunchResultsTab from './tabs/PunchResultsTab';
import WorkHourResultsTab from './tabs/WorkHourResultsTab';

const { RangePicker } = DatePicker;

const WorkHourDetailPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('punch');
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>({
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [searchForm] = useState<any>(null);

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  const tabItems = [
    {
      key: 'punch',
      label: (
        <span>
          <ClockCircleOutlined />
          打卡结果
        </span>
      ),
      children: (
        <PunchResultsTab
          selectedDateRange={selectedDateRange}
          selectedEmployee={dynamicFilters.employeeNo}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['punchPairs'] })}
        />
      ),
    },
    {
      key: 'workhour',
      label: (
        <span>
          <AppstoreOutlined />
          工时结果
        </span>
      ),
      children: (
        <WorkHourResultsTab
          selectedDateRange={selectedDateRange}
          selectedEmployee={dynamicFilters.employeeNo}
        />
      ),
    },
  ];

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  return (
    <ModernPageLayout
      title="工时明细管理"
      description="查看和管理员工打卡结果与工时计算明细，支持编辑、补卡、删除等操作"
      breadcrumb={[
        { label: '考勤管理', path: '/attendance' },
        { label: '工时明细管理', path: '/attendance/workhour-details' },
      ]}
      stats={[]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ marginBottom: 24 }}>
          <DynamicSearchConditions
            pageCode="workhour-details"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={false}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ dateRange: selectedDateRange }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'dateRange' && value && value[0] && value[1]) {
                setSelectedDateRange({ start: value[0], end: value[1] });
              }
            }}
          />
        </div>
      </Card>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{
            margin: 0,
            padding: '0 24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        />
      </Card>
    </ModernPageLayout>
  );
};

export default WorkHourDetailPage;

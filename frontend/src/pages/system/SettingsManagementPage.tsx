import { Layout, Menu, Tabs } from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
  ControlOutlined,
  PieChartOutlined,
  UserOutlined,
  FileTextOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  SnippetsOutlined,
  UserSwitchOutlined,
  SearchOutlined,
  EditOutlined,
  FundOutlined,
  PlayCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';

const { Sider, Content } = Layout;

interface SettingItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SettingCategory {
  key: string;
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

const SettingsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openTabs, setOpenTabs] = useState<Array<{ key: string; label: string; path: string }>>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  // 菜单配置 - 按照用户要求的顺序
  const menuCategories: SettingCategory[] = [
    {
      key: 'hr',
      title: '人事管理',
      icon: <TeamOutlined />,
      items: [
        {
          key: '/embed/hr/data-source-management',
          label: '查找项管理',
          path: '/embed/hr/data-source-management',
          icon: <SearchOutlined />,
        },
        {
          key: '/embed/hr/custom-field-config',
          label: '自定义字段配置',
          path: '/embed/hr/custom-field-config',
          icon: <EditOutlined />,
        },
        {
          key: '/embed/hr/employee-info-config',
          label: '人事信息配置',
          path: '/embed/hr/employee-info-config',
          icon: <SettingOutlined />,
        },
        {
          key: '/embed/hr/unified-search-condition-configs',
          label: '查询条件配置',
          path: '/embed/hr/unified-search-condition-configs',
          icon: <SearchOutlined />,
        },
      ],
    },
    {
      key: 'account',
      title: '劳动力账户',
      icon: <ApartmentOutlined />,
      items: [
        {
          key: '/embed/account',
          label: '劳动力账户',
          path: '/embed/account',
          icon: <ApartmentOutlined />,
        },
      ],
    },
    {
      key: 'shift',
      title: '排班管理',
      icon: <CalendarOutlined />,
      items: [
        {
          key: '/embed/shift/shifts',
          label: '班次管理',
          path: '/embed/shift/shifts',
          icon: <ClockCircleOutlined />,
        },
        {
          key: '/embed/shift/property-config',
          label: '班次属性配置',
          path: '/embed/shift/property-config',
          icon: <SettingOutlined />,
        },
      ],
    },
    {
      key: 'punch',
      title: '打卡管理',
      icon: <ClockCircleOutlined />,
      items: [
        {
          key: '/embed/punch/devices',
          label: '设备管理',
          path: '/embed/punch/devices',
          icon: <SettingOutlined />,
        },
        {
          key: '/embed/punch/device-groups',
          label: '设备组管理',
          path: '/embed/punch/device-groups',
          icon: <ApartmentOutlined />,
        },
      ],
    },
    {
      key: 'calculate',
      title: '计算管理',
      icon: <CalculatorOutlined />,
      items: [
        {
          key: '/embed/calculate/results',
          label: '计算结果',
          path: '/embed/calculate/results',
          icon: <CalculatorOutlined />,
        },
        {
          key: '/embed/calculate/config/punch-rules',
          label: '打卡规则',
          path: '/embed/calculate/config/punch-rules',
          icon: <SettingOutlined />,
        },
        {
          key: '/embed/calculate/config/attendance-codes',
          label: '出勤代码定义',
          path: '/embed/calculate/config/attendance-codes',
          icon: <FundOutlined />,
        },
        {
          key: '/embed/calculate/config/attendance-rule-groups',
          label: '考勤规则组',
          path: '/embed/calculate/config/attendance-rule-groups',
          icon: <SettingOutlined />,
        },
        {
          key: '/embed/calculate/config/amount-policies',
          label: '金额政策',
          path: '/embed/calculate/config/amount-policies',
          icon: <SearchOutlined />,
        },
      ],
    },
    {
      key: 'allocation',
      title: '工时管理',
      icon: <PieChartOutlined />,
      items: [
        {
          key: '/embed/allocation/work-hour-basic-config',
          label: '工时基础配置',
          path: '/embed/allocation/work-hour-basic-config',
          icon: <SettingOutlined />,
        },
        {
          key: '/embed/allocation/product-standard-hours-config',
          label: '产品标准配置',
          path: '/embed/allocation/product-standard-hours-config',
          icon: <ClockCircleOutlined />,
        },
        {
          key: '/embed/calculate/attendance-code-definition',
          label: '工时代码',
          path: '/embed/calculate/attendance-code-definition',
          icon: <BranchesOutlined />,
        },
      ],
    },
    {
      key: 'workflow',
      title: '工作流管理',
      icon: <BranchesOutlined />,
      items: [
        {
          key: '/embed/workflow/form-config',
          label: '表单工作流配置',
          path: '/embed/workflow/form-config',
          icon: <BranchesOutlined />,
        },
        {
          key: '/embed/workflow/definitions',
          label: '流程定义',
          path: '/embed/workflow/definitions',
          icon: <SnippetsOutlined />,
        },
        {
          key: '/embed/workflow/designer',
          label: '流程设计器',
          path: '/embed/workflow/designer',
          icon: <EditOutlined />,
        },
        {
          key: '/embed/workflow/instances',
          label: '流程实例',
          path: '/embed/workflow/instances',
          icon: <FileTextOutlined />,
        },
        {
          key: '/embed/workflow/participants',
          label: '参与人配置',
          path: '/embed/workflow/participants',
          icon: <UserSwitchOutlined />,
        },
      ],
    },
    {
      key: 'system',
      title: '用户与角色',
      icon: <ControlOutlined />,
      items: [
        {
          key: '/embed/system/users',
          label: '用户管理',
          path: '/embed/system/users',
          icon: <UserOutlined />,
        },
        {
          key: '/embed/system/roles',
          label: '角色管理',
          path: '/embed/system/roles',
          icon: <TeamOutlined />,
        },
      ],
    },
  ];

  // 扁平化所有菜单项
  const allMenuItems = menuCategories.reduce((acc, category) => {
    return [...acc, ...category.items];
  }, [] as SettingItem[]);

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    const item = allMenuItems.find((i) => i.key === key);
    if (item) {
      // 检查是否已打开该标签
      const exists = openTabs.find((tab) => tab.key === key);
      if (!exists) {
        setOpenTabs([...openTabs, { key: item.key, label: item.label, path: item.path }]);
      }
      setActiveTab(key);
    }
  };

  // 处理标签关闭
  const handleTabClose = (targetKey: string) => {
    const newOpenTabs = openTabs.filter((tab) => tab.key !== targetKey);
    setOpenTabs(newOpenTabs);

    // 如果关闭的是当前激活的标签，激活最后一个标签
    if (activeTab === targetKey && newOpenTabs.length > 0) {
      const lastTab = newOpenTabs[newOpenTabs.length - 1];
      setActiveTab(lastTab.key);
    } else if (newOpenTabs.length === 0) {
      setActiveTab('');
    }
  };

  // 处理标签切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 监听路由变化，自动打开对应的标签
  useEffect(() => {
    const path = location.pathname;
    const item = allMenuItems.find((i) => i.path === path);
    if (item && activeTab === '') {
      const exists = openTabs.find((tab) => tab.key === item.key);
      if (!exists) {
        setOpenTabs([...openTabs, { key: item.key, label: item.label, path: item.path }]);
      }
      setActiveTab(item.key);
    }
  }, [location.pathname]);

  // 生成左侧菜单项
  const menuItems = menuCategories.map((category) => ({
    key: category.key,
    label: category.title,
    icon: category.icon,
    children: category.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
    })),
  }));

  // 获取当前激活标签的路径
  const activeTabPath = openTabs.find((tab) => tab.key === activeTab)?.path || '';

  return (
    <Layout style={{ minHeight: 'calc(100vh - 120px)', background: '#fff' }}>
      <Sider
        width={240}
        style={{
          background: '#fff',
          borderRight: '1px solid var(--color-border-1)',
          overflowY: 'auto',
        }}
      >
        <Menu
          mode="inline"
          defaultOpenAll={true}
          style={{ borderRight: 0, height: '100%', paddingTop: 16 }}
          items={menuItems}
          onClick={handleMenuClick}
          selectedKeys={[activeTab]}
        />
      </Sider>
      <Content style={{ background: '#fff', padding: 0, overflow: 'hidden' }}>
        {openTabs.length > 0 ? (
          <Tabs
            type="editable-card"
            activeKey={activeTab}
            onChange={handleTabChange}
            onEdit={(targetKey) => handleTabClose(targetKey as string)}
            hideAdd
            style={{ padding: '8px 16px 0' }}
            items={openTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              closable: true,
            }))}
          />
        ) : null}

        <div style={{ padding: activeTab ? '0' : '24px', height: '100%', overflow: 'hidden' }}>
          {activeTab ? (
            <iframe
              key={activeTab}
              src={activeTabPath}
              style={{
                width: '100%',
                height: 'calc(100vh - 180px)',
                border: 'none',
                background: '#f8fafc',
              }}
              title={activeTab}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
              <SettingOutlined style={{ fontSize: 64, marginBottom: 24, opacity: 0.3 }} />
              <div style={{ fontSize: 16, marginTop: 16 }}>请从左侧菜单选择配置项</div>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default SettingsManagementPage;

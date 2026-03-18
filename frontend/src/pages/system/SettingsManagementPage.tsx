import { Card, Row, Col, Typography } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '@/stores/tabsStore';

const { Title, Text } = Typography;

interface SettingItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface SettingCategory {
  key: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: SettingItem[];
}

const SettingsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { addTab } = useTabsStore();

  const settingCategories: SettingCategory[] = [
    {
      key: 'hr',
      title: '人事管理',
      icon: <TeamOutlined />,
      color: '#0ea5e9',
      items: [
        {
          key: '/hr/config/datasources',
          label: '查找项管理',
          path: '/hr/config',
          icon: <SettingOutlined />,
          description: '管理下拉选项数据源',
          color: '#0ea5e9',
        },
        {
          key: '/hr/config/custom-fields',
          label: '自定义字段配置',
          path: '/hr/config',
          icon: <SettingOutlined />,
          description: '配置自定义字段',
          color: '#0ea5e9',
        },
        {
          key: '/hr/config/search-conditions',
          label: '查询条件配置',
          path: '/hr/config',
          icon: <SettingOutlined />,
          description: '配置查询条件字段',
          color: '#0ea5e9',
        },
        {
          key: '/hr/employee-info-config',
          label: '员工信息配置',
          path: '/hr/employee-info-config',
          icon: <SettingOutlined />,
          description: '配置员工信息字段',
          color: '#0ea5e9',
        },
      ],
    },
    {
      key: 'punch',
      title: '打卡管理',
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
      items: [
        {
          key: '/punch/devices',
          label: '设备管理',
          path: '/punch/devices',
          icon: <ClockCircleOutlined />,
          description: '管理打卡设备',
          color: '#f59e0b',
        },
        {
          key: '/punch/device-groups',
          label: '设备组管理',
          path: '/punch/device-groups',
          icon: <SettingOutlined />,
          description: '管理设备分组',
          color: '#f59e0b',
        },
      ],
    },
    {
      key: 'shift',
      title: '排班管理',
      icon: <CalendarOutlined />,
      color: '#52c41a',
      items: [
        {
          key: '/shift/shifts',
          label: '班次管理',
          path: '/shift/shifts',
          icon: <ClockCircleOutlined />,
          description: '管理工作班次',
          color: '#52c41a',
        },
      ],
    },
    {
      key: 'calculate',
      title: '计算管理',
      icon: <CalculatorOutlined />,
      color: '#8b5cf6',
      items: [
        {
          key: '/calculate/config/punch-rules',
          label: '打卡规则',
          path: '/calculate/config/punch-rules',
          icon: <SettingOutlined />,
          description: '配置打卡规则',
          color: '#8b5cf6',
        },
        {
          key: '/calculate/config/attendance-codes',
          label: '出勤代码',
          path: '/calculate/config/attendance-codes',
          icon: <SettingOutlined />,
          description: '配置出勤代码',
          color: '#8b5cf6',
        },
        {
          key: '/calculate/pairing-results',
          label: '摆卡结果',
          path: '/calculate/pairing-results',
          icon: <CalculatorOutlined />,
          description: '查看摆卡结果',
          color: '#8b5cf6',
        },
        {
          key: '/calculate/work-hour-results',
          label: '工时结果',
          path: '/calculate/work-hour-results',
          icon: <ClockCircleOutlined />,
          description: '查看工时结果',
          color: '#8b5cf6',
        },
      ],
    },
    {
      key: 'allocation',
      title: '工时分摊',
      icon: <PieChartOutlined />,
      color: '#ec4899',
      items: [
        {
          key: '/allocation/basic-config',
          label: '通用配置',
          path: '/allocation/basic-config',
          icon: <SettingOutlined />,
          description: '配置分摊通用参数',
          color: '#ec4899',
        },
        {
          key: '/allocation/product-config',
          label: '产品配置',
          path: '/allocation/product-config',
          icon: <SettingOutlined />,
          description: '配置产品信息',
          color: '#ec4899',
        },
        {
          key: '/allocation/results',
          label: '分摊结果查询',
          path: '/allocation/results',
          icon: <FileTextOutlined />,
          description: '查询分摊结果',
          color: '#ec4899',
        },
      ],
    },
    {
      key: 'account',
      title: '劳动力账户',
      icon: <ApartmentOutlined />,
      color: '#10b981',
      items: [
        {
          key: '/account',
          label: '劳动力账户',
          path: '/account',
          icon: <ApartmentOutlined />,
          description: '管理劳动力账户',
          color: '#10b981',
        },
      ],
    },
    {
      key: 'system',
      title: '用户与角色',
      icon: <ControlOutlined />,
      color: '#6366f1',
      items: [
        {
          key: '/system/users',
          label: '用户管理',
          path: '/system/users',
          icon: <UserOutlined />,
          description: '管理系统用户',
          color: '#6366f1',
        },
        {
          key: '/system/roles',
          label: '角色管理',
          path: '/system/roles',
          icon: <SettingOutlined />,
          description: '管理系统角色',
          color: '#6366f1',
        },
      ],
    },
  ];

  const handleSettingClick = (item: SettingItem) => {
    addTab({
      key: item.key,
      label: item.label,
      path: item.path,
      closable: true,
    });
    navigate(item.path);

    // 如果是人事配置相关的入口，需要设置对应的页签
    if (item.path === '/hr/config') {
      // 延迟设置，确保页面已经加载
      setTimeout(() => {
        const tabKeyMap: Record<string, string> = {
          '/hr/config/datasources': 'datasources',
          '/hr/config/custom-fields': 'customFields',
          '/hr/config/search-conditions': 'search-conditions',
        };
        const targetTab = tabKeyMap[item.key];
        if (targetTab) {
          // 通过sessionStorage传递要激活的页签
          sessionStorage.setItem('hr-config-active-tab', targetTab);
        }
      }, 100);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        系统配置
      </Title>
      <Text type="secondary" style={{ marginBottom: 32, display: 'block' }}>
        集中管理系统各类配置项，按功能模块分类
      </Text>

      <Row gutter={[16, 16]}>
        {settingCategories.map((category) => (
          <Col xs={24} sm={24} md={12} lg={12} xl={8} key={category.key}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      fontSize: 20,
                      color: category.color,
                    }}
                  >
                    {category.icon}
                  </div>
                  <span>{category.title}</span>
                </div>
              }
              style={{ height: '100%' }}
            >
              <Row gutter={[12, 12]}>
                {category.items.map((item) => (
                  <Col xs={24} sm={12} key={item.key}>
                    <Card
                      hoverable
                      onClick={() => handleSettingClick(item)}
                      style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.3s',
                      }}
                      bodyStyle={{ padding: '20px 16px' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = category.color;
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#f0f0f0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div
                        style={{
                          fontSize: 32,
                          color: item.color,
                          marginBottom: 12,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div
                        style={{
                          fontWeight: 'bold',
                          fontSize: 14,
                          marginBottom: 4,
                          color: '#1e293b',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                        }}
                      >
                        {item.description}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default SettingsManagementPage;

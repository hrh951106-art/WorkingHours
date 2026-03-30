import { Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '@/stores/tabsStore';

const MultipleTabs: React.FC = () => {
  const navigate = useNavigate();
  const { tabs, activeKey, setActiveKey, removeTab } = useTabsStore();

  // 分离工作台页签和其他页签
  const dashboardTab = tabs.find((t) => t.key === '/dashboard');
  const otherTabs = tabs.filter((t) => t.key !== '/dashboard');

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    const tab = tabs.find((t) => t.key === key);
    if (tab) {
      navigate(tab.path);
    }
  };

  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove') {
      const key = typeof targetKey === 'string' ? targetKey : activeKey;

      // 调用 removeTab 并获取新的活动标签信息
      const { newActiveTab } = removeTab(key);

      // 如果有新的活动标签，导航到该标签的路径
      if (newActiveTab) {
        navigate(newActiveTab.path);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', overflow: 'hidden', maxWidth: '100%' }}>
      {/* 工作台页签固定显示 */}
      {dashboardTab && (
        <div
          key={dashboardTab.key}
          onClick={() => handleTabChange(dashboardTab.key)}
          className={`dashboard-tab ${activeKey === dashboardTab.key ? 'dashboard-tab-active' : ''}`}
        >
          {dashboardTab.label}
        </div>
      )}

      {/* 其他页签可滚动 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', overflowX: 'auto', overflowY: 'hidden' }}>
        <Tabs
          type="editable-card"
          activeKey={activeKey}
          onChange={handleTabChange}
          onEdit={handleTabEdit}
          hideAdd
          items={otherTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            closable: tab.closable,
          }))}
          style={{
            marginBottom: 0,
          }}
          tabBarStyle={{
            marginBottom: 0,
            fontWeight: 500,
            borderBottom: 'none',
            border: 'none',
          }}
          styles={{
            item: {
              borderRadius: 0,
              border: 'none',
              flexShrink: 0,
            },
            itemSelected: {
              borderRadius: 0,
              border: 'none',
            },
            itemHover: {
              borderRadius: 0,
              border: 'none',
            },
            nav: {
              marginBottom: 0,
              border: 'none',
              marginLeft: 0,
              paddingLeft: 0,
            },
          }}
          className="custom-tabs ant-tabs"
        />
      </div>
    </div>
  );
};

export default MultipleTabs;

import { Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '@/stores/tabsStore';

const MultipleTabs: React.FC = () => {
  const navigate = useNavigate();
  const { tabs, activeKey, setActiveKey, removeTab } = useTabsStore();

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
    <div
      style={{
        borderTop: '1px solid #f0f0f0',
      }}
    >
      <Tabs
        type="editable-card"
        activeKey={activeKey}
        onChange={handleTabChange}
        onEdit={handleTabEdit}
        hideAdd
        items={tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          closable: tab.closable,
        }))}
        style={{
          marginBottom: 0,
        }}
      />
    </div>
  );
};

export default MultipleTabs;

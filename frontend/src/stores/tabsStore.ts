import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabItem {
  key: string;
  label: string;
  path: string;
  closable: boolean;
}

interface TabsStore {
  tabs: TabItem[];
  activeKey: string;
  addTab: (tab: TabItem) => void;
  removeTab: (key: string) => { newActiveKey: string; newActiveTab: TabItem | null };
  setActiveKey: (key: string) => void;
  closeOtherTabs: (key: string) => void;
  closeAllTabs: () => void;
}

export const useTabsStore = create<TabsStore>()(
  persist(
    (set, get) => ({
      tabs: [
        { key: '/dashboard', label: '工作台', path: '/dashboard', closable: false }
      ],
      activeKey: '/dashboard',
      addTab: (tab) => {
        const { tabs } = get();
        const existingTab = tabs.find((t) => t.key === tab.key);
        if (existingTab) {
          set({ activeKey: tab.key });
          return;
        }
        set({ tabs: [...tabs, tab], activeKey: tab.key });
      },
      removeTab: (key) => {
        const { tabs, activeKey } = get();
        if (tabs.length === 1) return { newActiveKey: activeKey, newActiveTab: tabs[0] }; // 至少保留一个标签

        const newTabs = tabs.filter((t) => t.key !== key);
        let newActiveKey = activeKey;
        let newActiveTab: TabItem | null = null;

        if (activeKey === key) {
          // 如果关闭的是当前激活的标签，激活相邻的标签
          const currentIndex = tabs.findIndex((t) => t.key === key);
          const adjacentTab = newTabs[currentIndex - 1] || newTabs[0];
          newActiveKey = adjacentTab?.key || '/dashboard';
          newActiveTab = adjacentTab || null;
        } else {
          // 如果关闭的不是当前标签，保持当前活动标签
          newActiveTab = tabs.find((t) => t.key === activeKey) || null;
        }

        set({ tabs: newTabs, activeKey: newActiveKey });

        return { newActiveKey, newActiveTab };
      },
      setActiveKey: (key) => {
        set({ activeKey: key });
      },
      closeOtherTabs: (key) => {
        const { tabs } = get();
        const dashboardTab = tabs.find((t) => t.key === '/dashboard');
        const currentTab = tabs.find((t) => t.key === key);
        if (currentTab && dashboardTab) {
          set({ tabs: [dashboardTab, currentTab], activeKey: key });
        }
      },
      closeAllTabs: () => {
        const { tabs } = get();
        const dashboardTab = tabs.find((t) => t.key === '/dashboard');
        if (dashboardTab) {
          set({ tabs: [dashboardTab], activeKey: '/dashboard' });
        }
      },
    }),
    {
      name: 'tabs-storage',
    }
  )
);

'use client';

import React from 'react';
import { App, Layout, notification, theme } from 'antd';
import useLocalStorageState from '@/hooks/useLocalStorageState';
import AppSidebar from './AppSidebar';
import { notificationHolder } from '@/lib/notification';

const { Header, Content } = Layout;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [collapsed, setCollapsed] = useLocalStorageState('sidebarCollapsed', false);
  const [api, contextHolder] = notification.useNotification();

  // 将具有上下文的 api 实例赋值给 holder
  notificationHolder.instance = api as any;

  const sidebarWidth = collapsed ? 80 : 200;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s' }}>
        <Content style={{ margin: '0', overflow: 'initial' }}>
          <div
            style={{
              padding: 24,
              minHeight: '100vh',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
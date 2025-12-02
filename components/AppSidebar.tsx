'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  DesktopOutlined,
  FileOutlined,
  SettingOutlined,
  SoundOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Sider } = Layout;

// 定义 props 类型
interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export default function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    { key: '/', icon: <DesktopOutlined />, label: '首页' },
    { key: '/test', icon: <SoundOutlined />, label: '测试' },
    { key: '/plugins', icon: <FileOutlined />, label: '插件' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置' },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null} // 使用自定义触发器
      theme="dark"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Menu
        theme="dark"
        defaultSelectedKeys={[pathname]}
        mode="inline"
        inlineCollapsed={collapsed}
        onClick={(e) => {
          if (e.key === 'collapse-trigger') {
            onCollapse(!collapsed);
          } else {
            router.push(e.key);
          }
        }}
        style={{ flex: 1, borderRight: 0 }}
        items={[
          {
            key: 'collapse-trigger',
            icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
            label: '收起侧边栏',
          },
          ...menuItems,
        ]}
      />
    </Sider>
  );
}
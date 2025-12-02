import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { getThemeConfig } from '@/lib/themeConfig';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TTS Web Server',
  description: 'Web-based TTS Server compatible with Android plugins',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider locale={zhCN} theme={getThemeConfig()}>
             <App>{children}</App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

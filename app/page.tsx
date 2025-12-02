'use client';

import React from 'react';
import { Card, Typography, Space } from 'antd';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <MainLayout>
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Title>欢迎使用 TTS Web</Title>
        <Paragraph>
          这是一个功能强大的文本转语音（Text-to-Speech）Web 应用，支持动态插件。
        </Paragraph>
        <Space size="large" wrap>
          <Link href="/test" passHref>
            <Card hoverable style={{ width: 300 }}>
              <Title level={3}>前往测试页</Title>
              <Paragraph>在这里，您可以测试安装的 TTS 插件，调整各种语音参数并生成音频。</Paragraph>
            </Card>
          </Link>
          <Link href="/plugins" passHref>
            <Card hoverable style={{ width: 300 }}>
              <Title level={3}>管理插件</Title>
              <Paragraph>导入、查看和管理所有可用的 TTS 插件。</Paragraph>
            </Card>
          </Link>
          <Link href="/settings" passHref>
            <Card hoverable style={{ width: 300 }}>
              <Title level={3}>系统设置</Title>
              <Paragraph>配置系统级别的参数，例如缓存策略和默认值。</Paragraph>
            </Card>
          </Link>
        </Space>
      </div>
    </MainLayout>
  );
}
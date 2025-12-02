'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { App, Card, Typography, Button, Modal, Spin, Upload } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import MainLayout from '@/components/MainLayout';
import PluginList from '@/components/PluginList';
import PluginConfigModal from '@/components/PluginConfigModal';
import { getPlugins, deletePlugin, updatePlugin, importPlugins } from '@/lib/services/api';
import type { Plugin } from '@prisma/client';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

function PluginsPageContent() {
  const { modal, message } = App.useApp();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  
  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlugins();
      setPlugins(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);
  
  const handleToggle = async (pluginId: string, isEnabled: boolean) => {
    try {
      await updatePlugin(pluginId, { isEnabled });
      message.success(`插件 ${isEnabled ? '启用' : '禁用'}成功`);
      loadPlugins();
    } catch (e) {
      // 错误已在 api service 中处理
    }
  };
  
  const handleDelete = (pluginId: string) => {
     modal.confirm({
      title: '确定要删除这个插件吗？',
      content: '删除后，所有相关数据将无法恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePlugin(pluginId);
          message.success('插件删除成功');
          loadPlugins();
        } catch (e) {
          // 错误已在 api service 中处理
        }
      },
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          message.error('文件内容读取错误');
          return;
        }
        const pluginData = JSON.parse(content);
        const pluginsToImport = Array.isArray(pluginData) ? pluginData : [pluginData];
        await importPlugins(pluginsToImport);
        message.success('插件导入成功');
        loadPlugins();
      } catch (err) {
        message.error('导入失败，请检查文件格式是否正确。');
      }
    };
    reader.readAsText(file);
    return false; // 阻止 antd 的默认上传行为
  };
  
  const handleConfigure = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setIsModalOpen(true);
  };
  
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPlugin(null);
  };

  return (
    <MainLayout>
      <Card>
        <Title level={2}>插件管理</Title>
        <Paragraph>
          在这里，您可以导入、导出、启用、禁用和配置 TTS 插件。
        </Paragraph>
        
        <Dragger
          name="file"
          multiple={false}
          beforeUpload={handleFileUpload}
          accept=".json"
          style={{ marginBottom: 24 }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽插件文件 (.json) 到此区域以上传</p>
          <p className="ant-upload-hint">
            支持单个或多个插件的 JSON 文件。
          </p>
        </Dragger>

        <PluginList
          plugins={plugins}
          loading={loading}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onConfigure={handleConfigure}
        />
      </Card>
      
      <PluginConfigModal
        plugin={selectedPlugin}
        open={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => {
          loadPlugins();
          handleModalClose();
        }}
      />
    </MainLayout>
  );
}

export default function PluginsPage() {
  return (
    <App>
      <PluginsPageContent />
    </App>
  );
}
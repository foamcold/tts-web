import React, { useEffect } from 'react';
import { App, Modal, Form, Input, InputNumber } from 'antd';
import type { Plugin } from '@prisma/client';
import { updatePlugin } from '@/lib/services/api';

interface PluginConfigModalProps {
  plugin: Plugin | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PluginConfigModal: React.FC<PluginConfigModalProps> = ({ plugin, open, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    if (plugin) {
      form.setFieldsValue({
        ...plugin,
        // 确保版本号是数字
        version: Number(plugin.version),
      });
    }
  }, [plugin, form]);

  const handleOk = async () => {
    try {
      if (!plugin || !plugin.pluginId) {
        message.error('未找到有效的插件 ID');
        return;
      }
      const values = await form.validateFields();
      await updatePlugin(plugin.pluginId, values);
      message.success('插件信息更新成功');
      onSuccess();
      onClose();
    } catch (error) {
      // API service ahtomatically handles error messages
    }
  };

  return (
    <Modal
      title={`配置插件 - ${plugin?.name}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" name="plugin_config_form" initialValues={plugin || {}}>
        <Form.Item
          name="name"
          label="插件名称"
          rules={[{ required: true, message: '请输入插件名称!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="pluginId"
          label="插件 ID"
          rules={[{ required: true, message: '请输入插件 ID!' }]}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item name="author" label="作者">
          <Input />
        </Form.Item>
        <Form.Item
          name="version"
          label="版本"
          rules={[{ required: true, message: '请输入版本号!' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PluginConfigModal;
// components/PluginList.tsx
import React from 'react';
import { Table, Switch, Button, Popconfirm, Tag, Tooltip, Space } from 'antd';
import { DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { Plugin } from '@/types';
import type { TableProps } from 'antd';

interface Props {
  plugins: Plugin[];
  loading: boolean;
  onToggle: (pluginId: string, isEnabled: boolean) => void;
  onDelete: (pluginId: string) => void;
  onConfigure: (plugin: Plugin) => void;
}

export default function PluginList({ plugins, loading, onToggle, onDelete, onConfigure }: Props) {
  const columns: TableProps<Plugin>['columns'] = [
    {
      title: '插件名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '插件 ID',
      dataIndex: 'pluginId',
      key: 'pluginId',
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      render: (author) => author || '未知',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.isEnabled ? 'green' : 'default'}>
          {record.isEnabled ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="启用/禁用">
            <Switch
              checked={record.isEnabled}
              onChange={(checked) => onToggle(record.pluginId, checked)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="配置">
            <Button
              icon={<SettingOutlined />}
              onClick={() => onConfigure(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个插件吗？"
            onConfirm={() => onDelete(record.pluginId)}
            okText="是的"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={plugins}
      loading={loading}
      pagination={false}
    />
  );
}
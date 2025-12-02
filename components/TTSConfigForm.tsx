// components/TTSConfigForm.tsx
import React from 'react';
import { Form, Select, Slider, Input, Button, Row, Col, Alert, Switch } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { TextArea } = Input;
const { Option } = Select;

interface Props {
  form: any;
  plugins: any[];
  locales: string[];
  voices: Record<string, string>;
  loading: boolean;
  submitting: boolean;
  debugMode?: boolean;
  onFinish: (values: any) => void;
  onPluginChange: (pluginId: string) => void;
  onLocaleChange: (locale: string) => void;
  onDebugModeChange?: (checked: boolean) => void;
  mode?: 'test' | 'settings';
}

export default function TTSConfigForm({
  form,
  plugins,
  locales,
  voices,
  loading,
  submitting,
  debugMode = false,
  onFinish,
  onPluginChange,
  onLocaleChange,
  onDebugModeChange,
  mode = 'test'
}: Props) {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        speed: 50,
        volume: 50,
        pitch: 50,
        text: '你好，欢迎使用 TTS Web Server。'
      }}
    >
      <Form.Item
        label="插件"
        name="pluginId"
        rules={[{ required: true, message: '请选择一个插件' }]}
        help={plugins.length === 0 && !loading ? (
          <Alert
            title="没有可用的插件"
            description={<span>请前往 <Link href="/plugins">插件管理</Link> 页面导入一个插件。</span>}
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
          />
        ) : null}
      >
        <Select onChange={onPluginChange} loading={loading} placeholder="请选择一个插件">
          {plugins.map(p => (
            <Option key={p.id} value={p.pluginId}>{p.name}</Option>
          ))}
        </Select>
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="语言" name="locale">
            <Select onChange={onLocaleChange} loading={loading}>
              {locales.map(l => <Option key={l} value={l}>{l}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="发音人" name="voice">
            <Select loading={loading} showSearch optionFilterProp="children">
              {Object.entries(voices).map(([k, v]) => (
                <Option key={k} value={k}>{v} ({k})</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {mode === 'test' && (
        <>
          <Form.Item label="文本内容" name="text" rules={[{ required: true }]}>
            <TextArea rows={4} maxLength={5000} showCount />
          </Form.Item>

          <Form.Item label="调试模式" name="debug" valuePropName="checked">
            <Switch checked={debugMode} onChange={onDebugModeChange} checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </>
      )}

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="语速" name="speed">
            <Slider />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="音量" name="volume">
            <Slider />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="音高" name="pitch">
            <Slider />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting} icon={<SoundOutlined />} block size="large">
          {mode === 'test' ? '生成音频' : '保存设置'}
        </Button>
      </Form.Item>
    </Form>
  );
}
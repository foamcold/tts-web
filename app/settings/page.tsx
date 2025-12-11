'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Form, Switch, Select, Button, Row, Col, Divider, InputNumber, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import MainLayout from '@/components/MainLayout';
import TTSConfigForm from '@/components/TTSConfigForm';
import { getPlugins, getPluginMeta, getConfig, saveConfig } from '@/lib/services/api';
import { notify } from '@/components/Notification';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// 日志等级选项
const LOG_LEVEL_OPTIONS = [
  { value: 'DEBUG', label: 'DEBUG - 调试级别（输出所有日志）' },
  { value: 'INFO', label: 'INFO - 信息级别（默认）' },
  { value: 'WARN', label: 'WARN - 警告级别' },
  { value: 'ERROR', label: 'ERROR - 错误级别（仅输出错误）' },
];

// 默认系统配置
const DEFAULT_SYSTEM_CONFIG = {
  cacheEnabled: true,
  cacheMaxCount: 100,
  logLevel: 'INFO',
  retryMaxCount: 10,
  retryIntervalSeconds: 10,
  queueTimeoutSeconds: 300,
};

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [systemForm] = Form.useForm();
  const cacheEnabled = Form.useWatch('cacheEnabled', systemForm);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [voices, setVoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [systemSubmitting, setSystemSubmitting] = useState(false);

  const loadPlugins = useCallback(async () => {
    try {
      const allPlugins = await getPlugins();
      const enabledPlugins = allPlugins.filter((p: any) => p.isEnabled);
      setPlugins(enabledPlugins);
      return enabledPlugins;
    } catch (e) {
      // error handled in api service
    }
    return [];
  }, []);

  const handlePluginChange = async (pluginId: string, locale?: string) => {
    setLoading(true);
    setVoices({});
    try {
      if (!locale) {
        setLocales([]);
        form.setFieldsValue({ locale: undefined, voice: undefined });
      }

      const { locales: fetchedLocales, voices: fetchedVoices } = await getPluginMeta(pluginId, locale);

      if (!locale) {
        setLocales(fetchedLocales);
        if (fetchedLocales.length > 0) {
          const defaultLocale = fetchedLocales[0];
          form.setFieldsValue({ locale: defaultLocale });
          handlePluginChange(pluginId, defaultLocale);
          return;
        }
      }

      setVoices(fetchedVoices);
      const voiceKeys = Object.keys(fetchedVoices);
      if (voiceKeys.length > 0) {
        const currentVoice = form.getFieldValue('voice');
        if (!currentVoice || !fetchedVoices[currentVoice]) {
          form.setFieldsValue({ voice: voiceKeys[0] });
        }
      }
    } catch (e) {
      // error handled in api service
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = useCallback(async (enabledPlugins: any[]) => {
    try {
      // 加载 TTS 默认配置
      const config = await getConfig('default-tts-config');
      if (config && Object.keys(config).length > 0) {
        form.setFieldsValue(config);
        if (config.pluginId) {
          const pluginExists = enabledPlugins.some(p => p.pluginId === config.pluginId);
          if (pluginExists) {
            await handlePluginChange(config.pluginId, config.locale);
            // Ensure voice is set correctly after voices are loaded
            if (config.voice) {
              form.setFieldsValue({ voice: config.voice });
            }
          }
        }
      }

      // 加载系统配置
      const systemConfig = await getConfig('system-config');
      
      // 合并数据库配置和默认配置
      const mergedConfig: any = { ...DEFAULT_SYSTEM_CONFIG };
      
      if (systemConfig) {
        Object.keys(systemConfig).forEach(key => {
          const val = systemConfig[key];
          if (val !== null && val !== undefined && val !== '') {
            // 确保数字类型的字段被正确转换，防止字符串导致 InputNumber 校验失败
            if (['cacheMaxCount', 'retryMaxCount', 'retryIntervalSeconds', 'queueTimeoutSeconds'].includes(key)) {
              const numVal = Number(val);
              if (!isNaN(numVal)) {
                mergedConfig[key] = numVal;
              }
            } else {
              mergedConfig[key] = val;
            }
          }
        });
      }
      
      // 重置表单并设置新值
      systemForm.resetFields();
      systemForm.setFieldsValue(mergedConfig);
    } catch (e) {
      // error handled in api service
    }
  }, [form, systemForm]);

  useEffect(() => {
    const init = async () => {
      const enabledPlugins = await loadPlugins();
      await loadConfig(enabledPlugins);
    };
    init();
  }, [loadPlugins, loadConfig]);

  // 保存 TTS 默认配置
  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await saveConfig('default-tts-config', values);
      notify.success('保存成功', '默认音频配置已更新。');
    } catch (e) {
      // error handled in api service
    } finally {
      setSubmitting(false);
    }
  };

  // 保存系统配置
  const onSystemFinish = async (values: any) => {
    setSystemSubmitting(true);
    try {
      await saveConfig('system-config', values);
      notify.success('保存成功', '系统配置已更新。');
    } catch (e) {
      // error handled in api service
    } finally {
      setSystemSubmitting(false);
    }
  };

  return (
    <MainLayout>
      {/* 默认音频配置卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={2}>系统设置</Title>
        <Paragraph>
          在这里配置的参数将作为所有 TTS API 请求的默认值。如果在 API 请求中指定了相同参数，则请求中的值会覆盖此处的默认设置。
        </Paragraph>
        <Title level={4} style={{ marginBottom: 16 }}>默认音频配置</Title>
        <TTSConfigForm
          form={form}
          plugins={plugins}
          locales={locales}
          voices={voices}
          loading={loading}
          submitting={submitting}
          onFinish={onFinish}
          onPluginChange={(v) => handlePluginChange(v)}
          onLocaleChange={(l) => handlePluginChange(form.getFieldValue('pluginId'), l)}
          mode="settings"
        />
      </Card>

      {/* 系统选项卡片 */}
      <Card>
        <Title level={4} style={{ marginBottom: 16 }}>系统选项</Title>
        <Form
          form={systemForm}
          layout="vertical"
          onFinish={onSystemFinish}
          initialValues={DEFAULT_SYSTEM_CONFIG}
        >
          <Title level={5} style={{ marginBottom: 16 }}>缓存设置</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            开启后，相同参数的 TTS 请求将使用缓存结果以提高响应速度。当缓存数量超过上限时，系统将自动清理最旧的记录。
          </Paragraph>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="启用缓存"
                name="cacheEnabled"
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="缓存数量上限">
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item
                    name="cacheMaxCount"
                    noStyle
                    rules={[{ required: true, message: '请输入缓存数量' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100000}
                      style={{ width: '100%' }}
                      placeholder="默认: 100"
                      disabled={!cacheEnabled}
                    />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: 'none', color: 'rgba(0, 0, 0, 0.45)', backgroundColor: '#fafafa', borderColor: '#d9d9d9' }}>条</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>队列设置</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            TTS 请求会按插件分别排队处理，确保每个请求完整执行后再处理下一个。
          </Paragraph>
          
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="队列等待超时"
                extra="请求在队列中的最大等待时间（30-600秒）"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item
                    name="queueTimeoutSeconds"
                    noStyle
                    rules={[{ required: true, message: '请输入超时时间' }]}
                  >
                    <InputNumber
                      min={30}
                      max={600}
                      style={{ width: '100%' }}
                      placeholder="默认: 300"
                    />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: 'none', color: 'rgba(0, 0, 0, 0.45)', backgroundColor: '#fafafa', borderColor: '#d9d9d9' }}>秒</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>错误重试设置</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            当 TTS 生成失败时，系统会自动重试。您可以配置重试次数和每次重试之间的间隔时间。
          </Paragraph>
          
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="错误重试次数"
                extra="TTS 生成失败时的最大重试次数（1-100）"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item
                    name="retryMaxCount"
                    noStyle
                    rules={[{ required: true, message: '请输入重试次数' }]}
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: '100%' }}
                      placeholder="默认: 10"
                    />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: 'none', color: 'rgba(0, 0, 0, 0.45)', backgroundColor: '#fafafa', borderColor: '#d9d9d9' }}>次</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="错误重试间隔"
                extra="每次重试之间的等待时间（1-60秒）"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item
                    name="retryIntervalSeconds"
                    noStyle
                    rules={[{ required: true, message: '请输入重试间隔' }]}
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      style={{ width: '100%' }}
                      placeholder="默认: 10"
                    />
                  </Form.Item>
                  <Button disabled style={{ pointerEvents: 'none', color: 'rgba(0, 0, 0, 0.45)', backgroundColor: '#fafafa', borderColor: '#d9d9d9' }}>秒</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>高级设置</Title>
           <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            此处的设置为系统的高级选项，修改时请确认了解其作用。
          </Paragraph>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="日志等级"
                name="logLevel"
                extra="设置服务端日志输出的最低等级，等级越低输出的日志越详细"
              >
                <Select>
                  {LOG_LEVEL_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={systemSubmitting}
              icon={<SaveOutlined />}
              size="large"
            >
              保存系统配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </MainLayout>
  );
}
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Form } from 'antd';
import MainLayout from '@/components/MainLayout';
import TTSConfigForm from '@/components/TTSConfigForm';
import { getPlugins, getPluginMeta, getConfig, saveConfig } from '@/lib/services/api';
import { notify } from '@/components/Notification';

const { Title, Paragraph } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [voices, setVoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    } catch (e) {
      // error handled in api service
    }
  }, [form]);

  useEffect(() => {
    const init = async () => {
      const enabledPlugins = await loadPlugins();
      await loadConfig(enabledPlugins);
    };
    init();
  }, [loadPlugins, loadConfig]);

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

  return (
    <MainLayout>
      <Card>
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
    </MainLayout>
  );
}
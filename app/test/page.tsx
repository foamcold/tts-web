'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, Form, Row, Col, Typography } from 'antd';
import { notify } from '@/components/Notification';
import TTSConfigForm from '@/components/TTSConfigForm';
import TTSResult from '@/components/TTSResult';
import { getPlugins, getPluginMeta, generateTTS } from '@/lib/services/api';

export default function Home() {
  const { Title, Paragraph } = Typography;
  const [form] = Form.useForm();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [voices, setVoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);

  const loadPlugins = useCallback(async () => {
    try {
      const allPlugins = await getPlugins();
      const enabledPlugins = allPlugins.filter((p: any) => p.isEnabled);
      setPlugins(enabledPlugins);
      if (enabledPlugins.length > 0) {
        const initialPluginId = enabledPlugins[0].pluginId;
        form.setFieldsValue({ pluginId: initialPluginId });
        handlePluginChange(initialPluginId);
      }
    } catch (e) {
      // 错误已在 api service 中处理
    }
  }, [form]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

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
      // 错误已在 api service 中处理
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    setAudioUrl(null);
    setLogs(null);

    // 清理之前的 Blob URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    try {
      const result = await generateTTS(values, debugMode);
      if (debugMode) {
        // 添加调试日志
        console.log('===== 调试模式返回结果 =====');
        console.log('完整结果:', result);
        console.log('result字段:', result.result);
        console.log('audioBase64存在:', !!result.result?.audioBase64);
        console.log('audioSize:', result.result?.audioSize);
        console.log('=============================');

        // 存储完整的调试对象
        setLogs(result);
        // 处理音频数据
        if (result.result?.audioBase64) {
          const byteCharacters = atob(result.result.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mpeg' });
          setAudioUrl(URL.createObjectURL(blob));
        }
      } else {
        const blob = result as Blob;
        setAudioUrl(URL.createObjectURL(blob));
      }
      notify.success(`生成成功${debugMode ? ' (调试模式)' : ''}`, '音频已准备好播放或下载。');
    } catch (error) {
      // 错误已在 api service 中处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <Row gutter={24}>
        <Col span={24}>
          <Card style={{ marginBottom: 24 }}>
            <Title level={2}>音频测试</Title>
            <Paragraph>在此页面上，您可以测试 TTS 插件的音频合成效果。请选择一个插件，然后配置相关参数，点击"生成音频"按钮，即可试听或下载生成的音频文件。</Paragraph>
            <Title level={4} style={{ marginBottom: 16 }}>音频配置</Title>
            <TTSConfigForm
              form={form}
              plugins={plugins}
              locales={locales}
              voices={voices}
              loading={loading}
              submitting={submitting}
              debugMode={debugMode}
              onFinish={onFinish}
              onPluginChange={(v) => handlePluginChange(v)}
              onLocaleChange={(l) => handlePluginChange(form.getFieldValue('pluginId'), l)}
              onDebugModeChange={setDebugMode}
            />
          </Card>
        </Col>
        <Col span={24}>
          <TTSResult
            generating={submitting}
            audioUrl={audioUrl}
            logs={logs}
            debugMode={debugMode}
          />
        </Col>
      </Row>
    </MainLayout>
  );
}

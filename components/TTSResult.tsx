// components/TTSResult.tsx
import React, { useRef, useEffect } from 'react';
import { Card, Spin, Typography, Collapse, Descriptions } from 'antd';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

const { Text } = Typography;

interface Props {
  generating: boolean;
  audioUrl: string | null;
  logs: any;
  debugMode: boolean;
}

export default function TTSResult({ generating, audioUrl, logs, debugMode }: Props) {
  const audioPlayerRef = useRef<AudioPlayer>(null);

  useEffect(() => {
    // 当 audioUrl 变化时，说明有新的音频生成
    // 此时设置播放器音量
    if (audioUrl && audioPlayerRef.current?.audio.current) {
      audioPlayerRef.current.audio.current.volume = 0.1;
    }
  }, [audioUrl]);

  return (
    <>
      <Card title="音频结果" variant="borderless" style={{ marginBottom: 24 }}>
        {generating && (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" tip="正在生成音频...">
              <div style={{ height: 50 }} />
            </Spin>
          </div>
        )}

        {!generating && ((!audioUrl && !debugMode) || (debugMode && !logs)) && (
          <div style={{ textAlign: 'center', color: '#999', padding: 50 }}>
            暂无结果，请先生成
          </div>
        )}

        {audioUrl && !debugMode && (
          <div style={{ textAlign: 'center' }}>
            <AudioPlayer
              ref={audioPlayerRef}
              src={audioUrl}
              autoPlay
              layout="horizontal-reverse"
              style={{ marginTop: 20 }}
              customProgressBarSection={[]}
              customControlsSection={[
                RHAP_UI.MAIN_CONTROLS,
                RHAP_UI.PROGRESS_BAR,
                RHAP_UI.CURRENT_TIME,
                <div key="sep">/</div>,
                RHAP_UI.DURATION,
                <div key="spacer" style={{ width: '16px' }}></div>,
                RHAP_UI.VOLUME,
              ]}
              showJumpControls={false}
            />
          </div>
        )}

        {debugMode && logs && (
          <div style={{ padding: '12px 0' }}>
            <Collapse
              defaultActiveKey={['1', '2', '3']}
              ghost
              items={[
                {
                  key: '1',
                  label: '📝 请求参数',
                  children: (
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="文本内容">{logs.request?.text || '-'}</Descriptions.Item>
                      <Descriptions.Item label="插件 ID">{logs.request?.pluginId || '-'}</Descriptions.Item>
                      <Descriptions.Item label="发音人">{logs.request?.voice || '-'}</Descriptions.Item>
                      <Descriptions.Item label="语言">{logs.request?.locale || '-'}</Descriptions.Item>
                      <Descriptions.Item label="语速">{logs.request?.speed || '-'}</Descriptions.Item>
                      <Descriptions.Item label="音量">{logs.request?.volume || '-'}</Descriptions.Item>
                      <Descriptions.Item label="音高">{logs.request?.pitch || '-'}</Descriptions.Item>
                      <Descriptions.Item label="配置">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(logs.request?.config, null, 2)}
                        </pre>
                      </Descriptions.Item>
                    </Descriptions>
                  )
                },
                {
                  key: '2',
                  label: '✅ 生成结果',
                  children: (
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="音频大小">
                        {logs.result?.audioSize ? `${(logs.result.audioSize / 1024).toFixed(2)} KB` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="生成耗时">
                        {logs.result?.generationTime ? `${logs.result.generationTime} ms` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="内容类型">{logs.result?.contentType || '-'}</Descriptions.Item>
                      <Descriptions.Item label="音频数据">
                        {logs.result?.audioBase64 ? (
                          <Text type="secondary">Base64 字符串 ({logs.result.audioBase64.length} 字符)</Text>
                        ) : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  )
                },
                {
                  key: '3',
                  label: '🔍 执行日志',
                  children: (
                    <div style={{ maxHeight: 300, overflowY: 'auto', background: '#f5f5f5', padding: '12px', borderRadius: 4 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(logs.logs || [], null, 2)}
                      </pre>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Card>
    </>
  );
}
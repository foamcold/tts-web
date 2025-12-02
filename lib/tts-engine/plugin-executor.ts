import * as vm from 'vm';
import { JavaShim } from './java-shim.js';
import { TtsrvShim } from './ttsrv-shim.js';

export interface TTSPlugin {
  name: string;
  id: string;
  author: string;
  description?: string;
  version: number;
  getAudioStream?: (text: string, locale: string, voice: string, speed: number, volume: number, pitch: number, onAudioData?: any) => any;
  getAudio?: (text: string, locale: string, voice: string, speed: number, volume: number, pitch: number) => any;
  onLoadUI?: (ctx: any, layout: any) => void;
  // ... 其他可能的方法
}

export class PluginExecutor {
  private context: vm.Context;
  private ttsrvShim: TtsrvShim;
  private logs: string[] = [];

  constructor(code: string, config: Record<string, string> = {}) {
    this.ttsrvShim = new TtsrvShim(config);
    this.logs = [];

    const customConsole = {
      log: (...args: any[]) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.logs.push(`[LOG] ${msg}`);
        // console.log(`[Plugin Log]`, ...args);
      },
      error: (...args: any[]) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.logs.push(`[ERROR] ${msg}`);
        // console.error(`[Plugin Error]`, ...args);
      },
      warn: (...args: any[]) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.logs.push(`[WARN] ${msg}`);
      },
      info: (...args: any[]) => {
        const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        this.logs.push(`[INFO] ${msg}`);
      }
    };

    // 创建沙箱上下文
    this.context = vm.createContext({
      ttsrv: this.ttsrvShim,
      java: JavaShim,
      Packages: JavaShim, // 有些插件可能用 Packages.java...

      // UI 相关的 Mock
      View: { GONE: 8, VISIBLE: 0 },
      JTextInput: () => ({ setVisibility: () => { }, setOnTextChangedListener: () => { }, text: { set: () => { } } }),
      JSpinner: () => ({ setOnItemSelected: () => { }, items: [], selectedPosition: 0 }),
      JSeekBar: () => ({ setOnChangeListener: () => { }, max: 100, value: 0, visibility: 0 }),
      Item: (label: string, value: string) => ({ label, value }),
      console: customConsole, // 使用自定义 console 捕获日志

      // 捕获插件定义的全局变量
      PluginJS: {},
      EditorJS: {}
    });

    try {
      // 预处理代码，确保 PluginJS 和 EditorJS 被附加到上下文中
      const processedCode = code
        .replace(/^\s*let\s+PluginJS\s*=/m, 'this.PluginJS =')
        .replace(/^\s*let\s+EditorJS\s*=/m, 'this.EditorJS =');

      // 执行插件代码
      vm.runInContext(processedCode, this.context);
    } catch (e) {
      console.error("Plugin init error:", e);
      throw e;
    }
  }

  public getPluginJS(): TTSPlugin {
    return this.context.PluginJS;
  }

  public getEditorJS(): any {
    return this.context.EditorJS;
  }

  public getLogs(): string[] {
    return this.logs;
  }

  /**
   * 执行 TTS 生成
   * @param debug - debug模式不影响音频生成，只是用于标识是否需要返回详细调试信息
   */
  public async getAudio(
    text: string,
    locale: string,
    voice: string,
    speed: number = 50,
    volume: number = 50,
    pitch: number = 50,
    debug: boolean = false
  ): Promise<Buffer> {
    const plugin = this.getPluginJS();
    if (!plugin) throw new Error("PluginJS not found");

    // 插件中的 getAudioStream 通常是同步的（在我们 mock 了网络请求后）
    // 或者它返回一个 Java byte array

    try {
      this.logs.push(`[INFO] Executing plugin with params: ${JSON.stringify({ text, locale, voice, speed, volume, pitch })}`);
      let result;
      if (plugin.getAudioStream) {
        result = plugin.getAudioStream(text, locale, voice, speed, volume, pitch);
      } else if (plugin.getAudio) {
        result = plugin.getAudio(text, locale, voice, speed, volume, pitch);
      } else {
        throw new Error("No getAudio or getAudioStream method found");
      }

      // debug模式下也正常生成音频，不返回空Buffer

      // 关键：检查插件是否返回了空结果，这通常意味着失败
      if (result == null) {
        throw new Error('Plugin returned null or undefined, indicating a generation failure.');
      }

      if (Buffer.isBuffer(result)) {
        return result;
      } else if (Array.isArray(result)) {
        return Buffer.from(result);
      } else if (result && typeof result === 'object' && result.type === 'Buffer') { // 针对 Buffer 的 JSON 序列化
        return Buffer.from(result.data);
      } else if (result instanceof Uint8Array) {
        return Buffer.from(result);
      } else if (typeof result === 'string') {
        // 如果插件返回字符串，通常是错误信息
        throw new Error(`Plugin returned an error message: ${result}`);
      }

      // 如果返回了无法识别的类型，也视为错误
      const resultType = typeof result;
      this.logs.push(`[ERROR] Unknown result type from plugin: ${resultType}`);
      throw new Error(`Plugin returned an unhandled data type: ${resultType}`);

    } catch (e: any) {
      this.logs.push(`[ERROR] TTS Execution Error: ${e.message}`);
      throw e;
    }
  }
}
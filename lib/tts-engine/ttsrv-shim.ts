import * as crypto from 'crypto';
import CryptoJS from 'crypto-js';
import request from 'sync-request';
import { engineLogger } from './engine-logger.js';
import { getRandomFingerprint, DeviceFingerprint } from './device-fingerprints.js';

/**
 * 模拟 ttsrv 全局对象
 */
export class TtsrvShim {
  public tts: { data: Record<string, string> };
  private currentDevice: DeviceFingerprint | null = null;

  constructor(config: Record<string, string> = {}) {
    this.tts = {
      data: config
    };
    // 初始化时随机选择一个设备
    this.rotateDevice();
  }

  /**
   * 切换当前模拟的设备指纹
   */
  rotateDevice() {
    this.currentDevice = getRandomFingerprint();
    engineLogger.info(`Switched device fingerprint to: ${this.currentDevice['User-Agent']}`);
  }

  /**
   * 获取当前设备的 Headers 和 TLS 选项
   */
  private getDeviceOptions(headers: Record<string, string> = {}) {
    if (!this.currentDevice) {
      this.rotateDevice();
    }
    
    const device = this.currentDevice!;
    const tlsOptions: any = {};
    const fingerprintHeaders: Record<string, string> = {};

    // 分离 Headers 和 TLS 选项
    for (const [key, value] of Object.entries(device)) {
      if (value === undefined) continue;
      
      if (key.startsWith('__')) {
        // TLS 选项 (去掉 __ 前缀)
        tlsOptions[key.substring(2)] = value;
      } else {
        // 普通 Header
        fingerprintHeaders[key] = value;
      }
    }

    // 合并 Headers (指纹覆盖用户)
    const finalHeaders: Record<string, string> = { ...headers };
    for (const [fpKey, fpValue] of Object.entries(fingerprintHeaders)) {
      const lowerFpKey = fpKey.toLowerCase();
      const existingKeys = Object.keys(finalHeaders).filter(k => k.toLowerCase() === lowerFpKey);
      for (const existingKey of existingKeys) {
        delete finalHeaders[existingKey];
      }
      finalHeaders[fpKey] = fpValue;
    }

    return { headers: finalHeaders, tlsOptions };
  }

  // --- UI 组件模拟 (无操作) ---
  setMargins(view: any, left: number, top: number, right: number, bottom: number) {}
  
  // --- 加密工具 ---
  md5Encode(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  strToBytes(text: string): Buffer {
    return Buffer.from(text, 'utf-8');
  }
  
  bytesToStr(bytes: Buffer | number[]): string {
     if (Buffer.isBuffer(bytes)) {
         return bytes.toString('utf-8');
     }
     return Buffer.from(bytes).toString('utf-8');
  }

  createSymmetricCrypto(algorithm: string, key: Buffer) {
    // 简单解析 algorithm: 'AES/ECB/PKCS5Padding'
    // CryptoJs 默认就是 AES
    // 注意：Node.js crypto 模块和 CryptoJS 的 API 差异
    // 这里为了方便适配插件中看似 Java 风格的 API，我们做一层封装
    
    return {
      encryptBase64: (text: string) => {
        // 使用 CryptoJS 进行加密，因为它的 API 更容易模拟 ECB/PKCS5Padding
        // 注意：key 是 Buffer，需要转为 CryptoJS 的 WordArray
        const keyHex = key.toString('hex');
        const keyWA = CryptoJS.enc.Hex.parse(keyHex);
        
        const encrypted = CryptoJS.AES.encrypt(text, keyWA, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7 // PKCS5Padding 和 PKCS7Padding 在 AES 中是一样的
        });
        
        return encrypted.toString();
      },
      decryptStr: (base64Text: string) => {
         const keyHex = key.toString('hex');
         const keyWA = CryptoJS.enc.Hex.parse(keyHex);
         
         const decrypted = CryptoJS.AES.decrypt(base64Text, keyWA, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
         });
         
         return decrypted.toString(CryptoJS.enc.Utf8);
      }
    };
  }

  // --- 网络请求 (同步) ---
  httpPost(url: string, body: string, headers: Record<string, string>) {
    try {
      const { headers: finalHeaders, tlsOptions } = this.getDeviceOptions(headers);
      
      const response = request('POST', url, {
        headers: finalHeaders,
        body: body,
        timeout: 10000,
        retry: true,
        // 注入 TLS 选项 (sync-request 会透传给 http.request)
        ...tlsOptions
      });
      
      return {
        code: () => response.statusCode,
        status: () => response.statusCode.toString(), // sync-request 没有 statusText
        body: () => ({
          bytes: () => response.body // sync-request 直接返回 Buffer
        })
      };
    } catch (e) {
      engineLogger.error('HTTP POST 请求失败', e);
      return {
          code: () => 500,
          status: () => "Internal Error",
          body: () => ({ bytes: () => Buffer.alloc(0) })
      };
    }
  }

  httpGet(url: string, headers: Record<string, string> = {}) {
     try {
       const { headers: finalHeaders, tlsOptions } = this.getDeviceOptions(headers);
       const response = request('GET', url, {
         headers: finalHeaders,
         timeout: 10000,
         retry: true,
         ...tlsOptions
       });
       
       return {
         code: () => response.statusCode,
         body: () => ({
           bytes: () => response.body
         })
       };
     } catch (e) {
       engineLogger.error('HTTP GET 请求失败', e);
        return {
          code: () => 500,
          body: () => ({ bytes: () => Buffer.alloc(0) })
      };
     }
  }

  /**
   * 返回一个模拟的 InputStream
   */
  httpGetStream(url: string, headers: Record<string, string> = {}) {
    try {
      const { headers: finalHeaders, tlsOptions } = this.getDeviceOptions(headers);
      const response = request('GET', url, {
        headers: finalHeaders,
        timeout: 10000,
        ...tlsOptions
      });
      if (response.statusCode >= 300) return null;

      const buffer = response.body;
      if (!Buffer.isBuffer(buffer)) {
          engineLogger.error(`httpGetStream 期望返回 Buffer 但收到 ${typeof buffer}`);
          return null; // or handle error appropriately
      }
      let position = 0;

      return {
        read: (outBuffer: Buffer) => {
          if (position >= buffer.length) return -1;
          
          const remaining = buffer.length - position;
          const toRead = Math.min(outBuffer.length, remaining);
          
          buffer.copy(outBuffer, 0, position, position + toRead);
          position += toRead;
          
          return toRead;
        },
        close: () => {
          // No-op for buffer
        }
      };
    } catch (e) {
      engineLogger.error('HTTP GET 流请求失败', e);
      return null;
    }
  }
  
  getAudioSampleRate(audioData: any) {
      return 16000; // Mock
  }
  
  playAudio(audioData: any) {
      // Server side, do nothing
  }
  
  playAudioChunk(chunk: any) {
      // Server side, do nothing
  }
}
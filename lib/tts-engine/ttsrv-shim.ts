import * as crypto from 'crypto';
import CryptoJS from 'crypto-js';
const request = require('sync-request');

/**
 * 模拟 ttsrv 全局对象
 */
export class TtsrvShim {
  public tts: { data: Record<string, string> };

  constructor(config: Record<string, string> = {}) {
    this.tts = {
      data: config
    };
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
      const response = request('POST', url, {
        headers: headers,
        body: body,
        // sync-request 默认超时时间很短，需要设置
        timeout: 10000, // 10秒
        retry: true,
      });
      
      return {
        code: () => response.statusCode,
        status: () => response.statusCode.toString(), // sync-request 没有 statusText
        body: () => ({
          bytes: () => response.body // sync-request 直接返回 Buffer
        })
      };
    } catch (e) {
      console.error("httpPost error", e);
      return {
          code: () => 500,
          status: () => "Internal Error",
          body: () => ({ bytes: () => Buffer.alloc(0) })
      };
    }
  }

  httpGet(url: string) {
     try {
       const response = request('GET', url, {
         timeout: 10000,
         retry: true,
       });
       
       return {
         code: () => response.statusCode,
         body: () => ({
           bytes: () => response.body
         })
       };
     } catch (e) {
       console.error("httpGet error", e);
        return {
          code: () => 500,
          body: () => ({ bytes: () => Buffer.alloc(0) })
      };
     }
  }

  /**
   * 返回一个模拟的 InputStream
   */
  httpGetStream(url: string) {
    try {
      const response = request('GET', url, { timeout: 10000 });
      if (response.statusCode >= 300) return null;

      const buffer = response.body;
      if (!Buffer.isBuffer(buffer)) {
          console.error("httpGetStream expected a Buffer but received", typeof buffer);
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
      console.error("httpGetStream error", e);
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
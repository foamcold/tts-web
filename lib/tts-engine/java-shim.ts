/**
 * 模拟 Java 类库，用于支持 TTS 插件运行
 */

export const JavaShim = {
  lang: {
    System: {
      /**
       * 模拟 java.lang.System.arraycopy
       * @param src 源数组
       * @param srcPos 源位置
       * @param dest 目标数组
       * @param destPos 目标位置
       * @param length 长度
       */
      arraycopy: (src: any[], srcPos: number, dest: any[], destPos: number, length: number) => {
        if (Buffer.isBuffer(src) && Buffer.isBuffer(dest)) {
          src.copy(dest, destPos, srcPos, srcPos + length);
        } else if (Array.isArray(src) && Array.isArray(dest)) {
          for (let i = 0; i < length; i++) {
            dest[destPos + i] = src[srcPos + i];
          }
        } else {
          // 处理 Uint8Array 等其他情况，暂时视为 Array
          for (let i = 0; i < length; i++) {
            (dest as any)[destPos + i] = (src as any)[srcPos + i];
          }
        }
      },
    },
    reflect: {
      Array: {
        /**
         * 模拟 java.lang.reflect.Array.newInstance
         * @param componentType 组件类型 (忽略，默认 Byte)
         * @param length 长度
         */
        newInstance: (componentType: any, length: number) => {
          // 在 TTS 插件中，通常用于创建 byte 数组
          // 我们返回 Buffer，因为它在 Node.js 中处理二进制数据最高效
          return Buffer.alloc(length);
        },
      },
    },
    Byte: {
      TYPE: 'Byte', // 仅作标识
    },
    Float: class Float {
        value: number;
        constructor(value: number) {
            this.value = value;
        }
        floatValue() {
            return this.value;
        }
    }
  },
  util: {
    Arrays: {
      /**
       * 模拟 java.util.Arrays.copyOf
       * @param original 原数组
       * @param newLength 新长度
       */
      copyOf: (original: Buffer | any[], newLength: number) => {
        if (Buffer.isBuffer(original)) {
          const newBuffer = Buffer.alloc(newLength);
          original.copy(newBuffer, 0, 0, Math.min(original.length, newLength));
          return newBuffer;
        } else {
          return original.slice(0, newLength);
        }
      },
    },
  },
};
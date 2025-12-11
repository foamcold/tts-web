# 日志系统重构计划 ✅ 已完成

> **更新说明**：本计划已扩展，包含以下额外功能：
> 1. 缓存功能开关（可在设置页面启用/禁用）
> 2. 日志等级设置（可在设置页面通过下拉菜单选择）

## 一、当前状况分析

### 1.1 现有日志使用情况

通过分析项目代码，发现共有 **18 处** 使用 `console.log/error/warn/info` 的地方：

#### 服务端代码

| 文件 | 行号 | 类型 | 当前日志内容 |
|------|------|------|--------------|
| [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts:89) | 89 | error | `"httpPost error", e` |
| [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts:112) | 112 | error | `"httpGet error", e` |
| [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts:130) | 130 | error | `"httpGetStream expected a Buffer..."` |
| [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts:152) | 152 | error | `"httpGetStream error", e` |
| [`lib/tts-engine/plugin-executor.ts`](lib/tts-engine/plugin-executor.ts:75) | 75 | error | `"Plugin init error:", e` |
| [`lib/services/tts.service.ts`](lib/services/tts.service.ts:61) | 61 | log | `Cache cleanup: deleted ${count} old entries` |
| [`lib/services/tts.service.ts`](lib/services/tts.service.ts:128) | 128 | log | `Cache hit for ${cacheKey}` |
| [`lib/services/tts.service.ts`](lib/services/tts.service.ts:206) | 206 | log | `Cache written for ${cacheKey}` |
| [`lib/services/tts.service.ts`](lib/services/tts.service.ts:213) | 213 | warn | `'Failed to write cache:', e` |
| [`lib/api-utils.ts`](lib/api-utils.ts:51) | 51 | error | `[API Error] ${req.method} ${req.url}:` |
| [`app/api/config/route.ts`](app/api/config/route.ts:64) | 64 | error | 直接输出 error 对象 |
| [`app/api/plugins/[pluginId]/meta/route.ts`](app/api/plugins/[pluginId]/meta/route.ts:39) | 39 | error | `'Plugin Meta API Error:', error` |

#### 客户端代码

| 文件 | 行号 | 类型 | 当前日志内容 |
|------|------|------|--------------|
| [`lib/services/api.ts`](lib/services/api.ts:14) | 14 | error | `'API request error:', error` |
| [`lib/services/api.ts`](lib/services/api.ts:72) | 72 | error | `'API request error (blob):', error` |
| [`hooks/useLocalStorageState.ts`](hooks/useLocalStorageState.ts:13) | 13 | error | 直接输出 error 对象 |
| [`hooks/useLocalStorageState.ts`](hooks/useLocalStorageState.ts:22) | 22 | error | 直接输出 error 对象 |
| [`app/test/page.tsx`](app/test/page.tsx:92) | 92-97 | log | 调试信息（多行） |

#### 插件内部日志（特殊处理）

[`lib/tts-engine/plugin-executor.ts`](lib/tts-engine/plugin-executor.ts:26) 中已有自定义 console 对象用于捕获插件日志，这部分保持独立。

### 1.2 存在的问题

1. **格式不统一** - 有些带前缀（如 `[API Error]`），有些直接输出对象
2. **缺少时间戳** - 无法追踪日志发生时间
3. **语言混用** - 日志内容中英文混杂
4. **无等级控制** - 无法按环境过滤日志等级
5. **无统一入口** - 分散在各文件中，难以统一管理

---

## 二、重构目标

1. **统一日志格式**：`时间 [日志等级] 日志内容`
   - 示例：`2025-12-11 22:01:47 [INFO] 缓存命中: abc123`
2. **中文日志内容**：所有日志描述使用中文
3. **支持多等级**：DEBUG、INFO、WARN、ERROR
4. **环境感知**：支持按环境配置日志等级
5. **统一管理**：通过单一模块导出，便于维护和扩展

---

## 三、技术方案设计

### 3.1 日志模块结构

```
lib/
├── logger.ts          # 统一日志模块
```

### 3.2 日志模块接口设计

```typescript
// lib/logger.ts

// 日志等级枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志配置接口
interface LoggerConfig {
  level: LogLevel;        // 最低输出等级
  enableTimestamp: boolean; // 是否显示时间戳
}

// Logger 类
class Logger {
  private config: LoggerConfig;
  
  constructor(config?: Partial<LoggerConfig>);
  
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  
  private formatMessage(level: string, message: string): string;
  private formatArgs(args: any[]): string;
}

// 默认导出单例
export const logger: Logger;
```

### 3.3 日志格式规范

```
时间 [等级] 日志内容
```

- **时间格式**：`YYYY-MM-DD HH:mm:ss`（本地时间）
- **等级标识**：`[DEBUG]`、`[INFO]`、`[WARN]`、`[ERROR]`
- **日志内容**：中文描述 + 可选的详细信息

示例：
```
2025-12-11 22:01:47 [INFO] 缓存命中: abc123def456
2025-12-11 22:01:48 [ERROR] HTTP POST 请求失败: 连接超时
2025-12-11 22:01:50 [WARN] 缓存写入失败: 磁盘空间不足
```

### 3.4 环境配置

通过环境变量 `LOG_LEVEL` 控制日志等级：

| 环境 | 默认等级 | 说明 |
|------|----------|------|
| development | DEBUG | 输出所有日志 |
| production | INFO | 忽略 DEBUG 日志 |

---

## 四、重构实施步骤

### 第一阶段：创建日志模块

- [ ] 创建 [`lib/logger.ts`](lib/logger.ts) 统一日志模块
- [ ] 实现 Logger 类，支持 debug/info/warn/error 方法
- [ ] 实现时间格式化和等级过滤功能
- [ ] 导出 logger 单例

### 第二阶段：重构服务端日志

- [ ] 重构 [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts) - 4处日志
- [ ] 重构 [`lib/tts-engine/plugin-executor.ts`](lib/tts-engine/plugin-executor.ts) - 1处日志
- [ ] 重构 [`lib/services/tts.service.ts`](lib/services/tts.service.ts) - 4处日志
- [ ] 重构 [`lib/api-utils.ts`](lib/api-utils.ts) - 1处日志
- [ ] 重构 [`app/api/config/route.ts`](app/api/config/route.ts) - 1处日志
- [ ] 重构 [`app/api/plugins/[pluginId]/meta/route.ts`](app/api/plugins/[pluginId]/meta/route.ts) - 1处日志

### 第三阶段：重构客户端日志

- [ ] 重构 [`lib/services/api.ts`](lib/services/api.ts) - 2处日志
- [ ] 重构 [`hooks/useLocalStorageState.ts`](hooks/useLocalStorageState.ts) - 2处日志
- [ ] 重构 [`app/test/page.tsx`](app/test/page.tsx) - 调试日志（可选保留或移除）

### 第四阶段：测试验证

- [ ] 验证开发环境日志输出正常
- [ ] 验证生产环境日志等级过滤正常
- [ ] 验证日志格式符合规范

---

## 五、日志内容中文化对照表

| 原始日志 | 重构后（中文） |
|----------|----------------|
| `httpPost error` | `HTTP POST 请求失败` |
| `httpGet error` | `HTTP GET 请求失败` |
| `httpGetStream expected a Buffer but received` | `httpGetStream 期望返回 Buffer 但收到` |
| `httpGetStream error` | `HTTP GET 流请求失败` |
| `Plugin init error` | `插件初始化失败` |
| `Cache cleanup: deleted X old entries` | `缓存清理: 已删除 X 条过期记录` |
| `Cache hit for X` | `缓存命中: X` |
| `Cache written for X` | `缓存写入成功: X` |
| `Failed to write cache` | `缓存写入失败` |
| `[API Error] METHOD URL:` | `API 请求错误 [METHOD URL]:` |
| `Plugin Meta API Error` | `插件元数据 API 错误` |
| `API request error` | `API 请求失败` |
| `API request error (blob)` | `API 请求失败 (Blob响应)` |

---

## 六、扩展功能设计

### 6.1 缓存开关功能

#### 6.1.1 功能说明

在系统设置页面添加"启用缓存"开关，用于控制 TTS 音频缓存功能：
- **开启**：TTS 请求会先查询缓存，命中则直接返回；生成后写入缓存
- **关闭**：每次 TTS 请求都重新生成音频，不读取也不写入缓存

#### 6.1.2 涉及文件

| 文件 | 修改内容 |
|------|----------|
| [`app/settings/page.tsx`](app/settings/page.tsx) | 添加缓存开关 UI |
| [`lib/services/tts.service.ts`](lib/services/tts.service.ts) | 读取配置，控制缓存逻辑 |

#### 6.1.3 配置存储

使用现有的配置存储机制，在 `system-config` 配置键下存储：

```json
{
  "cacheEnabled": true,
  "logLevel": "INFO"
}
```

### 6.2 日志等级设置

#### 6.2.1 功能说明

在系统设置页面添加"日志等级"下拉选择器，可选等级：
- **DEBUG** - 输出所有日志（开发调试用）
- **INFO** - 输出 INFO、WARN、ERROR
- **WARN** - 输出 WARN、ERROR
- **ERROR** - 仅输出 ERROR

#### 6.2.2 涉及文件

| 文件 | 修改内容 |
|------|----------|
| [`app/settings/page.tsx`](app/settings/page.tsx) | 添加日志等级选择器 UI |
| [`lib/logger.ts`](lib/logger.ts) | 支持从数据库读取日志等级配置 |

#### 6.2.3 配置读取优先级

```
数据库配置 > 环境变量 LOG_LEVEL > 默认值（开发:DEBUG / 生产:INFO）
```

### 6.3 设置页面 UI 设计

```
┌─────────────────────────────────────────────────────────┐
│  系统设置                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ 默认音频配置                                          │
│    [现有的 TTS 配置表单...]                              │
│                                                         │
│  ▼ 系统选项                                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │  启用缓存        [✓ 开关]                           ││
│  │  (开启后，相同参数的请求将使用缓存结果)              ││
│  │                                                     ││
│  │  日志等级        [INFO ▼]                           ││
│  │  (设置服务端日志输出的最低等级)                      ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [保存设置]                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 七、代码示例

### 7.1 Logger 模块实现

```typescript
// lib/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isDev = process.env.NODE_ENV === 'development';
    this.config = {
      level: this.parseLogLevel(process.env.LOG_LEVEL) ?? (isDev ? LogLevel.DEBUG : LogLevel.INFO),
      enableTimestamp: true,
      ...config,
    };
  }

  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;
    const map: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };
    return map[level.toLowerCase()];
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  private formatMessage(level: string, message: string, args: any[]): string {
    const timestamp = this.config.enableTimestamp ? `${this.getTimestamp()} ` : '';
    const argsStr = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ') : '';
    return `${timestamp}[${level}] ${message}${argsStr}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, args));
    }
  }
}

export const logger = new Logger();
```

### 7.2 使用示例

重构前：
```typescript
console.log(`Cache hit for ${cacheKey}`);
console.error("httpPost error", e);
```

重构后：
```typescript
import { logger } from '@/lib/logger';

logger.info(`缓存命中: ${cacheKey}`);
logger.error('HTTP POST 请求失败', e);
```

### 7.3 系统配置存储结构

```typescript
// 系统配置接口
interface SystemConfig {
  cacheEnabled: boolean;  // 缓存开关
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';  // 日志等级
}
```

### 7.4 缓存逻辑修改示例

```typescript
// lib/services/tts.service.ts

// 读取系统配置
const systemConfig = await prisma.config.findUnique({
  where: { key: 'system-config' }
});
const { cacheEnabled = true } = systemConfig
  ? JSON.parse(systemConfig.value || '{}')
  : {};

// 根据配置决定是否使用缓存
if (cacheEnabled && !debug) {
  // 检查缓存...
}

// 生成音频后
if (cacheEnabled && !debug) {
  // 写入缓存...
}
```

---

## 八、注意事项

1. **插件内部日志保持独立** - [`plugin-executor.ts`](lib/tts-engine/plugin-executor.ts:26) 中的 customConsole 用于捕获插件运行时日志，不在本次重构范围内

2. **调试日志可选处理** - [`app/test/page.tsx`](app/test/page.tsx:92) 中的调试日志可以：
   - 保留并使用 `logger.debug()` 替代
   - 或完全移除（仅用于临时调试）

3. **环境变量配置** - 可在 `.env` 中添加 `LOG_LEVEL` 配置项

4. **配置热更新** - 日志等级和缓存开关修改后立即生效，无需重启服务

---

## 九、预期效果

### 日志输出示例

重构完成后，控制台输出示例：

```
2025-12-11 22:01:47 [INFO] 缓存命中: abc123def456789
2025-12-11 22:01:48 [INFO] 缓存写入成功: xyz987654321
2025-12-11 22:01:50 [WARN] 缓存写入失败 {"code":"ENOSPC","message":"磁盘空间不足"}
2025-12-11 22:02:01 [ERROR] HTTP POST 请求失败 {"message":"ECONNREFUSED"}
2025-12-11 22:02:15 [ERROR] API 请求错误 [POST /api/tts]: 插件执行超时
```

### 设置页面效果

设置页面新增"系统选项"区块，包含：
- 缓存开关（默认开启）
- 日志等级选择器（默认 INFO）

---

## 十、重构实施步骤（更新版）

### 第一阶段：创建日志模块

- [ ] 创建 [`lib/logger.ts`](lib/logger.ts) 统一日志模块
- [ ] 实现 Logger 类，支持 debug/info/warn/error 方法
- [ ] 实现时间格式化和等级过滤功能
- [ ] 支持从数据库读取日志等级配置

### 第二阶段：添加系统设置功能

- [ ] 修改 [`app/settings/page.tsx`](app/settings/page.tsx) 添加系统选项区块
- [ ] 添加缓存开关 Switch 组件
- [ ] 添加日志等级 Select 组件
- [ ] 实现配置保存到 `system-config` 键

### 第三阶段：集成缓存开关

- [ ] 修改 [`lib/services/tts.service.ts`](lib/services/tts.service.ts) 读取缓存配置
- [ ] 根据配置控制缓存读取逻辑
- [ ] 根据配置控制缓存写入逻辑

### 第四阶段：重构服务端日志

- [ ] 重构 [`lib/tts-engine/ttsrv-shim.ts`](lib/tts-engine/ttsrv-shim.ts) - 4处日志
- [ ] 重构 [`lib/tts-engine/plugin-executor.ts`](lib/tts-engine/plugin-executor.ts) - 1处日志
- [ ] 重构 [`lib/services/tts.service.ts`](lib/services/tts.service.ts) - 4处日志
- [ ] 重构 [`lib/api-utils.ts`](lib/api-utils.ts) - 1处日志
- [ ] 重构 [`app/api/config/route.ts`](app/api/config/route.ts) - 1处日志
- [ ] 重构 [`app/api/plugins/[pluginId]/meta/route.ts`](app/api/plugins/[pluginId]/meta/route.ts) - 1处日志

### 第五阶段：重构客户端日志

- [ ] 重构 [`lib/services/api.ts`](lib/services/api.ts) - 2处日志
- [ ] 重构 [`hooks/useLocalStorageState.ts`](hooks/useLocalStorageState.ts) - 2处日志
- [ ] 处理 [`app/test/page.tsx`](app/test/page.tsx) - 调试日志

### 第六阶段：测试验证

- [ ] 验证日志输出格式正确
- [ ] 验证日志等级设置生效
- [ ] 验证缓存开关功能正常
- [ ] 验证设置页面保存功能
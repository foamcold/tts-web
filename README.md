<div align="center">

# 🎙️ TTS Web

<p>
  <strong>功能强大、支持插件化的文本转语音 Web 应用</strong>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16.0.6-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2.0-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-5.x-2d3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

</div>

---

## 📖 目录

- [✨ 功能特性](#-功能特性)
- [🛠️ 技术栈](#️-技术栈)
- [🚀 快速开始](#-快速开始)
  - [开发环境部署](#开发环境部署)
  - [生产环境部署](#生产环境部署)
  - [Docker 部署](#docker-部署)
- [⚙️ 环境变量](#️-环境变量)
- [📂 项目结构](#-项目结构)
- [📘 使用指南](#-使用指南)
- [❓ 常见问题](#-常见问题)
- [🔌 API 文档](#-api-文档)
- [🤝 贡献](#-贡献)
- [📄 开源许可](#-开源许可)

---

## ✨ 功能特性

- **🔌 动态插件系统**：通过编写 JavaScript 代码，轻松集成和扩展新的 TTS 服务
- **🎛️ 参数化语音合成**：支持调整语速、音调、音量等多种语音参数
- **💾 智能音频缓存**：自动缓存已生成的音频，减少重复请求，提升响应速度
- **🎨 现代化界面**：使用 Ant Design 构建，提供清晰直观的操作体验
- **🐳 容器化部署**：提供 Dockerfile 和 docker-compose，实现一键部署
- **🔧 灵活配置**：支持多种数据库（SQLite、PostgreSQL、MySQL）

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| **开发语言** | [TypeScript 5](https://www.typescriptlang.org/) |
| **UI 框架** | [Ant Design 6](https://ant.design/) + [TailwindCSS 4](https://tailwindcss.com/) |
| **后端** | Next.js API Routes |
| **数据库 ORM** | [Prisma 5](https://www.prisma.io/) |
| **数据库** | SQLite (默认) / PostgreSQL / MySQL |
| **包管理器** | [pnpm](https://pnpm.io/) |
| **容器化** | [Docker](https://www.docker.com/) + Docker Compose |

---

## 🚀 快速开始

### 开发环境部署

适用于本地开发和调试。

#### 1. 环境准备

确保已安装以下工具：

- **Node.js** ≥ 20.0.0 ([下载](https://nodejs.org/))
- **pnpm** ≥ 10.0.0 (推荐) 或 npm/yarn

安装 pnpm：

```bash
npm install -g pnpm
```

#### 2. 克隆项目

```bash
git clone https://github.com/foamcold/tts-web.git
cd tts-web
```

#### 3. 安装依赖

```bash
pnpm install
```

#### 4. 配置环境变量

复制环境变量示例文件（可选，使用默认配置可跳过此步骤）：

```bash
cp .env.example .env
```

#### 5. 初始化数据库

首次运行时，执行以下命令初始化数据库并生成 Prisma Client：

```bash
npx prisma migrate dev
```

#### 6. 启动开发服务器

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

---

### 生产环境部署

适用于本地模拟生产环境或服务器部署。

> **⚠️ 重要提示**  
> 必须按照以下顺序执行，否则会导致构建失败！

#### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/foamcold/tts-web.git
cd tts-web
pnpm install
```

#### 2. 初始化数据库

**在构建之前**必须先初始化数据库以生成 Prisma Client：

```bash
npx prisma migrate deploy
# 或者使用开发模式迁移
npx prisma migrate dev
```

#### 3. 构建应用

```bash
pnpm build
```

#### 4. 启动生产服务器

```bash
pnpm start
```

或使用一键启动脚本（自动执行数据库迁移）：

```bash
pnpm start:prod
```

> **💡 提示**  
> `start:prod` 脚本会在启动前自动执行 `prisma migrate deploy`，适合生产环境使用。

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 访问应用。

---

### Docker 部署

推荐的生产环境部署方式，开箱即用。

#### 使用 Docker Compose（推荐）

1. **确保已安装 Docker 和 Docker Compose**

   - [安装 Docker](https://docs.docker.com/get-docker/)
   - [安装 Docker Compose](https://docs.docker.com/compose/install/)

2. **构建并启动容器**

   在项目根目录执行：

   ```bash
   docker-compose up --build -d
   ```

   该命令会：
   - 构建 Docker 镜像
   - 在后台启动 `tts-web` 服务
   - 自动执行数据库迁移

3. **访问应用**

   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

4. **查看日志**

   ```bash
   docker-compose logs -f
   ```

5. **停止服务**

   ```bash
   docker-compose down
   ```

#### 使用 Dockerfile 单独部署

如果不想使用 docker-compose，可直接通过 Dockerfile 构建和运行。

1. **构建镜像**

   ```bash
   docker build -t tts-web .
   ```

2. **运行容器**

   ```bash
   docker run -d -p 3000:3000 --name tts-web-app tts-web
   ```

3. **访问应用**

   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

---

## ⚙️ 环境变量

项目支持通过环境变量进行配置。复制 `.env.example` 为 `.env` 并根据需要修改。

### 配置项说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `PORT` | 应用服务端口 | `3000` | 否 |
| `DATABASE_URL` | 数据库连接字符串 | `file:./dev.db` | 否 |
| `NODE_ENV` | 运行环境 | `development` | 否 |

### 数据库配置示例

**SQLite（默认）**

```env
DATABASE_URL="file:./dev.db"
```

**PostgreSQL**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tts_web"
```

**MySQL**

```env
DATABASE_URL="mysql://user:password@localhost:3306/tts_web"
```

> **📌 注意**  
> 如果更改数据库类型，需要同步修改 `prisma/schema.prisma` 中的 `provider` 配置，并重新执行数据库迁移。

---

## 📂 项目结构

```
.
├── app/                    # Next.js App Router 目录
│   ├── api/                # 后端 API 路由
│   │   ├── plugins/        # 插件管理 API
│   │   ├── tts/            # TTS 服务 API
│   │   └── settings/       # 系统设置 API
│   ├── plugins/            # 插件管理页面
│   ├── settings/           # 系统设置页面
│   ├── test/               # TTS 测试页面
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 首页
├── components/             # React 组件
│   ├── AudioPlayer.tsx     # 音频播放器组件
│   ├── PluginEditor.tsx    # 插件编辑器组件
│   └── ...
├── lib/                    # 核心逻辑与服务
│   ├── tts-engine/         # TTS 插件引擎核心代码
│   │   ├── worker-entry.mjs # Worker 入口
│   │   └── ttsrv-shim.ts   # TTS 环境模拟
│   ├── services/           # 应用服务
│   └── prisma.ts           # Prisma 客户端实例
├── prisma/                 # Prisma 配置和迁移
│   ├── schema.prisma       # 数据库模型定义
│   └── migrations/         # 数据库迁移文件
├── public/                 # 静态资源
├── types/                  # TypeScript 类型定义
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── entrypoint.sh           # Docker 启动脚本
├── package.json            # 项目依赖和脚本
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目文档
```

---

## 📘 使用指南

### 插件管理

1. 访问 **/plugins** 页面
2. 点击"新建插件"按钮
3. 填写插件信息（名称、作者、ID）
4. 编写插件代码（基于 JavaScript）
5. 保存并启用插件

### TTS 测试

1. 访问 **/test** 页面
2. 选择已启用的 TTS 插件
3. 输入要合成的文本
4. 调整语音参数（语速、音调、音量等）
5. 点击"合成"按钮生成音频
6. 使用内置播放器播放或下载音频

### 系统设置

访问 **/settings** 页面可以配置：

- 缓存策略
- 系统参数
- 其他全局配置

---

## ❓ 常见问题

### 1. 构建时报错：`Module '@prisma/client' has no exported member 'PrismaClient'`

**原因：** 在运行 `pnpm build` 之前没有初始化数据库，导致 Prisma Client 未生成。

**解决方案：** 按照正确的顺序操作：

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库（生成 Prisma Client）
npx prisma migrate deploy

# 3. 构建应用
pnpm build

# 4. 启动服务
pnpm start
```

### 2. 开发环境报错：`require is not defined in ES module scope`

**原因：** 项目配置为 ES 模块，但代码中使用了 CommonJS 的 `require` 语法。

**解决方案：** 将 `require` 改为 `import`。例如：

```typescript
// ❌ 错误
const request = require('sync-request');

// ✅ 正确
import request from 'sync-request';
```

### 3. Docker 容器启动失败

**排查步骤：**

1. 查看日志：`docker-compose logs -f`
2. 检查端口占用：`netstat -ano | findstr :3000`（Windows）或 `lsof -i :3000`（Linux/Mac）
3. 确保 Docker 有足够的资源（内存、CPU）

### 4. 如何切换数据库？

1. 修改 `.env` 中的 `DATABASE_URL`
2. 修改 `prisma/schema.prisma` 中的 `provider`：

   ```prisma
   datasource db {
     provider = "postgresql"  // 或 "mysql"
     url      = env("DATABASE_URL")
   }
   ```

3. 重新生成 Prisma Client 并迁移：

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

---

## 🔌 API 文档

### 生成音频 API

TTS Web 提供 RESTful API 接口，支持通过 HTTP 请求生成语音音频。

#### 接口信息

| 项目 | 说明 |
|------|------|
| **URL** | `/api/tts` |
| **方法** | `GET` / `POST` |
| **响应类型** | 音频二进制数据（成功时）或 JSON（调试模式/错误时） |

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `text` | string | ✅ 是 | 要合成的文本内容 | - |
| `pluginId` | string | 否 | 使用的 TTS 插件 ID | 系统默认插件 |
| `voice` | string | 否 | 声音名称/ID | 插件默认声音 |
| `locale` | string | 否 | 语言区域代码（如 `zh-CN`） | 插件默认语言 |
| `speed` | number | 否 | 语速，范围 0-100 | 50 |
| `volume` | number | 否 | 音量，范围 0-100 | 50 |
| `pitch` | number | 否 | 音调，范围 0-100 | 50 |
| `debug` | boolean | 否 | 启用调试模式，返回 JSON 而非音频 | false |

> **💡 提示**
> 除上述参数外，API 还支持传递插件特定的自定义参数，这些参数会直接传递给对应的 TTS 插件处理。

#### 响应头

| 响应头 | 说明 |
|--------|------|
| `Content-Type` | 音频 MIME 类型（如 `audio/mpeg`、`audio/wav`） |
| `Content-Length` | 音频数据大小（字节） |
| `X-TTS-Cache` | 缓存状态（`hit` 表示命中缓存，`miss` 表示新生成） |

#### 请求示例

##### 1. GET 请求（基础用法）

使用 URL 查询参数传递数据：

```bash
# 基础请求 - 仅传递文本
curl "http://localhost:3000/api/tts?text=你好，世界" --output hello.mp3

# 完整参数请求
curl "http://localhost:3000/api/tts?text=欢迎使用TTS服务&pluginId=edge-tts&voice=zh-CN-XiaoxiaoNeural&speed=60&volume=80&pitch=50" --output welcome.mp3
```

##### 2. POST 请求（JSON Body）

使用 JSON 格式传递数据，适合传递较长文本或复杂参数：

```bash
# 基础 POST 请求
curl -X POST "http://localhost:3000/api/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "这是一段测试文本"}' \
  --output test.mp3

# 完整参数 POST 请求
curl -X POST "http://localhost:3000/api/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "欢迎使用 TTS Web 文本转语音服务",
    "pluginId": "edge-tts",
    "voice": "zh-CN-YunxiNeural",
    "locale": "zh-CN",
    "speed": 55,
    "volume": 75,
    "pitch": 50
  }' \
  --output output.mp3
```

##### 3. POST 请求（Form Data）

使用表单格式传递数据：

```bash
curl -X POST "http://localhost:3000/api/tts" \
  -d "text=表单提交的文本内容" \
  -d "speed=60" \
  -d "volume=80" \
  --output form-output.mp3
```

##### 4. 调试模式

启用调试模式返回 JSON 信息而非音频数据：

```bash
curl "http://localhost:3000/api/tts?text=调试测试&debug=true"
```

响应示例：

```json
{
  "success": true,
  "params": {
    "text": "调试测试",
    "pluginId": "edge-tts",
    "voice": "zh-CN-XiaoxiaoNeural",
    "speed": 50,
    "volume": 50,
    "pitch": 50
  },
  "plugin": {
    "id": "edge-tts",
    "name": "Edge TTS"
  }
}
```

#### 编程语言示例

##### JavaScript / Node.js

```javascript
// 使用 fetch API
async function generateSpeech(text, options = {}) {
  const response = await fetch('http://localhost:3000/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS 请求失败: ${response.status}`);
  }

  // 获取音频 Blob
  const audioBlob = await response.blob();
  
  // 检查缓存状态
  const cacheStatus = response.headers.get('X-TTS-Cache');
  console.log(`缓存状态: ${cacheStatus}`);
  
  return audioBlob;
}

// 使用示例
const audio = await generateSpeech('你好，世界', {
  voice: 'zh-CN-XiaoxiaoNeural',
  speed: 60,
});
```

##### Python

```python
import requests

def generate_speech(text, **options):
    """
    调用 TTS API 生成语音
    """
    url = "http://localhost:3000/api/tts"
    payload = {"text": text, **options}
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    # 获取缓存状态
    cache_status = response.headers.get("X-TTS-Cache")
    print(f"缓存状态: {cache_status}")
    
    return response.content

# 使用示例
audio_data = generate_speech(
    "你好，这是一段测试语音",
    voice="zh-CN-YunxiNeural",
    speed=55,
    volume=80
)

# 保存音频文件
with open("output.mp3", "wb") as f:
    f.write(audio_data)
```

##### PHP

```php
<?php

function generateSpeech(string $text, array $options = []): string
{
    $url = "http://localhost:3000/api/tts";
    $data = array_merge(['text' => $text], $options);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("TTS 请求失败: HTTP $httpCode");
    }
    
    return $response;
}

// 使用示例
$audio = generateSpeech("你好，世界", [
    'voice' => 'zh-CN-XiaoxiaoNeural',
    'speed' => 60
]);

file_put_contents("output.mp3", $audio);
```

#### 错误响应

当请求发生错误时，API 返回 JSON 格式的错误信息：

```json
{
  "error": "Text is required",
  "code": "VALIDATION_ERROR"
}
```

常见错误码：

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `PLUGIN_NOT_FOUND` | 404 | 指定的插件不存在 |
| `TTS_ERROR` | 500 | TTS 服务内部错误 |

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**[⬆ 返回顶部](#-tts-web)**

Made with ❤️ by [foamcold](https://github.com/foamcold)

</div>

# TTS Web - 文本转语音 Web 应用

TTS Web 是一个功能强大、支持插件化的文本转语音（Text-to-Speech）Web 应用。它提供了一个友好的用户界面，让您可以轻松地测试和管理不同的 TTS 引擎，并生成高质量的音频。

## ✨ 功能特性

- **动态插件系统**：通过编写 JavaScript 代码，轻松集成和扩展新的 TTS 服务。
- **参数化语音合成**：支持调整语速、音调、音量等多种语音参数。
- **音频缓存**：自动缓存已生成的音频，减少重复请求，提高响应速度。
- **简洁的用户界面**：使用 Ant Design 构建，提供清晰直观的操作体验。
- **容器化部署**：提供 Dockerfile 和 docker-compose，实现一键部署。

## 🛠️ 技术栈

- **前端**: [Next.js](https://nextjs.org/) (React), [TypeScript](https://www.typescriptlang.org/), [Ant Design](https://ant.design/)
- **后端**: Next.js API Routes
- **数据库**: [Prisma](https://www.prisma.io/) (默认使用 [SQLite](https://www.sqlite.org/))
- **部署**: [Docker](https://www.docker.com/)

## 🚀 快速开始

### 1. 环境准备

- [Node.js](https://nodejs.org/) (v20 或更高版本)
- [pnpm](https://pnpm.io/) (推荐) 或 npm/yarn

### 2. 安装依赖

克隆本项目到本地：

```bash
git clone https://github.com/foamcold/tts-web.git
cd tts-web
```

安装项目依赖：

```bash
pnpm install
```

### 3. 初始化数据库

本项目使用 Prisma 管理数据库。首次运行时，请执行以下命令来初始化数据库：

```bash
npx prisma migrate dev
```

### 4. 运行开发服务器

```bash
pnpm dev
```

现在，在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可看到应用界面。

## 本地生产环境部署

如果您想在本地模拟生产环境运行，可以按照以下步骤操作：

1.  **构建应用**:
    执行以下命令来为生产环境构建 Next.js 应用：
    ```bash
    pnpm build
    ```

2.  **启动生产服务器**:
    构建完成后，使用以下命令启动生产服务器：
    ```bash
    pnpm start
    ```

    现在，在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可访问为生产环境优化的应用。

## 🐳 Docker 部署

本项目支持使用 Docker 进行一键部署。

1.  **环境准备**:
    *   确保您的系统中已安装 [Docker](https://www.docker.com/get-started) 和 [Docker Compose](https://docs.docker.com/compose/install/)。

2.  **构建并启动容器**:
    在项目根目录下，运行以下命令：

    ```bash
    docker-compose up --build -d
    ```

    该命令会构建 Docker 镜像并在后台启动 `tts-web` 服务。

3.  **访问应用**:
    在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可访问。


### 使用 Dockerfile 单独部署

如果您不想使用 `docker-compose`，也可以直接通过 `Dockerfile` 来构建和运行应用。

1.  **构建 Docker 镜像**:
    在项目根目录下，运行以下命令来构建镜像：
    ```bash
    docker build -t tts-web .
    ```

2.  **运行 Docker 容器**:
    使用刚刚构建的镜像来启动一个容器：
    ```bash
    docker run -d -p 3000:3000 --name tts-web-app tts-web
    ```
    这将在后台启动一个名为 `tts-web-app` 的容器，并将应用的 3000 端口映射到主机的 3000 端口。

3.  **访问应用**:
    在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可访问。
## 📂 项目结构

```
.
├── app/                # Next.js App Router 目录
│   ├── api/            # 后端 API 路由
│   ├── plugins/        # 插件管理页面
│   ├── settings/       # 系统设置页面
│   └── test/           # TTS 测试页面
├── components/         # React 组件
├── prisma/             # Prisma 数据库模型和迁移文件
├── public/             # 静态资源
├── lib/                # 核心逻辑与服务
│   ├── tts-engine/     # TTS 插件引擎核心代码
│   └── services/       # 应用服务
├── Dockerfile          # 用于构建生产镜像
└── docker-compose.yml  # 用于简化 Docker 部署
```

## 🤝 贡献

欢迎提交 Pull Request 或 Issue 来为本项目做出贡献！

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。

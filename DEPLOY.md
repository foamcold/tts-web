# TTS Web Server 部署指南

本项目是一个基于 Next.js 的 TTS (Text-to-Speech) Web 服务端，旨在兼容运行 Android TTS 插件（例如“讯飞配音”）。

## 1. 环境要求

- **Node.js**: v18.0.0 或更高版本 (必须支持 Worker Threads 和 ES Modules)
- **数据库**: SQLite (默认) 或 PostgreSQL/MySQL (可通过 Prisma 配置)
- **操作系统**: Windows, Linux, macOS

## 2. 安装步骤

1.  **克隆代码库**
    ```bash
    git clone <your-repo-url>
    cd tts-web
    ```

2.  **安装依赖**
    ```bash
    npm install
    # 或者
    yarn install
    ```

3.  **配置环境变量**
    复制 `.env` 示例文件（如果不存在，请新建一个）：
    ```env
    # .env
    DATABASE_URL="file:./dev.db"
    ```

4.  **数据库迁移**
    初始化数据库表结构：
    ```bash
    npx prisma migrate dev --name init
    ```

## 3. 运行开发环境

```bash
npm run dev
```
服务将在 `http://localhost:3000` 启动。

## 4. 生产环境部署

### 4.1 构建项目

```bash
npm run build
```

### 4.2 启动服务

```bash
npm start
```

### 4.3 使用 PM2 管理进程 (推荐)

为了保证服务长期稳定运行，建议使用 PM2：

```bash
npm install -g pm2
pm2 start npm --name "tts-web" -- start
```

## 5. 插件使用说明

1.  访问 `http://localhost:3000/plugins`
2.  点击右上角的 **“导入插件”** 按钮。
3.  将你的 `.json` 格式 TTS 插件文件内容粘贴进去，或者上传文件。
4.  导入成功后，确保插件状态为 **“已启用”**。
5.  访问首页 `http://localhost:3000` 进行语音合成测试。

## 6. 常见问题排查

-   **Q: 插件运行报错 `MODULE_NOT_FOUND` 或 `SyntaxError`?**
    -   A: 这是一个已知的问题，通常与 Next.js 的 Worker 打包有关。本项目使用了特殊的 `worker-entry.mjs` 加载器来解决此问题。请确保你的 Node.js 版本 >= 18，并且没有修改 `lib/tts-engine` 下的核心文件。

-   **Q: 音频生成很慢?**
    -   A: 插件通常需要进行网络请求来获取音频，速度取决于你的网络连接以及插件目标服务器的响应速度。

-   **Q: 如何查看插件内部日志?**
    -   A: 在首页的“TTS 配置”表单中，开启 **“调试模式”**。生成音频后，页面下方会出现一个“调试日志”面板，显示插件运行过程中的所有输出。

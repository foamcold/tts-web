import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 禁用 Next.js 开发服务器的默认请求日志，使用自定义统一日志格式 */
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
};

export default nextConfig;

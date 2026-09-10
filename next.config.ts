import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 静态导出，供纯 nginx 托管
};

export default nextConfig;

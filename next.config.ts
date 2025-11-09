import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Bỏ devIndicators vì API cũ, Next 16 sẽ báo warning hoặc crash khi dùng boolean
  // Nếu muốn tắt loading indicator có thể dùng:
  // devIndicators: { buildActivity: false }
};

export default nextConfig;

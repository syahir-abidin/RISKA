/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["exceljs", "bcryptjs", "pg"] },
};
export default nextConfig;

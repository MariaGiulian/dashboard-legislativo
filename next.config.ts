import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que o Prisma Client seja importado nas rotas de API sem bundling
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;

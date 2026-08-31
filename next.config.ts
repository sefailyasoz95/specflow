import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* pdf-parse pulls in pdfjs and mammoth ships its own bundle; both are
     Node libraries that should be required at runtime rather than traced
     into the server bundle, where they break. */
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;

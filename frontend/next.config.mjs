/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Allow opening local documents via a URL path (works around browsers blocking file://
  // navigations from http(s) pages).
  //
  // Configure by setting DOCS_ROOT to an absolute folder on disk.
  // Example (PowerShell):
  //   $env:DOCS_ROOT = 'C:\\Users\\rt_bu\\Documents'
  //
  // Then links like /documents/<relative-path> will serve files from that folder.
  async rewrites() {
    if (!process.env.DOCS_ROOT) return [];
    // Route to our custom API handler.
    return [{ source: '/documents/:path*', destination: '/api/documents/:path*' }];
  }
};

export default nextConfig;

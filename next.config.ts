import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // TEMPORARY dev-only shim so the client can reach the Worker from origins the
  // Worker doesn't CORS-allow yet (Codespaces preview, localhost). Same-origin
  // /worker-proxy/* is rewritten server-side to the Worker (server→server has no
  // CORS), so the tide/current modules render live data in the preview WITHOUT
  // touching the Worker. Remove once the Worker allowlist is completed
  // (docs/worker-cors.md); production should point NEXT_PUBLIC_WORKER_URL at the
  // real Worker origin and drop this rewrite.
  async rewrites() {
    return [
      {
        source: "/worker-proxy/:path*",
        destination: "https://salty-cape-api.hogylureco.workers.dev/:path*",
      },
    ];
  },
};

export default nextConfig;

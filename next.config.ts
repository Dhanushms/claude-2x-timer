import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — stops your page being embedded in iframes on other sites
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Stop browsers guessing content types (MIME sniffing attacks)
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Only send the origin as referrer (no full URL leaked to third parties)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Disable browser features this site doesn't need
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // Force HTTPS for 1 year (Vercel already enforces this, belt-and-suspenders)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },

  // Content Security Policy — allows the site to run while blocking XSS
  // 'unsafe-inline' needed for Tailwind's inline styles; 'unsafe-eval' for Next.js dev
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires these
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",   // apply to every route
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000";

function readGitValue(command: string) {
  try {
    return (
      execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim() || "dev"
    );
  } catch {
    return "dev";
  }
}

const appCommit = process.env.APP_COMMIT ?? readGitValue("git rev-parse --short HEAD");
const appCommitDate =
  process.env.APP_COMMIT_DATE ?? readGitValue("git log -1 --format=%cd --date=short");

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_COMMIT_DATE__: JSON.stringify(appCommitDate),
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Sổ Chi Tiêu",
        short_name: "Wallet",
        theme_color: "#F4EFDD",
        background_color: "#F4EFDD",
        display: "standalone",
        start_url: "/",
        lang: "vi",
      },
      pwaAssets: {
        image: "public/app-icon.svg",
        // Manual links in index.html: the SVG favicon must stay on the light/dark
        // adaptive icon.svg, not this fixed-color install icon.
        includeHtmlHeadLinks: false,
        injectThemeColor: false,
        // Default preset gives the apple touch icon 30% padding + a white
        // backdrop (meant for icons without their own safe zone). app-icon.svg
        // already draws its own rounded-rect background at the size Apple
        // expects, so let it fill the full 180x180 canvas — iOS applies its
        // own corner mask, it doesn't need the built-in safe zone.
        preset: {
          transparent: { sizes: [64, 192, 512], favicons: [[48, "favicon.ico"]] },
          maskable: { sizes: [512] },
          apple: { sizes: [180], padding: 0 },
        },
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      "/health": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});

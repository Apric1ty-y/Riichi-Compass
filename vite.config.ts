import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default ({ mode }: { mode: string }) =>
  defineConfig({
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      VitePWA({
        injectRegister: "auto",
        registerType: "autoUpdate",
        includeAssets: ["Chun.svg", "Chun192.png", "Chun512.png", "**/*.svg", "fonts/*.woff2", "fonts/OFL.txt"],
        devOptions: {
          enabled: mode === "development",
        },
        manifest: {
          name: "riichi compass",
          short_name: "riichi compass",
          start_url: "/",
          display: "standalone",
          background_color: "#111827",
          lang: "zh-CN",
          scope: "/",
          description: "Riichi Mahjong Game Tracker",
          theme_color: "#111827",
          icons: [
            { src: "compass-sou1-192.png", sizes: "192x192", type: "image/png" },
            { src: "compass-sou1-512.png", sizes: "512x512", type: "image/png" },
          ],
        },
      }),
    ],
  });

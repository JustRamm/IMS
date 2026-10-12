import path from "node:path";
import fs from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualEdits } from "@emergentbase/visual-edits/vite";

// Supervisor exports DISABLE_HOT_RELOAD=true when the platform sets ENABLE_RELOAD=false.
const hotReloadDisabled = process.env.DISABLE_HOT_RELOAD === "true";

// Visual Edits (x-* JSX tagging, overlay, /edit-file endpoint) is dev-server-only by
// default (apply: serve); escape hatch mirrors DISABLE_HOT_RELOAD.
const visualEditsDisabled = process.env.DISABLE_VISUAL_EDITS === "true";

// Pod inotify quota is node-shared and routinely exhausted; native fs.watch EMFILEs at
// boot. Polling is the load-bearing default (set before Vite evaluates the config).
if (!hotReloadDisabled) {
  process.env.CHOKIDAR_USEPOLLING = "true";
}

// Read local .env if available
let localResendKey = "";
for (const p of [
  path.resolve(process.cwd(), "frontend/.env"),
  path.resolve(process.cwd(), ".env"),
]) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      const match = raw.match(/VITE_RESEND_API_KEY=(.*)/);
      if (match) {
        localResendKey = match[1].trim();
        break;
      }
    }
  } catch {}
}

// Local dev handler for /api/send-email
function resendLocalPlugin(env) {
  return {
    name: "resend-local-api",
    configureServer(server) {
      server.middlewares.use("/api/send-email", async (req, res) => {
        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body || "{}");
            const apiKey = env.VITE_RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || localResendKey;
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                from: parsed.from || "Carbon & Whale IMS <onboarding@resend.dev>",
                to: Array.isArray(parsed.to) ? parsed.to : [parsed.to],
                subject: parsed.subject || "Carbon & Whale Notification",
                html: parsed.html,
              }),
            });
            const data = await resendRes.json();
            res.setHeader("Content-Type", "application/json");
            res.statusCode = resendRes.status;
            res.end(JSON.stringify(data));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, process.cwd(), ""),
    ...loadEnv(mode, __dirname, ""),
  };
  return {
    plugins: [
      react(),
      tailwindcss(),
      resendLocalPlugin(env),
      ...(visualEditsDisabled ? [] : [visualEdits()]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react-dom/client", "react-router-dom", "react-is"],
    },
  // Every shipped dep, pre-bundled up front. Vite discovers deps lazily, so the first
  // import outside the initial graph would trigger a re-optimize + reload mid-session.
  optimizeDeps: {
    include: [
      "@base-ui/react",
      "@base-ui/react/button",
      "@base-ui/react/checkbox",
      "@base-ui/react/dialog",
      "@base-ui/react/input",
      "@base-ui/react/menu",
      "@base-ui/react/merge-props",
      "@base-ui/react/popover",
      "@base-ui/react/select",
      "@base-ui/react/tabs",
      "@base-ui/react/use-render",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "class-variance-authority",
      "clsx",
      "date-fns",
      "lucide-react",
      "motion/react",
      "next-themes",
      "react",
      "react-dom",
      "react-dom/client",
      "react-is",
      "react-router-dom",
      "recharts",
      "sonner",
      "tailwind-merge",
    ],
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    // Preview probe + /edit-file are cross-origin from the Emergent tab; Vite defaults to localhost-only CORS.
    cors: true,
    // No hmr.clientPort override: Vite infers the WS target from window.location, which
    // is correct on both localhost:3000 (smoke) and the https/:443 preview proxy.
    hmr: !hotReloadDisabled,
    watch: hotReloadDisabled
      ? null
      : {
          usePolling: true,
          interval: 300,
        },
    // No /api proxy: all data comes from Supabase directly via the SDK.
  },
};
});


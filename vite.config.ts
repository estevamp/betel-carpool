import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { componentTagger } from "lovable-tagger";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version?: string;
};

const normalizeVersion = (value?: string): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || /^0\.0\.0(?:[-+].*)?$/.test(trimmed)) {
    return null;
  }

  // Accept "major.minor" and normalize to valid semver for native build tooling.
  if (/^\d+\.\d+$/.test(trimmed)) {
    return `${trimmed}.0`;
  }

  return trimmed;
};

const getGitCommit = () => {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(
      normalizeVersion(process.env.VITE_APP_VERSION) ?? normalizeVersion(packageJson.version) ?? "0.0.0"
    ),
    __APP_COMMIT__: JSON.stringify(process.env.VITE_APP_COMMIT ?? getGitCommit()),
    __APP_BUILD_DATE__: JSON.stringify(process.env.VITE_APP_BUILD_DATE ?? new Date().toISOString()),
  },
}));

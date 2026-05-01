import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const githubPagesBase =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS && repositoryName && repositoryName !== "buicongnguyen.github.io"
    ? `/${repositoryName}/`
    : "/");

export default defineConfig({
  base: githubPagesBase,
  build: {
    cssTarget: ["chrome64", "ios12", "safari12"],
    target: ["chrome64", "ios12", "safari12"],
  },
  plugins: [react()],
});

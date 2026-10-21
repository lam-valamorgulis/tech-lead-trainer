import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": src } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/db/global-setup.ts"],
          // One reminder run takes at most about 0.3 s here (#91). On the CI machine, one request
          // once waited 5.4 s while 26 files shared one database. 15 s keeps such a wait from
          // failing CI, and a real hang still fails.
          testTimeout: 15_000,
        },
      },
    ],
  },
});

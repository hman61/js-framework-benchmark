import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const isProduction = process.env.BUILD === "production";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/main.js",
  output: {
    file: "dist/main.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [
    nodeResolve({
      preferBuiltins: false,
    }),
    isProduction && terser({
      compress: {
        drop_console: false, // Keep console for Timer
      },
    }),
  ].filter(Boolean),
};

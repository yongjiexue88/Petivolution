// vite.config.ts
import { defineConfig } from "file:///Users/yongjiexue/Documents/GitHub/Petivolution/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/yongjiexue/Documents/GitHub/Petivolution/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "/Users/yongjiexue/Documents/GitHub/Petivolution/frontend";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@app": resolve(__vite_injected_original_dirname, "src/app"),
      "@game": resolve(__vite_injected_original_dirname, "src/game"),
      "@sim": resolve(__vite_injected_original_dirname, "src/sim"),
      "@worker": resolve(__vite_injected_original_dirname, "src/worker"),
      "@storage": resolve(__vite_injected_original_dirname, "src/storage"),
      "@shared": resolve(__vite_injected_original_dirname, "src/shared")
    }
  },
  worker: {
    format: "es"
  },
  // @ts-expect-error - Vitest types not automatically merged with Vite UserConfig in this setup
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/main.tsx", "src/**/*.d.ts", "src/test/**"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMveW9uZ2ppZXh1ZS9Eb2N1bWVudHMvR2l0SHViL1BldGl2b2x1dGlvbi9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3lvbmdqaWV4dWUvRG9jdW1lbnRzL0dpdEh1Yi9QZXRpdm9sdXRpb24vZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3lvbmdqaWV4dWUvRG9jdW1lbnRzL0dpdEh1Yi9QZXRpdm9sdXRpb24vZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbi8vIGh0dHBzOi8vdml0ZS5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgc2VydmVyOiB7XG4gICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICdAYXBwJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvYXBwJyksXG4gICAgICAgICAgICAnQGdhbWUnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9nYW1lJyksXG4gICAgICAgICAgICAnQHNpbSc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3NpbScpLFxuICAgICAgICAgICAgJ0B3b3JrZXInOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy93b3JrZXInKSxcbiAgICAgICAgICAgICdAc3RvcmFnZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3N0b3JhZ2UnKSxcbiAgICAgICAgICAgICdAc2hhcmVkJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvc2hhcmVkJyksXG4gICAgICAgIH0sXG4gICAgfSxcbiAgICB3b3JrZXI6IHtcbiAgICAgICAgZm9ybWF0OiAnZXMnLFxuICAgIH0sXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciAtIFZpdGVzdCB0eXBlcyBub3QgYXV0b21hdGljYWxseSBtZXJnZWQgd2l0aCBWaXRlIFVzZXJDb25maWcgaW4gdGhpcyBzZXR1cFxuICAgIHRlc3Q6IHtcbiAgICAgICAgZ2xvYmFsczogdHJ1ZSxcbiAgICAgICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgICAgIHNldHVwRmlsZXM6ICcuL3NyYy90ZXN0L3NldHVwLnRzJyxcbiAgICAgICAgY292ZXJhZ2U6IHtcbiAgICAgICAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICAgICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnRzJywgJ3NyYy8qKi8qLnRzeCddLFxuICAgICAgICAgICAgZXhjbHVkZTogWydzcmMvbWFpbi50c3gnLCAnc3JjLyoqLyouZC50cycsICdzcmMvdGVzdC8qKiddLFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBSHhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDSixPQUFPO0FBQUEsTUFDSCxRQUFRO0FBQUEsUUFDSixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDWjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxRQUFRLFFBQVEsa0NBQVcsU0FBUztBQUFBLE1BQ3BDLFNBQVMsUUFBUSxrQ0FBVyxVQUFVO0FBQUEsTUFDdEMsUUFBUSxRQUFRLGtDQUFXLFNBQVM7QUFBQSxNQUNwQyxXQUFXLFFBQVEsa0NBQVcsWUFBWTtBQUFBLE1BQzFDLFlBQVksUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDNUMsV0FBVyxRQUFRLGtDQUFXLFlBQVk7QUFBQSxJQUM5QztBQUFBLEVBQ0o7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLFFBQVE7QUFBQSxFQUNaO0FBQUE7QUFBQSxFQUVBLE1BQU07QUFBQSxJQUNGLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLFVBQVU7QUFBQSxNQUNOLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxlQUFlLGNBQWM7QUFBQSxNQUN2QyxTQUFTLENBQUMsZ0JBQWdCLGlCQUFpQixhQUFhO0FBQUEsSUFDNUQ7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

// vite.config.ts
import { defineConfig } from "file:///home/ganpi/Documentos/Langs/JavaScript/py-data-sculptor-78919/node_modules/vite/dist/node/index.js";
import react from "file:///home/ganpi/Documentos/Langs/JavaScript/py-data-sculptor-78919/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/ganpi/Documentos/Langs/JavaScript/py-data-sculptor-78919/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/ganpi/Documentos/Langs/JavaScript/py-data-sculptor-78919";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "8rzoad-ip-161-132-54-35.tunnelmole.net",
      ".tunnelmole.net"
    ],
    host: "::",
    port: 8080
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9nYW5waS9Eb2N1bWVudG9zL0xhbmdzL0phdmFTY3JpcHQvcHktZGF0YS1zY3VscHRvci03ODkxOVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZ2FucGkvRG9jdW1lbnRvcy9MYW5ncy9KYXZhU2NyaXB0L3B5LWRhdGEtc2N1bHB0b3ItNzg5MTkvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvZ2FucGkvRG9jdW1lbnRvcy9MYW5ncy9KYXZhU2NyaXB0L3B5LWRhdGEtc2N1bHB0b3ItNzg5MTkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG5cdHNlcnZlcjoge1xuXHRcdGFsbG93ZWRIb3N0czogW1xuXHRcdFx0XCJsb2NhbGhvc3RcIixcblx0XHRcdFwiMTI3LjAuMC4xXCIsXG5cdFx0XHRcIjhyem9hZC1pcC0xNjEtMTMyLTU0LTM1LnR1bm5lbG1vbGUubmV0XCIsXG5cdFx0XHRcIi50dW5uZWxtb2xlLm5ldFwiLFxuXHRcdF0sXG5cdFx0aG9zdDogXCI6OlwiLFxuXHRcdHBvcnQ6IDgwODAsXG5cdH0sXG5cdHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihcblx0XHRCb29sZWFuLFxuXHQpLFxuXHRyZXNvbHZlOiB7XG5cdFx0YWxpYXM6IHtcblx0XHRcdFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuXHRcdH0sXG5cdH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRXLFNBQVMsb0JBQW9CO0FBQ3pZLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUMxQyxRQUFRO0FBQUEsSUFDUCxjQUFjO0FBQUEsTUFDYjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Q7QUFBQSxJQUNBLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNQO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUU7QUFBQSxJQUMvRDtBQUFBLEVBQ0Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLE9BQU87QUFBQSxNQUNOLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUNyQztBQUFBLEVBQ0Q7QUFDRCxFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=

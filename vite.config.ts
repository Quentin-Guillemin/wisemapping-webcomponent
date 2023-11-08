import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  return defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        '/quentin/api': {
          target: 'http://10.209.28.14:8090/',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[ext]',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
      },
    },
  });
};

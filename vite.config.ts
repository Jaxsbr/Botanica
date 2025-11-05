import { defineConfig } from 'vite';

export default defineConfig({
    base: '/Botanica/',
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
});


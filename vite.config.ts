/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@app': resolve(__dirname, 'src/app'),
            '@game': resolve(__dirname, 'src/game'),
            '@sim': resolve(__dirname, 'src/sim'),
            '@worker': resolve(__dirname, 'src/worker'),
            '@storage': resolve(__dirname, 'src/storage'),
            '@shared': resolve(__dirname, 'src/shared'),
        },
    },
    worker: {
        format: 'es',
    },
    // @ts-expect-error - Vitest types not automatically merged with Vite UserConfig in this setup
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/test/**'],
        },
    },
});

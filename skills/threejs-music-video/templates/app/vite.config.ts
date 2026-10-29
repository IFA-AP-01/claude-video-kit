import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    fs: { allow: ['..'] }, // song.mp3 and data/*.json live one level up
    hmr: process.env.MV_NO_HMR ? false : undefined,
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// base './' (Sprint 6): the built site in dist/ works from any address, so it can be dropped on
// Netlify, GitHub Pages or any static host for the live demo link.
export default defineConfig({ base: './', plugins: [react()], test: { environment: 'jsdom' } });

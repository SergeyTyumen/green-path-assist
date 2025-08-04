import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];
  
  // Динамический импорт для Tailwind CSS
  try {
    const tailwindcss = await import('@tailwindcss/vite');
    plugins.push(tailwindcss.default());
  } catch (error) {
    console.warn('Failed to load @tailwindcss/vite:', error);
  }
  
  if (mode === 'development') {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch (error) {
      console.warn('Failed to load lovable-tagger:', error);
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      host: "::",
      port: 8080,
    }
  };
});
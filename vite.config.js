import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// إصلاح أخطاء no-undef
const __dirname = dirname(fileURLToPath(import.meta.url));

// إصلاح تحذيرات process
process.env.NODE_ENV = process.env.NODE_ENV || 'development';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    })
  ],

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL) // Add other required variables explicitly
  },

  // إعدادات الخادم
  server: {
    port: 5173,
    host: true,
    open: true,
    strictPort: false,
    cors: true,
    hmr: {
      overlay: true,
      clientPort: 5173
    }
  },
  
  // إعدادات البناء
  build: {
    outDir: resolve(__dirname, 'dist'),
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'heavy-components': ['react-d3-tree', 'html2canvas']
        }
      }
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true
  },
  
  // إعدادات الحل والاستيراد - مُصححة
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@contexts': resolve(__dirname, 'src/contexts')
      // إزالة alias للـ firebase لتجنب التضارب
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  
  // إعدادات الـ CSS
  css: {
    devSourcemap: true,
    postcss: {
      plugins: []
    }
  },
  
  // تحسينات الأداء - مُصححة
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled'
    ],
    exclude: [
      'firebase'  // استبعاد Firebase من التحسين المسبق لتجنب المشاكل
    ],
    // تجبر Vite على إعادة تحسين التبعيات
    force: true
  },
  
  // إعدادات التطوير المتقدمة
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  
  logLevel: 'info',
  clearScreen: false,
  base: '/',
  
  worker: {
    format: 'es'
  },
  
  mode: process.env.NODE_ENV || 'development',
  publicDir: 'public'
})
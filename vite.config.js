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
      // إصلاح نهائي لمشكلة jsxDEV
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      fastRefresh: true,
      babel: {
        plugins: [],
        presets: [
          ['@babel/preset-react', { 
            runtime: 'automatic',
            importSource: 'react'
          }]
        ]
      }
    })
  ],

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    // إصلاح مشكلة global و jsxDEV
    global: 'globalThis',
    // إضافة تعريفات React
    __DEV__: JSON.stringify(false),
    'process.env.NODE_DEBUG': JSON.stringify(false),
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
  
  // إعدادات البرفيو
  preview: {
    port: 4173,
    host: true,
    open: true,
    strictPort: false,
    cors: true
  },
  
  // إعدادات البناء - مع إصلاحات مشكلة MUI
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
          // تجميع React في chunk منفصل
          'react-vendor': ['react', 'react-dom'],
          // تجميع جميع MUI في chunk واحد بدلاً من تقسيمه
          'mui-vendor': [
            '@mui/material', 
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // Firebase في chunk منفصل
          'firebase-vendor': [
            'firebase/app', 
            'firebase/auth', 
            'firebase/storage'
          ],
          // مكتبات ثقيلة منفصلة
          'visualization': ['d3'],
          'heavy-components': ['html2canvas']
        },
        // تحسين حجم الـ chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        }
      },
      // تحديد حد أقصى للملفات المفتوحة في نفس الوقت
      maxParallelFileOps: 5
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    // تحسين استخدام الذاكرة أثناء البناء
    reportCompressedSize: false,
    // تقليل عدد العمليات المتوازية
    target: 'esnext'
  },
  
  // إعدادات الحل والاستيراد
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@contexts': resolve(__dirname, 'src/contexts')
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
  
  // تحسينات الأداء - مع تحسينات MUI
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      // تحسين MUI
      '@mui/material/colors',
      '@emotion/react',
      '@emotion/styled',
      'd3'
    ],
    exclude: [
      'firebase'
    ],
    // تقليل عدد العمليات المتوازية للتحسين المسبق
    force: true,
    // تحديد عدد العمليات المتوازية
    esbuildOptions: {
      target: 'esnext'
    }
  },
  
  // إعدادات التطوير المتقدمة - إصلاح jsxDEV
  esbuild: {
    jsx: 'automatic',
    jsxFactory: undefined,
    jsxFragment: undefined,
    target: 'esnext'
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
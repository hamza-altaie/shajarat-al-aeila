import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: true
    })
  ],

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    global: 'globalThis',
    __DEV__: JSON.stringify(false),
    'process.env.NODE_DEBUG': JSON.stringify(false),
  },

  server: {
    port: 5173,
    host: true,
    open: true,
    strictPort: false,
    cors: true,
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      // لا تحدد clientPort - اترك Vite يختاره تلقائياً
    }
  },

  preview: {
    port: 4173,
    host: true,
    open: true,
    strictPort: false,
    cors: true
  },

  build: {
    outDir: resolve(__dirname, 'dist'),
    assetsDir: 'assets',
    sourcemap: false, // تعطيل source maps للإنتاج (يقلل الحجم بشكل كبير)
    minify: 'terser', // terser يضغط أفضل من esbuild
    target: 'es2020',
    terserOptions: {
      compress: {
        drop_console: true, // حذف console.log
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // React + MUI + Emotion معاً (تعتمد على بعض)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // MUI + Emotion في chunk واحد
          'mui': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/system',
            '@emotion/react',
            '@emotion/styled',
          ],
          // Firebase
          'firebase': ['firebase/app', 'firebase/auth'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // D3 + html2canvas
          'visualization': ['d3', 'html2canvas'],
        },
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    reportCompressedSize: true
  },

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

  css: {
    devSourcemap: true,
    postcss: { plugins: [] }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material/styles',
      '@mui/material/Button',
      '@mui/material/Box',
      '@mui/material/Typography',
      '@mui/material/Container',
      '@mui/material/Paper',
      '@mui/material/TextField',
      '@mui/material/Dialog',
      '@mui/material/CircularProgress',
      '@emotion/react',
      '@emotion/styled',
      'd3'
    ],
    exclude: [
      // استبعاد الحزمة المجمّعة كلها إذا كنت لا تستخدم Firebase
      'firebase'
    ],
    esbuildOptions: { target: 'es2019' }
  },

  esbuild: {
    jsx: 'automatic',
    target: 'es2019'
  },

  logLevel: 'info',
  clearScreen: false,
  base: '/',

  worker: {
    format: 'es'
  },

  publicDir: 'public'
})

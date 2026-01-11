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
      jsxImportSource: 'react',
      fastRefresh: true,
      babel: {
        plugins: [],
        presets: [['@babel/preset-react', { runtime: 'automatic', importSource: 'react' }]]
      }
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
    sourcemap: true,
    // استعمل esbuild بدلاً من terser (أسهل وأسرع)
    minify: 'esbuild',
    target: 'es2019',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // احذف هذا البلوك إذا لن تستخدم Firebase
          // 'firebase-vendor': [
          //   'firebase/app',
          //   'firebase/auth',
          //   'firebase/firestore',
          //   'firebase/storage'
          // ],
          'visualization': ['d3'],
          'heavy-components': ['html2canvas']
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `js/${name}-[hash].js`
        }
      }
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: false
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
      '@mui/material/colors',
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // تحسين React Fast Refresh
      fastRefresh: true,
      // تحسين معالجة JSX
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    })
  ],
  
  // إعدادات الخادم
  server: {
    port: 5173,
    host: true, // للوصول من الشبكة المحلية
    open: true, // فتح المتصفح تلقائياً
    strictPort: false, // السماح بمنافذ بديلة
    
    // إعدادات الـ proxy لـ Firebase (إذا لزم الأمر)
    proxy: {
      '/api': {
        target: 'https://shajarat-al-aeila.firebaseapp.com',
        changeOrigin: true,
        secure: true
      }
    },
    
    // معالجة CORS
    cors: true,
    
    // إعدادات HMR (Hot Module Replacement)
    hmr: {
      overlay: true, // إظهار الأخطاء على الشاشة
      clientPort: 5173
    }
  },
  
  // إعدادات البناء
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // خرائط المصدر للتطوير
    
    // تحسين حجم الملفات
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // الاحتفاظ بـ console.log في البناء
        drop_debugger: true
      }
    },
    
    // تقسيم الحزم
    rollupOptions: {
      output: {
        manualChunks: {
          // حزمة React منفصلة
          'react-vendor': ['react', 'react-dom'],
          // حزمة Material-UI منفصلة
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          // حزمة Firebase منفصلة
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // حزمة المكونات الثقيلة
          'heavy-components': ['react-d3-tree', 'html2canvas']
        }
      }
    },
    
    // تحسين الأصول
    assetsInlineLimit: 4096, // 4KB
    chunkSizeWarningLimit: 1000, // 1MB
    
    // تحسين CSS
    cssCodeSplit: true
  },
  
  // إعدادات الحل والاستيراد
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@firebase': resolve(__dirname, 'src/firebase'),
      '@contexts': resolve(__dirname, 'src/contexts')
    },
    
    // امتدادات الملفات المدعومة
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  
  // متغيرات البيئة
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  
  // إعدادات الـ CSS
  css: {
    devSourcemap: true, // خرائط مصدر CSS في التطوير
    
    // معالج CSS
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    },
    
    // PostCSS
    postcss: {
      plugins: [
        // يمكن إضافة plugins هنا عند الحاجة
      ]
    }
  },
  
  // تحسينات الأداء
  optimizeDeps: {
    include: [
      // تحسين استيراد المكتبات الشائعة
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'firebase/app',
      'firebase/auth', 
      'firebase/firestore'
    ],
    exclude: [
      // استبعاد المكتبات الثقيلة من التحسين المسبق
      'react-d3-tree'
    ]
  },
  
  // إعدادات التطوير المتقدمة
  esbuild: {
    // تحسين JSX
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    
    // إزالة console.log في الإنتاج
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  
  // معالجة الأخطاء
  logLevel: 'info',
  clearScreen: false, // عدم مسح الشاشة عند إعادة التحميل
  
  // إعدادات الـ PWA (إذا كان مطلوباً)
  base: '/',
  
  // تحسين الذاكرة
  worker: {
    format: 'es'
  },
  
  // إعدادات خاصة بالبيئة
  mode: process.env.NODE_ENV || 'development',
  
  // معالجة الملفات العامة
  publicDir: 'public',
  
  // إعدادات الأمان
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // معالجة خاصة للملفات المختلفة
      if (hostType === 'js') {
        return `/${filename}`
      } else {
        return `/${filename}`
      }
    }
  }
})
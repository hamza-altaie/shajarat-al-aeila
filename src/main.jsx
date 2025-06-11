import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import AppRoutes from './AppRoutes';
import { AuthProvider } from './AuthContext.jsx';

// إنشاء المظهر المخصص للتطبيق
const theme = createTheme({
  // الألوان الأساسية
  palette: {
    primary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    success: {
      main: '#388e3c',
      light: '#4caf50',
      dark: '#2e7d32',
    },
    error: {
      main: '#d32f2f',
      light: '#f44336',
      dark: '#c62828',
    },
    warning: {
      main: '#f57c00',
      light: '#ff9800',
      dark: '#ef6c00',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#0277bd',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },

  // الخطوط
  typography: {
    fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },

  // المكونات المخصصة
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.95rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4caf50',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2e7d32',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },

  spacing: 8,

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },

  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// الأنماط العامة للتطبيق - مُحدثة مع إصلاح أخطاء CSS
const globalStyles = (
  <GlobalStyles
    styles={(theme) => ({
      
      html: {
        direction: 'rtl',
        fontFamily: '"Cairo", sans-serif',
        fontSize: '16px',
        scrollBehavior: 'smooth',
      },
      
      body: {
        direction: 'rtl',
        fontFamily: '"Cairo", sans-serif',
        backgroundColor: '#f8f9fa',
        margin: 0,
        padding: 0,
        lineHeight: 1.6,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        WebkitTextSizeAdjust: '100%',
      },

      '*': {
        boxSizing: 'border-box',
        scrollBehavior: 'smooth',
      },
      
      '*::before, *::after': {
        boxSizing: 'border-box',
      },

      // تحسين شريط التمرير
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: '#f1f1f1',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#c1c1c1',
        borderRadius: '4px',
        '&:hover': {
          background: '#a8a8a8',
        },
      },

      // تحسين الروابط
      a: {
        color: '#2e7d32',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
        '&:hover': {
          textDecoration: 'underline',
          color: '#1b5e20',
        },
        '&:focus': {
          outline: '2px solid #2e7d32',
          outlineOffset: '2px',
        },
      },

      img: {
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
      },

      table: {
        borderCollapse: 'collapse',
        width: '100%',
      },

      'input, textarea, select, button': {
        font: 'inherit',
      },

      button: {
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: 0,
        '&:focus': {
          outline: '2px solid #2e7d32',
          outlineOffset: '2px',
        },
      },

      // فئات مساعدة
      '.no-select': {
        WebkitUserSelect: 'none', // إصلاح kebab-case
        MozUserSelect: 'none', // إصلاح kebab-case
        msUserSelect: 'none', // إصلاح kebab-case
        userSelect: 'none',
      },

      '.rtl': {
        direction: 'rtl',
        textAlign: 'right',
      },
      '.ltr': {
        direction: 'ltr',
        textAlign: 'left',
      },

      '.visually-hidden': {
        position: 'absolute !important',
        width: '1px !important',
        height: '1px !important',
        padding: '0 !important',
        margin: '-1px !important',
        overflow: 'hidden !important',
        clip: 'rect(0, 0, 0, 0) !important',
        whiteSpace: 'nowrap !important',
        border: '0 !important',
      },

      '.skip-link': {
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: '#2e7d32',
        color: '#ffffff',
        padding: '8px',
        textDecoration: 'none',
        borderRadius: '4px',
        '&:focus': {
          top: '6px',
        },
      },

      // استعلامات الوسائط
      '@media print': {
        body: {
          backgroundColor: 'white !important',
          color: 'black !important',
          fontSize: '12pt',
        },
        '.no-print': {
          display: 'none !important',
        },
        'a[href]:after': {
          content: '" (" attr(href) ")"',
        },
        img: {
          maxWidth: '100% !important',
        },
      },

      '@media (max-width: 600px)': {
        html: {
          fontSize: '14px',
        },
        body: {
          fontSize: '14px',
        },
      },

      '@media (min-width: 1920px)': {
        html: {
          fontSize: '18px',
        },
      },

      '@media (prefers-reduced-motion: reduce)': {
        '*': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
          scrollBehavior: 'auto !important',
        },
      },

      '@media (hover: none) and (pointer: coarse)': {
        'button, [role="button"]': {
          minHeight: '44px',
          minWidth: '44px',
        },
      },

      // الحركات المحسنة
      '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      '@keyframes slideInFromRight': {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' },
      },
      '@keyframes slideInFromLeft': {
        from: { transform: 'translateX(-100%)' },
        to: { transform: 'translateX(0)' },
      },
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' },
      },
      '@keyframes spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },

      // فئات الحركات
      '.fade-in': {
        animation: 'fadeIn 0.3s ease-in-out',
      },
      '.slide-in-right': {
        animation: 'slideInFromRight 0.3s ease-out',
      },
      '.slide-in-left': {
        animation: 'slideInFromLeft 0.3s ease-out',
      },
      '.pulse': {
        animation: 'pulse 2s infinite',
      },
      '.spin': {
        animation: 'spin 1s linear infinite',
      },
    })}
  />
);

// معالج الأخطاء العامة - محسن
const handleGlobalError = (error, errorInfo) => {
  console.error('خطأ عام في التطبيق:', error, errorInfo);
  
  // تجنب إرسال الأخطاء في وضع التطوير
  if (process.env.NODE_ENV === 'production') {
    // يمكن إضافة خدمة تسجيل الأخطاء هنا
    // مثل Sentry أو LogRocket
  }
};

// مكون معالج الأخطاء - محسن
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    handleGlobalError(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: '"Cairo", sans-serif',
          backgroundColor: '#f8f9fa',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '20px',
              filter: 'grayscale(1)',
            }}>
              🌳💔
            </div>
            
            <h1 style={{
              color: '#d32f2f',
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              عذراً، حدث خطأ غير متوقع
            </h1>
            
            <p style={{
              color: '#666',
              marginBottom: '24px',
              lineHeight: '1.6',
              fontSize: '16px'
            }}>
              نعتذر عن هذا الخطأ في تطبيق شجرة العائلة. 
              فريقنا سيعمل على إصلاح هذه المشكلة في أسرع وقت ممكن.
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                🔄 إعادة تحميل الصفحة
              </button>
              
              <button
                onClick={this.handleGoHome}
                style={{
                  backgroundColor: 'transparent',
                  color: '#2e7d32',
                  border: '2px solid #2e7d32',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                🏠 الصفحة الرئيسية
              </button>
            </div>

            <p style={{
              marginTop: '24px',
              fontSize: '14px',
              color: '#888',
              lineHeight: '1.4'
            }}>
              إذا استمر هذا الخطأ، يرجى التواصل مع فريق الدعم
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// التطبيق الرئيسي
const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// بدء تشغيل التطبيق - محسن
const container = document.getElementById('root');

if (!container) {
  console.error('❌ لم يتم العثور على العنصر الجذر #root في HTML');
  
  // إنشاء عنصر جذر إذا لم يكن موجوداً
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
  
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <div style={{
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        color: '#d32f2f',
        textAlign: 'center',
        padding: '20px',
      }}>
        <h1>خطأ في التطبيق</h1>
        <p>لم يتم العثور على العنصر الجذر المطلوب لتشغيل التطبيق</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#2e7d32',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    </React.StrictMode>
  );
} else {
  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// معالجة الأخطاء العامة - محسنة
window.addEventListener('error', (event) => {
  // تجنب إظهار أخطاء Chrome Extensions
  if (event.filename && event.filename.includes('extension://')) {
    return;
  }
  
  console.error('خطأ JavaScript غير معالج:', event.error);
  handleGlobalError(event.error, { 
    type: 'javascript', 
    source: event.filename, 
    line: event.lineno 
  });
});

window.addEventListener('unhandledrejection', (event) => {
  // تجنب إظهار أخطاء Chrome Extensions
  if (event.reason && event.reason.toString().includes('extension')) {
    return;
  }
  
  console.error('Promise مرفوض غير معالج:', event.reason);
  handleGlobalError(new Error(event.reason), { type: 'promise' });
});

// Service Worker للعمل دون اتصال - محسن
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ تم تسجيل Service Worker بنجاح:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('يتوفر تحديث جديد للتطبيق. هل تريد إعادة تحميل الصفحة؟')) {
              window.location.reload();
            }
          }
        });
      });
    } catch (registrationError) {
      console.log('❌ فشل تسجيل Service Worker:', registrationError);
    }
  });
}

// إضافة meta tags للتطبيق - محسنة
const addMetaTags = () => {
  const meta = [
    { name: 'description', content: 'تطبيق شجرة العائلة - أنشئ وأدر شجرة عائلتك بسهولة وأمان' },
    { name: 'keywords', content: 'شجرة العائلة, نسب, أنساب, عائلة, تطبيق عربي' },
    { name: 'author', content: 'فريق شجرة العائلة' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'theme-color', content: '#2e7d32' },
    { property: 'og:title', content: 'تطبيق شجرة العائلة' },
    { property: 'og:description', content: 'أنشئ وأدر شجرة عائلتك بسهولة وأمان' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/tree-bg.png' },
  ];

  meta.forEach(({ name, property, content }) => {
    const existing = document.querySelector(`meta[${name ? 'name' : 'property'}="${name || property}"]`);
    if (!existing) {
      const metaTag = document.createElement('meta');
      if (name) metaTag.name = name;
      if (property) metaTag.setAttribute('property', property);
      metaTag.content = content;
      document.head.appendChild(metaTag);
    }
  });
};

// تشغيل إضافة meta tags
try {
  addMetaTags();
} catch (error) {
  console.warn('تحذير: فشل في إضافة meta tags:', error);
}

// مراقبة حالة الشبكة - محسنة
if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
  const logNetworkStatus = () => {
    console.log('🌐 حالة الشبكة:', navigator.onLine ? 'متصل' : 'غير متصل');
  };
  
  window.addEventListener('online', logNetworkStatus);
  window.addEventListener('offline', logNetworkStatus);
  logNetworkStatus();
}

// دعم الاختصارات - محسن
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    console.log('⌨️ اختصارات لوحة المفاتيح متاحة');
  }
});

// تسجيل أداء التطبيق - محسن
if (process.env.NODE_ENV === 'production' && typeof performance !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          console.log('📊 أداء التطبيق:', {
            loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
            domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
            firstPaint: Math.round(performance.getEntriesByType('paint')[0]?.startTime || 0)
          });
        }
      } catch (error) {
        console.warn('تحذير: فشل في قياس الأداء:', error);
      }
    }, 0);
  });
}

// معلومات التطبيق في Console - محسنة
if (process.env.NODE_ENV === 'development') {
  console.group('🌳 معلومات التطبيق');
  console.log('📱 الاسم: تطبيق شجرة العائلة');
  console.log('🔢 الإصدار: 1.0.0');
  console.log('🚀 البيئة:', process.env.NODE_ENV);
  console.log('⚛️ React:', React.version);
  console.log('🎨 المظهر: Material-UI مخصص');
  console.log('👨‍💻 المطور: فريق شجرة العائلة');
  console.groupEnd();
}

console.log('🚀 تم تحميل التطبيق بنجاح!');
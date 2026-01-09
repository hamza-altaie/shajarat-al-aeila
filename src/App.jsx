import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles, Box, CircularProgress, Typography } from '@mui/material';

// استيراد المكونات الأساسية - مُصحح
import AppRoutes from './AppRoutes.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { TribeProvider } from './contexts/TribeContext.jsx';
import InstallPrompt from './components/InstallPrompt';
import MobileNavigation from './components/MobileNavigation';

// ======================================================
// 🎨 إنشاء المظهر الديناميكي
// ======================================================
const createDynamicTheme = (mode = 'light') => {
  // التأكد من تحديد الاتجاه بأمان
  let isRTL = false;
  try {
    isRTL = document.dir === 'rtl' || 
           document.documentElement.lang === 'ar' || 
           document.documentElement.getAttribute('dir') === 'rtl';
  } catch {
    // في حالة عدم توفر document، استخدم RTL كافتراضي للعربية
    isRTL = true;
  }
  
  return createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#2e7d32' : '#4caf50',
        light: mode === 'light' ? '#4caf50' : '#66bb6a',
        dark: mode === 'light' ? '#1b5e20' : '#2e7d32',
        contrastText: '#ffffff',
      },
      secondary: {
        main: mode === 'light' ? '#1976d2' : '#42a5f5',
        light: mode === 'light' ? '#42a5f5' : '#64b5f6',
        dark: mode === 'light' ? '#1565c0' : '#1976d2',
      },
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      },
      success: {
        main: mode === 'light' ? '#388e3c' : '#4caf50',
      },
      error: {
        main: mode === 'light' ? '#d32f2f' : '#f44336',
      },
      warning: {
        main: mode === 'light' ? '#f57c00' : '#ff9800',
      },
      info: {
        main: mode === 'light' ? '#0288d1' : '#03a9f4',
      },
    },
    typography: {
      fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700 },
      h2: { fontSize: '2rem', fontWeight: 600 },
      h3: { fontSize: '1.75rem', fontWeight: 600 },
      h4: { fontSize: '1.5rem', fontWeight: 600 },
      h5: { fontSize: '1.25rem', fontWeight: 600 },
      h6: { fontSize: '1.125rem', fontWeight: 600 },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(255,255,255,0.1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'light' ? '0 4px 16px rgba(0,0,0,0.15)' : '0 4px 16px rgba(255,255,255,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: mode === 'light' 
              ? '0 4px 20px rgba(0,0,0,0.08)' 
              : '0 4px 20px rgba(255,255,255,0.08)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: mode === 'light' 
                ? '0 8px 32px rgba(0,0,0,0.12)' 
                : '0 8px 32px rgba(255,255,255,0.12)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              transition: 'all 0.3s ease',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? '#4caf50' : '#66bb6a',
                borderWidth: 2,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? '#2e7d32' : '#4caf50',
                borderWidth: 2,
                boxShadow: `0 0 0 3px ${mode === 'light' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(76, 175, 80, 0.1)'}`,
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            transition: 'all 0.3s ease',
          },
        },
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
};

// ======================================================
// 🌐 الأنماط العامة المحسنة
// ======================================================
const createGlobalStyles = (mode) => (
  <GlobalStyles
    styles={{
      html: {
        direction: 'rtl',
        fontFamily: '"Cairo", sans-serif',
        fontSize: '16px',
        scrollBehavior: 'smooth',
        colorScheme: mode,
      },
      body: {
        direction: 'rtl',
        fontFamily: '"Cairo", sans-serif',
        backgroundColor: mode === 'light' ? '#f8f9fa' : '#121212',
        color: mode === 'light' ? '#333' : '#fff',
        margin: 0,
        padding: 0,
        lineHeight: 1.6,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      },
      '*': {
        boxSizing: 'border-box',
        scrollBehavior: 'smooth',
      },
      // تحسين شريط التمرير
      '::-webkit-scrollbar': {
        width: '12px',
        height: '12px',
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'light' ? '#f1f1f1' : '#2e2e2e',
        borderRadius: '6px',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'light' ? '#c1c1c1' : '#555',
        borderRadius: '6px',
        '&:hover': {
          background: mode === 'light' ? '#a8a8a8' : '#777',
        },
      },
      // تحسينات الإمكانية
      '@media (prefers-reduced-motion: reduce)': {
        '*': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
          scrollBehavior: 'auto !important',
        },
      },
      // تحسينات للطباعة
      '@media print': {
        body: {
          backgroundColor: 'white !important',
          color: 'black !important',
          fontSize: '12pt',
        },
        '.no-print': {
          display: 'none !important',
        },
      },
      // حركات مخصصة
      '@keyframes fadeInUp': {
        from: { opacity: 0, transform: 'translateY(20px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes slideInFromRight': {
        from: { opacity: 0, transform: 'translateX(100%)' },
        to: { opacity: 1, transform: 'translateX(0)' },
      },
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' },
      },
      // فئات مساعدة
      '.fade-in-up': {
        animation: 'fadeInUp 0.6s ease-out',
      },
      '.slide-in-right': {
        animation: 'slideInFromRight 0.5s ease-out',
      },
      '.pulse': {
        animation: 'pulse 2s infinite',
      },
      '.glass-morphism': {
        background: mode === 'light' 
          ? 'rgba(255, 255, 255, 0.7)' 
          : 'rgba(30, 30, 30, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid ' + (mode === 'light' 
          ? 'rgba(255, 255, 255, 0.3)' 
          : 'rgba(255, 255, 255, 0.1)'),
      },
    }}
  />
);

// ======================================================
// 🔐 مكون مراقبة المصادقة
// ======================================================
function AuthMonitor({ children }) {
  const [authLoading, setAuthLoading] = useState(true);
  
  useEffect(() => {
    // محاكاة فحص المصادقة
    const checkAuth = () => {
      try {
        // تأخير بسيط لمحاكاة التحميل
        setTimeout(() => {
          setAuthLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('❌ خطأ في مراقبة المصادقة:', error);
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (authLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            animation: 'pulse 2s infinite',
          }}
        >
          <Typography variant="h2" sx={{ color: 'white' }}>
            🌳
          </Typography>
        </Box>
        
        <CircularProgress 
          size={60} 
          sx={{ color: 'primary.main', mb: 2 }} 
        />
        
        <Typography 
          variant="h5" 
          color="text.primary"
          gutterBottom
          className="fade-in-up"
        >
          جاري تحميل شجرة العائلة...
        </Typography>
        
        <Typography 
          variant="body1" 
          color="text.secondary"
          textAlign="center"
          className="fade-in-up"
          sx={{ maxWidth: 400, mt: 1 }}
        >
          نقوم بتحضير بياناتك وتهيئة النظام المتقدم
        </Typography>
      </Box>
    );
  }

  return children;
}

// ======================================================
// 🎨 مكون إدارة المظهر
// ======================================================
function ThemeManager({ children }) {
  const [theme] = useState('light'); // يمكن تطويرها لاحقاً لدعم الوضع المظلم
  const dynamicTheme = createDynamicTheme(theme);
  
  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      {createGlobalStyles(theme)}
      {children}
    </ThemeProvider>
  );
}

// ======================================================
// 🎯 المكون الرئيسي للتطبيق
// ======================================================
function App() {
  return (
    <ThemeManager>
      <Router basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <TribeProvider>
            <AuthMonitor>
              <AppRoutes />
              <MobileNavigation />
              <InstallPrompt />
            </AuthMonitor>
          </TribeProvider>
        </AuthProvider>
      </Router>
    </ThemeManager>
  );
}

export default App;

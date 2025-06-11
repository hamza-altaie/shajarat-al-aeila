import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles, Box, CircularProgress, Typography } from '@mui/material';

// استيراد المكونات الأساسية
import AppRoutes from './AppRoutes';

// ======================================================
// 🎨 إنشاء المظهر المُبسط
// ======================================================
const createAppTheme = () => {
  return createTheme({
    direction: 'rtl',
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
      },
      background: {
        default: '#f8f9fa',
        paper: '#ffffff',
      },
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
      },
      success: {
        main: '#388e3c',
      },
      error: {
        main: '#d32f2f',
      },
      warning: {
        main: '#f57c00',
      },
      info: {
        main: '#0288d1',
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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
                borderColor: '#4caf50',
                borderWidth: 2,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32',
                borderWidth: 2,
                boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.1)',
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
// 🌐 الأنماط العامة المُبسطة
// ======================================================
const createAppStyles = () => (
  <GlobalStyles
    styles={{
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
        color: '#333',
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
        background: '#f1f1f1',
        borderRadius: '6px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#c1c1c1',
        borderRadius: '6px',
        '&:hover': {
          background: '#a8a8a8',
        },
      },
      // حركات مخصصة
      '@keyframes fadeInUp': {
        from: { opacity: 0, transform: 'translateY(20px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' },
      },
      '.fade-in-up': {
        animation: 'fadeInUp 0.6s ease-out',
      },
      '.pulse': {
        animation: 'pulse 2s infinite',
      },
    }}
  />
);

// ======================================================
// 🔐 مكون بسيط لمراقبة المصادقة
// ======================================================
function SimpleAuthMonitor({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // فحص بسيط للمصادقة
    const checkAuth = () => {
      try {
        const uid = localStorage.getItem('verifiedUid');
        const phone = localStorage.getItem('verifiedPhone');
        
        if (uid && phone) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('خطأ في فحص المصادقة:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    // تأخير بسيط لمحاكاة التحميل
    setTimeout(checkAuth, 1000);
  }, []);

  if (loading) {
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
          يرجى الانتظار بينما نحضر تطبيقك
        </Typography>
      </Box>
    );
  }

  return children;
}

// ======================================================
// 🎯 المكون الرئيسي للتطبيق
// ======================================================
function App() {
  const theme = createAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {createAppStyles()}
      <Router>
        <SimpleAuthMonitor>
          <AppRoutes />
        </SimpleAuthMonitor>
      </Router>
    </ThemeProvider>
  );
}

export default App;
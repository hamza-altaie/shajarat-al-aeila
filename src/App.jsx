// src/App.jsx - النسخة المحدثة
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

// صفحات التطبيق الموجودة
import PhoneLogin from './pages/PhoneLogin';
import Family from './pages/Family';
import FamilySelection from './pages/FamilySelection';
import PrivacyPolicy from './pages/PrivacyPolicy';

// المكون المحسن الجديد - يحل محل FamilyTreeAdvanced
import EnhancedFamilyTreeWrapper from './components/EnhancedFamilyTreeWrapper';

// المكون القديم (احتفظ به كنسخة احتياطية مؤقتاً)
import FamilyTreeAdvanced from './components/FamilyTreeAdvanced';

// إنشاء Theme للتطبيق
const createAppTheme = () => createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20'
    },
    secondary: {
      main: '#1565c0',
      light: '#42a5f5',
      dark: '#0d47a1'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 }
  },
  direction: 'rtl',
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          direction: 'rtl',
          fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

function App() {
  const theme = createAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>
            <Routes>
              {/* المسارات العامة */}
              <Route path="/login" element={<PhoneLogin />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              
              {/* المسارات المحمية */}
              <Route path="/" element={
                <ProtectedRoute>
                  <FamilySelection />
                </ProtectedRoute>
              } />
              
              <Route path="/family" element={
                <ProtectedRoute>
                  <Family />
                </ProtectedRoute>
              } />
              
              {/* مسار شجرة العائلة المحسن */}
              <Route path="/family-tree" element={
                <ProtectedRoute>
                  <EnhancedFamilyTreeWrapper />
                </ProtectedRoute>
              } />
              
              {/* مسار الشجرة القديمة (للاختبار والمقارنة) */}
              <Route path="/family-tree-old" element={
                <ProtectedRoute>
                  <FamilyTreeAdvanced />
                </ProtectedRoute>
              } />
              
              {/* إعادة توجيه المسارات غير الموجودة */}
              <Route path="*" element={
                <ProtectedRoute>
                  <FamilySelection />
                </ProtectedRoute>
              } />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
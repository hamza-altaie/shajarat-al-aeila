// src/components/ErrorBoundary.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

/**
 * مكون لالتقاط الأخطاء في React وعرض واجهة بديلة
 * يمنع انهيار التطبيق بالكامل عند حدوث خطأ في أي مكون فرعي
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // تحديث الحالة لعرض واجهة الخطأ البديلة
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // حفظ معلومات الخطأ للعرض في وضع التطوير
    this.setState({ errorInfo });

    // تسجيل الخطأ (يمكن إرساله لخدمة مراقبة الأخطاء)
    console.error('❌ خطأ في المكون:', error);
    console.error('📍 مكان الخطأ:', errorInfo?.componentStack);
  }

  handleRetry = () => {
    // إعادة تعيين الحالة لمحاولة عرض المكون مرة أخرى
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    // الانتقال للصفحة الرئيسية
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 450,
              borderRadius: 3,
              bgcolor: 'background.paper',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 72, color: 'error.main', mb: 2 }} />

            <Typography variant="h5" gutterBottom color="error.main" fontWeight="bold">
              حدث خطأ غير متوقع
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              {this.props.fallbackMessage ||
                'عذراً، حدث خطأ أثناء عرض هذا المحتوى. يرجى المحاولة مرة أخرى.'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                sx={{ minWidth: 150 }}
              >
                إعادة المحاولة
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                sx={{ minWidth: 150 }}
              >
                الصفحة الرئيسية
              </Button>
            </Box>

            {/* عرض تفاصيل الخطأ في وضع التطوير فقط */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  textAlign: 'left',
                  direction: 'ltr',
                  overflow: 'auto',
                  maxHeight: 200,
                  border: '1px solid',
                  borderColor: 'grey.300',
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

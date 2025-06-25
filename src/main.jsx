import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// استيراد الخطوط والستايل
import './index.css'

// إعداد اللغة العربية والاتجاه
document.documentElement.lang = 'ar';
document.documentElement.dir = 'rtl';
document.title = 'شجرة العائلة';

// معالج أخطاء React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('خطأ في المكون:', error, errorInfo);
    this.setState({ 
      error: error, 
      errorInfo: errorInfo 
    });
  }

  handleReload = () => {
    window.location.reload();
  }

  handleGoHome = () => {
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontFamily: 'Cairo, Arial, sans-serif',
          backgroundColor: '#f8f9fa',
          color: '#333',
          textAlign: 'center',
          padding: '20px',
          direction: 'rtl'
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '100%'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px'
            }}>
              ⚠️
            </div>
            
            <h1 style={{ 
              color: '#d32f2f', 
              marginBottom: '20px',
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              حدث خطأ في التطبيق
            </h1>
            
            <p style={{ 
              marginBottom: '24px', 
              lineHeight: '1.6',
              fontSize: '1.1rem',
              color: '#555'
            }}>
              نعتذر، حدث خطأ غير متوقع أثناء تشغيل التطبيق. 
              يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً.
            </p>

            <p style={{
              marginBottom: '32px',
              fontSize: '0.95rem',
              color: '#888',
              lineHeight: '1.4'
            }}>
              إذا استمر هذا الخطأ، يرجى التواصل مع فريق الدعم. 
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
              color: '#999',
              borderTop: '1px solid #eee',
              paddingTop: '16px'
            }}>
              شجرة العائلة - نسخة 1.0.0
            </p>

            {this.state.error && (
              <details style={{ 
                marginTop: '20px', 
                textAlign: 'left',
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: '#666',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  تفاصيل الخطأ (للمطورين)
                </summary>
                <pre style={{ 
                  backgroundColor: '#fff', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #ccc'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// دالة معالجة الأخطاء العامة
function handleGlobalError(error, context = {}) {
  console.error('خطأ عام في التطبيق:', error, context);
  
  // يمكن إضافة تتبع الأخطاء هنا (مثل Sentry)
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message || error.toString(),
      fatal: false
    });
  }
}

// بدء تشغيل التطبيق
const container = document.getElementById('root');

if (!container) {
  console.error('❌ لم يتم العثور على العنصر الجذر #root');
  
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
        fontFamily: 'Cairo, Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        color: '#d32f2f',
        textAlign: 'center',
        padding: '20px',
        direction: 'rtl'
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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// معالجة الأخطاء العامة
window.addEventListener('error', (event) => {
  // تجنب إظهار أخطاء Chrome Extensions
  if (event.filename && event.filename.includes('extension://')) {
    event.preventDefault();
    return false;
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
    event.preventDefault();
    return false;
  }
  
  console.error('Promise مرفوض غير معالج:', event.reason);
  handleGlobalError(new Error(event.reason), { type: 'promise' });
});

// Service Worker للعمل دون اتصال (للإنتاج فقط)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('يتوفر تحديث جديد للتطبيق. هل تريد إعادة التحميل الآن؟')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      console.log('✅ Service Worker مسجل بنجاح:', registration);
    } catch (error) {
      console.error('❌ فشل تسجيل Service Worker:', error);
    }
  });
}

// إعدادات الأداء
if (import.meta.env.DEV) {
  // في بيئة التطوير، تمكين أدوات التطوير
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE = () => {};
}

// تسجيل معلومات التطبيق
console.log(`
🌳 شجرة العائلة - تطبيق إدارة الأنساب
📱 النسخة: ${import.meta.env.VITE_APP_VERSION || '1.0.0'}
🔧 البيئة: ${import.meta.env.MODE}
🚀 تم التحميل بنجاح!
`);

// تصدير دوال مفيدة للـ debugging
if (import.meta.env.DEV) {
  window.debugApp = {
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    mode: import.meta.env.MODE,
    firebase: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    },
    reload: () => window.location.reload(),
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('تم مسح جميع البيانات المحلية');
    }
  };
}
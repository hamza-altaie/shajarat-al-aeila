import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// معالج الأخطاء العامة
const handleGlobalError = (error, errorInfo) => {
  console.error('خطأ عام في التطبيق:', error, errorInfo);
  
  // تجنب إرسال الأخطاء في وضع التطوير
  if (import.meta.env.PROD) {
    // يمكن إضافة خدمة تسجيل الأخطاء هنا
    // مثل Sentry أو LogRocket
  }
};

// مكون معالج الأخطاء
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

// بدء تشغيل التطبيق
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

// Service Worker للعمل دون اتصال
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ تم تسجيل Service Worker بنجاح:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('يتوفر تحديث جديد للتطبيق. هل تريد إعادة تحميل الصفحة؟')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (registrationError) {
      console.log('❌ فشل تسجيل Service Worker:', registrationError);
    }
  });
}

// مراقبة حالة الشبكة
if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
  const logNetworkStatus = () => {
    console.log('🌐 حالة الشبكة:', navigator.onLine ? 'متصل' : 'غير متصل');
  };
  
  window.addEventListener('online', logNetworkStatus);
  window.addEventListener('offline', logNetworkStatus);
  logNetworkStatus();
}

// معلومات التطبيق في Console
if (import.meta.env.DEV) {
  console.group('🌳 معلومات التطبيق');
  console.log('📱 الاسم: تطبيق شجرة العائلة');
  console.log('🔢 الإصدار: 1.0.0');
  console.log('🚀 البيئة:', import.meta.env.MODE);
  console.log('⚛️ React:', React.version);
  console.log('🎨 المظهر: Material-UI مخصص');
  console.log('👨‍💻 المطور: فريق شجرة العائلة');
  console.groupEnd();
}

console.log('🚀 تم تحميل التطبيق بنجاح!');
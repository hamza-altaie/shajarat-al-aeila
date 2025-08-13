// src/main.jsx - نقطة الدخول الرئيسية مع إصلاح الأخطاء
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ===========================================================================
// 🔧 إصلاح مشاكل React DevTools والأخطاء العامة
// ===========================================================================

// تجنب أخطاء React DevTools
if (typeof window !== 'undefined') {
  // إعداد React DevTools بشكل آمن
  try {
    if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    }
    
    // تعيين خصائص آمنة لـ React DevTools
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    if (typeof hook === 'object' && hook !== null) {
      // تعيين الخصائص المطلوبة بشكل آمن
      if (!hook.checkDCE) {
        hook.checkDCE = function() {};
      }
      if (!hook.supportsFiber) {
        hook.supportsFiber = true;
      }
      if (!hook.renderers) {
        hook.renderers = new Map();
      }
      if (!hook.onCommitFiberRoot) {
        hook.onCommitFiberRoot = function() {};
      }
      if (!hook.onCommitFiberUnmount) {
        hook.onCommitFiberUnmount = function() {};
      }
    }
  } catch (devToolsError) {
    console.warn('⚠️ تحذير: لم يتم إعداد React DevTools بشكل صحيح:', devToolsError);
  }
}

// ===========================================================================
// 🛡️ معالجة الأخطاء العامة
// ===========================================================================

// ErrorBoundary مكون لمعالجة الأخطاء
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ خطأ في التطبيق:', error, errorInfo);
    
    // تجنب إرسال أخطاء Chrome Extensions
    if (error.stack && !error.stack.includes('extension://')) {
      // يمكن إضافة خدمة لوغ الأخطاء هنا
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Cairo, Arial, sans-serif'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>
            🚫 حدث خطأ في التطبيق
          </h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            عذراً، حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔄 إعادة تحميل الصفحة
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>تفاصيل الخطأ (للمطورين)</summary>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '5px',
                fontSize: '12px',
                overflow: 'auto',
                maxWidth: '600px'
              }}>
                {this.state.error?.stack || this.state.error?.message || 'خطأ غير معروف'}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// دالة لمعالجة الأخطاء العامة
const handleGlobalError = (error, context = {}) => {
  // تجنب أخطاء Chrome Extensions
  if (error.message && (
    error.message.includes('extension') ||
    error.message.includes('chrome-extension') ||
    error.message.includes('aggiiclaiamajehmlfpkjmlbadmkledi') ||
    error.message.includes('ERR_FAILED')
  )) {
    return;
  }
  
  if (error.stack && (
    error.stack.includes('extension://') ||
    error.stack.includes('chrome-extension://') ||
    error.stack.includes('contentscript.js')
  )) {
    return;
  }
  
  console.error('❌ خطأ عام في التطبيق:', {
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
};

// ===========================================================================
// 🚀 تشغيل التطبيق
// ===========================================================================

// التأكد من وجود العنصر الجذر
const container = document.getElementById('root');
if (!container) {
  throw new Error('لم يتم العثور على العنصر الجذر #root في HTML');
}

// إنشاء الجذر وعرض التطبيق
const root = createRoot(container);

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

} catch (renderError) {
  console.error('❌ خطأ في عرض التطبيق:', renderError);
  handleGlobalError(renderError, { phase: 'render' });
}

// ===========================================================================
// 🔍 مستمعات الأخطاء العامة
// ===========================================================================

// معالجة أخطاء JavaScript العامة
window.addEventListener('error', (event) => {
  // تجاهل أخطاء Chrome Extensions
  if (event.filename && (
    event.filename.includes('extension://') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    event.preventDefault();
    return false;
  }
  
  // تجاهل أخطاء React DevTools المعروفة
  if (event.message && event.message.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    event.preventDefault();
    return false;
  }
  
  // تجاهل أخطاء reCAPTCHA والمحتوى غير الحرج
  if (event.message && (
    event.message.includes('Script error') ||
    event.message.includes('Non-Error promise rejection') ||
    event.message.includes('recaptcha') ||
    event.message.includes('grecaptcha')
  )) {
    console.warn('⚠️ تحذير غير حرج:', event.message);
    event.preventDefault();
    return false;
  }
  
  // تسجيل الأخطاء الحرجة فقط
  handleGlobalError(event.error || new Error(event.message), { 
    type: 'javascript', 
    source: event.filename, 
    line: event.lineno,
    column: event.colno
  });
});

// معالجة Promise المرفوضة
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // تجاهل أخطاء Chrome Extensions
  if (reason && reason.toString().includes('extension')) {
    event.preventDefault();
    return false;
  }
  
  // تجاهل أخطاء React DevTools
  if (reason && reason.toString().includes('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    event.preventDefault();
    return false;
  }
  
  // تجاهل أخطاء reCAPTCHA والتايمآوت المعروفة
  if (reason && (
    reason.toString().includes('recaptcha') ||
    reason.toString().includes('Timeout') ||
    reason.toString().includes('grecaptcha') ||
    reason.toString().includes('___grecaptcha_cfg')
  )) {
    console.warn('⚠️ تحذير reCAPTCHA/Timeout:', reason);
    event.preventDefault();
    return false;
  }
  
  // تجاهل أخطاء Firebase المعروفة غير الحرجة
  if (reason && reason.code && reason.code.startsWith('firebase/')) {
    console.warn('⚠️ تحذير Firebase:', reason);
    event.preventDefault();
    return false;
  }
  
  // فقط تسجيل الأخطاء الحرجة
  if (reason && !reason.toString().includes('Network Error')) {
    handleGlobalError(new Error(reason), { type: 'promise' });
  }
});

// ===========================================================================
// 🔧 Service Worker (للإنتاج فقط)
// ===========================================================================

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('🔄 يتوفر تحديث جديد للتطبيق. هل تريد إعادة التحميل الآن؟')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
    } catch (error) {
      console.warn('⚠️ تحذير: فشل تسجيل Service Worker:', error);
    }
  });
}

// ===========================================================================
// 📱 معلومات التطبيق والتطوير
// ===========================================================================

// تسجيل معلومات التطبيق
const appInfo = {
  name: import.meta.env.VITE_APP_NAME || 'شجرة العائلة',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  mode: import.meta.env.MODE,
  timestamp: new Date().toISOString()
};

// أدوات التطوير (بيئة التطوير فقط)
if (import.meta.env.DEV) {
  window.debugApp = {
    info: appInfo,
    firebase: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    },
    actions: {
      reload: () => window.location.reload(),
      clearStorage: () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          console.error('❌ فشل في مسح البيانات المحلية:', error);
        }
      },
      checkFirebase: async () => {
        try {
          const { getFirebaseStatus } = await import('./firebase/config');
          const status = getFirebaseStatus();
          return status;
        } catch (error) {
          console.error('❌ خطأ في فحص Firebase:', error);
          return { error: error.message };
        }
      }
    }
  };
}

// ===========================================================================
// Cleanup on page close
// ===========================================================================

window.addEventListener('beforeunload', () => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    try {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.renderers) {
        hook.renderers.clear();
      }
    } catch {
      // Ignore cleanup errors
    }
  }
});

if (import.meta.env.DEV) {
  window.__APP_INFO__ = appInfo;
}

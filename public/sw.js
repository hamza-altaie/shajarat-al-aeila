// public/sw.js - النسخة المُصححة الكاملة
const CACHE_VERSION = 'family-tree-v1.0.3';
const CACHE_NAME = `family-tree-cache-${CACHE_VERSION}`;

// الملفات الأساسية (مسارات صحيحة لـ Vite)
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ فشل في تثبيت Service Worker:', error);
        // حتى لو فشل التخزين، استمر في التثبيت
        return self.skipWaiting();
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  
  event.waitUntil(
    Promise.all([
      // حذف التخزين المؤقت القديم
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع العملاء
      self.clients.claim()
    ])
  );
});

// معالجة الطلبات - مُبسطة ومُحسنة
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // تجاهل الطلبات الخارجية
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // تجاهل طلبات Firebase والخدمات الخارجية
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('google') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firestore')) {
    return;
  }

  // تجاهل طلبات التطوير
  if (url.pathname.includes('/@vite/') || 
      url.pathname.includes('/@fs/') ||
      url.pathname.includes('/node_modules/') ||
      url.pathname.includes('/__vite_hmr')) {
    return;
  }

  event.respondWith(
    handleFetchRequest(event.request)
  );
});

// معالجة الطلبات بطريقة بسيطة وفعالة
async function handleFetchRequest(request) {
  try {
    // للصفحات HTML - محاولة الشبكة أولاً
    if (request.destination === 'document') {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        // في حالة فشل الشبكة، استخدم النسخة المخزنة
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // إرجاع الصفحة الرئيسية كحل احتياطي
        return caches.match('/') || caches.match('/index.html');
      }
    }

    // للموارد الأخرى - الشبكة أولاً مع تخزين
    const networkResponse = await fetch(request);
    if (networkResponse.ok && 
        (request.destination === 'image' || 
         request.destination === 'script' || 
         request.destination === 'style' ||
         request.url.includes('/icons/') ||
         request.url.includes('/assets/'))) {
      
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;

  } catch {
    // محاولة استخدام النسخة المخزنة
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // للصفحات، إرجاع صفحة احتياطية
    if (request.destination === 'document') {
      return new Response(getOfflineHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    throw new Error('Network and cache both failed');
  }
}

// معالجة رسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: CACHE_VERSION });
      }
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      }).catch((error) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
      break;
  }
});

// حذف جميع التخزين المؤقت
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  } catch (error) {
    console.error('❌ فشل في مسح التخزين المؤقت:', error);
    throw error;
  }
}

// صفحة HTML احتياطية عند عدم وجود اتصال
function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>شجرة العائلة - غير متصل</title>
      <style>
        body {
          font-family: 'Cairo', Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        h1 {
          color: #2e7d32;
          margin-bottom: 20px;
          font-size: 2rem;
        }
        p {
          color: #666;
          margin: 20px 0;
          line-height: 1.6;
        }
        button {
          background: #2e7d32;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 20px;
          transition: background 0.3s;
        }
        button:hover {
          background: #1b5e20;
        }
        .emoji {
          font-size: 4rem;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">📵</div>
        <h1>غير متصل</h1>
        <p>
          عذراً، لا يمكن الوصول إلى شجرة العائلة في الوقت الحالي.
          يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
        </p>
        <button onclick="window.location.reload()">
          🔄 إعادة المحاولة
        </button>
      </div>
    </body>
    </html>
  `;
}

// تنظيف دوري للتخزين المؤقت (كل 24 ساعة)
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // أسبوع واحد
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const responseDate = new Date(dateHeader).getTime();
            if (now - responseDate > maxAge) {
              await cache.delete(request);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ فشل التنظيف الدوري:', error);
    }
  }, 24 * 60 * 60 * 1000);
}
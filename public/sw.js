// public/sw.js - النسخة المُصححة للمشروع
const CACHE_VERSION = 'family-tree-v1.0.0';
const CACHE_NAME = `family-tree-cache-${CACHE_VERSION}`;

// الملفات الأساسية (مسارات صحيحة لـ Vite)
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-72x72.png'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 تثبيت Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 تخزين الملفات الأساسية...');
        // تخزين الملفات الأساسية فقط
        return cache.addAll([
          '/',
          '/index.html', 
          '/manifest.json'
        ]);
      })
      .then(() => {
        console.log('✅ تم تثبيت Service Worker بنجاح');
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
  console.log('🚀 تفعيل Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // حذف التخزين المؤقت القديم
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ حذف التخزين المؤقت القديم:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع العملاء
      self.clients.claim()
    ]).then(() => {
      console.log('✅ تم تفعيل Service Worker بنجاح');
    })
  );
});

// معالجة الطلبات
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
      url.hostname.includes('firestore') ||
      url.hostname.includes('cloudfunctions')) {
    return;
  }

  // تجاهل طلبات HMR في التطوير
  if (url.pathname.includes('/@vite/') || 
      url.pathname.includes('/@fs/') ||
      url.pathname.includes('/node_modules/')) {
    return;
  }

  event.respondWith(
    handleFetchRequest(event.request)
  );
});

// معالجة الطلبات مع استراتيجيات مختلفة
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // للصفحات HTML - محاولة الشبكة أولاً
    if (request.destination === 'document') {
      try {
        const networkResponse = await fetch(request);
        // تخزين الصفحة الناجحة
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // في حالة فشل الشبكة، استخدم النسخة المخزنة أو الصفحة الرئيسية
        const cachedResponse = await caches.match(request);
        return cachedResponse || caches.match('/') || caches.match('/index.html');
      }
    }

    // للموارد الثابتة - التخزين المؤقت أولاً
    if (request.destination === 'image' || 
        request.destination === 'script' || 
        request.destination === 'style' ||
        url.pathname.includes('/icons/') ||
        url.pathname.includes('/assets/')) {
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.warn('⚠️ فشل تحميل المورد:', request.url);
        throw error;
      }
    }

    // للطلبات الأخرى - الشبكة فقط
    return fetch(request);

  } catch (error) {
    console.warn('⚠️ فشل في معالجة الطلب:', request.url, error);
    
    // محاولة أخيرة من التخزين المؤقت
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // إرجاع استجابة احتياطية للصفحات
    if (request.destination === 'document') {
      return new Response(getOfflineHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    throw error;
  }
}

// معالجة رسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      console.log('⏩ تخطي الانتظار...');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      console.log('📱 طلب نسخة التطبيق');
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      console.log('🧹 مسح التخزين المؤقت...');
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      }).catch((error) => {
        event.ports[0]?.postMessage({ success: false, error: error.message });
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
    console.log('✅ تم مسح جميع التخزين المؤقت');
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

// معلومات Service Worker
console.log(`
🌳 Service Worker لشجرة العائلة
📱 النسخة: ${CACHE_VERSION}
🚀 جاهز للعمل!
`);

// تنظيف دوري للتخزين المؤقت (كل 24 ساعة)
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
            console.log('🗑️ تم حذف ملف قديم:', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ فشل التنظيف الدوري:', error);
  }
}, 24 * 60 * 60 * 1000);
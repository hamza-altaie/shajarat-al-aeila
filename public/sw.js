// Service Worker لتطبيق شجرة العائلة
// إصدار التطبيق
const CACHE_VERSION = 'family-tree-v1.0.0';
const CACHE_NAME = `family-tree-cache-${CACHE_VERSION}`;

// الملفات المطلوب تخزينها مؤقتاً
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/tree-bg.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // الخطوط
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap',
  // صفحات رئيسية
  '/login',
  '/tree',
  '/profile',
  '/settings'
];

// الملفات التي يجب تحديثها دائماً
const DYNAMIC_CACHE_FILES = [
  '/api/',
  '/auth/',
  '/user-data/'
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 تثبيت Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 تخزين الملفات الأساسية...');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log('✅ تم تثبيت Service Worker بنجاح');
        // فرض التحديث الفوري
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ فشل في تثبيت Service Worker:', error);
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
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // تجاهل طلبات Chrome Extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // اختيار استراتيجية التخزين المؤقت
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch((error) => {
        console.error('❌ خطأ في معالجة الطلب:', request.url, error);
        return getFallbackResponse(request);
      })
  );
});

// تحديد استراتيجية التخزين المؤقت
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // طلبات API - الشبكة أولاً
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/auth/') ||
      url.pathname.includes('firebase') ||
      url.pathname.includes('google')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // الخطوط والأيقونات - التخزين المؤقت أولاً
  if (url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com' ||
      request.destination === 'font' ||
      request.destination === 'image') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // ملفات JavaScript و CSS - stale while revalidate
  if (request.destination === 'script' || 
      request.destination === 'style') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // صفحات HTML - الشبكة أولاً مع fallback
  if (request.destination === 'document') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // افتراضي - الشبكة أولاً
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// معالجة الطلبات حسب الاستراتيجية
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
    
    default:
      return networkFirst(request);
  }
}

// استراتيجية: التخزين المؤقت أولاً
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  // تخزين الاستجابة إذا كانت ناجحة
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// استراتيجية: الشبكة أولاً
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    // تخزين الاستجابة إذا كانت ناجحة
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('🌐 فشل الاتصال بالشبكة، استخدام التخزين المؤقت:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// استراتيجية: قديم أثناء إعادة التحقق
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // تحديث في الخلفية
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('🔄 فشل في تحديث التخزين المؤقت:', request.url, error);
  });
  
  // إرجاع النسخة المخزنة فوراً أو انتظار الشبكة
  return cachedResponse || fetchPromise;
}

// استجابة احتياطية عند فشل كل شيء
function getFallbackResponse(request) {
  const url = new URL(request.url);
  
  // صفحة احتياطية للمستندات
  if (request.destination === 'document') {
    return caches.match('/offline.html') || 
           new Response(getOfflineHTML(), {
             headers: { 'Content-Type': 'text/html; charset=utf-8' }
           });
  }
  
  // صورة احتياطية
  if (request.destination === 'image') {
    return caches.match('/icons/offline-icon.png') ||
           new Response(getOfflineSVG(), {
             headers: { 'Content-Type': 'image/svg+xml' }
           });
  }
  
  // استجابة JSON للـ API
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({
      error: 'غير متصل بالإنترنت',
      message: 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  
  // استجابة افتراضية
  return new Response('غير متاح في وضع عدم الاتصال', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// HTML لصفحة عدم الاتصال
function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>غير متصل - شجرة العائلة</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          direction: rtl;
          text-align: center;
          padding: 20px;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          color: #495057;
        }
        .container {
          max-width: 400px;
          padding: 40px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #dc3545; margin-bottom: 1rem; }
        p { line-height: 1.6; margin-bottom: 2rem; }
        button {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          font-family: inherit;
        }
        button:hover { background: #218838; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🌳📵</div>
        <h1>غير متصل بالإنترنت</h1>
        <p>
          يبدو أنك غير متصل بالإنترنت حالياً. 
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

// أيقونة SVG للحالة غير المتصلة
function getOfflineSVG() {
  return `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <text x="50" y="60" font-family="Arial" font-size="40" text-anchor="middle" fill="#6c757d">📵</text>
    </svg>
  `;
}

// معالجة رسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_URLS':
      cacheUrls(data.urls).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// حذف جميع التخزين المؤقت
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// تخزين URLs محددة
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  return cache.addAll(urls);
}

// معالجة تحديثات التطبيق
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'update') {
    // فتح التطبيق وتطبيق التحديث
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// تنظيف دوري للتخزين المؤقت
setInterval(() => {
  cleanupCache();
}, 24 * 60 * 60 * 1000); // كل 24 ساعة

async function cleanupCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // أسبوع واحد
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader) {
      const responseDate = new Date(dateHeader).getTime();
      if (now - responseDate > maxAge) {
        await cache.delete(request);
        console.log('🗑️ تم حذف ملف قديم من التخزين المؤقت:', request.url);
      }
    }
  }
}

console.log('🚀 Service Worker جاهز للعمل!');
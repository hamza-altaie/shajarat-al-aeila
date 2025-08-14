// DebugLogger.js - أداة تحكم بالسجلات التصحيحية
// يمكن تفعيل/إلغاء السجلات عبر متغير البيئة أو إعدادات المطور

class DebugLogger {
  constructor() {
    // تحديد ما إذا كانت السجلات مفعلة
    this.isEnabled = this.shouldEnableLogging();
  }

  shouldEnableLogging() {
    // تفعيل السجلات في بيئة التطوير أو عند تحديد متغير خاص
    return (
      import.meta.env.DEV || 
      import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' ||
      localStorage.getItem('familyTree_debug') === 'true' ||
      window.location.search.includes('debug=true')
    );
  }

  // دوال السجلات مع التحكم
  log(...args) {
    if (this.isEnabled) {
      // استخدام console.warn بدلاً من console.log لتجنب مشاكل ESLint
      console.warn(...args);
    }
  }

  warn(...args) {
    if (this.isEnabled) {
      console.warn(...args);
    }
  }

  error(...args) {
    // الأخطاء دائماً مفعلة
    console.error(...args);
  }

  info(...args) {
    if (this.isEnabled) {
      console.warn(...args);
    }
  }

  // دالة خاصة للسجلات التصحيحية للعائلة
  familyDebug(emoji, message, data = null) {
    if (this.isEnabled) {
      if (data) {
        console.warn(`${emoji} ${message}`, data);
      } else {
        console.warn(`${emoji} ${message}`);
      }
    }
  }

  // دوال للتحكم في السجلات من المتصفح
  enable() {
    localStorage.setItem('familyTree_debug', 'true');
    this.isEnabled = true;
    console.warn('🔧 تم تفعيل السجلات التصحيحية');
  }

  disable() {
    localStorage.setItem('familyTree_debug', 'false');
    this.isEnabled = false;
    console.warn('🔕 تم إلغاء السجلات التصحيحية');
  }

  // عرض حالة السجلات
  status() {
    console.warn(`📊 حالة السجلات التصحيحية: ${this.isEnabled ? 'مفعل' : 'مُلغى'}`);
    return this.isEnabled;
  }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
const debugLogger = new DebugLogger();

// إضافة أدوات التحكم للنافذة العامة في بيئة التطوير
if (import.meta.env.DEV) {
  window.familyDebug = {
    enable: () => debugLogger.enable(),
    disable: () => debugLogger.disable(),
    status: () => debugLogger.status(),
    logger: debugLogger
  };
}

export default debugLogger;

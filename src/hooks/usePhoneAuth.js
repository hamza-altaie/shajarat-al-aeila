// src/hooks/usePhoneAuth.js
// دوال مساعدة للتحقق من الاسم وتاريخ الميلاد

// التحقق من الاسم: 2-40 حرف، عربي أو إنجليزي + مسافات
export const validateName = (value) => {
  if (!value) return false;

  const trimmed = String(value).trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;

  // أحرف عربية + إنجليزية + مسافة
  const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
  return nameRegex.test(trimmed);
};

// التحقق من تاريخ الميلاد: تاريخ صحيح وليس في المستقبل
export const validateBirthdate = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  // نخلي الوقت على نص الليل حتى المقارنة تكون نظيفة
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  // ما نسمح بتاريخ بالمستقبل
  if (date > today) return false;

  // اختيارياً: نمنع تواريخ قديمة جداً
  const year = date.getFullYear();
  if (year < 1900) return false;

  return true;
};

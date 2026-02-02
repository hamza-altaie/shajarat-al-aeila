// src/services/imageService.js
// خدمة إدارة صور الأشخاص في شجرة العائلة

import { supabase } from '../supabaseClient';

// =============================================
// ⚙️ الإعدادات
// =============================================
const BUCKET_NAME = 'person-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const THUMBNAIL_SIZE = 150;

// =============================================
// 🔧 دوال مساعدة
// =============================================

/**
 * التحقق من صحة الملف
 */
export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('لم يتم اختيار ملف');
    return { valid: false, errors };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WebP, GIF');
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`حجم الملف كبير جداً. الحد الأقصى: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ضغط الصورة قبل الرفع
 */
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // تصغير الأبعاد إذا لزم الأمر
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('فشل في ضغط الصورة'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/**
 * إنشاء صورة مصغرة
 */
export async function createThumbnail(file, size = THUMBNAIL_SIZE) {
  return compressImage(file, size, 0.7);
}

/**
 * توليد اسم فريد للملف
 */
function generateFileName(tribeId, personId, originalName) {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${tribeId}/${personId}/${timestamp}.${ext}`;
}

// =============================================
// 📤 رفع الصور
// =============================================

/**
 * رفع صورة شخص
 * @param {number} tribeId - معرف القبيلة
 * @param {number} personId - معرف الشخص
 * @param {File} file - ملف الصورة
 * @param {boolean} compress - ضغط الصورة قبل الرفع
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadPersonPhoto(tribeId, personId, file, compress = true) {
  // التحقق من الملف
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    // ضغط الصورة إذا مطلوب
    const fileToUpload = compress ? await compressImage(file) : file;

    // توليد اسم الملف
    const fileName = generateFileName(tribeId, personId, file.name);

    // رفع الملف إلى Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('خطأ في رفع الصورة:', error);
      throw new Error('فشل في رفع الصورة: ' + error.message);
    }

    // الحصول على الرابط العام
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error('خطأ في رفع الصورة:', err);
    throw err;
  }
}

/**
 * رفع صورة وتحديث الشخص
 */
export async function uploadAndUpdatePersonPhoto(tribeId, personId, file) {
  // رفع الصورة
  const { url } = await uploadPersonPhoto(tribeId, personId, file);

  // تحديث الشخص في قاعدة البيانات
  const { error } = await supabase
    .from('persons')
    .update({
      photo_url: url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId)
    .eq('tribe_id', tribeId);

  if (error) {
    console.error('خطأ في تحديث الشخص:', error);
    throw new Error('فشل في حفظ رابط الصورة');
  }

  return url;
}

// =============================================
// 🗑️ حذف الصور
// =============================================

/**
 * حذف صورة شخص
 */
export async function deletePersonPhoto(tribeId, personId, photoPath) {
  try {
    // حذف من Storage
    if (photoPath) {
      const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([photoPath]);

      if (storageError) {
        console.warn('تحذير: فشل حذف الصورة من التخزين:', storageError);
      }
    }

    // تحديث الشخص (إزالة الرابط)
    const { error: dbError } = await supabase
      .from('persons')
      .update({
        photo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', personId)
      .eq('tribe_id', tribeId);

    if (dbError) {
      throw new Error('فشل في تحديث قاعدة البيانات');
    }

    return true;
  } catch (err) {
    console.error('خطأ في حذف الصورة:', err);
    throw err;
  }
}

/**
 * حذف جميع صور شخص (عند حذف الشخص)
 */
export async function deleteAllPersonPhotos(tribeId, personId) {
  try {
    const folderPath = `${tribeId}/${personId}`;

    // جلب قائمة الملفات
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (listError) {
      console.warn('تحذير: فشل في جلب قائمة الصور:', listError);
      return;
    }

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${folderPath}/${f.name}`);

      const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

      if (removeError) {
        console.warn('تحذير: فشل في حذف الصور:', removeError);
      }
    }
  } catch (err) {
    console.error('خطأ في حذف صور الشخص:', err);
  }
}

// =============================================
// 🖼️ دوال العرض
// =============================================

/**
 * الحصول على صورة افتراضية
 */
export function getDefaultAvatar(gender, firstName = '') {
  const initial = firstName?.charAt(0)?.toUpperCase() || '?';

  // إرجاع كائن مع المعلومات
  return {
    type: 'initial',
    initial,
    color: gender === 'F' ? '#e91e63' : '#2196f3',
    bgColor: gender === 'F' ? '#fce4ec' : '#e3f2fd',
  };
}

/**
 * تحويل رابط الصورة إلى صورة مصغرة (إذا مدعوم)
 */
export function getThumbnailUrl(photoUrl, size = 150) {
  if (!photoUrl) return null;

  // Supabase يدعم تحويل الصور
  // إضافة معاملات التحويل
  try {
    const url = new URL(photoUrl);
    url.searchParams.set('width', size.toString());
    url.searchParams.set('height', size.toString());
    url.searchParams.set('resize', 'cover');
    return url.toString();
  } catch {
    return photoUrl;
  }
}

/**
 * التحقق من وجود صورة
 */
export function hasPhoto(person) {
  return person?.photo_url && person.photo_url.trim() !== '';
}

// =============================================
// 📊 إحصائيات
// =============================================

/**
 * حساب نسبة الأشخاص الذين لديهم صور
 */
export async function getPhotoStats(tribeId) {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('id, photo_url')
      .eq('tribe_id', tribeId);

    if (error) throw error;

    const total = data?.length || 0;
    const withPhotos = data?.filter((p) => p.photo_url)?.length || 0;

    return {
      total,
      withPhotos,
      withoutPhotos: total - withPhotos,
      percentage: total > 0 ? Math.round((withPhotos / total) * 100) : 0,
    };
  } catch (err) {
    console.error('خطأ في جلب إحصائيات الصور:', err);
    return { total: 0, withPhotos: 0, withoutPhotos: 0, percentage: 0 };
  }
}

export default {
  validateImageFile,
  compressImage,
  createThumbnail,
  uploadPersonPhoto,
  uploadAndUpdatePersonPhoto,
  deletePersonPhoto,
  deleteAllPersonPhotos,
  getDefaultAvatar,
  getThumbnailUrl,
  hasPhoto,
  getPhotoStats,
};

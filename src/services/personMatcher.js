// src/services/personMatcher.js
// خوارزمية المطابقة الذكية للأشخاص

/**
 * تطبيع النص العربي للمقارنة
 * - إزالة التشكيل
 * - توحيد الهمزات
 * - توحيد التاء المربوطة والهاء
 * - توحيد الألف المقصورة والياء
 */
export function normalizeArabicText(text) {
  if (!text) return '';
  
  return text
    .trim()
    // إزالة التشكيل
    .replace(/[\u064B-\u065F]/g, '')
    // توحيد الهمزات
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    // توحيد التاء المربوطة والهاء
    .replace(/ة/g, 'ه')
    // توحيد الألف المقصورة والياء
    .replace(/ى/g, 'ي')
    // إزالة المسافات الزائدة
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * حساب نسبة التشابه بين نصين (Levenshtein Distance)
 */
export function calculateSimilarity(str1, str2) {
  const s1 = normalizeArabicText(str1);
  const s2 = normalizeArabicText(str2);
  
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  // مصفوفة المسافات
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // حذف
        matrix[i][j - 1] + 1,      // إضافة
        matrix[i - 1][j - 1] + cost // استبدال
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * حساب نسبة تطابق شخصين
 * @param {Object} person1 - الشخص الأول
 * @param {Object} person2 - الشخص الثاني
 * @returns {number} نسبة التطابق (0-100)
 */
export function matchPersons(person1, person2) {
  // أوزان الحقول
  const weights = {
    first_name: 40,      // الاسم الأول - الأهم
    father_name: 35,     // اسم الأب
    grandfather_name: 15, // اسم الجد
    family_name: 10      // اسم العائلة
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [field, weight] of Object.entries(weights)) {
    const val1 = person1[field];
    const val2 = person2[field];
    
    // إذا كلا الحقلين فارغين، نتجاهل
    if (!val1 && !val2) continue;
    
    // إذا أحدهما فارغ والآخر لا
    if (!val1 || !val2) {
      totalWeight += weight;
      continue;
    }
    
    const similarity = calculateSimilarity(val1, val2);
    totalScore += (similarity * weight) / 100;
    totalWeight += weight;
  }
  
  if (totalWeight === 0) return 0;
  
  return Math.round((totalScore / totalWeight) * 100);
}

/**
 * البحث عن الأشخاص المشابهين في القائمة
 * @param {Object} targetPerson - الشخص المراد البحث عنه
 * @param {Array} personsList - قائمة الأشخاص للبحث فيها
 * @param {number} threshold - الحد الأدنى للتشابه (افتراضي 80%)
 * @returns {Array} قائمة الأشخاص المشابهين مرتبة بالتشابه
 */
export function findSimilarPersons(targetPerson, personsList, threshold = 80) {
  const matches = [];
  
  for (const person of personsList) {
    // تجاهل نفس الشخص
    if (person.id === targetPerson.id) continue;
    
    const similarity = matchPersons(targetPerson, person);
    
    if (similarity >= threshold) {
      matches.push({
        person,
        similarity,
        matchDetails: {
          first_name: calculateSimilarity(targetPerson.first_name, person.first_name),
          father_name: calculateSimilarity(targetPerson.father_name, person.father_name),
          grandfather_name: calculateSimilarity(targetPerson.grandfather_name, person.grandfather_name),
          family_name: calculateSimilarity(targetPerson.family_name, person.family_name)
        }
      });
    }
  }
  
  // ترتيب بالتشابه تنازلياً
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * التحقق من وجود تطابق تام (نفس الشخص)
 * @param {Object} person1 
 * @param {Object} person2 
 * @returns {boolean}
 */
export function isExactMatch(person1, person2) {
  const n1 = normalizeArabicText(person1.first_name);
  const n2 = normalizeArabicText(person2.first_name);
  
  const f1 = normalizeArabicText(person1.father_name);
  const f2 = normalizeArabicText(person2.father_name);
  
  // تطابق تام في الاسم الأول واسم الأب
  return n1 === n2 && f1 === f2;
}

/**
 * بناء الاسم الكامل للشخص
 */
export function buildFullName(person) {
  const parts = [
    person.first_name,
    person.father_name,
    person.grandfather_name,
    person.family_name
  ].filter(Boolean);
  
  return parts.join(' ');
}

/**
 * اقتراح أفضل تطابق
 */
export function suggestBestMatch(targetPerson, personsList) {
  const matches = findSimilarPersons(targetPerson, personsList, 70);
  
  if (matches.length === 0) {
    return { found: false, suggestion: null };
  }
  
  const best = matches[0];
  
  // إذا التطابق عالي جداً (95%+)، نقترح الربط مباشرة
  if (best.similarity >= 95) {
    return {
      found: true,
      confidence: 'high',
      suggestion: best.person,
      similarity: best.similarity,
      message: `يبدو أن "${buildFullName(targetPerson)}" هو نفس "${buildFullName(best.person)}"`
    };
  }
  
  // إذا التطابق متوسط (80-95%)، نسأل المستخدم
  if (best.similarity >= 80) {
    return {
      found: true,
      confidence: 'medium',
      suggestion: best.person,
      similarity: best.similarity,
      message: `هل "${buildFullName(targetPerson)}" هو "${buildFullName(best.person)}"؟`
    };
  }
  
  // تطابق ضعيف، نعرض كاقتراح فقط
  return {
    found: true,
    confidence: 'low',
    suggestion: best.person,
    similarity: best.similarity,
    alternatives: matches.slice(0, 3),
    message: `قد يكون مشابه لـ "${buildFullName(best.person)}"`
  };
}

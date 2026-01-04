// src/services/smartTribeService.js
// 🧠 نظام الربط الذكي للقبيلة - Smart Tribe Linking System

import { supabase } from '../supabaseClient';

// =============================================
// 🔧 دوال مساعدة
// =============================================

/**
 * تنظيف وتوحيد الاسم
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * مقارنة اسمين (مع تسامح للأخطاء الإملائية)
 */
function namesMatch(name1, name2, threshold = 0.85) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return { match: true, score: 1.0 };
  
  // حساب التشابه (Levenshtein-based)
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return { match: false, score: 0 };
  
  const distance = levenshteinDistance(n1, n2);
  const similarity = 1 - (distance / maxLen);
  
  return { 
    match: similarity >= threshold, 
    score: similarity 
  };
}

/**
 * حساب مسافة Levenshtein
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i-1] === str2[j-1]) {
        dp[i][j] = dp[i-1][j-1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
  }
  return dp[m][n];
}

// =============================================
// 🔍 البحث الذكي عن الأشخاص
// =============================================

/**
 * البحث عن شخص بسلسلة النسب
 * @param {number} tribeId - معرف القبيلة
 * @param {string[]} lineage - سلسلة النسب [الاسم, اسم الأب, اسم الجد, ...]
 * @returns {Object|null} الشخص الموجود أو null
 */
export async function findPersonByLineage(tribeId, lineage) {
  if (!lineage || lineage.length < 2) return null;
  
  const [firstName, fatherName, grandfatherName] = lineage;
  
  // البحث بالاسم الأول واسم الأب
  const { data: candidates } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId)
    .ilike('first_name', `%${firstName}%`);
  
  if (!candidates || candidates.length === 0) return null;
  
  // فلترة بالتطابق الذكي
  for (const person of candidates) {
    const firstMatch = namesMatch(person.first_name, firstName);
    const fatherMatch = namesMatch(person.father_name, fatherName);
    
    if (firstMatch.match && fatherMatch.match) {
      // التحقق من اسم الجد إذا متوفر
      if (grandfatherName && person.grandfather_name) {
        const grandMatch = namesMatch(person.grandfather_name, grandfatherName);
        if (grandMatch.match) {
          return { 
            person, 
            confidence: (firstMatch.score + fatherMatch.score + grandMatch.score) / 3 
          };
        }
      } else {
        return { 
          person, 
          confidence: (firstMatch.score + fatherMatch.score) / 2 
        };
      }
    }
  }
  
  return null;
}

/**
 * البحث عن والد محتمل بالاسم
 */
export async function findPotentialFather(tribeId, fatherName, grandfatherName) {
  const { data: candidates } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId);
  
  if (!candidates) return [];
  
  const matches = [];
  
  for (const person of candidates) {
    const nameMatch = namesMatch(person.first_name, fatherName);
    
    if (nameMatch.match) {
      let score = nameMatch.score * 50; // 50% للاسم
      
      // إضافة نقاط إذا تطابق اسم الأب مع اسم الجد
      if (grandfatherName && person.father_name) {
        const grandMatch = namesMatch(person.father_name, grandfatherName);
        if (grandMatch.match) {
          score += grandMatch.score * 40; // 40% لاسم الجد
        }
      }
      
      // إضافة نقاط إذا كان لديه أطفال (أكثر احتمالاً أن يكون الوالد الصحيح)
      const { count } = await supabase
        .from('relations')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', person.id);
      
      if (count > 0) {
        score += 10; // 10% bonus للوالد الذي لديه أطفال
      }
      
      matches.push({
        person,
        score: Math.min(score, 100),
        reason: buildMatchReason(nameMatch, grandfatherName, person)
      });
    }
  }
  
  // ترتيب حسب النقاط
  return matches.sort((a, b) => b.score - a.score);
}

function buildMatchReason(nameMatch, grandfatherName, person) {
  const reasons = [];
  reasons.push(`تطابق الاسم: ${Math.round(nameMatch.score * 100)}%`);
  if (grandfatherName && person.father_name) {
    reasons.push(`اسم الجد: ${person.father_name}`);
  }
  return reasons.join('، ');
}

// =============================================
// 🔗 الربط الذكي التلقائي
// =============================================

/**
 * إضافة شخص مع ربط ذكي تلقائي
 * @param {number} tribeId - معرف القبيلة
 * @param {Object} personData - بيانات الشخص
 * @param {string} userId - معرف المستخدم
 * @returns {Object} نتيجة الإضافة
 */
export async function addPersonWithSmartLinking(tribeId, personData, userId) {
  const { 
    firstName, 
    fatherName, 
    grandfatherName, 
    greatGrandfatherName,
    familyName,
    gender,
    birthDate,
    isAlive = true
  } = personData;

  console.warn('🧠 بدء الربط الذكي:', { firstName, fatherName, grandfatherName });

  // 1️⃣ التحقق من وجود الشخص مسبقاً
  const existing = await findPersonByLineage(tribeId, [firstName, fatherName, grandfatherName]);
  
  if (existing && existing.confidence > 0.9) {
    console.warn('⚠️ الشخص موجود مسبقاً:', existing.person.first_name);
    return {
      success: false,
      error: 'duplicate',
      existingPerson: existing.person,
      confidence: existing.confidence,
      message: `يوجد شخص مشابه: ${existing.person.first_name} بن ${existing.person.father_name}`
    };
  }

  // 2️⃣ البحث عن الوالد
  let parentId = null;
  let parentCreated = false;
  let linkingResult = { type: 'none', details: null };

  if (fatherName) {
    const potentialFathers = await findPotentialFather(tribeId, fatherName, grandfatherName);
    
    if (potentialFathers.length > 0 && potentialFathers[0].score >= 70) {
      // ✅ وجدنا والد مطابق بثقة عالية
      parentId = potentialFathers[0].person.id;
      linkingResult = {
        type: 'auto_linked',
        details: {
          parentId,
          parentName: potentialFathers[0].person.first_name,
          confidence: potentialFathers[0].score,
          reason: potentialFathers[0].reason
        }
      };
      console.warn('✅ تم العثور على الوالد:', potentialFathers[0].person.first_name);
      
    } else if (potentialFathers.length > 0 && potentialFathers[0].score >= 50) {
      // ⏳ وجدنا مرشحين - نحتاج تأكيد
      linkingResult = {
        type: 'needs_confirmation',
        details: {
          candidates: potentialFathers.slice(0, 3),
          message: 'يوجد أشخاص قد يكونون الوالد، يرجى التأكيد'
        }
      };
      console.warn('⏳ مرشحون محتملون للوالد:', potentialFathers.length);
      
    } else {
      // 🆕 لم نجد الوالد - ننشئه كـ placeholder
      const { data: newParent, error: parentError } = await supabase
        .from('persons')
        .insert({
          tribe_id: tribeId,
          first_name: fatherName,
          father_name: grandfatherName || null,
          grandfather_name: greatGrandfatherName || null,
          family_name: familyName,
          gender: 'M', // الوالد دائماً ذكر
          is_placeholder: true, // علامة أنه مُنشأ تلقائياً
          created_by: userId
        })
        .select()
        .single();

      if (!parentError && newParent) {
        parentId = newParent.id;
        parentCreated = true;
        linkingResult = {
          type: 'parent_created',
          details: {
            parentId,
            parentName: fatherName,
            message: 'تم إنشاء الوالد تلقائياً (يمكن لشخص آخر إكمال بياناته)'
          }
        };
        console.warn('🆕 تم إنشاء الوالد:', fatherName);

        // إذا كان هناك جد، نحاول ربط الوالد به
        if (grandfatherName) {
          await tryLinkToGrandfather(tribeId, newParent.id, grandfatherName, greatGrandfatherName, userId);
        }
      }
    }
  }

  // 3️⃣ إنشاء الشخص الجديد
  const { data: newPerson, error: personError } = await supabase
    .from('persons')
    .insert({
      tribe_id: tribeId,
      first_name: firstName,
      father_name: fatherName,
      grandfather_name: grandfatherName,
      family_name: familyName,
      gender: gender || 'M',
      birth_date: birthDate,
      is_alive: isAlive,
      is_placeholder: false,
      created_by: userId
    })
    .select()
    .single();

  if (personError) {
    console.error('❌ خطأ في إنشاء الشخص:', personError);
    throw personError;
  }

  // 4️⃣ إنشاء علاقة مع الوالد
  if (parentId) {
    const { error: relationError } = await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: parentId,
        child_id: newPerson.id,
        created_by: userId
      });

    if (relationError) {
      console.error('⚠️ خطأ في إنشاء العلاقة:', relationError);
    } else {
      console.warn('🔗 تم الربط:', parentId, '→', newPerson.id);
    }
  }

  // 5️⃣ البحث عن إخوة محتملين وربطهم
  const siblingsLinked = await linkPotentialSiblings(tribeId, newPerson.id, parentId, fatherName, grandfatherName);

  return {
    success: true,
    person: newPerson,
    linking: linkingResult,
    parentCreated,
    siblingsLinked,
    message: buildSuccessMessage(linkingResult, parentCreated, siblingsLinked)
  };
}

/**
 * محاولة ربط الوالد بالجد
 */
async function tryLinkToGrandfather(tribeId, parentId, grandfatherName, greatGrandfatherName, userId) {
  const potentialGrandfathers = await findPotentialFather(tribeId, grandfatherName, greatGrandfatherName);
  
  if (potentialGrandfathers.length > 0 && potentialGrandfathers[0].score >= 70) {
    await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: potentialGrandfathers[0].person.id,
        child_id: parentId,
        created_by: userId
      });
    console.warn('🔗 تم ربط الوالد بالجد');
  }
}

/**
 * البحث عن إخوة محتملين وربطهم بنفس الوالد
 */
async function linkPotentialSiblings(tribeId, personId, parentId, fatherName, grandfatherName) {
  if (!parentId || !fatherName) return 0;
  
  // البحث عن أشخاص بنفس اسم الأب والجد (إخوة محتملين)
  const { data: potentialSiblings } = await supabase
    .from('persons')
    .select('id, first_name, father_name, grandfather_name')
    .eq('tribe_id', tribeId)
    .neq('id', personId);
  
  if (!potentialSiblings) return 0;
  
  let linkedCount = 0;
  
  for (const sibling of potentialSiblings) {
    const fatherMatch = namesMatch(sibling.father_name, fatherName);
    const grandMatch = grandfatherName && sibling.grandfather_name 
      ? namesMatch(sibling.grandfather_name, grandfatherName)
      : { match: true, score: 1 };
    
    if (fatherMatch.match && fatherMatch.score >= 0.9 && grandMatch.match) {
      // التحقق من عدم وجود علاقة
      const { data: existingRel } = await supabase
        .from('relations')
        .select('id')
        .eq('child_id', sibling.id)
        .single();
      
      if (!existingRel) {
        // ربط الأخ بنفس الوالد
        await supabase
          .from('relations')
          .insert({
            tribe_id: tribeId,
            parent_id: parentId,
            child_id: sibling.id,
            created_by: 'system'
          });
        linkedCount++;
        console.warn('👥 تم ربط أخ:', sibling.first_name);
      }
    }
  }
  
  return linkedCount;
}

function buildSuccessMessage(linkingResult, parentCreated, siblingsLinked) {
  const messages = ['✅ تمت الإضافة بنجاح'];
  
  if (linkingResult.type === 'auto_linked') {
    messages.push(`🔗 تم الربط تلقائياً مع "${linkingResult.details.parentName}"`);
  } else if (linkingResult.type === 'parent_created') {
    messages.push(`🆕 تم إنشاء الوالد "${linkingResult.details.parentName}" تلقائياً`);
  }
  
  if (siblingsLinked > 0) {
    messages.push(`👥 تم ربط ${siblingsLinked} إخوة تلقائياً`);
  }
  
  return messages.join('\n');
}

// =============================================
// 🔄 دمج الأشخاص المكررين
// =============================================

/**
 * دمج شخصين (عندما يكتشف أنهما نفس الشخص)
 */
export async function mergePersons(tribeId, keepPersonId, mergePersonId, userId) {
  console.warn('🔄 دمج الأشخاص:', keepPersonId, '←', mergePersonId);
  
  // 1. نقل جميع العلاقات من الشخص المدمج إلى الشخص المحتفظ به
  
  // نقل علاقات الأبناء
  await supabase
    .from('relations')
    .update({ parent_id: keepPersonId })
    .eq('parent_id', mergePersonId)
    .eq('tribe_id', tribeId);
  
  // نقل علاقات الوالد (إذا كان الشخص المدمج طفلاً)
  const { data: parentRel } = await supabase
    .from('relations')
    .select('parent_id')
    .eq('child_id', mergePersonId)
    .eq('tribe_id', tribeId)
    .single();
  
  if (parentRel) {
    // التحقق من عدم وجود علاقة مسبقة
    const { data: existingRel } = await supabase
      .from('relations')
      .select('id')
      .eq('child_id', keepPersonId)
      .eq('tribe_id', tribeId)
      .single();
    
    if (!existingRel) {
      await supabase
        .from('relations')
        .insert({
          tribe_id: tribeId,
          parent_id: parentRel.parent_id,
          child_id: keepPersonId,
          created_by: userId
        });
    }
  }
  
  // 2. تحديث بيانات الشخص المحتفظ به من الشخص المدمج (إذا كانت ناقصة)
  const { data: keepPerson } = await supabase
    .from('persons')
    .select('*')
    .eq('id', keepPersonId)
    .single();
  
  const { data: mergePerson } = await supabase
    .from('persons')
    .select('*')
    .eq('id', mergePersonId)
    .single();
  
  if (keepPerson && mergePerson) {
    const updates = {};
    
    // نسخ البيانات الناقصة
    if (!keepPerson.birth_date && mergePerson.birth_date) {
      updates.birth_date = mergePerson.birth_date;
    }
    if (!keepPerson.photo_url && mergePerson.photo_url) {
      updates.photo_url = mergePerson.photo_url;
    }
    if (keepPerson.is_placeholder && !mergePerson.is_placeholder) {
      updates.is_placeholder = false;
    }
    
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('persons')
        .update(updates)
        .eq('id', keepPersonId);
    }
  }
  
  // 3. حذف الشخص المدمج
  await supabase
    .from('relations')
    .delete()
    .eq('child_id', mergePersonId)
    .eq('tribe_id', tribeId);
  
  await supabase
    .from('persons')
    .delete()
    .eq('id', mergePersonId);
  
  console.warn('✅ تم الدمج بنجاح');
  
  return { success: true };
}

// =============================================
// 📊 إحصائيات وتحليل الشجرة
// =============================================

/**
 * الحصول على إحصائيات الشجرة
 */
export async function getTreeStatistics(tribeId) {
  const { data: persons } = await supabase
    .from('persons')
    .select('id, gender, is_placeholder, is_alive, created_at')
    .eq('tribe_id', tribeId);
  
  const { data: relations } = await supabase
    .from('relations')
    .select('id')
    .eq('tribe_id', tribeId);
  
  if (!persons) return null;
  
  const stats = {
    totalPersons: persons.length,
    totalRelations: relations?.length || 0,
    males: persons.filter(p => p.gender === 'M').length,
    females: persons.filter(p => p.gender === 'F').length,
    placeholders: persons.filter(p => p.is_placeholder).length,
    alive: persons.filter(p => p.is_alive).length,
    deceased: persons.filter(p => !p.is_alive).length,
    // حساب عدد الجذور (أشخاص بدون والد)
    unlinkedCount: 0,
    generations: 0
  };
  
  // حساب الأشخاص غير المرتبطين
  const linkedChildren = new Set();
  for (const rel of (relations || [])) {
    linkedChildren.add(rel.child_id);
  }
  stats.unlinkedCount = persons.filter(p => !linkedChildren.has(p.id)).length;
  
  return stats;
}

/**
 * البحث عن أشخاص قد يكونون مكررين
 */
export async function findPotentialDuplicates(tribeId) {
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId);
  
  if (!persons) return [];
  
  const duplicates = [];
  
  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const p1 = persons[i];
      const p2 = persons[j];
      
      const firstMatch = namesMatch(p1.first_name, p2.first_name);
      const fatherMatch = namesMatch(p1.father_name, p2.father_name);
      
      if (firstMatch.match && fatherMatch.match) {
        const avgScore = (firstMatch.score + fatherMatch.score) / 2;
        if (avgScore >= 0.85) {
          duplicates.push({
            person1: p1,
            person2: p2,
            similarity: avgScore,
            recommendation: avgScore >= 0.95 ? 'merge' : 'review'
          });
        }
      }
    }
  }
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

// =============================================
// 🔗 إصلاح الروابط المفقودة بالمطابقة الذكية
// =============================================

/**
 * البحث عن إخوة غير مرتبطين وربطهم بناءً على الأسماء الثلاثية
 * 
 * المنطق:
 * 1. نجد كل الأشخاص الذين لهم نفس اسم الأب + اسم الجد
 * 2. إذا كان أحدهم مرتبط بوالد، نربط البقية بنفس الوالد
 * 3. إذا لم يكن هناك والد موجود، نبحث عن شخص اسمه = اسم الأب
 */
export async function smartLinkByNames(tribeId, userId) {
  console.warn('🧠 بدء الربط الذكي بالأسماء...');
  
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId);
  
  const { data: relations } = await supabase
    .from('relations')
    .select('*')
    .eq('tribe_id', tribeId);
  
  if (!persons) return { linked: 0, suggestions: [] };
  
  // بناء خريطة العلاقات الحالية
  const childToParent = new Map();
  const parentToChildren = new Map();
  
  for (const rel of (relations || [])) {
    childToParent.set(rel.child_id, rel.parent_id);
    if (!parentToChildren.has(rel.parent_id)) {
      parentToChildren.set(rel.parent_id, []);
    }
    parentToChildren.get(rel.parent_id).push(rel.child_id);
  }
  
  // تجميع الأشخاص بنفس اسم الأب + الجد (إخوة محتملين)
  const siblingGroups = new Map(); // key: "fatherName|grandfatherName"
  
  for (const person of persons) {
    if (!person.father_name) continue;
    
    const key = normalizeName(person.father_name) + '|' + normalizeName(person.grandfather_name || '');
    
    if (!siblingGroups.has(key)) {
      siblingGroups.set(key, []);
    }
    siblingGroups.get(key).push(person);
  }
  
  let linkedCount = 0;
  const suggestions = [];
  
  // معالجة كل مجموعة إخوة
  for (const [key, siblings] of siblingGroups) {
    if (siblings.length < 2) continue;
    
    const [fatherName, grandfatherName] = key.split('|');
    
    // البحث عن والد مرتبط بأحد الإخوة
    let foundParentId = null;
    
    for (const sibling of siblings) {
      if (childToParent.has(sibling.id)) {
        foundParentId = childToParent.get(sibling.id);
        break;
      }
    }
    
    // إذا لم نجد والد مرتبط، نبحث عن شخص اسمه = اسم الأب
    if (!foundParentId) {
      const potentialFather = persons.find(p => {
        const nameMatch = namesMatch(p.first_name, fatherName);
        const grandMatch = grandfatherName 
          ? namesMatch(p.father_name || '', grandfatherName)
          : { match: true, score: 1 };
        return nameMatch.match && nameMatch.score >= 0.9 && grandMatch.match;
      });
      
      if (potentialFather) {
        foundParentId = potentialFather.id;
        console.warn(`🔍 وجدنا الوالد المحتمل: ${potentialFather.first_name} (${potentialFather.id})`);
      }
    }
    
    // ربط الإخوة غير المرتبطين
    if (foundParentId) {
      for (const sibling of siblings) {
        if (!childToParent.has(sibling.id) && sibling.id !== foundParentId) {
          // إضافة علاقة جديدة
          const { error } = await supabase
            .from('relations')
            .insert({
              tribe_id: tribeId,
              parent_id: foundParentId,
              child_id: sibling.id,
              created_by: userId || 'system-smart-link'
            });
          
          if (!error) {
            linkedCount++;
            console.warn(`✅ تم ربط ${sibling.first_name} مع والده`);
          }
        }
      }
    } else if (siblings.length >= 2) {
      // اقتراح للمراجعة
      suggestions.push({
        type: 'missing_parent',
        fatherName: fatherName,
        grandfatherName: grandfatherName,
        siblings: siblings.map(s => ({ id: s.id, name: s.first_name })),
        message: `يوجد ${siblings.length} أشخاص والدهم "${fatherName}" لكن الوالد غير موجود في الشجرة`
      });
    }
  }
  
  console.warn(`🔗 تم ربط ${linkedCount} شخص، ${suggestions.length} اقتراحات للمراجعة`);
  
  return { linked: linkedCount, suggestions };
}

/**
 * البحث عن روابط مفقودة واقتراحها
 */
export async function findMissingLinks(tribeId) {
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId);
  
  const { data: relations } = await supabase
    .from('relations')
    .select('*')
    .eq('tribe_id', tribeId);
  
  if (!persons) return [];
  
  // الأشخاص المرتبطين كأبناء
  const linkedChildren = new Set((relations || []).map(r => r.child_id));
  
  const missingLinks = [];
  
  for (const person of persons) {
    // تخطي الأشخاص المرتبطين بالفعل
    if (linkedChildren.has(person.id)) continue;
    
    // البحث عن والد محتمل
    if (person.father_name) {
      const potentialFather = persons.find(p => {
        if (p.id === person.id) return false;
        const nameMatch = namesMatch(p.first_name, person.father_name);
        const grandMatch = person.grandfather_name && p.father_name
          ? namesMatch(p.father_name, person.grandfather_name)
          : { match: true, score: 0.5 };
        return nameMatch.match && nameMatch.score >= 0.85 && grandMatch.score >= 0.5;
      });
      
      if (potentialFather) {
        const confidence = namesMatch(potentialFather.first_name, person.father_name).score;
        missingLinks.push({
          person: { id: person.id, name: person.first_name, fatherName: person.father_name },
          potentialParent: { id: potentialFather.id, name: potentialFather.first_name },
          confidence: Math.round(confidence * 100),
          type: 'parent_link'
        });
      }
    }
  }
  
  return missingLinks.sort((a, b) => b.confidence - a.confidence);
}

export default {
  findPersonByLineage,
  findPotentialFather,
  addPersonWithSmartLinking,
  mergePersons,
  getTreeStatistics,
  findPotentialDuplicates,
  smartLinkByNames,
  findMissingLinks,
  namesMatch,
  normalizeName
};

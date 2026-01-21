import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../firebase/auth.js';

// =============================================
// دوال القبيلة (Tribe)
// =============================================

/**
 * ✅ إصلاح سيناريو 2: فحص الحلقات المغلقة قبل إنشاء علاقة
 * يتأكد أن إضافة العلاقة لن تسبب حلقة (A → B → C → A)
 */
async function wouldCreateCircle(tribeId, parentId, childId) {
  try {
    // إذا كان الوالد هو نفسه الابن - حلقة مباشرة!
    if (parentId === childId) {
      console.error('❌ خطأ: محاولة جعل شخص والد نفسه!');
      return true;
    }
    
    // جلب كل العلاقات
    const { data: relations } = await supabase
      .from('relations')
      .select('parent_id, child_id')
      .eq('tribe_id', tribeId);
    
    if (!relations) return false;
    
    // بناء رسم بياني للعلاقات
    const graph = new Map();
    for (const rel of relations) {
      if (!graph.has(rel.parent_id)) graph.set(rel.parent_id, []);
      graph.get(rel.parent_id).push(rel.child_id);
    }
    
    // إضافة العلاقة الجديدة مؤقتاً
    if (!graph.has(parentId)) graph.set(parentId, []);
    graph.get(parentId).push(childId);
    
    // بحث عميق للكشف عن الحلقات
    const visited = new Set();
    const path = new Set();
    
    function hasCircle(node) {
      if (path.has(node)) return true; // وجدنا حلقة!
      if (visited.has(node)) return false;
      
      visited.add(node);
      path.add(node);
      
      for (const child of (graph.get(node) || [])) {
        if (hasCircle(child)) return true;
      }
      
      path.delete(node);
      return false;
    }
    
    // التحقق من وجود حلقة تبدأ من الوالد الجديد
    const circleExists = hasCircle(parentId);
    
    if (circleExists) {
      console.error('❌ خطأ: إضافة هذه العلاقة ستسبب حلقة مغلقة!');
    }
    
    return circleExists;
  } catch (err) {
    console.error('❌ خطأ في فحص الحلقات:', err);
    return true; // ✅ في حالة الخطأ، نمنع الإضافة للحماية (fail-safe)
  }
}

// الحصول على القبيلة الافتراضية (سنستخدم قبيلة واحدة حالياً)
export async function getDefaultTribe() {
  try {
    const { data, error } = await supabase
      .from('tribes')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في تحميل القبيلة:", err);
    throw err;
  }
}

// إضافة/تحديث مستخدم في القبيلة
export async function joinTribe(tribeId, userData = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('tribe_users')
      .upsert({
        tribe_id: tribeId,
        firebase_uid: user.uid,
        phone: userData.phone || user.phoneNumber,
        display_name: userData.displayName,
        role: 'contributor',
        status: 'active'
      }, {
        onConflict: 'tribe_id,firebase_uid'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في الانضمام للقبيلة:", err);
    throw err;
  }
}

// التحقق من عضوية المستخدم
export async function checkUserMembership(tribeId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) return null;

    const { data, error } = await supabase
      .from('tribe_users')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('firebase_uid', user.uid)
      .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب خطأ 406

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في التحقق من العضوية:", err);
    return null;
  }
}

// ✅ التحقق من أن المستخدم له والد مسجل
export async function checkUserHasParent(tribeId, userPersonId) {
  if (!userPersonId) return false;
  
  try {
    const { data } = await supabase
      .from('relations')
      .select('parent_id')
      .eq('child_id', userPersonId)
      .maybeSingle();
    
    return !!data?.parent_id;
  } catch {
    return false;
  }
}

// =============================================
// دوال الأشخاص (Persons) - نسخة القبيلة
// =============================================

// قائمة جميع الأشخاص في القبيلة
export async function listTribePersons(tribeId, search = '') {
  try {
    let query = supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,father_name.ilike.%${search}%,family_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل الأشخاص:", err);
    throw err;
  }
}

// ✅ إنشاء العلاقات التلقائية بناءً على relation
async function createAutoRelations(tribeId, newPerson, membership, userId) {
  try {
    const relation = newPerson.relation;
    
    // 1. إذا كان "أنا" → ربط person_id في tribe_users
    if (relation === 'أنا') {
      await supabase
        .from('tribe_users')
        .update({ person_id: newPerson.id })
        .eq('id', membership.id);
      return; // "أنا" ليس له علاقة parent/child
    }

    // الحصول على person_id الخاص بالمستخدم
    const userPersonId = membership.person_id;
    if (!userPersonId) {
      return; // يجب أن يضيف المستخدم نفسه أولاً
    }

    // دالة مساعدة لإضافة علاقة مع التحقق من عدم وجودها والحلقات
    const addRelationIfNotExists = async (parentId, childId) => {
      try {
        // ✅ فحص الحلقات المغلقة أولاً
        const wouldCircle = await wouldCreateCircle(tribeId, parentId, childId);
        if (wouldCircle) {
          console.warn('⚠️ رفض إضافة العلاقة: ستسبب حلقة مغلقة!');
          return false;
        }
        
        // ✅ فحص وجود العلاقة أولاً
        const { data: existing } = await supabase
          .from('relations')
          .select('id')
          .eq('parent_id', parentId)
          .eq('child_id', childId)
          .maybeSingle();
        
        // إذا موجودة، لا نضيف
        if (existing) {
          return true; // العلاقة موجودة بالفعل
        }
        
        // إضافة العلاقة الجديدة
        const { error } = await supabase
          .from('relations')
          .insert({
            tribe_id: tribeId,
            parent_id: parentId,
            child_id: childId,
            created_by: userId
          });
        
        if (error) {
          // تجاهل أخطاء التكرار فقط
          if (error.code === '23505') {
            return true; // العلاقة موجودة بالفعل
          }
          console.warn('⚠️ خطأ في إضافة العلاقة:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        // تجاهل أي خطأ - العلاقة قد تكون موجودة
        console.warn('⚠️ تجاهل خطأ العلاقة:', err.message);
        return true;
      }
    };

    // 2. إذا كان "ابن" أو "بنت" → المستخدم هو الوالد
    if (relation === 'ابن' || relation === 'بنت') {
      await addRelationIfNotExists(userPersonId, newPerson.id);
    }
    
    // 3. إذا كان "والد" أو "والدة" → المستخدم هو الطفل
    else if (relation === 'والد' || relation === 'والدة') {
      await addRelationIfNotExists(newPerson.id, userPersonId);
    }
    
    // 4. إذا كان "أخ" أو "أخت" → نفس الوالد
    else if (relation === 'أخ' || relation === 'أخت') {
      // البحث عن والد المستخدم
      const { data: parentRel } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('child_id', userPersonId)
        .maybeSingle();
      
      if (parentRel?.parent_id) {
        // ربط الأخ بنفس الوالد
        await addRelationIfNotExists(parentRel.parent_id, newPerson.id);
      }
      // ❌ لا ننشئ والد افتراضي - يجب على المستخدم إضافة والده أولاً
      // التحقق يتم في Family.jsx قبل الإضافة
    }
    
    // 5. إذا كان "جد" أو "جدة" → والد الوالد
    else if (relation === 'جد' || relation === 'جدة') {
      // البحث عن والد المستخدم
      const { data: parentRel } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('child_id', userPersonId)
        .maybeSingle(); // ✅ استخدام maybeSingle
      
      if (parentRel?.parent_id) {
        await addRelationIfNotExists(newPerson.id, parentRel.parent_id);
      }
    }
  } catch (err) {
    console.error('❌ خطأ في إنشاء العلاقات التلقائية:', err);
    // لا نرمي الخطأ لأن إضافة الشخص نجحت
  }
}

// =============================================
// 🧠 الربط الذكي الشامل - يعمل تلقائياً
// =============================================

/**
 * تنظيف وتوحيد الاسم للمقارنة
 */
function normalizeNameForMatch(name) {
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
function namesAreSimilar(name1, name2, threshold = 0.85) {
  const n1 = normalizeNameForMatch(name1);
  const n2 = normalizeNameForMatch(name2);
  
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  
  // حساب التشابه البسيط
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return false;
  
  let matches = 0;
  const shorter = n1.length <= n2.length ? n1 : n2;
  const longer = n1.length > n2.length ? n1 : n2;
  
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return (matches / maxLen) >= threshold;
}

/**
 * 🧠 الربط الذكي الشامل - يعمل تلقائياً عند إضافة شخص
 * يبحث عن: والد، أبناء، إخوة، جد
 */
async function smartAutoLink(tribeId, newPerson, userId) {
  try {
    // الربط الذكي الشامل
    
    // جلب كل الأشخاص والعلاقات
    const { data: allPersons } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId);
    
    const { data: allRelations } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId);
    
    if (!allPersons) return;
    
    // بناء خريطة العلاقات
    const childToParent = new Map();
    const parentToChildren = new Map();
    
    for (const rel of (allRelations || [])) {
      childToParent.set(rel.child_id, rel.parent_id);
      if (!parentToChildren.has(rel.parent_id)) {
        parentToChildren.set(rel.parent_id, []);
      }
      parentToChildren.get(rel.parent_id).push(rel.child_id);
    }
    
    // ✅ بناء Set للعلاقات الموجودة للتحقق السريع (بدلاً من استعلام لكل علاقة)
    const existingRelationsSet = new Set(
      (allRelations || []).map(rel => `${rel.parent_id}_${rel.child_id}`)
    );
    
    // ✅ دالة للتحقق من وجود العلاقة (في الذاكرة بدلاً من الاستعلام)
    const relationExists = (parentId, childId) => {
      return existingRelationsSet.has(`${parentId}_${childId}`);
    };
    
    // ✅ دالة آمنة لإضافة العلاقة مع فحص الحلقات
    const safeAddRelation = async (parentId, childId) => {
      // فحص الحلقات أولاً
      const wouldCircle = await wouldCreateCircle(tribeId, parentId, childId);
      if (wouldCircle) {
        console.warn('⚠️ تم رفض الربط: سيسبب حلقة مغلقة');
        return false;
      }
      
      // ✅ التحقق من وجود العلاقة (في الذاكرة - سريع جداً)
      if (relationExists(parentId, childId)) return false;
      
      const { error } = await supabase
        .from('relations')
        .insert({
          tribe_id: tribeId,
          parent_id: parentId,
          child_id: childId,
          created_by: userId
        });
      
      // ✅ إضافة العلاقة للـ Set لمنع التكرار في نفس الدورة
      if (!error) {
        existingRelationsSet.add(`${parentId}_${childId}`);
      }
      
      return !error;
    };
    
    // ========================================
    // 1️⃣ البحث عن الوالد (father_name → شخص first_name مطابق)
    // ========================================
    if (newPerson.father_name && !childToParent.has(newPerson.id)) {
      const potentialFather = allPersons.find(p => {
        if (p.id === newPerson.id) return false;
        
        // مطابقة الاسم الأول للوالد
        const nameMatch = namesAreSimilar(p.first_name, newPerson.father_name);
        
        // مطابقة اسم الجد إذا متوفر
        let grandMatch = true;
        if (newPerson.grandfather_name && p.father_name) {
          grandMatch = namesAreSimilar(p.father_name, newPerson.grandfather_name);
        }
        
        // ✅ فحص فرق الأجيال
        let generationValid = true;
        if (p.generation !== undefined && newPerson.generation !== undefined) {
          // الوالد يجب أن يكون بجيل أقل (رقم أصغر)
          generationValid = p.generation < newPerson.generation;
        }
        
        return nameMatch && grandMatch && generationValid;
      });
      
      if (potentialFather) {
        // ✅ استخدام الدالة الآمنة
        const added = await safeAddRelation(potentialFather.id, newPerson.id);
        if (added) {
          childToParent.set(newPerson.id, potentialFather.id);
        }
      }
    }
    
    // ========================================
    // 2️⃣ البحث عن أبناء (أشخاص father_name = first_name لهذا الشخص)
    // ========================================
    const potentialChildren = allPersons.filter(p => {
      if (p.id === newPerson.id) return false;
      if (childToParent.has(p.id)) return false; // لديه والد بالفعل
      
      // مطابقة: father_name للشخص = first_name للشخص الجديد
      const nameMatch = namesAreSimilar(p.father_name, newPerson.first_name);
      
      // مطابقة إضافية: grandfather_name = father_name للشخص الجديد
      let grandMatch = true;
      if (p.grandfather_name && newPerson.father_name) {
        grandMatch = namesAreSimilar(p.grandfather_name, newPerson.father_name);
      }
      
      // ✅ فحص فرق الأجيال - الابن يجب أن يكون بجيل أعلى
      let generationValid = true;
      if (p.generation !== undefined && newPerson.generation !== undefined) {
        generationValid = p.generation > newPerson.generation;
      }
      
      return nameMatch && grandMatch && generationValid;
    });
    
    for (const child of potentialChildren) {
      // ✅ استخدام الدالة الآمنة
      // ✅ استخدام الدالة الآمنة
      const added = await safeAddRelation(newPerson.id, child.id);
      if (added) {
        childToParent.set(child.id, newPerson.id);
      }
    }
    
    // ========================================
    // 3️⃣ البحث عن إخوة (نفس father_name + grandfather_name)
    // ========================================
    if (newPerson.father_name) {
      // البحث عن إخوة محتملين
      const potentialSiblings = allPersons.filter(p => {
        if (p.id === newPerson.id) return false;
        
        const sameFather = namesAreSimilar(p.father_name, newPerson.father_name);
        const sameGrandfather = !newPerson.grandfather_name || !p.grandfather_name ||
          namesAreSimilar(p.grandfather_name, newPerson.grandfather_name);
        
        // ✅ فحص أن الجيل متقارب (إخوة = نفس الجيل تقريباً)
        let sameGeneration = true;
        if (p.generation !== undefined && newPerson.generation !== undefined) {
          sameGeneration = Math.abs(p.generation - newPerson.generation) <= 1;
        }
        
        return sameFather && sameGrandfather && sameGeneration;
      });
      
      // إذا وجدنا إخوة، نتحقق هل أحدهم مرتبط بوالد
      for (const sibling of potentialSiblings) {
        if (childToParent.has(sibling.id)) {
          const siblingParentId = childToParent.get(sibling.id);
          
          // إذا الشخص الجديد غير مرتبط بوالد، نربطه بنفس والد الأخ
          if (!childToParent.has(newPerson.id)) {
            // ✅ استخدام الدالة الآمنة
            const added = await safeAddRelation(siblingParentId, newPerson.id);
            if (added) {
              childToParent.set(newPerson.id, siblingParentId);
            }
            break; // نخرج بعد الربط الأول
          }
        }
      }
      
      // ربط الإخوة غير المرتبطين بنفس الوالد
      if (childToParent.has(newPerson.id)) {
        const newPersonParentId = childToParent.get(newPerson.id);
        
        for (const sibling of potentialSiblings) {
          if (!childToParent.has(sibling.id)) {
            // ✅ استخدام الدالة الآمنة
            await safeAddRelation(newPersonParentId, sibling.id);
          }
        }
      }
    }
    
  } catch (err) {
    console.error('❌ خطأ في الربط الذكي:', err);
    // لا نرمي الخطأ - الربط الذكي اختياري
  }
}

// إضافة شخص جديد للقبيلة
export async function createTribePerson(tribeId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من العضوية
    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // =====================================================
    // 🔗 إذا كانت العلاقة "أنا" - نبحث عن سجل موجود بنفس الاسم الثلاثي ونربط به
    // =====================================================
    if (personData.relation === 'أنا') {
      // البحث عن شخص موجود بنفس الاسم الثلاثي (الاسم + الأب + الجد)
      const { data: existingPersons } = await supabase
        .from('persons')
        .select('*')
        .eq('tribe_id', tribeId)
        .ilike('first_name', personData.first_name || '')
        .ilike('father_name', personData.father_name || '')
        .ilike('grandfather_name', personData.grandfather_name || '');

      if (existingPersons && existingPersons.length > 0) {
        // وجدنا شخص مطابق - نربط المستخدم به بدلاً من إنشاء سجل جديد
        const existingPerson = existingPersons[0];
        
        // تحديث tribe_users لربط المستخدم بهذا الشخص
        const { error: linkError } = await supabase
          .from('tribe_users')
          .update({ person_id: existingPerson.id })
          .eq('tribe_id', tribeId)
          .eq('firebase_uid', user.uid);

        if (linkError) throw linkError;
        
        // ⚠️ نحدث فقط المعلومات الناقصة - لا نغير العلاقة!
        // العلاقة الأصلية (ابن/بنت/إلخ) تبقى كما هي
        const updates = {};
        if (personData.phone && !existingPerson.phone) updates.phone = personData.phone;
        if (personData.birth_date && !existingPerson.birth_date) updates.birth_date = personData.birth_date;
        if (personData.photo_url && !existingPerson.photo_url) updates.photo_url = personData.photo_url;
        
        // تحديث فقط إذا كان هناك معلومات جديدة
        if (Object.keys(updates).length > 0) {
          const { data: updatedPerson, error: updateError } = await supabase
            .from('persons')
            .update(updates)
            .eq('id', existingPerson.id)
            .select()
            .single();

          if (updateError) throw updateError;
          console.log('✅ تم ربط المستخدم بسجل موجود وتحديث معلوماته:', existingPerson.id);
          return updatedPerson;
        }
        
        console.log('✅ تم ربط المستخدم بسجل موجود:', existingPerson.id);
        return existingPerson;
      }
    }
    
    // =====================================================
    // إنشاء شخص جديد إذا لم يوجد مطابق
    // =====================================================
    
    // ⚠️ إذا كانت العلاقة "أنا"، نغيرها إلى "رب العائلة" لأن "أنا" ليست علاقة حقيقية
    // هي فقط طريقة لتحديد أن المستخدم يسجل نفسه
    const finalPersonData = { ...personData };
    if (finalPersonData.relation === 'أنا') {
      finalPersonData.relation = 'رب العائلة';
    }
    
    const { data, error } = await supabase
      .from('persons')
      .insert({
        tribe_id: tribeId,
        ...finalPersonData,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ إذا كان المستخدم يسجل نفسه ("أنا")، نربطه بالسجل الجديد
    if (personData.relation === 'أنا') {
      const { error: linkError } = await supabase
        .from('tribe_users')
        .update({ person_id: data.id })
        .eq('tribe_id', tribeId)
        .eq('firebase_uid', user.uid);
      
      if (linkError) {
        console.warn('⚠️ فشل ربط المستخدم بالسجل الجديد:', linkError);
      } else {
        console.log('✅ تم ربط المستخدم بسجله الجديد:', data.id);
      }
    }

    // إنشاء العلاقات التلقائية (للعلاقات المباشرة مثل "ابن"، "والد")
    await createAutoRelations(tribeId, data, membership, user.uid);
    
    // 🧠 الربط الذكي الشامل - يربط الأشخاص المتشابهين في رسم الشجرة
    await smartAutoLink(tribeId, data, user.uid);

    // إضافة سجل في Audit Log
    await logPersonAction(tribeId, data.id, 'create', user.uid, null, data);

    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة الشخص:", err);
    throw err;
  }
}

// تحديث شخص
export async function updateTribePerson(tribeId, personId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من العضوية
    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // جلب البيانات القديمة
    const { data: oldData } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .single();

    // ✅ التحقق من الملكية:
    // 1. Admin يعدّل أي شيء
    // 2. صاحب السجل (من أنشأه) يعدّله
    // 3. الشخص المرتبط بالسجل (person_id في tribe_users) يعدّل سجله الخاص
    const isAdmin = membership.role === 'admin';
    const isCreator = oldData?.created_by === user.uid;
    const isLinkedPerson = membership.person_id && String(membership.person_id) === String(personId); // ✅ مقارنة كنصوص
    
    if (!isAdmin && !isCreator && !isLinkedPerson) {
      throw new Error('لا يمكنك تعديل بيانات أضافها شخص آخر');
    }

    // ⚠️ إذا كان المستخدم هو الشخص المرتبط (وليس صاحب السجل)، لا نسمح بتغيير العلاقة
    // العلاقة يحددها من أنشأ السجل (مثلاً الأب يحدد أن ابنه "ابن")
    const finalPersonData = { ...personData };
    if (isLinkedPerson && !isCreator && !isAdmin) {
      // حذف العلاقة من البيانات المُرسلة - لا يمكن للشخص المرتبط تغيير علاقته
      delete finalPersonData.relation;
      console.log('⚠️ تم تجاهل تغيير العلاقة - المستخدم مرتبط بالسجل وليس صاحبه');
    }
    
    // إذا كانت العلاقة "أنا"، نحولها للعلاقة المناسبة
    if (finalPersonData.relation === 'أنا') {
      finalPersonData.relation = oldData?.relation || 'رب العائلة';
      console.log('⚠️ تم تحويل العلاقة "أنا" إلى:', finalPersonData.relation);
    }

    const { data, error } = await supabase
      .from('persons')
      .update({
        ...finalPersonData,
        updated_by: user.uid,
      })
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .select()
      .single();

    if (error) throw error;

    // 🧠 إعادة الربط الذكي عند التحديث (إذا تغيرت الأسماء)
    await smartAutoLink(tribeId, data, user.uid);

    // سجل التعديل
    await logPersonAction(tribeId, personId, 'update', user.uid, oldData, data);

    return data;
  } catch (err) {
    console.error("❌ خطأ في تحديث الشخص:", err);
    throw err;
  }
}

// حذف شخص
export async function deleteTribePerson(tribeId, personId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // جلب البيانات قبل الحذف - استخدام maybeSingle لتجنب خطأ 406
    const { data: oldData, error: fetchError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .maybeSingle();

    if (fetchError) {
      console.error('خطأ في جلب بيانات الشخص:', fetchError);
      throw new Error('فشل في جلب بيانات الشخص');
    }

    if (!oldData) {
      throw new Error('الشخص غير موجود أو تم حذفه مسبقاً');
    }

    // ✅ التحقق من الصلاحيات
    const isAdmin = membership.role === 'admin';
    const isOwner = oldData.created_by === user.uid;
    const isLinkedToMe = membership.person_id && String(membership.person_id) === String(personId); // ✅ مقارنة كنصوص
    
    // Admin يحذف أي شيء
    // المستخدم العادي يحذف: ما أضافه هو، أو السجل المرتبط به
    if (!isAdmin && !isOwner && !isLinkedToMe) {
      throw new Error('لا يمكنك حذف بيانات أضافها شخص آخر');
    }

    // ⚠️ تحذير: إذا حذف المستخدم السجل المرتبط به، نفك الربط
    if (isLinkedToMe) {
      await supabase
        .from('tribe_users')
        .update({ person_id: null })
        .eq('id', membership.id);
    }

    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId)
      .eq('tribe_id', tribeId);

    if (error) throw error;

    // سجل الحذف
    await logPersonAction(tribeId, personId, 'delete', user.uid, oldData, null);

    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف الشخص:", err);
    throw err;
  }
}

// =============================================
// دوال العلاقات (Relations)
// =============================================

// إضافة علاقة والد-ابن
export async function createTribeRelation(tribeId, parentId, childId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: parentId,
        child_id: childId,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة العلاقة:", err);
    throw err;
  }
}

// حذف علاقة
export async function deleteTribeRelation(tribeId, parentId, childId) {
  try {
    const { error } = await supabase
      .from('relations')
      .delete()
      .eq('tribe_id', tribeId)
      .eq('parent_id', parentId)
      .eq('child_id', childId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف العلاقة:", err);
    throw err;
  }
}

// =============================================
// 🔧 إيجاد وحذف التكرارات
// =============================================

/**
 * البحث عن الأشخاص المكررين (نفس الاسم والجنس)
 * ⚠️ هذه الدالة للعرض فقط - لا تحذف تلقائياً
 */
// eslint-disable-next-line no-unused-vars
export async function findAndRemoveDuplicates(tribeId) {
  // ⚠️ تم تعطيل الحذف التلقائي - خطير جداً
  // الدالة الآن تعرض التكرارات فقط بدون حذف
  return { duplicates: [], deleted: 0 };
}

// الحصول على الشجرة الكاملة - محسّن للأداء
export async function getTribeTree(tribeId, options = {}) {
  const { useCache = true, forceRefresh = false } = options;
  
  // استخدام cache بسيط في الذاكرة
  const cacheKey = `tree_${tribeId}`;
  if (useCache && !forceRefresh && window.__treeCache?.[cacheKey]) {
    const cached = window.__treeCache[cacheKey];
    // Cache صالح لمدة 30 ثانية
    if (Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
  }
  
  try {
    // جلب الأشخاص والعلاقات بالتوازي لتسريع التحميل
    const [personsResult, relationsResult] = await Promise.all([
      supabase
        .from('persons')
        .select('id, first_name, father_name, family_name, grandfather_name, gender, birth_date, phone, photo_url, is_root, generation, relation, created_at')
        .eq('tribe_id', tribeId)
        .order('generation', { ascending: true }),
      supabase
        .from('relations')
        .select('parent_id, child_id')
        .eq('tribe_id', tribeId)
    ]);

    if (personsResult.error) throw personsResult.error;
    if (relationsResult.error) throw relationsResult.error;

    const persons = personsResult.data || [];
    const relations = relationsResult.data || [];

    // استخدام Map للوصول O(1) بدلاً من filter O(n)
    const seenChildren = new Map();
    const uniqueRelations = [];
    
    for (const rel of relations) {
      // كل طفل له والد واحد فقط - نأخذ أول علاقة
      if (!seenChildren.has(rel.child_id)) {
        seenChildren.set(rel.child_id, rel.parent_id);
        uniqueRelations.push(rel);
      }
    }

    const result = { persons, relations: uniqueRelations };
    
    // حفظ في Cache
    if (!window.__treeCache) window.__treeCache = {};
    window.__treeCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  } catch (err) {
    console.error("❌ خطأ في تحميل الشجرة:", err);
    throw err;
  }
}

// =============================================
// 🔧 إيجاد الجذور المتعددة وربطها
// =============================================

/**
 * الحصول على الأشخاص بدون والد (الجذور)
 */
export async function getUnlinkedRoots(tribeId) {
  try {
    // جلب كل الأشخاص
    const { data: persons } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId);
    
    // جلب كل العلاقات
    const { data: relations } = await supabase
      .from('relations')
      .select('child_id')
      .eq('tribe_id', tribeId);
    
    // مجموعة الأشخاص الذين لديهم والد
    const hasParent = new Set((relations || []).map(r => r.child_id));
    
    // الجذور = من ليس لديهم والد
    const roots = (persons || []).filter(p => !hasParent.has(p.id));
    
    return roots;
  } catch (err) {
    console.error("❌ خطأ في جلب الجذور:", err);
    throw err;
  }
}

/**
 * 🧹 تنظيف العلاقات المكررة من قاعدة البيانات
 */
export async function cleanDuplicateRelations(tribeId) {
  try {
    // جلب كل العلاقات
    const { data: relations } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('created_at', { ascending: true }); // أقدم أولاً
    
    if (!relations || relations.length === 0) return { deleted: 0 };
    
    const seenChildren = new Set();
    const toDelete = [];
    
    for (const rel of relations) {
      if (seenChildren.has(rel.child_id)) {
        // هذه علاقة مكررة - الطفل له والد آخر بالفعل
        toDelete.push(rel.id);
      } else {
        seenChildren.add(rel.child_id);
      }
    }
    
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('relations')
        .delete()
        .in('id', toDelete);
      
      if (error) throw error;
    }
    
    return { deleted: toDelete.length };
  } catch (err) {
    console.error("❌ خطأ في تنظيف العلاقات:", err);
    throw err;
  }
}

// =============================================
// � فحص صحة الشجرة - تقرير شامل
// =============================================

/**
 * فحص صحة الشجرة وإرجاع تقرير شامل
 */
export async function analyzeTreeHealth(tribeId) {
  try {
    // جلب كل البيانات
    const { data: persons } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId);
    
    const { data: relations } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId);
    
    const { data: users } = await supabase
      .from('tribe_users')
      .select('*')
      .eq('tribe_id', tribeId);
    
    if (!persons) return null;

    // بناء خرائط
    const childToParent = new Map();
    const parentToChildren = new Map();
    
    for (const rel of (relations || [])) {
      childToParent.set(rel.child_id, rel.parent_id);
      if (!parentToChildren.has(rel.parent_id)) {
        parentToChildren.set(rel.parent_id, []);
      }
      parentToChildren.get(rel.parent_id).push(rel.child_id);
    }

    // 1️⃣ الجذور (أشخاص بدون والد)
    const roots = persons.filter(p => !childToParent.has(p.id));
    
    // 2️⃣ الأشخاص المكررين (نفس الاسم)
    const nameGroups = {};
    for (const person of persons) {
      const key = `${(person.first_name || '').trim().toLowerCase()}_${(person.father_name || '').trim().toLowerCase()}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(person);
    }
    const duplicates = Object.entries(nameGroups)
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({ key, persons: group }));
    
    // 3️⃣ أشخاص بدون علاقات (معزولين)
    const isolated = persons.filter(p => 
      !childToParent.has(p.id) && 
      !parentToChildren.has(p.id) &&
      roots.length > 1 // فقط إذا كان هناك أكثر من جذر
    );
    
    // 4️⃣ المستخدمين غير المرتبطين
    const unlinkedUsers = (users || []).filter(u => !u.person_id);
    
    // 5️⃣ حساب عمق الشجرة
    const calculateDepth = (personId, visited = new Set()) => {
      if (visited.has(personId)) return 0;
      visited.add(personId);
      const children = parentToChildren.get(personId) || [];
      if (children.length === 0) return 1;
      return 1 + Math.max(...children.map(c => calculateDepth(c, visited)));
    };
    
    const maxDepth = roots.length > 0 
      ? Math.max(...roots.map(r => calculateDepth(r.id)))
      : 0;
    
    // 6️⃣ إحصائيات عامة
    const stats = {
      totalPersons: persons.length,
      totalRelations: (relations || []).length,
      totalUsers: (users || []).length,
      linkedUsers: (users || []).filter(u => u.person_id).length,
      rootsCount: roots.length,
      maxDepth: maxDepth,
      avgChildrenPerPerson: persons.length > 0 
        ? ((relations || []).length / persons.length).toFixed(1) 
        : 0
    };

    // 7️⃣ المشاكل
    const problems = [];
    
    if (roots.length > 1) {
      problems.push({
        type: 'multiple_roots',
        severity: 'warning',
        message: `يوجد ${roots.length} جذور منفصلة - الشجرة غير موحدة`,
        details: roots.map(r => `${r.first_name} ${r.father_name}`).join(', ')
      });
    }
    
    if (duplicates.length > 0) {
      problems.push({
        type: 'duplicates',
        severity: 'warning',
        message: `يوجد ${duplicates.length} مجموعة من الأشخاص المكررين`,
        details: duplicates.map(d => d.persons[0].first_name + ' ' + d.persons[0].father_name).join(', ')
      });
    }
    
    if (unlinkedUsers.length > 0) {
      problems.push({
        type: 'unlinked_users',
        severity: 'info',
        message: `يوجد ${unlinkedUsers.length} مستخدم لم يضف نفسه للشجرة`,
        details: ''
      });
    }
    
    if (isolated.length > 0) {
      problems.push({
        type: 'isolated',
        severity: 'info',
        message: `يوجد ${isolated.length} شخص معزول (بدون أب وبدون أبناء)`,
        details: isolated.map(p => p.first_name + ' ' + p.father_name).join(', ')
      });
    }

    return {
      stats,
      roots: roots.map(r => ({ id: r.id, name: `${r.first_name} ${r.father_name}` })),
      duplicates,
      problems,
      isHealthy: problems.filter(p => p.severity === 'warning' || p.severity === 'error').length === 0
    };
  } catch (err) {
    console.error("❌ خطأ في تحليل الشجرة:", err);
    throw err;
  }
}

// =============================================
// �🔍 البحث عن الأشخاص المكررين
// =============================================

/**
 * البحث عن الأشخاص المكررين (نفس الاسم الثلاثي: الأول + الأب + الجد)
 */
export async function findDuplicatePersons(tribeId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // جلب جميع الأشخاص
    const { data: persons, error } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId);

    if (error) throw error;

    // تجميع الأشخاص حسب الاسم الثلاثي (الأول + الأب + الجد)
    const nameGroups = {};
    for (const person of (persons || [])) {
      const key = `${normalizeNameForMatch(person.first_name || '')}_${normalizeNameForMatch(person.father_name || '')}_${normalizeNameForMatch(person.grandfather_name || '')}`;
      if (!nameGroups[key]) {
        nameGroups[key] = [];
      }
      nameGroups[key].push(person);
    }

    // إيجاد المجموعات التي فيها أكثر من شخص
    const duplicates = [];
    for (const [key, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        duplicates.push({
          key,
          name: `${group[0].first_name} ${group[0].father_name} ${group[0].grandfather_name || ''}`.trim(),
          persons: group
        });
      }
    }

    return duplicates;
  } catch (err) {
    console.error("❌ خطأ في البحث عن المكررين:", err);
    throw err;
  }
}

/**
 * دمج شخصين (نقل كل العلاقات من المصدر للهدف وحذف المصدر)
 * @param keepId - الشخص الذي سيبقى (عادة الأقدم أو الذي له علاقة "أنا")
 * @param mergeId - الشخص الذي سيُدمج (يُحذف)
 */
export async function mergePersons(tribeId, keepId, mergeId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkUserMembership(tribeId);
    if (!membership || membership.role !== 'admin') {
      throw new Error('فقط المدير يمكنه دمج الأشخاص');
    }

    // 1️⃣ نقل علاقات الوالد (حيث mergeId هو الوالد)
    const { error: parentErr } = await supabase
      .from('relations')
      .update({ parent_id: keepId })
      .eq('tribe_id', tribeId)
      .eq('parent_id', mergeId);
    
    if (parentErr) throw parentErr;

    // 2️⃣ نقل علاقات الطفل (حيث mergeId هو الطفل)
    // لكن فقط إذا لم يكن keepId طفلاً لنفس الوالد بالفعل
    const { data: mergeChildRels } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('child_id', mergeId);

    const { data: keepChildRels } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('child_id', keepId);

    const keepParents = new Set((keepChildRels || []).map(r => r.parent_id));
    
    for (const rel of (mergeChildRels || [])) {
      if (!keepParents.has(rel.parent_id)) {
        // نقل العلاقة
        await supabase
          .from('relations')
          .update({ child_id: keepId })
          .eq('id', rel.id);
      } else {
        // حذف العلاقة المكررة
        await supabase
          .from('relations')
          .delete()
          .eq('id', rel.id);
      }
    }

    // 3️⃣ نقل ربط المستخدمين
    await supabase
      .from('tribe_users')
      .update({ person_id: keepId })
      .eq('tribe_id', tribeId)
      .eq('person_id', mergeId);

    // 4️⃣ حذف الشخص المُدمج
    const { error: deleteErr } = await supabase
      .from('persons')
      .delete()
      .eq('id', mergeId)
      .eq('tribe_id', tribeId);

    if (deleteErr) throw deleteErr;

    return { success: true, message: 'تم الدمج بنجاح' };
  } catch (err) {
    console.error("❌ خطأ في دمج الأشخاص:", err);
    throw err;
  }
}

/**
 * ربط شخص (جذر) بوالد آخر (جذر أقدم)
 */
export async function mergeRoots(tribeId, childRootId, parentRootId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');
    
    // التحقق من عدم وجود العلاقة
    const { data: existing } = await supabase
      .from('relations')
      .select('id')
      .eq('tribe_id', tribeId)
      .eq('parent_id', parentRootId)
      .eq('child_id', childRootId)
      .maybeSingle();
    
    if (existing) {
      return { success: true, message: 'العلاقة موجودة مسبقاً' };
    }
    
    // إنشاء العلاقة
    const { error } = await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: parentRootId,
        child_id: childRootId,
        created_by: user.uid
      });
    
    if (error) throw error;
    
    return { success: true, message: 'تم الربط بنجاح' };
  } catch (err) {
    console.error("❌ خطأ في دمج الجذور:", err);
    throw err;
  }
}

// =============================================
// 🔧 إصلاح العلاقات المفقودة
// =============================================

// ربط شخص بوالد
export async function linkPersonToParent(tribeId, childId, parentId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من عدم وجود العلاقة
    const { data: existing } = await supabase
      .from('relations')
      .select('id')
      .eq('tribe_id', tribeId)
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .single();

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: parentId,
        child_id: childId,
        created_by: user.uid
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في ربط الشخص:", err);
    throw err;
  }
}

// إصلاح علاقات الإخوة غير المرتبطين
export async function fixUnlinkedSiblings(tribeId, userPersonId) {
  try {
    // 1. الحصول على والد المستخدم
    const { data: parentRel } = await supabase
      .from('relations')
      .select('parent_id')
      .eq('tribe_id', tribeId)
      .eq('child_id', userPersonId)
      .single();

    if (!parentRel) {
      return { fixed: 0 };
    }

    const parentId = parentRel.parent_id;

    // 2. الحصول على جميع الأشخاص بعلاقة "أخ" أو "أخت"
    const { data: siblings } = await supabase
      .from('persons')
      .select('id, first_name, relation')
      .eq('tribe_id', tribeId)
      .in('relation', ['أخ', 'أخت']);

    if (!siblings || siblings.length === 0) {
      return { fixed: 0 };
    }

    // 3. التحقق من كل أخ/أخت إذا كان مرتبطاً
    let fixedCount = 0;
    for (const sibling of siblings) {
      const { data: existingRel } = await supabase
        .from('relations')
        .select('id')
        .eq('tribe_id', tribeId)
        .eq('child_id', sibling.id)
        .single();

      if (!existingRel) {
        // ربط الأخ بالوالد
        await linkPersonToParent(tribeId, sibling.id, parentId);
        fixedCount++;
      }
    }

    return { fixed: fixedCount, parentId };
  } catch (err) {
    console.error("❌ خطأ في إصلاح علاقات الإخوة:", err);
    throw err;
  }
}

// =============================================
// دوال الزواج (Marriages)
// =============================================

// إضافة زواج
export async function createMarriage(tribeId, husbandId, wifeId, marriageData = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('marriages')
      .insert({
        tribe_id: tribeId,
        husband_id: husbandId,
        wife_id: wifeId,
        ...marriageData,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة الزواج:", err);
    throw err;
  }
}

// قائمة الزيجات
export async function listMarriages(tribeId) {
  try {
    const { data, error } = await supabase
      .from('marriages')
      .select(`
        *,
        husband:persons!marriages_husband_id_fkey(*),
        wife:persons!marriages_wife_id_fkey(*)
      `)
      .eq('tribe_id', tribeId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل الزيجات:", err);
    throw err;
  }
}

// =============================================
// دوال مساعدة
// =============================================

// سجل التعديلات (Audit Log) - اختياري، لا يوقف العملية الرئيسية
async function logPersonAction(tribeId, personId, action, changedBy, oldData, newData) {
  try {
    // تجاهل الأخطاء لأن السجل اختياري
    const { error } = await supabase
      .from('person_audit_log')
      .insert({
        tribe_id: tribeId,
        person_id: personId,
        action,
        changed_by: changedBy,
        old_data: oldData,
        new_data: newData,
      });
    
    if (error) {
      // تجاهل أخطاء التعارض (409) - السجل موجود مسبقاً
      if (error.code !== '23505' && error.code !== 'PGRST409') {
        console.warn("⚠️ سجل التعديلات:", error.message);
      }
    }
  } catch {
    // تجاهل جميع الأخطاء - السجل اختياري
  }
}

// قائمة المساهمين
export async function listTribeContributors(tribeId) {
  try {
    const { data, error } = await supabase
      .from('tribe_users')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل المساهمين:", err);
    throw err;
  }
}

// =============================================
// 🧠 نظام الربط الذكي الموحد
// =============================================

/**
 * التحقق من وجود شخص مشابه قبل الإضافة
 */
export async function checkDuplicatePerson(tribeId, firstName, fatherName, grandfatherName = null, excludeId = null) {
  try {
    let query = supabase
      .from('persons')
      .select('id, first_name, father_name, grandfather_name, family_name, gender, birth_date')
      .eq('tribe_id', tribeId)
      .ilike('first_name', firstName.trim())
      .ilike('father_name', fatherName.trim());
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // إذا وجدنا تطابق، نحسب درجة التشابه
    if (data && data.length > 0) {
      const matches = data.map(person => {
        let score = 70; // الاسم + اسم الأب متطابقان
        
        if (grandfatherName && person.grandfather_name?.toLowerCase().trim() === grandfatherName.toLowerCase().trim()) {
          score += 20;
        }
        
        return {
          ...person,
          matchScore: score,
          isExactMatch: score >= 90
        };
      });
      
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    return [];
  } catch (err) {
    console.error("❌ خطأ في البحث عن التكرار:", err);
    return [];
  }
}

/**
 * البحث عن والد محتمل
 */
export async function findPotentialParent(tribeId, fatherName, grandfatherName = null) {
  try {
    let query = supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .ilike('first_name', fatherName.trim());
    
    if (grandfatherName) {
      query = query.ilike('father_name', grandfatherName.trim());
    }
    
    const { data, error } = await query.order('generation', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في البحث عن الوالد:", err);
    return [];
  }
}

/**
 * إنشاء شخص مع الربط الذكي التلقائي
 */
export async function createSmartPerson(tribeId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من العضوية
    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // التحقق من التكرار
    const duplicates = await checkDuplicatePerson(
      tribeId,
      personData.first_name,
      personData.father_name,
      personData.grandfather_name
    );
    
    if (duplicates.length > 0 && duplicates[0].isExactMatch) {
      return {
        success: false,
        error: 'duplicate',
        existingPerson: duplicates[0],
        message: `يوجد شخص مشابه: ${duplicates[0].first_name} بن ${duplicates[0].father_name}`
      };
    }

    // البحث عن والد محتمل للربط التلقائي
    const potentialParents = await findPotentialParent(
      tribeId,
      personData.father_name,
      personData.grandfather_name
    );

    // إضافة الشخص
    const { data: newPerson, error } = await supabase
      .from('persons')
      .insert({
        tribe_id: tribeId,
        ...personData,
        created_by: user.uid,
        auto_linked: potentialParents.length > 0,
        link_source: potentialParents.length > 0 ? 'auto_name' : null
      })
      .select()
      .single();

    if (error) throw error;

    // إنشاء العلاقة التلقائية إذا وجدنا والداً
    let linkResult = null;
    if (potentialParents.length > 0) {
      const bestParent = potentialParents[0];
      
      // تحقق من أن الشخص الجديد ليس أقدم من الوالد المحتمل
      const isValidLink = !personData.birth_date || !bestParent.birth_date || 
        new Date(personData.birth_date) > new Date(bestParent.birth_date);
      
      if (isValidLink) {
        // إنشاء العلاقة
        const { error: relError } = await supabase
          .from('relations')
          .insert({
            tribe_id: tribeId,
            parent_id: bestParent.id,
            child_id: newPerson.id,
            created_by: user.uid
          });
        
        if (!relError) {
          // تحديث جيل الشخص الجديد
          await supabase
            .from('persons')
            .update({ 
              generation: (bestParent.generation || 0) + 1,
              confidence_score: potentialParents.length === 1 ? 95 : 75
            })
            .eq('id', newPerson.id);
          
          linkResult = {
            linked: true,
            parentId: bestParent.id,
            parentName: bestParent.first_name,
            confidence: potentialParents.length === 1 ? 95 : 75
          };
        }
      }
    }

    // إنشاء العلاقات الإضافية (لـ "أنا"، الأبناء، الوالدين)
    await createAutoRelations(tribeId, newPerson, membership, user.uid);

    // سجل التعديل
    await logPersonAction(tribeId, newPerson.id, 'create', user.uid, null, newPerson);

    return {
      success: true,
      person: newPerson,
      linkResult,
      similarPersons: duplicates.filter(d => !d.isExactMatch)
    };
  } catch (err) {
    console.error("❌ خطأ في إضافة الشخص:", err);
    throw err;
  }
}

/**
 * بناء الشجرة الهرمية الموحدة
 */
export async function buildUnifiedTree(tribeId) {
  try {
    // جلب جميع الأشخاص
    const { data: persons, error: personsError } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: true });

    if (personsError) throw personsError;

    // جلب جميع العلاقات
    const { data: relations, error: relationsError } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId);

    if (relationsError) throw relationsError;

    // إنشاء خريطة للأشخاص
    const personsMap = new Map();
    (persons || []).forEach(p => {
      personsMap.set(p.id, {
        id: String(p.id),
        firstName: p.first_name,
        fatherName: p.father_name,
        grandfatherName: p.grandfather_name,
        surname: p.family_name,
        fullName: `${p.first_name} بن ${p.father_name || ''}`.trim(),
        gender: p.gender,
        birthDate: p.birth_date,
        isAlive: p.is_alive !== false,
        photoUrl: p.photo_url,
        generation: p.generation || 0,
        relation: p.relation,
        createdBy: p.created_by,
        children: [],
        _raw: p
      });
    });

    // بناء علاقات الوالد-الابن
    const childIds = new Set();
    (relations || []).forEach(rel => {
      const parent = personsMap.get(rel.parent_id);
      const child = personsMap.get(rel.child_id);
      
      if (parent && child) {
        parent.children.push(child);
        child.parentId = String(rel.parent_id);
        childIds.add(rel.child_id);
      }
    });

    // إيجاد الجذور (الأشخاص بدون آباء)
    const roots = [];
    personsMap.forEach((person, id) => {
      if (!childIds.has(id)) {
        roots.push(person);
      }
    });

    // ترتيب الجذور والأطفال
    const sortByGenThenName = (a, b) => {
      if (a.generation !== b.generation) {
        return a.generation - b.generation;
      }
      return (a.firstName || '').localeCompare(b.firstName || '', 'ar');
    };

    roots.sort(sortByGenThenName);

    // ترتيب الأطفال بشكل متكرر
    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '', 'ar'));
        node.children.forEach(sortChildren);
      }
    };

    roots.forEach(sortChildren);

    // حساب الإحصائيات
    let maxGeneration = 0;
    let totalCount = 0;
    const countStats = (node, depth = 0) => {
      totalCount++;
      if (depth > maxGeneration) maxGeneration = depth;
      (node.children || []).forEach(child => countStats(child, depth + 1));
    };
    roots.forEach(root => countStats(root));

    return {
      roots,
      allPersons: Array.from(personsMap.values()),
      relations: relations || [],
      stats: {
        totalPersons: totalCount,
        maxGeneration,
        rootsCount: roots.length,
        linkedPersons: childIds.size,
        unlinkedPersons: roots.length
      }
    };
  } catch (err) {
    console.error("❌ خطأ في بناء الشجرة:", err);
    throw err;
  }
}

/**
 * الحصول على الشجرة بتنسيق D3
 */
export async function getUnifiedTreeForD3(tribeId) {
  try {
    const tree = await buildUnifiedTree(tribeId);
    
    if (!tree.roots || tree.roots.length === 0) {
      return null;
    }

    // تحويل إلى تنسيق D3
    const convertNode = (node) => ({
      id: node.id,
      name: node.fullName || node.firstName,
      firstName: node.firstName,
      fatherName: node.fatherName,
      surname: node.surname,
      gender: node.gender,
      birthDate: node.birthDate,
      isAlive: node.isAlive,
      photoUrl: node.photoUrl,
      generation: node.generation,
      relation: node.relation,
      children: (node.children || []).map(convertNode)
    });

    // إذا كان هناك جذر واحد
    if (tree.roots.length === 1) {
      return {
        tree: convertNode(tree.roots[0]),
        stats: tree.stats
      };
    }

    // إذا كان هناك عدة جذور، ننشئ جذراً افتراضياً
    return {
      tree: {
        id: 'tribe-root',
        name: '🏛️ شجرة القبيلة',
        isVirtualRoot: true,
        children: tree.roots.map(convertNode)
      },
      stats: tree.stats
    };
  } catch (err) {
    console.error("❌ خطأ في تحويل الشجرة:", err);
    throw err;
  }
}

/**
 * الحصول على نسب شخص (من الجذر إليه)
 */
export async function getPersonLineage(tribeId, personId) {
  try {
    const lineage = [];
    let currentId = personId;
    const visited = new Set();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      
      const { data: person } = await supabase
        .from('persons')
        .select('*')
        .eq('id', currentId)
        .single();
      
      if (!person) break;
      
      lineage.unshift({
        id: String(person.id),
        firstName: person.first_name,
        fatherName: person.father_name,
        fullName: `${person.first_name} بن ${person.father_name || ''}`.trim()
      });
      
      const { data: relation } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('child_id', currentId)
        .eq('tribe_id', tribeId)
        .limit(1)
        .single();
      
      currentId = relation?.parent_id;
    }
    
    return lineage;
  } catch (err) {
    console.error("❌ خطأ في جلب النسب:", err);
    return [];
  }
}

/**
 * الحصول على إحصائيات الشجرة
 */
export async function getTribeStatistics(tribeId) {
  try {
    const { count: totalPersons } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId);
    
    const { count: maleCount } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('gender', 'M');
    
    const { count: femaleCount } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('gender', 'F');
    
    const { count: relationsCount } = await supabase
      .from('relations')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId);
    
    const { data: generations } = await supabase
      .from('persons')
      .select('generation')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: false })
      .limit(1);
    
    return {
      totalPersons: totalPersons || 0,
      maleCount: maleCount || 0,
      femaleCount: femaleCount || 0,
      relationsCount: relationsCount || 0,
      generationsCount: (generations?.[0]?.generation || 0) + 1
    };
  } catch (err) {
    console.error("❌ خطأ في جلب الإحصائيات:", err);
    return {};
  }
}

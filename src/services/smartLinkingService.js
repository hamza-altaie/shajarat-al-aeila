// src/services/smartLinkingService.js
// خدمة الربط الذكي للشجرة الموحدة

import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../firebase/auth.js';

// =============================================
// 🔗 خوارزمية الربط الذكي
// =============================================

/**
 * البحث عن والد محتمل بناءً على اسم الأب واسم الجد
 */
export async function findPotentialParent(tribeId, fatherName, grandfatherName = null) {
  try {
    let query = supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .ilike('first_name', fatherName.trim());
    
    // إذا كان اسم الجد متوفراً، نضيفه للبحث
    if (grandfatherName) {
      query = query.ilike('father_name', grandfatherName.trim());
    }
    
    const { data, error } = await query.order('generation', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('❌ خطأ في البحث عن الوالد:', err);
    return [];
  }
}

/**
 * البحث عن أشخاص مشابهين (لمنع التكرار)
 */
export async function findSimilarPersons(tribeId, personData, excludeId = null) {
  try {
    const { firstName, fatherName, grandfatherName, familyName } = personData;
    
    let query = supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    // بناء شروط البحث
    const conditions = [];
    
    if (firstName) {
      conditions.push(`first_name.ilike.%${firstName.trim()}%`);
    }
    
    if (fatherName) {
      conditions.push(`father_name.ilike.%${fatherName.trim()}%`);
    }
    
    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // حساب درجة التشابه لكل شخص
    const scoredResults = (data || []).map(person => {
      let score = 0;
      const reasons = [];
      
      // مطابقة الاسم الأول
      if (person.first_name?.toLowerCase().trim() === firstName?.toLowerCase().trim()) {
        score += 40;
        reasons.push('تطابق الاسم الأول');
      }
      
      // مطابقة اسم الأب
      if (person.father_name?.toLowerCase().trim() === fatherName?.toLowerCase().trim()) {
        score += 30;
        reasons.push('تطابق اسم الأب');
      }
      
      // مطابقة اسم الجد
      if (grandfatherName && person.grandfather_name?.toLowerCase().trim() === grandfatherName?.toLowerCase().trim()) {
        score += 20;
        reasons.push('تطابق اسم الجد');
      }
      
      // مطابقة اسم العائلة
      if (familyName && person.family_name?.toLowerCase().trim() === familyName?.toLowerCase().trim()) {
        score += 10;
        reasons.push('تطابق اسم العائلة');
      }
      
      return {
        ...person,
        similarityScore: score,
        matchReasons: reasons,
        isExactMatch: score >= 70
      };
    });
    
    // ترتيب حسب درجة التشابه
    return scoredResults
      .filter(p => p.similarityScore >= 40)
      .sort((a, b) => b.similarityScore - a.similarityScore);
      
  } catch (err) {
    console.error('❌ خطأ في البحث عن المشابهين:', err);
    return [];
  }
}

/**
 * التحقق من وجود تكرار دقيق
 */
export async function checkExactDuplicate(tribeId, firstName, fatherName, excludeId = null) {
  try {
    let query = supabase
      .from('persons')
      .select('id, first_name, father_name, grandfather_name, family_name')
      .eq('tribe_id', tribeId)
      .ilike('first_name', firstName.trim())
      .ilike('father_name', fatherName.trim());
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('❌ خطأ في التحقق من التكرار:', err);
    return null;
  }
}

/**
 * إنشاء علاقة والد-ابن مع التحقق
 */
export async function createSmartRelation(tribeId, parentId, childId) {
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
      console.warn('⚠️ العلاقة موجودة مسبقاً');
      return existing;
    }
    
    // التحقق من عدم وجود دورة (الابن لا يمكن أن يكون جداً للأب)
    const hasCycle = await checkForCycle(tribeId, parentId, childId);
    if (hasCycle) {
      throw new Error('لا يمكن إنشاء هذه العلاقة - ستسبب دورة في الشجرة');
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
    
    // تحديث الجيل للابن
    await updatePersonGeneration(childId, parentId);
    
    return data;
  } catch (err) {
    console.error('❌ خطأ في إنشاء العلاقة:', err);
    throw err;
  }
}

/**
 * التحقق من وجود دورة في الشجرة
 */
async function checkForCycle(tribeId, parentId, childId) {
  try {
    // التحقق من أن الابن ليس جداً للأب
    const { data: ancestors } = await supabase
      .from('relations')
      .select('parent_id')
      .eq('tribe_id', tribeId)
      .eq('child_id', parentId);
    
    if (!ancestors || ancestors.length === 0) return false;
    
    // بحث عميق للتأكد من عدم وجود دورة
    const visited = new Set();
    const queue = ancestors.map(a => a.parent_id);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current === childId) return true; // وجدنا دورة
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      const { data: parentAncestors } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('tribe_id', tribeId)
        .eq('child_id', current);
      
      if (parentAncestors) {
        queue.push(...parentAncestors.map(a => a.parent_id));
      }
    }
    
    return false;
  } catch (err) {
    console.error('❌ خطأ في التحقق من الدورة:', err);
    return false;
  }
}

/**
 * تحديث جيل الشخص بناءً على والده
 */
async function updatePersonGeneration(personId, parentId) {
  try {
    const { data: parent } = await supabase
      .from('persons')
      .select('generation')
      .eq('id', parentId)
      .single();
    
    if (parent) {
      await supabase
        .from('persons')
        .update({ generation: (parent.generation || 0) + 1 })
        .eq('id', personId);
    }
  } catch (err) {
    console.error('⚠️ خطأ في تحديث الجيل:', err);
  }
}

// =============================================
// 🌳 بناء الشجرة الهرمية
// =============================================

/**
 * الحصول على جذور الشجرة (الأشخاص بدون آباء)
 */
export async function getTreeRoots(tribeId) {
  try {
    const { data: allPersons } = await supabase
      .from('persons')
      .select('id')
      .eq('tribe_id', tribeId);
    
    const { data: relations } = await supabase
      .from('relations')
      .select('child_id')
      .eq('tribe_id', tribeId);
    
    const childIds = new Set((relations || []).map(r => r.child_id));
    const rootIds = (allPersons || [])
      .filter(p => !childIds.has(p.id))
      .map(p => p.id);
    
    if (rootIds.length === 0) return [];
    
    const { data: roots } = await supabase
      .from('persons')
      .select('*')
      .in('id', rootIds)
      .order('generation', { ascending: true });
    
    return roots || [];
  } catch (err) {
    console.error('❌ خطأ في الحصول على الجذور:', err);
    return [];
  }
}

/**
 * بناء الشجرة الهرمية الكاملة
 */
export async function buildHierarchicalTree(tribeId) {
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
        ...p,
        children: [],
        depth: 0
      });
    });
    
    // بناء علاقات الوالد-الابن
    const childIds = new Set();
    (relations || []).forEach(rel => {
      const parent = personsMap.get(rel.parent_id);
      const child = personsMap.get(rel.child_id);
      
      if (parent && child) {
        parent.children.push(child);
        childIds.add(rel.child_id);
      }
    });
    
    // إيجاد الجذور
    const roots = [];
    personsMap.forEach((person, id) => {
      if (!childIds.has(id)) {
        roots.push(person);
      }
    });
    
    // ترتيب الجذور والأطفال
    const sortByName = (a, b) => (a.first_name || '').localeCompare(b.first_name || '', 'ar');
    roots.sort(sortByName);
    
    // حساب العمق لكل شخص
    const calculateDepth = (node, depth = 0) => {
      node.depth = depth;
      node.children.sort(sortByName);
      node.children.forEach(child => calculateDepth(child, depth + 1));
    };
    
    roots.forEach(root => calculateDepth(root));
    
    // إحصائيات الشجرة
    let maxDepth = 0;
    let totalPersons = 0;
    
    const countStats = (node) => {
      totalPersons++;
      if (node.depth > maxDepth) maxDepth = node.depth;
      node.children.forEach(countStats);
    };
    
    roots.forEach(countStats);
    
    return {
      roots,
      stats: {
        totalPersons,
        maxDepth,
        rootsCount: roots.length
      }
    };
  } catch (err) {
    console.error('❌ خطأ في بناء الشجرة:', err);
    throw err;
  }
}

/**
 * تحويل الشجرة الهرمية لتنسيق D3
 */
export function convertToD3Format(roots) {
  if (!roots || roots.length === 0) {
    return null;
  }
  
  // إذا كان هناك جذر واحد
  if (roots.length === 1) {
    return convertNodeToD3(roots[0]);
  }
  
  // إذا كان هناك عدة جذور، ننشئ جذراً افتراضياً
  return {
    id: 'root',
    name: 'القبيلة',
    isVirtualRoot: true,
    children: roots.map(convertNodeToD3)
  };
}

function convertNodeToD3(node) {
  return {
    id: String(node.id),
    name: buildDisplayName(node),
    firstName: node.first_name,
    fatherName: node.father_name,
    familyName: node.family_name,
    gender: node.gender,
    birthDate: node.birth_date,
    isAlive: node.is_alive,
    photoUrl: node.photo_url,
    generation: node.generation || node.depth,
    relation: node.relation,
    children: (node.children || []).map(convertNodeToD3)
  };
}

function buildDisplayName(person) {
  const parts = [
    person.first_name,
    person.father_name
  ].filter(Boolean);
  
  return parts.join(' بن ') || 'غير معروف';
}

// =============================================
// 🔄 الربط التلقائي الذكي
// =============================================

/**
 * محاولة الربط التلقائي لشخص جديد
 */
export async function autoLinkNewPerson(tribeId, personData, personId) {
  try {
    const { father_name, grandfather_name } = personData;
    
    // البحث عن والد محتمل
    const potentialParents = await findPotentialParent(
      tribeId,
      father_name,
      grandfather_name
    );
    
    if (potentialParents.length === 0) {
      console.warn('ℹ️ لم يتم العثور على والد محتمل للربط التلقائي');
      return null;
    }
    
    // اختيار أفضل مطابقة
    let bestMatch = potentialParents[0];
    let bestScore = 0;
    
    for (const parent of potentialParents) {
      let score = 50; // مطابقة الاسم الأول
      
      if (grandfather_name && parent.father_name?.toLowerCase() === grandfather_name.toLowerCase()) {
        score += 30; // مطابقة اسم الجد
      }
      
      if (personData.family_name && parent.family_name?.toLowerCase() === personData.family_name.toLowerCase()) {
        score += 20; // مطابقة اسم العائلة
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = parent;
      }
    }
    
    // إذا كانت الثقة عالية، أنشئ الربط
    if (bestScore >= 70) {
      await createSmartRelation(tribeId, bestMatch.id, personId);
      
      // تحديث حالة الربط
      await supabase
        .from('persons')
        .update({
          auto_linked: true,
          link_source: 'auto_name',
          confidence_score: bestScore
        })
        .eq('id', personId);
      
      console.warn(`✅ تم الربط التلقائي مع "${bestMatch.first_name}" بثقة ${bestScore}%`);
      
      return {
        linked: true,
        parentId: bestMatch.id,
        parentName: bestMatch.first_name,
        confidence: bestScore
      };
    }
    
    // إذا كانت الثقة متوسطة، أضف كمطابقة محتملة
    if (bestScore >= 50) {
      await supabase
        .from('potential_matches')
        .upsert({
          tribe_id: tribeId,
          person1_id: personId,
          person2_id: bestMatch.id,
          match_score: bestScore,
          match_reasons: { reasons: ['تشابه اسم الأب'] },
          status: 'pending'
        }, {
          onConflict: 'person1_id,person2_id'
        });
      
      console.warn(`⏳ تم إضافة مطابقة محتملة مع "${bestMatch.first_name}" للمراجعة`);
      
      return {
        linked: false,
        pending: true,
        parentId: bestMatch.id,
        parentName: bestMatch.first_name,
        confidence: bestScore
      };
    }
    
    return null;
  } catch (err) {
    console.error('❌ خطأ في الربط التلقائي:', err);
    return null;
  }
}

/**
 * الحصول على المطابقات المعلقة للمراجعة
 */
export async function getPendingMatches(tribeId) {
  try {
    const { data, error } = await supabase
      .from('potential_matches')
      .select(`
        *,
        person1:persons!potential_matches_person1_id_fkey(*),
        person2:persons!potential_matches_person2_id_fkey(*)
      `)
      .eq('tribe_id', tribeId)
      .eq('status', 'pending')
      .order('match_score', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ خطأ في جلب المطابقات:', err);
    return [];
  }
}

/**
 * قبول أو رفض مطابقة
 */
export async function reviewMatch(matchId, approved, reviewerUid) {
  try {
    const { data: match, error: fetchError } = await supabase
      .from('potential_matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (approved) {
      // إنشاء العلاقة
      await createSmartRelation(match.tribe_id, match.person2_id, match.person1_id);
    }
    
    // تحديث حالة المطابقة
    const { error } = await supabase
      .from('potential_matches')
      .update({
        status: approved ? 'confirmed' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerUid
      })
      .eq('id', matchId);
    
    if (error) throw error;
    
    return true;
  } catch (err) {
    console.error('❌ خطأ في مراجعة المطابقة:', err);
    throw err;
  }
}

// =============================================
// 📊 إحصائيات الشجرة
// =============================================

/**
 * الحصول على إحصائيات شاملة للشجرة
 */
export async function getTreeStatistics(tribeId) {
  try {
    // إجمالي الأشخاص
    const { count: totalPersons } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId);
    
    // عدد الذكور
    const { count: maleCount } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('gender', 'M');
    
    // عدد الإناث
    const { count: femaleCount } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('gender', 'F');
    
    // الأحياء
    const { count: aliveCount } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('is_alive', true);
    
    // عدد العلاقات
    const { count: relationsCount } = await supabase
      .from('relations')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId);
    
    // عدد الأجيال
    const { data: generations } = await supabase
      .from('persons')
      .select('generation')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: false })
      .limit(1);
    
    const maxGeneration = generations?.[0]?.generation || 0;
    
    // المطابقات المعلقة
    const { count: pendingMatches } = await supabase
      .from('potential_matches')
      .select('*', { count: 'exact', head: true })
      .eq('tribe_id', tribeId)
      .eq('status', 'pending');
    
    return {
      totalPersons: totalPersons || 0,
      maleCount: maleCount || 0,
      femaleCount: femaleCount || 0,
      aliveCount: aliveCount || 0,
      deceasedCount: (totalPersons || 0) - (aliveCount || 0),
      relationsCount: relationsCount || 0,
      generationsCount: maxGeneration + 1,
      pendingMatches: pendingMatches || 0,
      linkedPercentage: totalPersons > 0 
        ? Math.round(((relationsCount || 0) / totalPersons) * 100)
        : 0
    };
  } catch (err) {
    console.error('❌ خطأ في جلب الإحصائيات:', err);
    return {};
  }
}

/**
 * الحصول على شجرة النسب لشخص معين
 */
export async function getPersonLineage(tribeId, personId) {
  try {
    const lineage = [];
    let currentId = personId;
    const visited = new Set();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      
      // جلب الشخص الحالي
      const { data: person } = await supabase
        .from('persons')
        .select('*')
        .eq('id', currentId)
        .single();
      
      if (!person) break;
      
      lineage.unshift(person);
      
      // البحث عن الوالد
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
    console.error('❌ خطأ في جلب النسب:', err);
    return [];
  }
}

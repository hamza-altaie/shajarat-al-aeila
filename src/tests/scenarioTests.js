// src/tests/scenarioTests.js
// اختبارات السيناريوهات المختلفة لنظام ربط العائلات

import { calculateSimilarity, matchPersons } from '../services/personMatcher.js';

/**
 * 🧪 سيناريوهات الاختبار للكشف عن الأخطاء المحتملة
 */

// ============================================================
// 🔴 سيناريو 1: الأسماء المتشابهة جداً لأشخاص مختلفين
// ============================================================
export function testScenario1_SimilarNamesDifferentPersons() {
  console.log('\n🔴 اختبار سيناريو 1: أسماء متشابهة لأشخاص مختلفين');
  
  // مشكلة: محمد علي أحمد الطائي (من بغداد) vs محمد علي أحمد الطائي (من البصرة)
  const person1 = {
    first_name: 'محمد',
    father_name: 'علي',
    grandfather_name: 'أحمد',
    family_name: 'الطائي',
    birth_date: '1990-01-01' // 34 سنة
  };
  
  const person2 = {
    first_name: 'محمد',
    father_name: 'علي',
    grandfather_name: 'أحمد',
    family_name: 'الطائي',
    birth_date: '1985-01-01' // 39 سنة - مختلف!
  };
  
  const similarity = matchPersons(person1, person2);
  console.log(`  التشابه: ${similarity}%`);
  
  if (similarity >= 85) {
    console.log('  ⚠️ خطر: قد يتم ربطهما كشخص واحد رغم أنهما مختلفان!');
    console.log('  💡 الحل: يجب إضافة تاريخ الميلاد كعامل تمييز');
    return { passed: false, issue: 'missing_birthdate_check' };
  }
  
  return { passed: true };
}

// ============================================================
// 🔴 سيناريو 2: الحلقات المغلقة (Circular References)
// ============================================================
export function testScenario2_CircularRelations() {
  console.log('\n🔴 اختبار سيناريو 2: الحلقات المغلقة');
  
  // مشكلة: A والد B و B والد A (مستحيل!)
  const relations = [
    { parent_id: 1, child_id: 2 }, // أحمد والد محمد
    { parent_id: 2, child_id: 1 }, // محمد والد أحمد?! خطأ!
  ];
  
  // كشف الحلقات
  function detectCircle(relations) {
    const graph = new Map();
    for (const rel of relations) {
      if (!graph.has(rel.parent_id)) graph.set(rel.parent_id, []);
      graph.get(rel.parent_id).push(rel.child_id);
    }
    
    const visited = new Set();
    const path = new Set();
    
    function dfs(node) {
      if (path.has(node)) return true; // وجدنا حلقة!
      if (visited.has(node)) return false;
      
      visited.add(node);
      path.add(node);
      
      for (const child of (graph.get(node) || [])) {
        if (dfs(child)) return true;
      }
      
      path.delete(node);
      return false;
    }
    
    for (const [node] of graph) {
      if (dfs(node)) return true;
    }
    return false;
  }
  
  const hasCircle = detectCircle(relations);
  console.log(`  يوجد حلقة: ${hasCircle ? '⚠️ نعم!' : '✅ لا'}`);
  
  if (hasCircle) {
    console.log('  💡 الحل: يجب إضافة فحص الحلقات قبل إنشاء العلاقة');
    return { passed: false, issue: 'circular_reference' };
  }
  
  return { passed: true };
}

// ============================================================
// 🔴 سيناريو 3: اختلاف طريقة كتابة الأسماء
// ============================================================
export function testScenario3_NameVariations() {
  console.log('\n🔴 اختبار سيناريو 3: اختلاف كتابة الأسماء');
  
  const variations = [
    ['عبدالقادر', 'عبد القادر'],
    ['محمد', 'محمّد'],
    ['أحمد', 'احمد'],
    ['عبدالله', 'عبد الله'],
    ['فاطمة', 'فاطمه'],
    ['على', 'علي'],
    ['مصطفى', 'مصطفي'],
  ];
  
  let allPassed = true;
  
  for (const [name1, name2] of variations) {
    const similarity = calculateSimilarity(name1, name2);
    const passed = similarity >= 85;
    
    console.log(`  "${name1}" vs "${name2}": ${similarity}% ${passed ? '✅' : '❌'}`);
    
    if (!passed) {
      allPassed = false;
    }
  }
  
  if (!allPassed) {
    console.log('  💡 الحل: تحسين دالة تطبيع النص العربي');
    return { passed: false, issue: 'name_normalization' };
  }
  
  return { passed: true };
}

// ============================================================
// 🔴 سيناريو 4: الوالد المفقود
// ============================================================
export function testScenario4_MissingParent() {
  console.log('\n🔴 اختبار سيناريو 4: الوالد المفقود');
  
  // مشكلة: المستخدم يضيف ابنه قبل أن يضيف نفسه
  const scenario = {
    step1: 'المستخدم يضيف ابنه "حسن محمد" بعلاقة "ابن"',
    step2: 'لكن المستخدم لم يضف نفسه بعد!',
    result: 'الابن يبقى بدون والد في الشجرة'
  };
  
  console.log(`  الخطوة 1: ${scenario.step1}`);
  console.log(`  الخطوة 2: ${scenario.step2}`);
  console.log(`  النتيجة: ${scenario.result}`);
  console.log('  💡 الحل: إجبار المستخدم على إضافة نفسه أولاً');
  
  return { passed: false, issue: 'missing_self_registration' };
}

// ============================================================
// 🔴 سيناريو 5: ربط خاطئ بسبب تشابه الأسماء
// ============================================================
export function testScenario5_WrongLinking() {
  console.log('\n🔴 اختبار سيناريو 5: الربط الخاطئ');
  
  // مشكلة: عبدالقادر محمود (الجد) vs عبدالقادر محمود (حفيد آخر بنفس الاسم)
  const grandfather = {
    id: 1,
    first_name: 'عبدالقادر',
    father_name: 'محمود',
    grandfather_name: 'أحمد',
    generation: 1
  };
  
  const grandchild = {
    id: 50,
    first_name: 'عبدالقادر',
    father_name: 'محمود', // سمي على جده!
    grandfather_name: 'علي',
    generation: 4
  };
  
  const similarity = matchPersons(grandfather, grandchild);
  console.log(`  التشابه بين الجد والحفيد: ${similarity}%`);
  
  // الفرق في الجيل كبير!
  const generationDiff = Math.abs(grandfather.generation - grandchild.generation);
  console.log(`  فرق الأجيال: ${generationDiff}`);
  
  if (similarity >= 85 && generationDiff > 1) {
    console.log('  ⚠️ خطر: قد يتم ربطهما رغم فرق الأجيال الكبير!');
    console.log('  💡 الحل: إضافة فحص فرق الأجيال قبل الربط');
    return { passed: false, issue: 'generation_gap_not_checked' };
  }
  
  return { passed: true };
}

// ============================================================
// 🔴 سيناريو 6: الأخوة بدون والد مشترك
// ============================================================
export function testScenario6_SiblingsWithoutParent() {
  console.log('\n🔴 اختبار سيناريو 6: الأخوة بدون والد');
  
  // مشكلة: أخان يُضافان لكن والدهما غير موجود
  // const brotherOne = {
  //   first_name: 'علي',
  //   father_name: 'محمود',
  //   relation: 'أنا'
  // };
  
  // const brotherTwo = {
  //   first_name: 'حسين',
  //   father_name: 'محمود',
  //   relation: 'أخ'
  // };
  
  console.log('  علي يضيف أخاه حسين');
  console.log('  كلاهما والدهما "محمود" لكن محمود غير موجود في الشجرة');
  console.log('  💡 الحل: إنشاء "والد افتراضي" تلقائياً عند إضافة الأخ');
  
  return { passed: false, issue: 'siblings_without_parent' };
}

// ============================================================
// 🔴 سيناريو 7: تكرار الشخص من مستخدمين مختلفين
// ============================================================
export function testScenario7_DuplicateFromDifferentUsers() {
  console.log('\n🔴 اختبار سيناريو 7: تكرار من مستخدمين مختلفين');
  
  // المستخدم 1 يضيف جده
  const grandpa_user1 = {
    first_name: 'محمود',
    father_name: 'أحمد',
    family_name: 'الطائي',
    created_by: 'user_1'
  };
  
  // المستخدم 2 (ابن عم) يضيف نفس الجد
  const grandpa_user2 = {
    first_name: 'محمود',
    father_name: 'احمد', // بدون همزة
    family_name: 'الطائي',
    created_by: 'user_2'
  };
  
  const similarity = matchPersons(grandpa_user1, grandpa_user2);
  console.log(`  التشابه: ${similarity}%`);
  
  if (similarity >= 85) {
    console.log('  ✅ سيتم اكتشافه كتكرار');
    return { passed: true };
  } else {
    console.log('  ⚠️ قد لا يتم اكتشافه كتكرار!');
    return { passed: false, issue: 'duplicate_not_detected' };
  }
}

// ============================================================
// 🔴 سيناريو 8: الجيل المقلوب
// ============================================================
export function testScenario8_InvertedGeneration() {
  console.log('\n🔴 اختبار سيناريو 8: الجيل المقلوب');
  
  // مشكلة: الابن يُضاف بجيل أقل من والده!
  const father = { id: 1, first_name: 'محمد', generation: 3 };
  const son = { id: 2, first_name: 'علي', father_name: 'محمد', generation: 2 }; // خطأ!
  
  if (son.generation <= father.generation) {
    console.log('  ⚠️ خطأ: جيل الابن أقل من أو يساوي جيل الأب!');
    console.log('  💡 الحل: حساب الجيل تلقائياً من علاقة الأب');
    return { passed: false, issue: 'inverted_generation' };
  }
  
  return { passed: true };
}

// ============================================================
// 🟢 تشغيل جميع الاختبارات
// ============================================================
export function runAllScenarioTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 بدء اختبارات السيناريوهات للكشف عن الأخطاء المحتملة');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = [];
  
  results.push({ name: 'أسماء متشابهة لأشخاص مختلفين', ...testScenario1_SimilarNamesDifferentPersons() });
  results.push({ name: 'الحلقات المغلقة', ...testScenario2_CircularRelations() });
  results.push({ name: 'اختلاف كتابة الأسماء', ...testScenario3_NameVariations() });
  results.push({ name: 'الوالد المفقود', ...testScenario4_MissingParent() });
  results.push({ name: 'الربط الخاطئ', ...testScenario5_WrongLinking() });
  results.push({ name: 'الأخوة بدون والد', ...testScenario6_SiblingsWithoutParent() });
  results.push({ name: 'تكرار من مستخدمين مختلفين', ...testScenario7_DuplicateFromDifferentUsers() });
  results.push({ name: 'الجيل المقلوب', ...testScenario8_InvertedGeneration() });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 ملخص النتائج:');
  console.log('═══════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  
  console.log(`\n✅ نجح: ${passed.length}/${results.length}`);
  console.log(`❌ فشل: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n🔧 المشاكل التي تحتاج إصلاح:');
    failed.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}: ${f.issue}`);
    });
  }
  
  return { passed: passed.length, failed: failed.length, results };
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (typeof window !== 'undefined') {
  window.runScenarioTests = runAllScenarioTests;
}

export default runAllScenarioTests;

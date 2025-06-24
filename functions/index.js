/* eslint-env node */

// إصلاح أخطاء no-undef
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp();
const db = getFirestore();

// ======================================================
// 🎯 دالة ترحيب واختبار الاتصال
// ======================================================
exports.helloWorld = onRequest(
  {
    cors: true,
    region: "us-central1"
  },
  (request, response) => {
    response.json({
      message: "مرحباً من شجرة العائلة المتقدمة! 🌳",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      status: "success",
      features: [
        "إدارة العائلة المتقدمة",
        "البحث الذكي",
        "الإحصائيات التفاعلية",
        "الروابط التلقائية"
      ]
    });
  }
);

// ======================================================
// 👥 معالجة إضافة عضو جديد للعائلة
// ======================================================
exports.onFamilyMemberAdded = onDocumentCreated(
  {
    document: "users/{userId}/family/{memberId}",
    region: "us-central1"
  },
  async (event) => {
    const { userId, memberId } = event.params;
    const memberData = event.data?.data();

    if (!memberData) return;

    try {
      console.log(`✅ إضافة عضو جديد: ${memberData.firstName} في عائلة ${userId}`);

      // تحديث إحصائيات العائلة
      await updateFamilyStatistics(userId);

      // إنشاء فهرس البحث
      await createSearchIndex(userId, memberId, memberData);

      // البحث عن روابط تلقائية
      await findAutoConnections(userId, memberData);

      // تسجيل النشاط
      await logActivity(userId, "family_member_added", {
        memberId,
        memberName: memberData.firstName,
        relation: memberData.relation
      });

      console.log(`🎉 تمت معالجة إضافة العضو بنجاح`);

    } catch (error) {
      console.error("❌ خطأ في معالجة إضافة العضو:", error);
      await logError(userId, "family_member_add_error", error);
    }
  }
);

// ======================================================
// 📊 تحديث إحصائيات العائلة تلقائياً
// ======================================================
async function updateFamilyStatistics(userId) {
  try {
    // جلب جميع أعضاء العائلة
    const familySnapshot = await db.collection(`users/${userId}/family`).get();
    const members = familySnapshot.docs.map(doc => doc.data());

    // حساب الإحصائيات
    const stats = {
      totalMembers: members.length,
      maleCount: members.filter(m => m.gender === 'male').length,
      femaleCount: members.filter(m => m.gender === 'female').length,
      unknownGender: members.filter(m => !m.gender || m.gender === 'unknown').length,

      // توزيع العلاقات
      relations: {},

      // توزيع الأجيال
      generations: {},

      // إحصائيات متقدمة
      averageAge: calculateAverageAge(members),
      membersWithPhotos: members.filter(m => m.avatar && m.avatar !== '/boy.png').length,
      membersWithBirthDates: members.filter(m => m.birthDate).length,

      // تواريخ مهمة
      lastUpdated: FieldValue.serverTimestamp(),
      oldestMember: findOldestMember(members),
      youngestMember: findYoungestMember(members)
    };

    // حساب توزيع العلاقات
    members.forEach(member => {
      const relation = member.relation || 'غير محدد';
      stats.relations[relation] = (stats.relations[relation] || 0) + 1;
    });

    // حساب توزيع الأجيال
    members.forEach(member => {
      const generation = member.generation || 0;
      stats.generations[generation] = (stats.generations[generation] || 0) + 1;
    });

    // حفظ الإحصائيات
    await db.doc(`analytics/${userId}`).set({
      familyStats: stats,
      lastCalculated: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`📊 تم تحديث إحصائيات العائلة ${userId}`);

  } catch (error) {
    console.error('❌ خطأ في تحديث الإحصائيات:', error);
    throw error;
  }
}

// ======================================================
// 🔍 إنشاء فهرس البحث المتقدم
// ======================================================
async function createSearchIndex(userId, memberId, memberData) {
  try {
    // تجهيز نصوص البحث
    const searchTerms = [
      memberData.firstName,
      memberData.fatherName,
      memberData.grandfatherName,
      memberData.surname,
      memberData.relation
    ].filter(Boolean).join(' ').toLowerCase();

    // إنشاء كلمات البحث
    const searchWords = searchTerms.split(/\s+/).filter(word => word.length > 1);

    // إنشاء n-grams للبحث الضبابي
    const ngrams = [];
    searchWords.forEach(word => {
      for (let i = 0; i < word.length - 1; i++) {
        for (let j = i + 2; j <= word.length; j++) {
          ngrams.push(word.substring(i, j));
        }
      }
    });

    const searchIndexData = {
      userId,
      memberId,
      fullName: searchTerms,
      searchWords,
      ngrams: [...new Set(ngrams)],
      relation: memberData.relation,
      generation: memberData.generation || 0,
      hasPhoto: !!(memberData.avatar && memberData.avatar !== '/boy.png'),
      hasBirthDate: !!memberData.birthDate,
      createdAt: FieldValue.serverTimestamp()
    };

    // حفظ فهرس البحث
    await db.doc(`search_index/${userId}_${memberId}`).set(searchIndexData);

    console.log(`🔍 تم إنشاء فهرس البحث للعضو ${memberData.firstName}`);

  } catch (error) {
    console.error('❌ خطأ في إنشاء فهرس البحث:', error);
  }
}

// ======================================================
// 🔗 البحث عن الروابط التلقائية
// ======================================================
async function findAutoConnections(userId, memberData) {
  try {
    // البحث عن أشخاص مشابهين في عائلات أخرى
    const searchQuery = db.collection('search_index')
      .where('fullName', '>=', memberData.firstName.toLowerCase())
      .where('fullName', '<=', memberData.firstName.toLowerCase() + '\uf8ff')
      .where('userId', '!=', userId)
      .limit(10);

    const similarPersons = await searchQuery.get();

    for (const doc of similarPersons.docs) {
      const similarPerson = doc.data();

      // حساب درجة التشابه
      const similarity = calculateSimilarity(memberData, similarPerson);

      if (similarity > 0.7) {
        // إنشاء اقتراح رابط
        await createConnectionSuggestion(userId, similarPerson.userId, {
          person1: {
            id: memberData.id,
            name: memberData.firstName,
            relation: memberData.relation
          },
          person2: {
            id: similarPerson.memberId,
            name: similarPerson.fullName,
            relation: similarPerson.relation
          },
          similarity,
          type: 'name_similarity',
          status: 'pending'
        });
      }
    }

  } catch (error) {
    console.error('❌ خطأ في البحث عن الروابط:', error);
  }
}

// ======================================================
// 📱 دالة البحث المتقدم عبر HTTP
// ======================================================
exports.advancedSearch = onCall(
  {
    region: "us-central1",
    cors: true
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new Error("غير مصرح");
    }

    try {
      const { query, filters = {}, limit = 20 } = data;
      const userId = auth.uid;

      if (!query || query.trim().length < 2) {
        throw new Error("نص البحث قصير جداً");
      }

      console.log(`🔍 بحث متقدم من ${userId}: "${query}"`);

      // بناء استعلام البحث
      let searchQuery = db.collection("search_index")
        .where("searchWords", "array-contains-any", query.toLowerCase().split(" "))
        .limit(limit);

      // تطبيق الفلاتر
      if (filters.relation) {
        searchQuery = searchQuery.where("relation", "==", filters.relation);
      }

      if (filters.generation !== undefined) {
        searchQuery = searchQuery.where("generation", "==", filters.generation);
      }

      if (filters.hasPhoto !== undefined) {
        searchQuery = searchQuery.where("hasPhoto", "==", filters.hasPhoto);
      }

      const results = await searchQuery.get();

      // معالجة النتائج وحساب درجة التطابق
      const processedResults = results.docs.map(doc => {
        const data = doc.data();
        const relevanceScore = calculateRelevance(query, data);

        return {
          ...data,
          relevanceScore,
          id: doc.id
        };
      });

      // ترتيب حسب الصلة
      processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return {
        results: processedResults,
        totalFound: processedResults.length,
        query
      };

    } catch (error) {
      console.error("❌ خطأ في البحث المتقدم:", error);
      throw new Error("خطأ في البحث");
    }
  }
);

// ======================================================
// 📊 دالة الحصول على إحصائيات العائلة المتقدمة
// ======================================================
exports.getFamilyStats = onCall(
  {
    region: "us-central1",
    cors: true
  },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new Error('غير مصرح');
    }

    try {
      const userId = auth.uid;

      // جلب الإحصائيات المحفوظة
      const statsDoc = await db.doc(`analytics/${userId}`).get();

      if (statsDoc.exists()) {
        return {
          success: true,
          stats: statsDoc.data(),
          cached: true
        };
      }

      // إذا لم توجد، احسبها مباشرة
      await updateFamilyStatistics(userId);
      const updatedStatsDoc = await db.doc(`analytics/${userId}`).get();

      return {
        success: true,
        stats: updatedStatsDoc.data(),
        cached: false
      };

    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error);
      throw new Error('خطأ في جلب الإحصائيات');
    }
  }
);

// ======================================================
// 🔗 دالة اقتراح الروابط الذكية
// ======================================================
exports.suggestConnections = onCall(
  {
    region: "us-central1",
    cors: true
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new Error('غير مصرح');
    }

    try {
      const userId = auth.uid;
      const { memberId } = data;

      // الحصول على بيانات العضو
      const memberDoc = await db.doc(`users/${userId}/family/${memberId}`).get();
      if (!memberDoc.exists()) {
        throw new Error('العضو غير موجود');
      }

      const memberData = memberDoc.data();

      // البحث عن اقتراحات الروابط
      const suggestions = await findConnectionSuggestions(memberData, userId);

      return {
        suggestions,
        memberName: memberData.firstName
      };

    } catch (error) {
      console.error('❌ خطأ في اقتراح الروابط:', error);
      throw new Error('خطأ في اقتراح الروابط');
    }
  }
);

// ======================================================
// 🧹 تنظيف البيانات المنتهية الصلاحية (مجدولة)
// ======================================================
exports.cleanupExpiredData = onSchedule(
  {
    schedule: "0 2 * * *", // كل يوم في الساعة 2 صباحاً
    region: "us-central1",
    timeZone: "Asia/Baghdad"
  },
  async () => {
    try {
      console.log('🧹 بدء تنظيف البيانات المنتهية الصلاحية');

      const now = FieldValue.serverTimestamp();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // تنظيف ذاكرة التخزين المؤقت
      const expiredCacheQuery = db.collectionGroup('cache')
        .where('expiresAt', '<', now)
        .limit(100);

      const expiredCache = await expiredCacheQuery.get();
      const deleteCachePromises = expiredCache.docs.map(doc => doc.ref.delete());
      await Promise.all(deleteCachePromises);

      // تنظيف الجلسات القديمة
      const oldSessionsQuery = db.collectionGroup('sessions')
        .where('lastActivity', '<', oneDayAgo)
        .where('isActive', '==', false)
        .limit(100);

      const oldSessions = await oldSessionsQuery.get();
      const deleteSessionPromises = oldSessions.docs.map(doc => doc.ref.delete());
      await Promise.all(deleteSessionPromises);

      console.log(`✅ تم تنظيف ${expiredCache.size} ملف مؤقت، ${oldSessions.size} جلسة`);

    } catch (error) {
      console.error('❌ خطأ في التنظيف:', error);
    }
  }
);

// ======================================================
// 🛠️ دوال مساعدة
// ======================================================

function calculateAverageAge(members) {
  const membersWithAge = members.filter(m => m.birthDate);
  if (membersWithAge.length === 0) return 0;

  const totalAge = membersWithAge.reduce((sum, member) => {
    const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
    return sum + age;
  }, 0);

  return Math.round(totalAge / membersWithAge.length);
}

function findOldestMember(members) {
  const membersWithAge = members.filter(m => m.birthDate);
  if (membersWithAge.length === 0) return null;

  return membersWithAge.reduce((oldest, member) => {
    const memberDate = new Date(member.birthDate);
    const oldestDate = new Date(oldest.birthDate);
    return memberDate < oldestDate ? member : oldest;
  });
}

function findYoungestMember(members) {
  const membersWithAge = members.filter(m => m.birthDate);
  if (membersWithAge.length === 0) return null;

  return membersWithAge.reduce((youngest, member) => {
    const memberDate = new Date(member.birthDate);
    const youngestDate = new Date(youngest.birthDate);
    return memberDate > youngestDate ? member : youngest;
  });
}

function calculateSimilarity(person1, person2) {
  let score = 0;
  const person2Name = person2.fullName.toLowerCase();

  // تطابق الاسم الأول
  if (person1.firstName.toLowerCase() === person2Name.split(' ')[0]) {
    score += 0.4;
  }

  // تطابق اسم الأب
  if (person1.fatherName && person2Name.includes(person1.fatherName.toLowerCase())) {
    score += 0.3;
  }

  // تطابق العلاقة
  if (person1.relation === person2.relation) {
    score += 0.2;
  }

  // تطابق الجيل
  if (person1.generation === person2.generation) {
    score += 0.1;
  }

  return score;
}

function calculateRelevance(query, searchData) {
  const queryWords = query.toLowerCase().split(' ');
  let score = 0;

  queryWords.forEach(word => {
    if (searchData.fullName.includes(word)) {
      score += 10;
    }
    if (searchData.searchWords.includes(word)) {
      score += 5;
    }
    if (searchData.ngrams.some(ngram => ngram.includes(word))) {
      score += 2;
    }
  });

  return score;
}

async function createConnectionSuggestion(family1Id, family2Id, connectionData) {
  try {
    const connectionId = `${family1Id}_${family2Id}_${Date.now()}`;

    await db.doc(`connection_suggestions/${connectionId}`).set({
      family1Id,
      family2Id,
      ...connectionData,
      createdAt: FieldValue.serverTimestamp(),
      reviewed: false
    });

    console.log(`🔗 تم إنشاء اقتراح رابط بين ${family1Id} و ${family2Id}`);

  } catch (error) {
    console.error('❌ خطأ في إنشاء اقتراح الرابط:', error);
  }
}

async function findConnectionSuggestions(memberData, excludeUserId) {
  const suggestions = [];

  try {
    // البحث بالاسم المشابه
    const nameQuery = db.collection('search_index')
      .where('searchWords', 'array-contains', memberData.firstName.toLowerCase())
      .where('userId', '!=', excludeUserId)
      .limit(10);

    const nameResults = await nameQuery.get();

    nameResults.docs.forEach(doc => {
      const data = doc.data();
      const similarity = calculateSimilarity(memberData, data);

      if (similarity > 0.5) {
        suggestions.push({
          type: 'name_similarity',
          score: similarity,
          suggestion: data,
          reason: 'تشابه في الاسم'
        });
      }
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);

  } catch (error) {
    console.error('❌ خطأ في البحث عن اقتراحات:', error);
    return [];
  }
}

async function logActivity(userId, action, details = {}) {
  try {
    await db.collection(`audit_logs/${userId}/logs`).add({
      action,
      details,
      timestamp: FieldValue.serverTimestamp(),
      userId
    });
  } catch (error) {
    console.error('خطأ في تسجيل النشاط:', error);
  }
}

async function logError(userId, errorType, error) {
  try {
    await db.collection(`error_logs`).add({
      userId,
      errorType,
      message: error.message,
      stack: error.stack,
      timestamp: FieldValue.serverTimestamp()
    });
  } catch (logError) {
    console.error('خطأ في تسجيل الخطأ:', logError);
  }
}

console.log('🚀 Cloud Functions لشجرة العائلة جاهزة!');
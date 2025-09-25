// src/services/tribeService.js
// ملاحظة هامة (تنظيف الكود):
// هذا الملف غير مستخدم حالياً في أي جزء من التطبيق (لا توجد عمليات استيراد له حسب البحث).
// احتفظنا به لأنه يمثل نواة مبدئية لتكامل مستقبلي مع "شجرة القبيلة الموحدة".
// إن لم يكن التكامل مطلوباً يمكن حذفه لتقليل الحجم. ضع في الاعتبار نقله إلى docs/ أو إنشاء فرع منفصل.
// -------------------------------------------------------------------------
// هيكل خدمة مبدئي للتكامل مع شجرة القبيلة الموحدة (Bani Lam)
// لا يغير سلوك التطبيق الحالي، بل يقدم واجهات يمكن ربطها لاحقًا.

import { db } from '@/firebase/config';
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, serverTimestamp
} from 'firebase/firestore';

const TRIBE_ID = 'bani-lam'; // يمكن جعله قابلاً للتهيئة من env لاحقًا

const personsCol = () => collection(db, 'tribes', TRIBE_ID, 'persons');
const claimsCol = () => collection(db, 'tribes', TRIBE_ID, 'claims');
const mergesCol = () => collection(db, 'tribes', TRIBE_ID, 'merge_proposals');

const normalizeName = (s) => (s || '').toString().trim();

const buildLineageKey = ({ firstName, fatherName, surname }) =>
  [firstName, fatherName, surname]
    .map(normalizeName)
    .filter(Boolean)
    .join('|')
    .toLowerCase();

const tribeService = {
  // بحث أساسي بالاسم/اللقب (يمكن تحسينه لاحقًا باستخدام ngrams)
  async searchPersons({ term, limit = 20 }) {
    const t = (term || '').toString().trim().toLowerCase();
    if (!t || t.length < 2) return [];

    const q = query(personsCol(), where('searchWords', 'array-contains', t));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results.slice(0, Math.max(1, Math.min(100, limit)));
  },

  // إضافة شخص جديد (يُفترض أن الواجهة تضيف المالك uid ضمن Cloud Function لاحقًا)
  async addPerson(uid, data) {
    const payload = {
      firstName: normalizeName(data.firstName),
      fatherName: normalizeName(data.fatherName),
      grandfatherName: normalizeName(data.grandfatherName),
      surname: normalizeName(data.surname),
      birthdate: data.birthdate || '',
      gender: data.gender || 'unknown',
      spouseIds: [],
      parentIds: data.parentIds || [],
      ownerUids: [uid],
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lineageKey: buildLineageKey(data),
      searchWords: [
        normalizeName(data.firstName).toLowerCase(),
        normalizeName(data.fatherName).toLowerCase(),
        normalizeName(data.surname).toLowerCase()
      ].filter(Boolean)
    };

    const ref = await addDoc(personsCol(), payload);
    return { id: ref.id, ...payload };
  },

  // إضافة ابن/ابنة لشخص موجود (ينشئ الطفل ويربط parentIds)
  async addChild(uid, parentId, childData) {
    const child = await this.addPerson(uid, childData);
    const parentRef = doc(db, 'tribes', TRIBE_ID, 'persons', parentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) return child;

    // تعيين parentIds للطفل
    await setDoc(doc(db, 'tribes', TRIBE_ID, 'persons', child.id), {
      parentIds: [parentId]
    }, { merge: true });

    return child;
  },

  // إنشاء مطالبة ملكية لشخص قائم
  async claimPerson(uid, personId) {
    const ref = await addDoc(claimsCol(), {
      personId,
      uid,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    return { id: ref.id };
  },

  // اقتراح دمج سجلين
  async proposeMerge(uid, personIdA, personIdB, reason = '') {
    const ref = await addDoc(mergesCol(), {
      personIdA,
      personIdB,
      proposerUid: uid,
      reason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    return { id: ref.id };
  },
};

export default tribeService;

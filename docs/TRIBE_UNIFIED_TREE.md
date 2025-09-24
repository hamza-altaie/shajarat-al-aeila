# شجرة موحدة لقبيلة بني لام

هذا المستند يضع خطة تنفيذ عملية لبناء شجرة موحدة لقبيلة بني لام بحيث يستطيع أي شخص إنشاء حسابه وإضافة نفسه وأولاده، مع دمج الكل في شجرة واحدة تشمل جميع الحسابات، مع ضوابط أمان ومراقبة ومقترحات دمج لتفادي التكرار.

## الأهداف
- تمثيل موحّد لكل أفراد القبيلة عبر مستودع مركزي للأشخاص.
- تمكين أي مستخدم مصادق (Firebase Auth) من:
  - إضافة نفسه وأولاده.
  - المطالبة (Claim) بملكية سجل شخص موجود.
  - اقتراح دمج سجلات مكررة.
- أدوار إدارية (مشرفين) للموافقة على الدمج وربط السجلات الحساسة.
- قواعد أمان دقيقة تمنع العبث وتحمي البيانات.

---

## نموذج البيانات (Firestore)
هيكل جديد إلى جانب بنية المستخدم الحالية، لدعم الشجرة الموحّدة:

```
tribes/{tribeId}
  - name, createdAt, updatedAt
  persons/{personId}
    - firstName, fatherName, grandfatherName, surname
    - birthdate, gender
    - lineageKey: string  # مفتاح قرابة قياسي اختياري (firstName+fatherName+surname)
    - parentIds: string[] # (اختياري: [fatherId, motherId])
    - spouseIds: string[]
    - ownerUids: string[] # المستخدمون الذين “يدّعون” هذا السجل
    - createdBy: uid
    - createdAt, updatedAt
    - searchWords: string[] / ngrams: string[]
  roles/{uid}
    - role: 'member' | 'moderator' | 'admin'
    - grantedAt
  claims/{claimId}
    - personId, uid, status: 'pending'|'approved'|'rejected'
    - createdAt, decidedAt, decidedBy
  merge_proposals/{mergeId}
    - personIdA, personIdB, proposerUid
    - reason, status: 'pending'|'approved'|'rejected'
    - createdAt, decidedAt, decidedBy
  logs/{logId}
    - type, uid, payload, timestamp
```

- `tribeId`: ثابت مثل `bani-lam`.
- `persons`: الكيان الأساسي لكل شخص في القبيلة، بعلاقات مرجعية (IDs) بدل التكرار.
- `ownerUids`: يمكّن من ضبط من يملك حق تعديل سجل الشخص (بعد الموافقة إن لزم).
- `claims` و`merge_proposals`: لسير العمل (workflows) بإشراف المشرفين.

فهرس مقترح:
- على `persons.searchWords` (array-contains) و/أو `ngrams` لتحسين البحث.
- على `claims.status`, `merge_proposals.status`.

---

## سير العمل (Workflows)

1) إضافة شخص جديد
- الواجهة تستدعي tribeService.addPerson(tribeId, personData)
- يُنشأ سجل في `tribes/{tribeId}/persons` مع `createdBy=uid` و`ownerUids=[uid]`.

2) إضافة أبناء
- استدعاء tribeService.addChild(tribeId, parentId, childData)
- ينشئ شخصًا جديدًا للابن (إن لم يكن موجودًا)، ويربطه في `parentIds`.

3) المطالبة بسجل موجود
- إذا وجد المستخدم شخصًا موجودًا يطابق بياناته، يطلب `claimPerson(personId)` → إنشاء سجل في `claims` status=pending.
- مشرف يراجع ويقرّر: عند الموافقة يُضاف uid إلى `ownerUids` للشخص.

4) اقتراح دمج سجلات مكررة
- المستخدم يقترح دمج `personIdA` و`personIdB` → سجل في `merge_proposals`.
- مشرف يوافق: Cloud Function تدمج السجلات (تنقل المراجع, توحّد الحقول, تحفظ backup)، وتحدّث العلاقات.

5) ربط شجر المستخدمين الخاصة
- هجرة تدريجية: سكربت/Cloud Function تقوم بإنشاء/مطابقة `persons` من `users/{uid}/family` باستخدام مفتاح نسب بسيط (firstName + fatherName + surname)، وتفتح `merge_proposals` بدل الدمج التلقائي.

---

## الواجهة (UI/UX) – خطوات بسيطة
- اختيار وضع "القبيلة" من شاشة رئيسية: (حسابي فقط) أو (شجرة القبيلة).
- شاشة بحث موحّدة عن أشخاص القبيلة (الاسم/اللقب/اسم الأب).
- زر "أنا هذا الشخص" → يرسل Claim.
- زر "إضافة ابن/ابنة" عند أي شخص تملكه أو سمح به المشرف.
- شاشة للاقتراحات: دمج مزدوج، روابط محتملة للأب/الأم، يشرف عليها Moderator.

---

## القواعد الأمنية المقترحة (ملخّص)
- القراءة:
  - allow read على `tribes/{tribeId}/persons/*` للمستخدمين المصادقين (أو عامةً إن رغبت).
- الكتابة:
  - إنشاء person: للمستخدمين المصادقين.
  - تحديث person: فقط إن `request.auth.uid in resource.data.ownerUids` أو كان Moderator/Admin.
  - تحديث الحقول الحساسة (parentIds/spouseIds): يقتصر على المالك/المشرفين.
  - claims/merge_proposals: يستطيع أي مصادق الإنشاء، لكن approve/reject للمشرفين فقط.
  - roles: إدارة من Admin فقط.

سيتم توثيق قواعد تفصيلية لاحقًا وتوحيدها مع القواعد الحالية.

---

## وظائف سحابية (تصميم واجهة)
- callable: `tribe_addPerson`, `tribe_claimPerson`, `tribe_proposeMerge`, `tribe_approveMerge`, `tribe_search`.
- مشفوع بـ Admin SDK للعمليات الحساسة (دمج، منح أدوار، قبول مطالبات).
- سجلات نشاط `logs` لمراقبة وتدقيق.

---

## خطة طرح تدريجية
1) المرحلة 1 (سريعة):
- إنشاء مجموعات `tribes/{tribeId}/persons` وإتاحة إضافة أشخاص جدد وقراءتهم.
- واجهة بحث وإضافة أبناء.
- قواعد أمان أولية (إنشاء فقط، تحديث محدود للمالك).

2) المرحلة 2:
- المطالبات (claims) + أدوار (roles) + واجهة للمشرفين.

3) المرحلة 3:
- اقتراح ودمج (merge_proposals) بإدارة المشرفين، مع Cloud Functions.

4) المرحلة 4:
- هجرة/مطابقة من أشجار المستخدمين الخاصة إلى الشجرة الموحدة.

---

## اعتبارات الأمان والجودة
- App Check لحماية واجهات Firebase.
- معدلات/قيود (Rate limiting) على وظائف claim/merge.
- تدقيق إدخال الأسماء والتواريخ على الواجهة والخادم.
- نسخ احتياطي عند الدمج واستراتيجية تراجع.

---

## نقاط التكامل الحالية
- لا تغييرات كاسرة على واجهة المستخدم الحالية.
- خدمة `tribeService` ستُضاف تدريجيًا ويمكن استدعاؤها من صفحات جديدة (مثل "شجرة القبيلة").

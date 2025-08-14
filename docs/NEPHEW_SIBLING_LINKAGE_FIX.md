# إصلاح ربط أولاد الأشقاء بآبائهم الصحيحين

## المشكلة الأصلية
كان أولاد الأشقاء (أبناء الأخ/الأخت) يتم ربطهم بشكل عشوائي أو بناءً على موقع صاحب الحساب، وليس بآبائهم الصحيحين.

## الحل المطبق

### 1. إنشاء نظام ربط ذكي
```javascript
// إضافة معلومات الأبوة لكل ابن أخ
parentName: nephew.fatherName, // اسم الأب (الأخ)
parentRelation: 'أخ'

// خريطة ربط كل ابن أخ بأخيه الصحيح
const nephewToSiblingMap = new Map();
```

### 2. دالة مطابقة متقدمة
```javascript
const findMatchingSibling = useCallback((nephewNiece, siblings, rootAttributes) => {
  // مطابقة مباشرة للاسم الأول
  if (siblingFullName.includes(parentName)) return true;
  
  // مطابقة الاسم الكامل
  const expectedFullName = `${parentName} ${fatherName}`.trim();
  if (siblingFullName === expectedFullName) return true;
  
  // مطابقة بالاسم الثلاثي
  const expectedTripleName = `${parentName} ${fatherName} ${grandfatherName}`.trim();
  if (siblingFullName === expectedTripleName) return true;
  
  // مطابقة عكسية
  const siblingFirstName = siblingFullName.split(' ')[0];
  if (siblingFirstName === parentName) return true;
}, []);
```

### 3. تحسين وضع الكارتات
- **قبل الإصلاح**: كان أولاد الأشقاء يوضعون بشكل عشوائي
- **بعد الإصلاح**: كل ابن أخ يوضع تحت أخيه الصحيح مباشرة

```javascript
// العثور على الأخ المرتبط بهذا ابن الأخ
const linkedSiblingId = data.nephewToSiblingMap?.get(nephewNiece.id);

// حساب موقع الأخ المحدد
if (linkedSiblingId && data.siblings) {
  const siblingIndex = data.siblings.findIndex(s => s.id === linkedSiblingId);
  // حساب الموقع الصحيح...
}
```

### 4. رسم خطوط ربط صحيحة
```javascript
// خط ربط مباشر من الأخ إلى ابنه
const siblingBottomY = root.y + cardHeight/2;
drawUnifiedLine(g, parentSiblingX, siblingBottomY, nephewX, nephewY - cardHeight/2, 
  `nephew-to-parent-${index}`, "relative", 1200 + index * 150, 400);

// إضافة تسمية للخط
g.append("text")
  .attr("x", nephewX + 10)
  .attr("y", (siblingBottomY + nephewY - cardHeight/2) / 2)
  .attr("font-size", "10px")
  .attr("fill", "#666")
  .attr("opacity", 0.7)
  .text(`↳ ${nephewNiece.parentRelation}`);
```

### 5. معالجة أطفال متعددين لنفس الأخ
```javascript
// إذا كان للأخ أكثر من طفل، نوزعهم حول موقعه
const siblingChildren = data.nephewsNieces.filter(nn => 
  data.nephewToSiblingMap?.get(nn.id) === linkedSiblingId
);

if (siblingChildren.length > 1) {
  const childIndex = siblingChildren.findIndex(child => child.id === nephewNiece.id);
  const childSpacing = 100; // مسافة بين أطفال نفس الأخ
  const totalChildWidth = (siblingChildren.length - 1) * childSpacing;
  const startChildX = nephewX - totalChildWidth / 2;
  nephewX = startChildX + (childIndex * childSpacing);
}
```

## التحسينات المضافة

### ✅ مطابقة أسماء ذكية
- مطابقة بالاسم الأول
- مطابقة بالاسم الكامل  
- مطابقة بالاسم الثلاثي
- مطابقة عكسية

### ✅ ربط بصري واضح
- خط مباشر من الأخ إلى ابنه
- تسمية توضح نوع العلاقة (أخ/أخت)
- توزيع متوازن للأطفال المتعددين

### ✅ تسجيل تفصيلي
```javascript
console.log(`🔗 ربط ${nephewNiece.name} بـ ${matchingSibling.name}`);
console.warn(`⚠️ لم يتم العثور على أخ مطابق لـ ${nephewNiece.name}`);
```

## النتيجة النهائية

### قبل الإصلاح:
- أولاد الأشقاء مبعثرون
- خطوط ربط خاطئة
- صعوبة فهم العلاقات

### بعد الإصلاح:
- ✅ كل ابن أخ تحت أخيه الصحيح
- ✅ خطوط ربط مباشرة وواضحة
- ✅ تسميات توضح نوع العلاقة
- ✅ توزيع متوازن للأطفال المتعددين
- ✅ مطابقة أسماء ذكية ومتقدمة

## تاريخ التحديث: 14 أغسطس 2025 - 9:20 صباحاً

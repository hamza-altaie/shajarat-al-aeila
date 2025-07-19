const fs = require('fs');

function cleanupESLintErrors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // إصلاح الكتل الفارغة
  content = content
    // إزالة كتل if فارغة
    .replace(/if\s*\([^)]*\)\s*{\s*}/g, '// تم إزالة كتلة if فارغة')
    // إزالة كتل else فارغة
    .replace(/else\s*{\s*}/g, '// تم إزالة كتلة else فارغة')
    // إزالة كتل else if فارغة
    .replace(/else\s+if\s*\([^)]*\)\s*{\s*}/g, '// تم إزالة كتلة else if فارغة');

  // إصلاح المتغيرات غير المستخدمة في forEach
  content = content
    // إزالة index غير مستخدم من forEach
    .replace(/\.forEach\(\(([^,]+),\s*index\s*\)\s*=>/g, '.forEach(($1) =>')
    // إزالة المتغيرات غير المستخدمة الأولى في forEach
    .replace(/\.forEach\(\(([^,\s]+)[^)]*\)\s*=>\s*{\s*}/g, '.forEach(() => {');

  fs.writeFileSync(filePath, content);
  console.log(`تم إصلاح الأخطاء في: ${filePath}`);
}

const filePath = 'd:/shajarat-al-aeila/src/components/FamilyTreeAdvanced.jsx';
cleanupESLintErrors(filePath);

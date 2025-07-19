const fs = require('fs');
const path = require('path');

function removeConsoleLog(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // إزالة جميع console.log مع الحفاظ على التنسيق
  const cleanedContent = content
    // إزالة console.log مع ; في نهاية السطر
    .replace(/^\s*console\.log\([^)]*\);\s*$/gm, '')
    // إزالة console.log متعدد الأسطر
    .replace(/^\s*console\.log\(\s*`[^`]*`\s*\);\s*$/gms, '')
    // إزالة الأسطر الفارغة الزائدة (أكثر من سطرين فارغين متتاليين)
    .replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(filePath, cleanedContent);
  return true;
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let processedFiles = 0;

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processedFiles += processDirectory(fullPath);
    } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
      removeConsoleLog(fullPath);
      processedFiles++;
      console.log(`✅ تم تنظيف: ${fullPath}`);
    }
  });

  return processedFiles;
}

const srcPath = path.join(__dirname, 'src');
console.log('🧹 بدء تنظيف ملفات console.log...');
const totalFiles = processDirectory(srcPath);
console.log(`✅ تم تنظيف ${totalFiles} ملف بنجاح!`);

// src/utils/enhanced/treeHelpers.js
/**
 * دوال مساعدة لمعالجة بيانات شجرة العائلة
 */

/**
 * تحويل بيانات Firebase إلى تنسيق D3 Tree
 * @param {Array} familiesData - بيانات العائلات من Firebase
 * @param {string} rootFamilyUid - معرف العائلة الجذر
 * @returns {Object} بيانات الشجرة بتنسيق D3
 */
export const convertFirebaseToD3Tree = (familiesData, rootFamilyUid) => {
  if (!familiesData || familiesData.length === 0) return null;

  const familyMap = new Map();
  const personMap = new Map();

  // بناء خريطة العائلات والأشخاص
  familiesData.forEach(family => {
    familyMap.set(family.uid, family);
    
    // إضافة رب العائلة
    if (family.head) {
      const personKey = `${family.head.firstName}_${family.head.fatherName}_${family.head.grandfatherName}`;
      personMap.set(personKey, {
        ...family.head,
        familyUid: family.uid,
        isHead: true,
        children: []
      });
    }

    // إضافة أفراد العائلة
    family.members?.forEach(member => {
      const personKey = `${member.firstName}_${member.fatherName}_${member.grandfatherName}`;
      if (!personMap.has(personKey)) {
        personMap.set(personKey, {
          ...member,
          familyUid: family.uid,
          isHead: false,
          children: []
        });
      }
    });
  });

  // بناء الهيكل الهرمي
  const buildHierarchy = (familyUid, processedFamilies = new Set(), depth = 0) => {
    if (processedFamilies.has(familyUid) || depth > 8) return null;
    
    processedFamilies.add(familyUid);
    const family = familyMap.get(familyUid);
    
    if (!family || !family.head) return null;

    const headKey = `${family.head.firstName}_${family.head.fatherName}_${family.head.grandfatherName}`;
    const headPerson = personMap.get(headKey);
    
    if (!headPerson) return null;

    // إنشاء عقدة رب العائلة
    const node = {
      name: `${headPerson.firstName} ${headPerson.fatherName}`,
      fullName: `${headPerson.firstName} ${headPerson.fatherName} ${headPerson.grandfatherName}`,
      relation: headPerson.relation || 'رب العائلة',
      avatar: headPerson.avatar || '/boy.png',
      familyUid: familyUid,
      isHead: true,
      phone: headPerson.phone,
      birthDate: headPerson.birthDate,
      depth: depth,
      id: headPerson.globalId,
      children: []
    };

    // إضافة الأطفال المباشرين
    const directChildren = family.members?.filter(member => 
      (member.relation === 'ابن' || member.relation === 'بنت') &&
      member.globalId !== headPerson.globalId
    ) || [];

    directChildren.forEach(child => {
      const childNode = {
        name: `${child.firstName} ${child.fatherName}`,
        fullName: `${child.firstName} ${child.fatherName} ${child.grandfatherName}`,
        relation: child.relation,
        avatar: child.avatar || (child.relation === 'بنت' ? '/girl.png' : '/boy.png'),
        familyUid: familyUid,
        isHead: false,
        phone: child.phone,
        birthDate: child.birthDate,
        depth: depth + 1,
        id: child.globalId,
        children: []
      };

      // البحث عن العائلات التي يرأسها هذا الطفل
      const childFamilies = familiesData.filter(f => 
        f.head && 
        `${f.head.firstName}_${f.head.fatherName}_${f.head.grandfatherName}` === 
        `${child.firstName}_${child.fatherName}_${child.grandfatherName}` &&
        f.uid !== familyUid
      );

      // إضافة أحفاد هذا الطفل
      childFamilies.forEach(childFamily => {
        const grandchildren = buildHierarchy(childFamily.uid, new Set(processedFamilies), depth + 2);
        if (grandchildren && grandchildren.children) {
          childNode.children.push(...grandchildren.children);
        }
      });

      node.children.push(childNode);
    });

    return node;
  };

  // البحث عن العائلة الجذر
  const rootFamily = familyMap.get(rootFamilyUid) || 
                     familiesData.find(f => f.level === 0) || 
                     familiesData[0];

  if (!rootFamily) return null;

  return buildHierarchy(rootFamily.uid);
};

/**
 * جمع جميع الأشخاص من الشجرة
 * @param {Object} treeData - بيانات الشجرة
 * @returns {Array} مصفوفة جميع الأشخاص
 */
export const collectAllPersons = (treeData) => {
  if (!treeData) return [];

  const persons = [];
  
  const collectPersons = (node, depth = 0, path = []) => {
    if (!node) return;

    persons.push({
      ...node,
      depth,
      path: [...path, node.name],
      searchKey: `${node.name} ${node.fullName || ''} ${node.relation || ''} ${node.phone || ''}`.toLowerCase()
    });

    if (node.children) {
      node.children.forEach(child => 
        collectPersons(child, depth + 1, [...path, node.name])
      );
    }
  };

  collectPersons(treeData);
  return persons;
};

/**
 * حساب إحصائيات الشجرة
 * @param {Object} treeData - بيانات الشجرة
 * @returns {Object} الإحصائيات
 */
export const calculateTreeStatistics = (treeData) => {
  if (!treeData) return null;

  const allPersons = collectAllPersons(treeData);
  const generationData = {};
  const relationCounts = {};
  const phoneNumbers = [];
  const birthYears = [];

  allPersons.forEach(person => {
    // إحصائيات الأجيال
    generationData[person.depth] = (generationData[person.depth] || 0) + 1;

    // إحصائيات العلاقات
    const relation = person.relation || 'غير محدد';
    relationCounts[relation] = (relationCounts[relation] || 0) + 1;

    // أرقام الهواتف
    if (person.phone) {
      phoneNumbers.push(person.phone);
    }

    // سنوات الميلاد
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear();
      if (year > 1900 && year < new Date().getFullYear()) {
        birthYears.push(year);
      }
    }
  });

  // تحليل الأعمار
  const currentYear = new Date().getFullYear();
  const ages = birthYears.map(year => currentYear - year);
  const ageGroups = {
    'أطفال (0-12)': ages.filter(age => age >= 0 && age <= 12).length,
    'مراهقون (13-18)': ages.filter(age => age >= 13 && age <= 18).length,
    'شباب (19-35)': ages.filter(age => age >= 19 && age <= 35).length,
    'بالغون (36-55)': ages.filter(age => age >= 36 && age <= 55).length,
    'كبار السن (56+)': ages.filter(age => age >= 56).length
  };

  return {
    totalPersons: allPersons.length,
    totalGenerations: Object.keys(generationData).length,
    maleCount: allPersons.filter(p => p.relation !== 'بنت' && p.relation !== 'أم').length,
    femaleCount: allPersons.filter(p => p.relation === 'بنت' || p.relation === 'أم').length,
    phoneCount: phoneNumbers.length,
    birthDateCount: birthYears.length,
    completenessScore: (
      (phoneNumbers.length * 0.3 + birthYears.length * 0.3 + allPersons.length * 0.4) / 
      allPersons.length * 100
    ).toFixed(1),
    generationData,
    relationCounts,
    ageGroups,
    ages
  };
};

/**
 * البحث في الشجرة
 * @param {Object} treeData - بيانات الشجرة
 * @param {string} searchTerm - مصطلح البحث
 * @param {string} searchType - نوع البحث
 * @returns {Array} نتائج البحث
 */
export const searchInTree = (treeData, searchTerm, searchType = 'all') => {
  if (!treeData || !searchTerm.trim()) return [];

  const allPersons = collectAllPersons(treeData);
  const searchTermLower = searchTerm.toLowerCase();

  return allPersons.filter(person => {
    switch (searchType) {
      case 'name':
        return person.name?.toLowerCase().includes(searchTermLower);
      case 'relation':
        return person.relation?.toLowerCase().includes(searchTermLower);
      case 'phone':
        return person.phone?.includes(searchTerm);
      case 'all':
      default:
        return person.searchKey.includes(searchTermLower);
    }
  });
};

/**
 * العثور على شخص بـ ID
 * @param {Object} treeData - بيانات الشجرة
 * @param {string} personId - معرف الشخص
 * @returns {Object|null} الشخص المطلوب
 */
export const findPersonById = (treeData, personId) => {
  if (!treeData || !personId) return null;

  const findNode = (node) => {
    if (!node) return null;
    
    if (node.id === personId) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
    }

    return null;
  };

  return findNode(treeData);
};

/**
 * بناء مسار إلى شخص معين
 * @param {Object} treeData - بيانات الشجرة
 * @param {string} personId - معرف الشخص
 * @returns {Array} مسار إلى الشخص
 */
export const buildPathToPerson = (treeData, personId) => {
  if (!treeData || !personId) return [];

  const findPath = (node, path = []) => {
    if (!node) return null;
    
    const currentPath = [...path, node];
    
    if (node.id === personId) return currentPath;

    if (node.children) {
      for (const child of node.children) {
        const found = findPath(child, currentPath);
        if (found) return found;
      }
    }

    return null;
  };

  return findPath(treeData) || [];
};
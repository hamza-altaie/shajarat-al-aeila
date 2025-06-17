// src/hooks/useEnhancedFamilyTree.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook محسن لإدارة شجرة العائلة مع ميزات D3.js المتقدمة
 */
export default function useEnhancedFamilyTree(userUid) {
  // ============================================================================
  // الحالات الأساسية
  // ============================================================================
  
  const [treeData, setTreeData] = useState(null);
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [hoveredPerson, setHoveredPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [treeStatistics, setTreeStatistics] = useState({
    totalPersons: 0,
    totalFamilies: 0,
    maxDepth: 0,
    generationCounts: {}
  });

  // ============================================================================
  // دوال تحويل البيانات
  // ============================================================================

  /**
   * تحويل بيانات Firebase إلى تنسيق شجرة D3
   */
  const convertToTreeFormat = useCallback((familiesData, rootFamilyUid) => {
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
  }, []);

  // ============================================================================
  // دوال تحميل البيانات
  // ============================================================================

  /**
   * تحميل البيانات من Firebase
   */
  const loadFamilyData = useCallback(async () => {
    if (!userUid) return;

    try {
      setLoading(true);
      setError(null);

      // تحميل بيانات المستخدم
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (!userDoc.exists()) {
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }

      const userData = userDoc.data();
      const familyUid = userData.familyUid;

      if (!familyUid) {
        throw new Error('المستخدم غير منتمي لأي عائلة');
      }

      // تحميل العائلات المرتبطة
      const familiesQuery = query(
        collection(db, 'families'),
        where('rootFamilyUid', '==', familyUid)
      );

      const familiesSnapshot = await getDocs(familiesQuery);
      const familiesData = [];

      familiesSnapshot.forEach(doc => {
        familiesData.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      // إضافة العائلة الأساسية إذا لم تكن موجودة
      const mainFamilyDoc = await getDoc(doc(db, 'families', familyUid));
      if (mainFamilyDoc.exists()) {
        const mainFamilyData = { uid: mainFamilyDoc.id, ...mainFamilyDoc.data() };
        if (!familiesData.find(f => f.uid === familyUid)) {
          familiesData.unshift(mainFamilyData);
        }
      }

      setFamilyData(familiesData);

      // تحويل البيانات إلى تنسيق الشجرة
      const treeStructure = convertToTreeFormat(familiesData, familyUid);
      setTreeData(treeStructure);

      // حساب الإحصائيات
      calculateStatistics(familiesData, treeStructure);

    } catch (err) {
      console.error('خطأ في تحميل بيانات العائلة:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userUid, convertToTreeFormat]);

  /**
   * حساب إحصائيات الشجرة
   */
  const calculateStatistics = useCallback((familiesData, treeStructure) => {
    if (!familiesData || !treeStructure) return;

    let totalPersons = 0;
    let maxDepth = 0;
    const generationCounts = {};

    // حساب العمق والأشخاص بشكل تكراري
    const traverseTree = (node, depth = 0) => {
      if (!node) return;

      totalPersons++;
      maxDepth = Math.max(maxDepth, depth);
      
      const generation = depth;
      generationCounts[generation] = (generationCounts[generation] || 0) + 1;

      if (node.children) {
        node.children.forEach(child => traverseTree(child, depth + 1));
      }
    };

    traverseTree(treeStructure);

    setTreeStatistics({
      totalPersons,
      totalFamilies: familiesData.length,
      maxDepth,
      generationCounts
    });
  }, []);

  // ============================================================================
  // دوال البحث والفلترة
  // ============================================================================

  /**
   * البحث في الشجرة
   */
  const searchInTree = useCallback((query) => {
    if (!treeData || !query.trim()) return [];

    const results = [];
    const searchTerm = query.toLowerCase();

    const searchNode = (node) => {
      if (!node) return;

      // البحث في الاسم والاسم الكامل والعلاقة
      const name = node.name?.toLowerCase() || '';
      const fullName = node.fullName?.toLowerCase() || '';
      const relation = node.relation?.toLowerCase() || '';

      if (name.includes(searchTerm) || 
          fullName.includes(searchTerm) || 
          relation.includes(searchTerm)) {
        results.push({
          ...node,
          matchType: name.includes(searchTerm) ? 'name' : 
                   fullName.includes(searchTerm) ? 'fullName' : 'relation'
        });
      }

      if (node.children) {
        node.children.forEach(child => searchNode(child));
      }
    };

    searchNode(treeData);
    return results;
  }, [treeData]);

  /**
   * العثور على شخص بـ ID
   */
  const findPersonById = useCallback((personId) => {
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
  }, [treeData]);

  // ============================================================================
  // معالجات الأحداث
  // ============================================================================

  const handleNodeClick = useCallback((nodeData) => {
    console.log('تم النقر على العقدة:', nodeData);
    setSelectedPerson(nodeData);
  }, []);

  const handleNodeHover = useCallback((nodeData, event) => {
    setHoveredPerson(nodeData);
  }, []);

  // ============================================================================
  // تأثيرات جانبية
  // ============================================================================

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  // ============================================================================
  // البحث المباشر
  // ============================================================================

  const searchResults = useMemo(() => {
    return searchInTree(searchQuery);
  }, [searchQuery, searchInTree]);

  // ============================================================================
  // إرجاع الواجهة
  // ============================================================================

  return {
    // البيانات
    treeData,
    familyData,
    treeStatistics,
    
    // الحالات
    loading,
    error,
    selectedPerson,
    hoveredPerson,
    
    // البحث
    searchQuery,
    setSearchQuery,
    searchResults,
    
    // الوظائف
    loadFamilyData,
    findPersonById,
    handleNodeClick,
    handleNodeHover,
    
    // معلومات إضافية
    isReady: !loading && !error && treeData,
    hasData: Boolean(treeData),
    isEmpty: !loading && !error && !treeData
  };
}
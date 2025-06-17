// src/hooks/enhanced/useEnhancedFamilyTree.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const useEnhancedFamilyTree = (userId) => {
  // الحالات الأساسية
  const [familyData, setFamilyData] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // حالات التفاعل
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [hoveredPerson, setHoveredPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // تحميل بيانات العائلة
  const loadFamilyData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const familyRef = collection(db, 'users', userId, 'family');
      const snapshot = await getDocs(familyRef);
      
      const members = [];
      snapshot.forEach(doc => {
        members.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setFamilyData(members);
      
      // بناء بيانات الشجرة
      const treeStructure = buildTreeStructure(members);
      setTreeData(treeStructure);
      
    } catch (err) {
      console.error('خطأ في تحميل بيانات العائلة:', err);
      setError('فشل في تحميل بيانات العائلة');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // بناء هيكل الشجرة
  const buildTreeStructure = (members) => {
    if (!members || members.length === 0) return null;
    
    // البحث عن رب العائلة
    const head = members.find(m => m.relation === 'رب العائلة') || members[0];
    
    // بناء الشجرة بشكل تكراري
    const buildNode = (person) => {
      const children = members.filter(m => m.parentId === person.id);
      
      return {
        name: buildFullName(person),
        id: person.id,
        relation: person.relation,
        avatar: person.avatar,
        attributes: person,
        children: children.map(buildNode)
      };
    };
    
    return buildNode(head);
  };

  // بناء الاسم الكامل
  const buildFullName = (person) => {
    if (!person) return 'غير محدد';
    
    const parts = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(' ') : 'غير محدد';
  };

  // البحث في الأعضاء
  const searchResults = useMemo(() => {
    if (!searchQuery || !familyData) return [];
    
    const query = searchQuery.toLowerCase();
    return familyData.filter(person => {
      const fullName = buildFullName(person).toLowerCase();
      const relation = (person.relation || '').toLowerCase();
      
      return fullName.includes(query) || relation.includes(query);
    });
  }, [searchQuery, familyData]);

  // إحصائيات الشجرة
  const treeStatistics = useMemo(() => {
    if (!familyData) return {};
    
    const relations = [...new Set(familyData.map(p => p.relation).filter(Boolean))];
    const generations = [...new Set(familyData.map(p => p.generation || 0))];
    
    return {
      totalMembers: familyData.length,
      relations,
      generations,
      maleCount: familyData.filter(p => p.gender === 'ذكر').length,
      femaleCount: familyData.filter(p => p.gender === 'أنثى').length
    };
  }, [familyData]);

  // البحث عن شخص بالمعرف
  const findPersonById = useCallback((id) => {
    return familyData.find(person => person.id === id);
  }, [familyData]);

  // معالج النقر على العقدة
  const handleNodeClick = useCallback((person) => {
    setSelectedPerson(person);
  }, []);

  // معالج التمرير على العقدة
  const handleNodeHover = useCallback((person) => {
    setHoveredPerson(person);
  }, []);

  // تحميل البيانات عند التحميل الأولي
  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  // حالات مساعدة
  const isReady = !loading && !error;
  const hasData = familyData && familyData.length > 0;
  const isEmpty = !loading && (!familyData || familyData.length === 0);

  return {
    // البيانات
    familyData,
    treeData,
    treeStatistics,
    
    // الحالات
    loading,
    error,
    isReady,
    hasData,
    isEmpty,
    
    // التفاعل
    selectedPerson,
    hoveredPerson,
    searchQuery,
    setSearchQuery,
    searchResults,
    
    // الدوال
    loadFamilyData,
    findPersonById,
    handleNodeClick,
    handleNodeHover
  };
};

export default useEnhancedFamilyTree;
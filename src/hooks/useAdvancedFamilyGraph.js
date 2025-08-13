import { useState, useEffect, useCallback, useMemo } from 'react';
import AdvancedFamilyGraph from '../utils/AdvancedFamilyGraph';

/**
 * Hook متقدم لإدارة شجرة العائلة
 * @param {Object} options - خيارات التكوين
 * @returns {Object} كائن يحتوي على البيانات والوظائف
 */
export default function useAdvancedFamilyGraph(options = {}) {
  // ============================================================================
  // الحالات الأساسية
  // ============================================================================
  
  const [familyGraph] = useState(() => new AdvancedFamilyGraph());
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // ============================================================================
  // الإعدادات المدمجة
  // ============================================================================
  
  const config = useMemo(() => ({
    maxDepth: 6, // زيادة من 4 إلى 6
    includeExtended: true,
    autoOptimize: true,
    enableDetailedLogging: false,
    enableCrossFamily: true, // ميزة جديدة
    includeCrossFamilyLinks: true, // إضافة جديدة
    loadLinkedFamilies: true, // إضافة جديدة
    ...options
  }), [options]);

  // ============================================================================
  // الوظائف الأساسية
  // ============================================================================

  /**
   * تحميل الشجرة الموسعة
   */
  const loadExtendedTree = useCallback(async (userUid, includeExtended = true, opts = {}) => {
    if (!userUid) {
      console.warn('⚠️ لا يوجد معرف مستخدم لتحميل الشجرة');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingStage('بدء التحميل...');

      // إعدادات التحميل
      const loadOptions = {
        maxDepth: config.maxDepth,
        includeExtended,
        forceRefresh: opts.forceRefresh || false,
        clearPrevious: opts.clearCache || false,
        ...opts
      };

      // تحديث التقدم
      setLoadingProgress(10);
      setLoadingStage('تحميل البيانات الأساسية...');

      // تحميل البيانات
      const result = await familyGraph.loadExtendedFamilies(userUid, loadOptions);

      if (result.success) {
        setLoadingProgress(80);
        setLoadingStage('إنشاء بيانات الشجرة...');

        // إنشاء بيانات الشجرة
        const tree = result.treeData;
        setTreeData(tree);

        setLoadingProgress(100);
        setLoadingStage('اكتمل التحميل');

      } else {
        throw new Error(result.error || 'فشل في تحميل البيانات');
      }

    } catch (err) {
      console.error('❌ خطأ في تحميل الشجرة:', err);
      setError(err.message || 'حدث خطأ في تحميل الشجرة');
      setTreeData(null);
    } finally {
      setLoading(false);
      setLoadingProgress(100);
    }
  }, [familyGraph, config.maxDepth]);

  /**
   * البحث في الشجرة
   */
  const searchInTree = useCallback(async (query, filters = {}) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return [];
    }

    try {
      // تحويل Map إلى Array للبحث
      const allPersons = Array.from(familyGraph.nodes.values());
      
      // تطبيق البحث
      const results = allPersons.filter(person => {
        const nameMatch = person.name?.toLowerCase().includes(query.toLowerCase()) ||
                         person.firstName?.toLowerCase().includes(query.toLowerCase());
        
        // تطبيق الفلاتر
        if (filters.relation && person.relation !== filters.relation) return false;
        if (filters.generation !== undefined && person.generation !== filters.generation) return false;
        
        return nameMatch;
      });

      setSearchResults(results);
      
      return results;
    } catch (err) {
      console.error('❌ خطأ في البحث:', err);
      return [];
    }
  }, [familyGraph.nodes]);

  /**
   * البحث عن مسار بين شخصين
   */
  const findRelationshipPath = useCallback((person1Id, person2Id) => {
    try {
      if (!person1Id || !person2Id) return null;

      const person1 = familyGraph.nodes.get(person1Id);
      const person2 = familyGraph.nodes.get(person2Id);

      if (!person1 || !person2) return null;

      // بحث بسيط عن العلاقة المباشرة
      if (person1.relations.children.has(person2Id)) {
        return [person1, person2];
      }
      if (person1.relations.parents.has(person2Id)) {
        return [person1, person2];
      }
      if (person1.relations.siblings.has(person2Id)) {
        return [person1, person2];
      }

      return null;
    } catch (err) {
      console.error('❌ خطأ في البحث عن المسار:', err);
      return null;
    }
  }, [familyGraph.nodes]);

  /**
   * تحديد شخص
   */
  const selectPerson = useCallback((person) => {
    if (!person) return;
    
    setSelectedPersons(prev => {
      const exists = prev.find(p => p.globalId === person.globalId);
      if (exists) return prev;
      return [...prev, person];
    });
  }, []);

  /**
   * مسح التحديد
   */
  const clearSelection = useCallback(() => {
    setSelectedPersons([]);
  }, []);

  /**
   * الحصول على تفاصيل شخص
   */
  const getPersonDetails = useCallback((personId) => {
    return familyGraph.nodes.get(personId) || null;
  }, [familyGraph.nodes]);

  /**
   * تصدير بيانات الشجرة
   */
  const exportTreeData = useCallback((format = 'json') => {
    try {
      const allPersons = Array.from(familyGraph.nodes.values());
      
      if (format === 'json') {
        return JSON.stringify(allPersons, null, 2);
      } else if (format === 'csv') {
        const headers = ['الاسم', 'القرابة', 'الجيل', 'تاريخ الميلاد'];
        const rows = allPersons.map(person => [
          person.name || '',
          person.relation || '',
          person.generation || 0,
          person.birthDate || ''
        ]);
        
        return [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
      }
      
      return null;
    } catch (err) {
      console.error('❌ خطأ في تصدير البيانات:', err);
      return null;
    }
  }, [familyGraph.nodes]);

  // ============================================================================
  // الخصائص المحسوبة
  // ============================================================================

  const statistics = useMemo(() => {
    if (!familyGraph.nodes.size) return null;

    return familyGraph.getAdvancedStatistics();
  }, [familyGraph]);

  const isReady = useMemo(() => {
    return !loading && !error && familyGraph.nodes.size > 0;
  }, [loading, error, familyGraph.nodes.size]);

  const hasData = useMemo(() => {
    return familyGraph.nodes.size > 0;
  }, [familyGraph.nodes.size]);

  // ============================================================================
  // التأثيرات
  // ============================================================================

  // تنظيف الموارد عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (familyGraph) {
        familyGraph.clear();
      }
    };
  }, [familyGraph]);

  // ============================================================================
  // القيمة المرجعة
  // ============================================================================

  return {
    // البيانات
    familyGraph,
    treeData,
    loading,
    error,
    loadingProgress,
    loadingStage,
    statistics,
    searchResults,
    selectedPersons,

    // الوظائف
    loadExtendedTree,
    searchInTree,
    findRelationshipPath,
    selectPerson,
    clearSelection,
    getPersonDetails,
    exportTreeData,

    // الخصائص المحسوبة
    isReady,
    hasData,

    // إعدادات
    config
  };
}

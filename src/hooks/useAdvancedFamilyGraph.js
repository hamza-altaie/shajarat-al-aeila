// =============================================================================
// useAdvancedFamilyGraph.js - Hook محسن لاستخدام النظام المتقدم (مُصحح)
// =============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// استيراد مؤقت لتجنب أخطاء التحميل
let AdvancedFamilyGraph;
try {
  // استيراد ديناميكي لتجنب أخطاء التحميل
  import('../utils/AdvancedFamilyGraph.js').then(module => {
    AdvancedFamilyGraph = module.default || module.AdvancedFamilyGraph;
  }).catch(error => {
    console.warn('تحذير: فشل تحميل AdvancedFamilyGraph، استخدام fallback');
    AdvancedFamilyGraph = createFallbackGraph();
  });
} catch (error) {
  console.warn('تحذير: فشل استيراد AdvancedFamilyGraph');
  AdvancedFamilyGraph = createFallbackGraph();
}

// إنشاء Graph بديل مبسط
function createFallbackGraph() {
  return class FallbackGraph {
    constructor() {
      this.nodes = new Map();
      this.edges = new Map();
      this.families = new Map();
      this.metadata = {
        totalNodes: 0,
        totalEdges: 0,
        lastUpdated: Date.now()
      };
    }

    clear() {
      this.nodes.clear();
      this.edges.clear();
      this.families.clear();
      this.metadata.totalNodes = 0;
      this.metadata.totalEdges = 0;
    }

    async loadExtendedFamilies(userUid, options = {}) {
      console.log('🔄 استخدام النظام البديل لتحميل العائلة');
      
      try {
        // تحميل بسيط من Firebase
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        
        const familySnapshot = await getDocs(collection(db, 'users', userUid, 'family'));
        
        const familyMembers = [];
        familySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.firstName) {
            familyMembers.push({
              ...data,
              id: doc.id,
              globalId: doc.id,
              name: `${data.firstName || ''} ${data.fatherName || ''}`.trim()
            });
          }
        });

        // إنشاء بيانات شجرة بسيطة
        const treeData = this.createSimpleTreeData(familyMembers);
        
        return {
          success: true,
          treeData,
          stats: {
            overview: {
              totalPersons: familyMembers.length,
              totalFamilies: 1,
              totalRelations: 0
            }
          }
        };
        
      } catch (error) {
        console.error('خطأ في النظام البديل:', error);
        return {
          success: false,
          error: error.message,
          treeData: this.createEmptyTreeData()
        };
      }
    }

    createSimpleTreeData(members) {
      if (members.length === 0) {
        return this.createEmptyTreeData();
      }

      // البحث عن رب العائلة
      const head = members.find(m => m.relation === 'رب العائلة') || members[0];
      
      // إنشاء عقدة الجذر
      const rootNode = {
        name: head.name || head.firstName || 'رب العائلة',
        id: head.globalId || head.id,
        avatar: head.avatar || '/boy.png',
        attributes: head,
        children: []
      };

      // إضافة الأطفال
      const children = members.filter(m => 
        m.relation === 'ابن' || m.relation === 'بنت'
      );

      children.forEach(child => {
        rootNode.children.push({
          name: child.name || child.firstName || 'عضو',
          id: child.globalId || child.id,
          avatar: child.avatar || '/boy.png',
          attributes: child,
          children: []
        });
      });

      return rootNode;
    }

    createEmptyTreeData() {
      return {
        name: 'شجرة العائلة',
        id: 'empty',
        avatar: '/tree-icon.png',
        attributes: {
          name: 'شجرة العائلة',
          isEmpty: true
        },
        children: []
      };
    }

    getAdvancedStatistics() {
      return {
        overview: {
          totalPersons: this.nodes.size,
          totalFamilies: this.families.size,
          totalRelations: this.edges.size
        },
        performance: {
          totalLoadTime: 0,
          cacheSize: 0
        }
      };
    }

    advancedSearch(query, filters = {}) {
      const results = [];
      this.nodes.forEach(person => {
        if (person.name && person.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(person);
        }
      });
      return results;
    }

    findOptimalPath(person1Id, person2Id) {
      return null; // مبسط
    }
  };
}

/**
 * Hook متقدم لإدارة شجرة العائلة (مع معالجة أخطاء)
 */
export const useAdvancedFamilyGraph = (options = {}) => {
  // ==========================================================================
  // الحالات الأساسية
  // ==========================================================================
  
  const [familyGraph, setFamilyGraph] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // حالات متقدمة
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPersons, setSelectedPersons] = useState([]);
  
  // مراجع للأداء
  const graphRef = useRef(null);
  const retryCountRef = useRef(0);
  
  // إعدادات افتراضية
  const defaultOptions = useMemo(() => ({
    maxDepth: 4,
    includeExtended: true,
    loadConnections: true,
    useCache: true,
    enableRealTimeUpdates: false,
    autoOptimize: true,
    ...options
  }), [options]);

  // ==========================================================================
  // تحميل البيانات
  // ==========================================================================

  const loadExtendedTree = useCallback(async (userUid, showExtended = false, customOptions = {}) => {
    if (!userUid) {
      setError('معرف المستخدم غير صحيح');
      return null;
    }

    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingStage('بدء التحميل...');
    
    const startTime = Date.now();

    try {
      console.log(`🚀 بدء تحميل شجرة العائلة - المستخدم: ${userUid}`);
      
      // إنشاء أو إعادة استخدام الرسم البياني
      let graph = graphRef.current;
      if (!graph || customOptions.forceRefresh) {
        // انتظار تحميل الكلاس
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!AdvancedFamilyGraph) {
          AdvancedFamilyGraph = createFallbackGraph();
        }
        
        graph = new AdvancedFamilyGraph();
        graphRef.current = graph;
      }

      setLoadingProgress(25);
      setLoadingStage('تحميل البيانات...');

      // تحميل البيانات
      const result = await graph.loadExtendedFamilies(userUid, {
        ...defaultOptions,
        ...customOptions,
        includeExtended: showExtended,
        onProgress: (progress) => setLoadingProgress(progress),
        onStageChange: (stage) => setLoadingStage(stage)
      });
      
      if (result.success) {
        setFamilyGraph(graph);
        setTreeData(result.treeData);
        setStatistics(result.stats);
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        console.log(`✅ اكتمل التحميل بنجاح في ${loadTime}ms`);
        
        setLoadingStage('اكتمل بنجاح');
        setLoadingProgress(100);
        
        // تنظيف بعد فترة قصيرة
        setTimeout(() => {
          setLoadingStage('');
          setLoadingProgress(0);
        }, 2000);
        
        return result;
        
      } else {
        throw new Error(result.error || 'فشل في تحميل البيانات');
      }
      
    } catch (err) {
      console.error('❌ خطأ في تحميل الشجرة:', err);
      
      retryCountRef.current++;
      setError(`فشل في تحميل البيانات: ${err.message}`);
      setLoadingStage('حدث خطأ');
      
      // إعادة محاولة تلقائية مع البديل
      if (retryCountRef.current < 2) {
        console.log(`🔄 إعادة محاولة ${retryCountRef.current}/2 مع النظام البديل...`);
        
        try {
          const fallbackGraph = new (createFallbackGraph())();
          const fallbackResult = await fallbackGraph.loadExtendedFamilies(userUid);
          
          if (fallbackResult.success) {
            setFamilyGraph(fallbackGraph);
            setTreeData(fallbackResult.treeData);
            setStatistics(fallbackResult.stats);
            setError(null);
            return fallbackResult;
          }
        } catch (fallbackError) {
          console.error('فشل النظام البديل أيضاً:', fallbackError);
        }
      }
      
      return null;
      
    } finally {
      setLoading(false);
    }
  }, [defaultOptions]);

  // ==========================================================================
  // دوال البحث
  // ==========================================================================

  const searchInTree = useCallback(async (query, filters = {}) => {
    if (!familyGraph) {
      console.warn('⚠️ لا توجد بيانات للبحث فيها');
      return [];
    }

    try {
      console.log(`🔍 البحث: "${query}"`);
      
      const results = familyGraph.advancedSearch ? 
        familyGraph.advancedSearch(query, filters) : [];
      
      setSearchResults(results);
      console.log(`✅ نتائج البحث: ${results.length} شخص`);
      
      return results;
      
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
      setError(`خطأ في البحث: ${error.message}`);
      return [];
    }
  }, [familyGraph]);

  const findRelationshipPath = useCallback((person1Id, person2Id) => {
    if (!familyGraph) {
      console.warn('⚠️ لا توجد بيانات للبحث فيها');
      return null;
    }

    try {
      const path = familyGraph.findOptimalPath ? 
        familyGraph.findOptimalPath(person1Id, person2Id) : null;
      
      if (path) {
        console.log(`✅ تم العثور على مسار: ${path.length} خطوات`);
      } else {
        console.log(`❌ لا يوجد مسار بين الشخصين`);
      }
      
      return path;
      
    } catch (error) {
      console.error('❌ خطأ في البحث عن المسار:', error);
      return null;
    }
  }, [familyGraph]);

  // ==========================================================================
  // دوال التفاعل
  // ==========================================================================

  const selectPerson = useCallback((person, multiSelect = false) => {
    if (!person) return;

    setSelectedPersons(prev => {
      if (multiSelect) {
        const isSelected = prev.some(p => p.globalId === person.globalId);
        if (isSelected) {
          return prev.filter(p => p.globalId !== person.globalId);
        } else {
          return [...prev, person];
        }
      } else {
        return [person];
      }
    });
    
    console.log(`👆 تم تحديد الشخص: ${person.name}`);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPersons([]);
    console.log(`🗑️ تم مسح جميع التحديدات`);
  }, []);

  const getPersonDetails = useCallback((personId) => {
    if (!familyGraph || !familyGraph.nodes) return null;

    const person = familyGraph.nodes.get(personId);
    if (!person) return null;

    return {
      ...person,
      totalRelations: (person.relations?.parents?.size || 0) + 
                     (person.relations?.children?.size || 0) + 
                     (person.relations?.siblings?.size || 0) + 
                     (person.relations?.spouses?.size || 0)
    };
  }, [familyGraph]);

  // ==========================================================================
  // دوال التصدير
  // ==========================================================================

  const exportTreeData = useCallback((format = 'json') => {
    if (!familyGraph) {
      console.warn('⚠️ لا توجد بيانات للتصدير');
      return null;
    }

    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '2.0',
          format
        },
        treeData,
        statistics
      };

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        default:
          return JSON.stringify(exportData, null, 2);
      }
      
    } catch (error) {
      console.error('❌ خطأ في تصدير البيانات:', error);
      setError(`خطأ في التصدير: ${error.message}`);
      return null;
    }
  }, [familyGraph, treeData, statistics]);

  // ==========================================================================
  // تنظيف الموارد
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (graphRef.current && graphRef.current.clear) {
        graphRef.current.clear();
      }
    };
  }, []);

  // ==========================================================================
  // الإرجاع النهائي
  // ==========================================================================

  return {
    // الحالات الأساسية
    familyGraph,
    treeData,
    loading,
    error,
    
    // حالات متقدمة
    loadingProgress,
    loadingStage,
    statistics,
    searchResults,
    selectedPersons,
    
    // دوال التحميل
    loadExtendedTree,
    
    // دوال البحث والفلترة
    searchInTree,
    findRelationshipPath,
    
    // دوال التفاعل
    selectPerson,
    clearSelection,
    getPersonDetails,
    
    // دوال التصدير
    exportTreeData,
    
    // معلومات إضافية
    isReady: !loading && !error && familyGraph !== null,
    hasData: familyGraph && treeData !== null,
    retryCount: retryCountRef.current
  };
};

export default useAdvancedFamilyGraph;
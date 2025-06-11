// =============================================================================
// useAdvancedFamilyGraph.js - Hook محسن لاستخدام النظام المتقدم
// =============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import AdvancedFamilyGraph from '../utils/AdvancedFamilyGraph';

/**
 * Hook متقدم لإدارة شجرة العائلة
 * @param {Object} options - خيارات التكوين
 * @returns {Object} الحالة والدوال
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
  const loadingTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  
  // إعدادات افتراضية
  const defaultOptions = {
    maxDepth: 4,
    includeExtended: true,
    loadConnections: true,
    useCache: true,
    enableRealTimeUpdates: false,
    autoOptimize: true,
    ...options
  };

  // ==========================================================================
  // دوال التحميل الرئيسية
  // ==========================================================================

  /**
   * تحميل الشجرة الموسعة - الدالة الرئيسية
   * @param {string} userUid - معرف المستخدم
   * @param {boolean} showExtended - عرض الشجرة الموسعة
   * @param {Object} customOptions - خيارات مخصصة
   */
  const loadExtendedTree = useCallback(async (userUid, showExtended = false, customOptions = {}) => {
    if (!userUid) {
      setError('معرف المستخدم غير صحيح');
      return null;
    }

    // إعداد حالة التحميل
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingStage('بدء التحميل...');
    
    const startTime = Date.now();
    loadingTimeRef.current = startTime;

    try {
      console.log(`🚀 [Hook] بدء تحميل شجرة العائلة - المستخدم: ${userUid}`);
      
      // إنشاء أو إعادة استخدام الرسم البياني
      let graph = graphRef.current;
      if (!graph || customOptions.forceRefresh) {
        graph = new AdvancedFamilyGraph();
        graphRef.current = graph;
      }

      // دمج الخيارات
      const loadOptions = {
        ...defaultOptions,
        ...customOptions,
        includeExtended: showExtended,
        onProgress: updateProgress,
        onStageChange: updateStage
      };

      console.log(`⚙️ [Hook] خيارات التحميل:`, loadOptions);

      // تحميل البيانات
      const result = await graph.loadExtendedFamilies(userUid, loadOptions);
      
      if (result.success) {
        // تحديث الحالات
        setFamilyGraph(graph);
        setTreeData(result.treeData);
        setStatistics(result.stats);
        
        // تسجيل النجاح
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        console.log(`✅ [Hook] اكتمل التحميل بنجاح في ${loadTime}ms`);
        console.log(`📊 [Hook] الإحصائيات:`, result.stats.overview);
        
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
      console.error('❌ [Hook] خطأ في تحميل الشجرة:', err);
      
      // تسجيل الخطأ وإعادة المحاولة
      retryCountRef.current++;
      setError(`فشل في تحميل البيانات: ${err.message}`);
      setLoadingStage('حدث خطأ');
      
      // إعادة محاولة تلقائية (حتى 3 مرات)
      if (retryCountRef.current < 3 && err.message.includes('network')) {
        console.log(`🔄 [Hook] إعادة محاولة ${retryCountRef.current}/3...`);
        setTimeout(() => {
          loadExtendedTree(userUid, showExtended, customOptions);
        }, 2000 * retryCountRef.current);
      }
      
      return null;
      
    } finally {
      setLoading(false);
    }
  }, [defaultOptions]);

  /**
   * تحديث تقدم التحميل
   * @param {number} progress - نسبة التقدم (0-100)
   */
  const updateProgress = useCallback((progress) => {
    setLoadingProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  /**
   * تحديث مرحلة التحميل
   * @param {string} stage - اسم المرحلة
   */
  const updateStage = useCallback((stage) => {
    setLoadingStage(stage);
    console.log(`📍 [Hook] مرحلة التحميل: ${stage}`);
  }, []);

  // ==========================================================================
  // دوال البحث والفلترة
  // ==========================================================================

  /**
   * البحث المتقدم في الشجرة
   * @param {string} query - النص المراد البحث عنه
   * @param {Object} filters - فلاتر البحث
   */
  const searchInTree = useCallback(async (query, filters = {}) => {
    if (!familyGraph) {
      console.warn('⚠️ [Hook] لا توجد بيانات للبحث فيها');
      return [];
    }

    try {
      console.log(`🔍 [Hook] البحث: "${query}" مع فلاتر:`, filters);
      
      const results = familyGraph.advancedSearch(query, filters);
      setSearchResults(results);
      
      console.log(`✅ [Hook] نتائج البحث: ${results.length} شخص`);
      
      return results;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في البحث:', error);
      setError(`خطأ في البحث: ${error.message}`);
      return [];
    }
  }, [familyGraph]);

  /**
   * البحث عن مسار بين شخصين
   * @param {string} person1Id - معرف الشخص الأول
   * @param {string} person2Id - معرف الشخص الثاني
   */
  const findRelationshipPath = useCallback((person1Id, person2Id) => {
    if (!familyGraph) {
      console.warn('⚠️ [Hook] لا توجد بيانات للبحث فيها');
      return null;
    }

    try {
      console.log(`🔗 [Hook] البحث عن مسار بين الأشخاص`);
      
      const path = familyGraph.findOptimalPath(person1Id, person2Id);
      
      if (path) {
        console.log(`✅ [Hook] تم العثور على مسار: ${path.length} خطوات`);
      } else {
        console.log(`❌ [Hook] لا يوجد مسار بين الشخصين`);
      }
      
      return path;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في البحث عن المسار:', error);
      return null;
    }
  }, [familyGraph]);

  /**
   * فلترة الأشخاص حسب معايير متعددة
   * @param {Object} criteria - معايير الفلترة
   */
  const filterPersons = useCallback((criteria) => {
    if (!familyGraph) return [];

    try {
      const allPersons = Array.from(familyGraph.nodes.values());
      
      const filtered = allPersons.filter(person => {
        // فلترة حسب الجيل
        if (criteria.generation !== undefined && person.generation !== criteria.generation) {
          return false;
        }
        
        // فلترة حسب الجنس
        if (criteria.gender && person.gender !== criteria.gender) {
          return false;
        }
        
        // فلترة حسب العائلة
        if (criteria.familyUid && !person.familyUids.has(criteria.familyUid)) {
          return false;
        }
        
        // فلترة حسب القرابة
        if (criteria.relation && person.relation !== criteria.relation) {
          return false;
        }
        
        // فلترة حسب العمر
        if (criteria.ageRange) {
          const age = calculateAge(person.birthDate);
          const [minAge, maxAge] = criteria.ageRange;
          if (age < minAge || age > maxAge) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`🔍 [Hook] فلترة: ${filtered.length}/${allPersons.length} شخص`);
      
      return filtered;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في الفلترة:', error);
      return [];
    }
  }, [familyGraph]);

  // ==========================================================================
  // دوال إدارة التحديد والتفاعل
  // ==========================================================================

  /**
   * تحديد شخص أو إضافته للتحديد المتعدد
   * @param {Object} person - الشخص المراد تحديده
   * @param {boolean} multiSelect - السماح بالتحديد المتعدد
   */
  const selectPerson = useCallback((person, multiSelect = false) => {
    if (!person) return;

    setSelectedPersons(prev => {
      if (multiSelect) {
        // إضافة أو إزالة من التحديد المتعدد
        const isSelected = prev.some(p => p.globalId === person.globalId);
        if (isSelected) {
          return prev.filter(p => p.globalId !== person.globalId);
        } else {
          return [...prev, person];
        }
      } else {
        // تحديد واحد فقط
        return [person];
      }
    });
    
    console.log(`👆 [Hook] تم تحديد الشخص: ${person.name}`);
  }, []);

  /**
   * مسح جميع التحديدات
   */
  const clearSelection = useCallback(() => {
    setSelectedPersons([]);
    console.log(`🗑️ [Hook] تم مسح جميع التحديدات`);
  }, []);

  /**
   * الحصول على الأشخاص المرتبطين بشخص معين
   * @param {string} personId - معرف الشخص
   * @param {number} depth - عمق البحث
   */
  const getRelatedPersons = useCallback((personId, depth = 2) => {
    if (!familyGraph) return [];

    try {
      const person = familyGraph.nodes.get(personId);
      if (!person) return [];

      const related = new Set();
      const visited = new Set();
      
      const explore = (currentPersonId, currentDepth) => {
        if (currentDepth > depth || visited.has(currentPersonId)) return;
        
        visited.add(currentPersonId);
        const currentPerson = familyGraph.nodes.get(currentPersonId);
        if (!currentPerson) return;

        // إضافة جميع الأقارب المباشرين
        [
          ...currentPerson.relations.parents,
          ...currentPerson.relations.children,
          ...currentPerson.relations.siblings,
          ...currentPerson.relations.spouses
        ].forEach(relatedId => {
          if (relatedId !== personId) {
            related.add(relatedId);
            explore(relatedId, currentDepth + 1);
          }
        });
      };

      explore(personId, 0);
      
      const relatedPersons = Array.from(related)
        .map(id => familyGraph.nodes.get(id))
        .filter(Boolean);

      console.log(`👥 [Hook] الأقارب لـ ${person.name}: ${relatedPersons.length} شخص`);
      
      return relatedPersons;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في الحصول على الأقارب:', error);
      return [];
    }
  }, [familyGraph]);

  // ==========================================================================
  // دوال إدارة البيانات والتحديثات
  // ==========================================================================

  /**
   * إضافة شخص جديد
   * @param {Object} personData - بيانات الشخص الجديد
   */
  const addPerson = useCallback(async (personData) => {
    if (!familyGraph) {
      console.warn('⚠️ [Hook] لا يوجد رسم بياني لإضافة الشخص إليه');
      return null;
    }

    try {
      console.log(`➕ [Hook] إضافة شخص جديد: ${personData.name || personData.firstName}`);
      
      const person = familyGraph.addPerson(personData);
      
      // تحديث الإحصائيات
      setStatistics(familyGraph.getAdvancedStatistics());
      
      // إعادة إنشاء بيانات الشجرة إذا لزم الأمر
      if (defaultOptions.autoOptimize) {
        const newTreeData = familyGraph.generateTreeData();
        setTreeData(newTreeData);
      }
      
      console.log(`✅ [Hook] تم إضافة الشخص بنجاح`);
      
      return person;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في إضافة الشخص:', error);
      setError(`خطأ في إضافة الشخص: ${error.message}`);
      return null;
    }
  }, [familyGraph, defaultOptions.autoOptimize]);

  /**
   * إضافة علاقة بين شخصين
   * @param {string} person1Id - معرف الشخص الأول
   * @param {string} person2Id - معرف الشخص الثاني
   * @param {string} relationType - نوع العلاقة
   * @param {Object} metadata - معلومات إضافية
   */
  const addRelation = useCallback((person1Id, person2Id, relationType, metadata = {}) => {
    if (!familyGraph) {
      console.warn('⚠️ [Hook] لا يوجد رسم بياني لإضافة العلاقة إليه');
      return null;
    }

    try {
      console.log(`🔗 [Hook] إضافة علاقة: ${relationType}`);
      
      const relation = familyGraph.addRelation(person1Id, person2Id, relationType, metadata);
      
      // تحديث الإحصائيات
      setStatistics(familyGraph.getAdvancedStatistics());
      
      // إعادة إنشاء بيانات الشجرة إذا لزم الأمر
      if (defaultOptions.autoOptimize) {
        const newTreeData = familyGraph.generateTreeData();
        setTreeData(newTreeData);
      }
      
      console.log(`✅ [Hook] تم إضافة العلاقة بنجاح`);
      
      return relation;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في إضافة العلاقة:', error);
      setError(`خطأ في إضافة العلاقة: ${error.message}`);
      return null;
    }
  }, [familyGraph, defaultOptions.autoOptimize]);

  /**
   * تحديث بيانات شخص
   * @param {string} personId - معرف الشخص
   * @param {Object} updates - التحديثات
   */
  const updatePerson = useCallback((personId, updates) => {
    if (!familyGraph) return false;

    try {
      const person = familyGraph.nodes.get(personId);
      if (!person) {
        console.warn(`⚠️ [Hook] الشخص غير موجود: ${personId}`);
        return false;
      }

      // تطبيق التحديثات
      Object.assign(person, updates);
      person.metadata.updatedAt = Date.now();

      // تحديث الفهارس إذا تغيرت معلومات مهمة
      if (updates.name || updates.firstName || updates.fatherName || 
          updates.generation || updates.relation) {
        familyGraph.updateIndexes(person);
      }

      // تحديث الإحصائيات
      setStatistics(familyGraph.getAdvancedStatistics());

      console.log(`✅ [Hook] تم تحديث الشخص: ${person.name}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في تحديث الشخص:', error);
      return false;
    }
  }, [familyGraph]);

  /**
   * حذف شخص من الشجرة
   * @param {string} personId - معرف الشخص
   */
  const removePerson = useCallback((personId) => {
    if (!familyGraph) return false;

    try {
      const person = familyGraph.nodes.get(personId);
      if (!person) return false;

      // إزالة العلاقات المرتبطة
      const relationsToRemove = [];
      familyGraph.edges.forEach((relation, relationId) => {
        if (relation.person1Id === personId || relation.person2Id === personId) {
          relationsToRemove.push(relationId);
        }
      });

      relationsToRemove.forEach(relationId => {
        familyGraph.edges.delete(relationId);
      });

      // إزالة الشخص من الفهارس
      familyGraph.nameIndex.forEach(personSet => personSet.delete(personId));
      familyGraph.generationIndex.forEach(personSet => personSet.delete(personId));
      familyGraph.relationIndex.forEach(personSet => personSet.delete(personId));

      // إزالة الشخص
      familyGraph.nodes.delete(personId);
      familyGraph.metadata.totalNodes--;

      // تحديث المكون المحدد إذا كان الشخص المحذوف محدداً
      setSelectedPersons(prev => prev.filter(p => p.globalId !== personId));

      // تحديث الإحصائيات
      setStatistics(familyGraph.getAdvancedStatistics());

      // إعادة إنشاء بيانات الشجرة
      if (defaultOptions.autoOptimize) {
        const newTreeData = familyGraph.generateTreeData();
        setTreeData(newTreeData);
      }

      console.log(`🗑️ [Hook] تم حذف الشخص: ${person.name}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في حذف الشخص:', error);
      return false;
    }
  }, [familyGraph, defaultOptions.autoOptimize]);

  // ==========================================================================
  // دوال تصدير واستيراد البيانات
  // ==========================================================================

  /**
   * تصدير بيانات الشجرة
   * @param {string} format - تنسيق التصدير (json, csv, gedcom)
   */
  const exportTreeData = useCallback((format = 'json') => {
    if (!familyGraph) {
      console.warn('⚠️ [Hook] لا توجد بيانات للتصدير');
      return null;
    }

    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '2.0',
          format,
          ...familyGraph.metadata
        },
        persons: Array.from(familyGraph.nodes.values()),
        families: Array.from(familyGraph.families.values()),
        relations: Array.from(familyGraph.edges.values()),
        statistics: familyGraph.getAdvancedStatistics()
      };

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
          
        case 'csv':
          return convertToCSV(exportData.persons);
          
        case 'gedcom':
          return convertToGEDCOM(exportData);
          
        default:
          return JSON.stringify(exportData, null, 2);
      }
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في تصدير البيانات:', error);
      setError(`خطأ في التصدير: ${error.message}`);
      return null;
    }
  }, [familyGraph]);

  /**
   * استيراد بيانات الشجرة
   * @param {string} data - البيانات المستوردة
   * @param {string} format - تنسيق البيانات
   */
  const importTreeData = useCallback(async (data, format = 'json') => {
    try {
      setLoading(true);
      setLoadingStage('استيراد البيانات...');

      let importedData;
      
      switch (format.toLowerCase()) {
        case 'json':
          importedData = JSON.parse(data);
          break;
          
        case 'csv':
          importedData = parseCSVData(data);
          break;
          
        default:
          throw new Error(`تنسيق غير مدعوم: ${format}`);
      }

      // إنشاء رسم بياني جديد
      const newGraph = new AdvancedFamilyGraph();
      
      // استيراد الأشخاص
      if (importedData.persons) {
        importedData.persons.forEach(personData => {
          newGraph.addPerson(personData);
        });
      }

      // استيراد العلاقات
      if (importedData.relations) {
        importedData.relations.forEach(relation => {
          newGraph.addRelation(
            relation.person1Id,
            relation.person2Id,
            relation.type,
            relation.metadata
          );
        });
      }

      // تحديث الحالة
      graphRef.current = newGraph;
      setFamilyGraph(newGraph);
      setTreeData(newGraph.generateTreeData());
      setStatistics(newGraph.getAdvancedStatistics());

      console.log(`✅ [Hook] تم استيراد البيانات بنجاح`);
      setLoadingStage('اكتمل الاستيراد');
      
      return true;
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في استيراد البيانات:', error);
      setError(`خطأ في الاستيراد: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingStage(''), 2000);
    }
  }, []);

  // ==========================================================================
  // دوال مساعدة وأدوات إضافية
  // ==========================================================================

  /**
   * إعادة تعيين جميع البيانات
   */
  const resetGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.clear();
    }
    
    setFamilyGraph(null);
    setTreeData(null);
    setStatistics(null);
    setSearchResults([]);
    setSelectedPersons([]);
    setError(null);
    
    retryCountRef.current = 0;
    
    console.log(`🔄 [Hook] تم إعادة تعيين الرسم البياني`);
  }, []);

  /**
   * تحسين الأداء يدوياً
   */
  const optimizePerformance = useCallback(() => {
    if (!familyGraph) return;

    try {
      familyGraph.optimizePerformance();
      setStatistics(familyGraph.getAdvancedStatistics());
      
      console.log(`⚡ [Hook] تم تحسين الأداء`);
      
    } catch (error) {
      console.error('❌ [Hook] خطأ في تحسين الأداء:', error);
    }
  }, [familyGraph]);

  /**
   * الحصول على معلومات مفصلة عن شخص
   * @param {string} personId - معرف الشخص
   */
  const getPersonDetails = useCallback((personId) => {
    if (!familyGraph) return null;

    const person = familyGraph.nodes.get(personId);
    if (!person) return null;

    // إضافة معلومات إضافية
    const relatedPersons = getRelatedPersons(personId, 1);
    const familyInfo = Array.from(person.familyUids).map(uid => 
      familyGraph.families.get(uid)
    ).filter(Boolean);

    return {
      ...person,
      relatedPersons,
      familyInfo,
      totalRelations: person.relations.parents.size + 
                     person.relations.children.size + 
                     person.relations.siblings.size + 
                     person.relations.spouses.size
    };
  }, [familyGraph, getRelatedPersons]);

  // ==========================================================================
  // تأثيرات جانبية ومراقبة
  // ==========================================================================

  // تنظيف عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.clear();
      }
    };
  }, []);

  // مراقبة التغييرات في إعدادات الأداء
  useEffect(() => {
    if (familyGraph && defaultOptions.autoOptimize) {
      const interval = setInterval(() => {
        familyGraph.optimizePerformance();
      }, 60000); // كل دقيقة

      return () => clearInterval(interval);
    }
  }, [familyGraph, defaultOptions.autoOptimize]);

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
    resetGraph,
    
    // دوال البحث والفلترة
    searchInTree,
    findRelationshipPath,
    filterPersons,
    
    // دوال التفاعل
    selectPerson,
    clearSelection,
    getRelatedPersons,
    getPersonDetails,
    
    // دوال إدارة البيانات
    addPerson,
    updatePerson,
    removePerson,
    addRelation,
    
    // دوال التصدير والاستيراد
    exportTreeData,
    importTreeData,
    
    // دوال الأداء
    optimizePerformance,
    
    // معلومات إضافية
    isReady: !loading && !error && familyGraph !== null,
    hasData: familyGraph && familyGraph.nodes.size > 0,
    retryCount: retryCountRef.current
  };
};

// ==========================================================================
// دوال مساعدة
// ==========================================================================

/**
 * حساب العمر من تاريخ الميلاد
 * @param {string} birthDate - تاريخ الميلاد
 * @returns {number} العمر
 */
const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return Math.max(0, age);
};

/**
 * تحويل البيانات إلى تنسيق CSV
 * @param {Array} persons - قائمة الأشخاص
 * @returns {string} البيانات بتنسيق CSV
 */
const convertToCSV = (persons) => {
  const headers = [
    'الاسم',
    'الاسم الأول',
    'اسم الأب',
    'اسم الجد',
    'اللقب',
    'القرابة',
    'تاريخ الميلاد',
    'الجنس',
    'الجيل'
  ];
  
  const rows = persons.map(person => [
    person.name || '',
    person.firstName || '',
    person.fatherName || '',
    person.grandfatherName || '',
    person.surname || '',
    person.relation || '',
    person.birthDate || '',
    person.gender || '',
    person.generation || 0
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
};

/**
 * تحويل البيانات إلى تنسيق GEDCOM
 * @param {Object} data - البيانات الكاملة
 * @returns {string} البيانات بتنسيق GEDCOM
 */
const convertToGEDCOM = (data) => {
  let gedcom = '0 HEAD\n';
  gedcom += '1 SOUR Family Tree App\n';
  gedcom += '1 DEST ANSTFILE\n';
  gedcom += '1 DATE ' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '\n';
  gedcom += '1 CHAR UTF-8\n';
  
  // إضافة الأشخاص
  data.persons.forEach((person, index) => {
    const id = `I${index + 1}`;
    gedcom += `0 @${id}@ INDI\n`;
    gedcom += `1 NAME ${person.firstName || ''} /${person.surname || ''}/\n`;
    if (person.birthDate) {
      gedcom += `1 BIRT\n2 DATE ${person.birthDate}\n`;
    }
    if (person.gender) {
      gedcom += `1 SEX ${person.gender === 'male' ? 'M' : 'F'}\n`;
    }
  });
  
  gedcom += '0 TRLR\n';
  
  return gedcom;
};

/**
 * تحليل بيانات CSV
 * @param {string} csvData - البيانات النصية CSV
 * @returns {Object} البيانات المحللة
 */
const parseCSVData = (csvData) => {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  const persons = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    const person = {};
    
    headers.forEach((header, index) => {
      person[header] = values[index] || '';
    });
    
    return person;
  });
  
  return { persons };
};

export default useAdvancedFamilyGraph;
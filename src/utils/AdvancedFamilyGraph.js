<<<<<<< HEAD
// =============================================================================
// AdvancedFamilyGraph.js - نظام شجرة العائلة المتقدم (مُصحح ومُبسط)
=======

All projects
شجرة العائلة
Private




Start a chat to keep conversations organized and re-use project knowledge.
Project knowledge
67% of project capacity used

SECURITY_FIRESTORE_RULES.txt
15 lines

txt



package.json
52 lines

json



firestore.indexes.json
77 lines

json



firebase.json
43 lines

json



package.json
24 lines

json



index.js
608 lines

js



sw.js
427 lines

js



manifest.json
160 lines

json



index.html
52 lines

html



ProtectedRoute.jsx
202 lines

jsx



main.jsx
786 lines

jsx



AuthContext.jsx
347 lines

jsx



AppRoutes.jsx
133 lines

jsx



App.jsx
456 lines

jsx



AdvancedFamilyGraph.js
1,492 lines

js



PrivacyPolicy.jsx
305 lines

jsx



PhoneLogin.jsx
411 lines

jsx



FamilyTree.jsx
7 lines

jsx



FamilySelection.jsx
6 lines

jsx



Family.jsx
1,251 lines

jsx



usePhoneAuth.js
280 lines

js



useAdvancedFamilyGraph.js
912 lines

js



storage.js
7 lines

js



cors.json
8 lines

json



config.js
25 lines

js



auth.js
11 lines

js



FamilyTreeContext.jsx
998 lines

jsx



FamilyTreeAdvanced.jsx
1,693 lines

jsx



FamilySelectionPage.jsx
515 lines

jsx



AdvancedFamilyFeatures.jsx
661 lines

jsx


Claude
AdvancedFamilyGraph.js

48.17 KB •1,492 lines
•
Formatting may be inconsistent from source

// =============================================================================
// AdvancedFamilyGraph.js - نظام شجرة العائلة المتقدم (مُصحح)
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
// =============================================================================

import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export class AdvancedFamilyGraph {
  constructor() {
    // البيانات الأساسية
<<<<<<< HEAD
    this.nodes = new Map();           // الأشخاص
    this.edges = new Map();           // العلاقات
    this.families = new Map();        // العائلات
    
    // الفهارس للبحث السريع
    this.nameIndex = new Map();       
    this.generationIndex = new Map(); 
    this.relationIndex = new Map();   
    
    // الذاكرة المؤقتة
    this.cache = new Map();           
    this.loadedFamilies = new Set();  
    
    this.metadata = {
      totalNodes: 0,
      totalEdges: 0,
      lastUpdated: Date.now()
    };
    
    this.config = {
      maxCacheSize: 1000,
      maxLoadDepth: 4,
      maxNodesPerQuery: 500
=======
    this.nodes = new Map();           // الأشخاص: Map<globalId, Person>
    this.edges = new Map();           // العلاقات المباشرة: Map<edgeId, Relation>
    this.families = new Map();        // العائلات: Map<familyUid, Family>
    
    // الفهارس للبحث السريع
    this.pathIndex = new Map();       // فهرس المسارات: Map<pathKey, Set<personId>>
    this.nameIndex = new Map();       // فهرس الأسماء: Map<term, Set<personId>>
    this.generationIndex = new Map(); // فهرس الأجيال: Map<generation, Set<personId>>
    this.relationIndex = new Map();   // فهرس العلاقات: Map<relationType, Set<personId>>
    
    // الذاكرة المؤقتة والأداء
    this.cache = new Map();           // ذاكرة التخزين المؤقت
    this.loadedFamilies = new Set();  // العائلات المحملة
    this.optimized = false;           // حالة التحسين
    this.metadata = {
      totalNodes: 0,
      totalEdges: 0,
      maxDepth: 0,
      lastUpdated: Date.now(),
      loadingStats: {
        totalLoadTime: 0,
        averageQueryTime: 0,
        cacheHitRate: 0
      }
    };
    
    // إعدادات الأداء
    this.config = {
      maxCacheSize: 1000,
      cacheExpiry: 5 * 60 * 1000, // 5 دقائق
      maxLoadDepth: 4,
      maxNodesPerQuery: 500,
      enableDetailedLogging: true
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    };
  }

  // ==========================================================================
<<<<<<< HEAD
  // إدارة الأشخاص
  // ==========================================================================

  addPerson(personData) {
    try {
      const globalId = this.generateGlobalId(personData);
      
      const person = {
=======
  // إدارة الأشخاص (Persons Management)
  // ==========================================================================

  /**
   * إضافة شخص جديد للرسم البياني
   * @param {Object} personData - بيانات الشخص
   * @returns {Object} الشخص المضاف
   */
  addPerson(personData) {
    const startTime = Date.now();
    
    try {
      // إنشاء معرف عالمي فريد
      const globalId = this.generateGlobalId(personData);
      
      // بناء كائن الشخص المحسن
      const person = {
        // البيانات الأساسية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        globalId,
        id: personData.id || globalId,
        name: personData.name || this.buildFullName(personData),
        firstName: personData.firstName || '',
        fatherName: personData.fatherName || '',
        grandfatherName: personData.grandfatherName || '',
        surname: personData.surname || '',
        
<<<<<<< HEAD
=======
        // المعلومات الشخصية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        birthDate: personData.birthDate || personData.birthdate || null,
        gender: this.determineGender(personData),
        avatar: personData.avatar || '/boy.png',
        relation: personData.relation || 'عضو',
        
<<<<<<< HEAD
=======
        // الانتماءات العائلية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        familyUids: new Set([personData.familyUid].filter(Boolean)),
        primaryFamilyUid: personData.familyUid || null,
        generation: personData.generation || 0,
        
<<<<<<< HEAD
=======
        // المسارات في العائلات المختلفة
        paths: new Map(),
        
        // العلاقات المباشرة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        relations: {
          parents: new Set(),
          children: new Set(),
          siblings: new Set(),
          spouses: new Set()
        },
        
<<<<<<< HEAD
=======
        // معلومات إضافية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        metadata: {
          addedAt: Date.now(),
          confidence: personData.confidence || 1.0,
          verified: personData.verified || false,
          source: personData.source || 'user',
          updatedAt: Date.now()
        },
        
<<<<<<< HEAD
        originalData: { ...personData }
      };

      this.nodes.set(globalId, person);
      this.metadata.totalNodes++;
      this.updateIndexes(person);
      
=======
        // البيانات الأصلية للمرجع
        originalData: { ...personData }
      };

      // إضافة مسار في العائلة الأساسية
      if (person.primaryFamilyUid) {
        this.addPersonPath(person, person.primaryFamilyUid);
      }

      // حفظ الشخص
      this.nodes.set(globalId, person);
      this.metadata.totalNodes++;
      
      // تحديث الفهارس
      this.updateIndexes(person);
      
      // تسجيل الأداء
      const endTime = Date.now();
      if (this.config.enableDetailedLogging) {
        console.log(`✅ تم إضافة الشخص: ${person.name} في ${endTime - startTime}ms`);
      }
      
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      return person;
      
    } catch (error) {
      console.error('❌ خطأ في إضافة الشخص:', error);
      throw new Error(`فشل في إضافة الشخص: ${error.message}`);
    }
  }

<<<<<<< HEAD
=======
  /**
   * إضافة مسار للشخص في عائلة معينة
   * @param {Object} person - الشخص
   * @param {string} familyUid - معرف العائلة
   * @param {string} parentId - معرف الوالد (اختياري)
   */
  addPersonPath(person, familyUid, parentId = null) {
    const pathData = {
      familyUid,
      parentId,
      fullPath: this.buildPersonPath(person, familyUid, parentId),
      pathLevel: this.calculatePathLevel(person, familyUid),
      generation: person.generation,
      addedAt: Date.now()
    };
    
    person.paths.set(familyUid, pathData);
    this.updatePathIndex(person, pathData);
  }

  /**
   * بناء الاسم الكامل
   * @param {Object} personData - بيانات الشخص
   * @returns {string} الاسم الكامل
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  buildFullName(personData) {
    const parts = [
      personData.firstName,
      personData.fatherName,
      personData.grandfatherName,
      personData.surname
    ].filter(Boolean);
    
    return parts.join(' ').trim() || 'غير محدد';
  }

<<<<<<< HEAD
  determineGender(personData) {
    if (personData.gender) return personData.gender;
    
=======
  /**
   * تحديد الجنس بناءً على البيانات
   * @param {Object} personData - بيانات الشخص
   * @returns {string} الجنس
   */
  determineGender(personData) {
    if (personData.gender) return personData.gender;
    
    // تحديد الجنس من القرابة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    const femaleRelations = ['بنت', 'أخت', 'أم', 'جدة', 'عمة', 'خالة'];
    const maleRelations = ['ابن', 'أخ', 'أب', 'جد', 'عم', 'خال', 'رب العائلة'];
    
    const relation = personData.relation || '';
    
    if (femaleRelations.includes(relation)) return 'female';
    if (maleRelations.includes(relation)) return 'male';
    
    return 'unknown';
  }

<<<<<<< HEAD
  generateGlobalId(personData) {
=======
  /**
   * إنشاء معرف عالمي فريد
   * @param {Object} personData - بيانات الشخص
   * @returns {string} المعرف العالمي
   */
  generateGlobalId(personData) {
    // استخدام بيانات مميزة لإنشاء hash
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    const uniqueString = [
      personData.firstName || '',
      personData.fatherName || '',
      personData.birthDate || personData.birthdate || '',
      personData.familyUid || '',
      personData.id || ''
    ].join('|').toLowerCase();
    
<<<<<<< HEAD
=======
    // حساب hash بسيط
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    let hash = 0;
    for (let i = 0; i < uniqueString.length; i++) {
      const char = uniqueString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
<<<<<<< HEAD
      hash = hash & hash;
=======
      hash = hash & hash; // تحويل لـ 32-bit integer
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    }
    
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substr(2, 5);
    
    return `person_${Math.abs(hash).toString(36)}_${timestamp}_${randomSuffix}`;
  }

  // ==========================================================================
<<<<<<< HEAD
  // تحميل البيانات
  // ==========================================================================

  async loadExtendedFamilies(userUid, options = {}) {
    const startTime = Date.now();
    
    const config = {
      maxDepth: options.maxDepth || this.config.maxLoadDepth,
      includeExtended: options.includeExtended !== false,
=======
  // إدارة العلاقات (Relations Management)
  // ==========================================================================

  /**
   * إضافة علاقة بين شخصين
   * @param {string} person1Id - معرف الشخص الأول
   * @param {string} person2Id - معرف الشخص الثاني
   * @param {string} relationType - نوع العلاقة
   * @param {Object} metadata - معلومات إضافية
   * @returns {Object} العلاقة المضافة
   */
  addRelation(person1Id, person2Id, relationType, metadata = {}) {
    if (!person1Id || !person2Id || person1Id === person2Id) {
      console.warn('⚠️ معرفات غير صحيحة للعلاقة');
      return null;
    }

    const person1 = this.nodes.get(person1Id);
    const person2 = this.nodes.get(person2Id);
    
    if (!person1 || !person2) {
      console.warn('⚠️ لم يتم العثور على الأشخاص للعلاقة');
      return null;
    }

    try {
      // إنشاء معرف العلاقة
      const relationId = `${person1Id}-${person2Id}-${relationType}`;
      
      // بناء كائن العلاقة
      const relation = {
        id: relationId,
        person1Id,
        person2Id,
        type: relationType,
        confidence: metadata.confidence || 1.0,
        establishedDate: metadata.date || Date.now(),
        source: metadata.source || 'user',
        verified: metadata.verified || false,
        bidirectional: this.isBidirectionalRelation(relationType),
        metadata: {
          ...metadata,
          createdAt: Date.now()
        }
      };

      // حفظ العلاقة
      this.edges.set(relationId, relation);
      this.metadata.totalEdges++;

      // تحديث العلاقات المباشرة للأشخاص
      this.updatePersonRelations(person1, person2, relationType);
      
      // تحديث المسارات المشتقة
      this.updateDerivedPaths(person1Id, person2Id, relationType);
      
      // تحديث فهرس العلاقات
      this.updateRelationIndex(relation);
      
      console.log(`✅ تم إضافة علاقة: ${person1.name} --[${relationType}]--> ${person2.name}`);
      
      return relation;
      
    } catch (error) {
      console.error('❌ خطأ في إضافة العلاقة:', error);
      return null;
    }
  }

  /**
   * تحديث العلاقات المباشرة للأشخاص
   * @param {Object} person1 - الشخص الأول
   * @param {Object} person2 - الشخص الثاني
   * @param {string} relationType - نوع العلاقة
   */
  updatePersonRelations(person1, person2, relationType) {
    switch (relationType) {
      case 'parent-child':
        person1.relations.children.add(person2.globalId);
        person2.relations.parents.add(person1.globalId);
        break;
        
      case 'child-parent':
        person1.relations.parents.add(person2.globalId);
        person2.relations.children.add(person1.globalId);
        break;
        
      case 'sibling':
        person1.relations.siblings.add(person2.globalId);
        person2.relations.siblings.add(person1.globalId);
        break;
        
      case 'marriage':
      case 'spouse':
        person1.relations.spouses.add(person2.globalId);
        person2.relations.spouses.add(person1.globalId);
        break;
    }
    
    // تحديث timestamp للأشخاص
    person1.metadata.updatedAt = Date.now();
    person2.metadata.updatedAt = Date.now();
  }

  /**
   * فحص إذا كانت العلاقة ثنائية الاتجاه
   * @param {string} relationType - نوع العلاقة
   * @returns {boolean} هل العلاقة ثنائية الاتجاه
   */
  isBidirectionalRelation(relationType) {
    const bidirectionalTypes = ['sibling', 'marriage', 'spouse', 'cousin'];
    return bidirectionalTypes.includes(relationType);
  }

  // ==========================================================================
  // تحميل البيانات (Data Loading)
  // ==========================================================================

  /**
   * تحميل الشجرة الموسعة - الدالة الرئيسية
   * @param {string} userUid - معرف المستخدم
   * @param {Object} options - خيارات التحميل
   * @returns {Promise<Object>} بيانات الشجرة
   */
  async loadExtendedFamilies(userUid, options = {}) {
    const startTime = Date.now();
    
    // إعدادات التحميل
    const config = {
      maxDepth: options.maxDepth || this.config.maxLoadDepth,
      includeExtended: options.includeExtended !== false,
      loadConnections: options.loadConnections !== false,
      useCache: options.useCache !== false,
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      ...options
    };
    
    console.log(`🚀 بدء تحميل الشجرة الموسعة للمستخدم: ${userUid}`);
<<<<<<< HEAD
    
    try {
=======
    console.log(`⚙️ إعدادات التحميل:`, config);
    
    try {
      // تنظيف البيانات السابقة إذا لزم الأمر
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      if (options.clearPrevious) {
        this.clear();
      }
      
<<<<<<< HEAD
      // تحميل العائلة الأساسية
      await this.loadPrimaryFamily(userUid);
      
      // تحميل العائلات المرتبطة
      if (config.includeExtended) {
        await this.loadConnectedFamilies(userUid, config.maxDepth);
      }
      
      // بناء العلاقات
      this.buildAllRelations();
      
      // بناء الفهارس
      this.buildAllIndexes();
      
      // إنشاء بيانات الشجرة
      const treeData = this.generateTreeData();
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      this.metadata.lastUpdated = endTime;
      
      console.log(`✅ اكتمل تحميل الشجرة في ${loadTime}ms`);
=======
      // الخطوة 1: تحميل العائلة الأساسية
      console.log(`📥 تحميل العائلة الأساسية...`);
      await this.loadPrimaryFamily(userUid);
      
      // الخطوة 2: تحميل العائلات المرتبطة
      if (config.includeExtended) {
        console.log(`🔗 تحميل العائلات المرتبطة (العمق: ${config.maxDepth})...`);
        await this.loadConnectedFamilies(userUid, config.maxDepth);
      }
      
      // الخطوة 3: بناء العلاقات والاتصالات
      if (config.loadConnections) {
        console.log(`🔧 بناء العلاقات والاتصالات...`);
        await this.buildAllRelations();
      }
      
      // الخطوة 4: بناء الفهارس
      console.log(`📊 بناء الفهارس...`);
      this.buildAllIndexes();
      
      // الخطوة 5: تحسين الأداء
      console.log(`⚡ تحسين الأداء...`);
      this.optimizePerformance();
      
      // إنشاء بيانات الشجرة
      const treeData = this.generateTreeData();
      
      // تسجيل النتائج النهائية
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      this.metadata.loadingStats.totalLoadTime = loadTime;
      this.metadata.lastUpdated = endTime;
      
      console.log(`✅ اكتمل تحميل الشجرة في ${loadTime}ms`);
      console.log(`📈 إحصائيات التحميل:`, {
        أشخاص: this.nodes.size,
        عائلات: this.families.size,
        علاقات: this.edges.size,
        'وقت التحميل': `${loadTime}ms`
      });
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      
      return {
        treeData,
        graph: this,
        stats: this.getAdvancedStatistics(),
        loadTime,
        success: true
      };
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الموسعة:', error);
      
      return {
        treeData: null,
        graph: this,
        error: error.message,
        success: false
      };
    }
  }

<<<<<<< HEAD
=======
  /**
   * تحميل العائلة الأساسية
   * @param {string} userUid - معرف المستخدم
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  async loadPrimaryFamily(userUid) {
    if (this.loadedFamilies.has(userUid)) {
      console.log(`⚡ العائلة ${userUid} محملة مسبقاً`);
      return;
    }
    
    try {
      console.log(`📥 تحميل العائلة الأساسية: ${userUid}`);
      
<<<<<<< HEAD
=======
      // تحميل أعضاء العائلة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      const familySnapshot = await getDocs(
        collection(db, 'users', userUid, 'family')
      );
      
      const familyMembers = [];
      
      familySnapshot.forEach(doc => {
        const memberData = { 
          ...doc.data(), 
          id: doc.id, 
          familyUid: userUid 
        };
        
<<<<<<< HEAD
        if (memberData.firstName && memberData.firstName.trim() !== '') {
=======
        // تنظيف البيانات
        if (memberData.name && memberData.name.trim() !== '') {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        }
      });
      
      if (familyMembers.length === 0) {
        console.warn(`⚠️ لا توجد أعضاء في العائلة: ${userUid}`);
<<<<<<< HEAD
=======
        // إنشاء بيانات تجريبية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        const sampleData = this.createSampleFamily(userUid);
        sampleData.forEach(memberData => {
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        });
      }
      
<<<<<<< HEAD
      const family = this.createFamilyObject(userUid, familyMembers);
      this.families.set(userUid, family);
      
      this.buildInternalFamilyRelations(userUid);
=======
      // إنشاء كائن العائلة
      const family = this.createFamilyObject(userUid, familyMembers);
      this.families.set(userUid, family);
      
      // بناء العلاقات الداخلية
      this.buildInternalFamilyRelations(userUid);
      
      // تسجيل العائلة كمحملة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      this.loadedFamilies.add(userUid);
      
      console.log(`✅ تم تحميل العائلة: ${userUid} (${familyMembers.length} أفراد)`);
      
    } catch (error) {
      console.error(`❌ خطأ في تحميل العائلة ${userUid}:`, error);
      throw error;
    }
  }

<<<<<<< HEAD
=======
  /**
   * إنشاء بيانات عائلة تجريبية
   * @param {string} userUid - معرف المستخدم
   * @returns {Array} بيانات العائلة التجريبية
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  createSampleFamily(userUid) {
    console.log(`🔧 إنشاء بيانات تجريبية للمستخدم: ${userUid}`);
    
    return [
      {
        id: `${userUid}_head`,
        name: 'رب الأسرة',
        firstName: 'رب',
        fatherName: 'الأسرة',
        gender: 'male',
        relation: 'رب العائلة',
        birthDate: '1970-01-01',
        familyUid: userUid,
        generation: 0
      },
      {
<<<<<<< HEAD
=======
        id: `${userUid}_spouse`,
        name: 'ربة الأسرة',
        firstName: 'ربة',
        fatherName: 'الأسرة',
        gender: 'female',
        relation: 'زوجة',
        birthDate: '1975-01-01',
        familyUid: userUid,
        generation: 0
      },
      {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        id: `${userUid}_child1`,
        name: 'الابن الأول',
        firstName: 'الابن',
        fatherName: 'الأول',
        gender: 'male',
        relation: 'ابن',
        birthDate: '2000-01-01',
        familyUid: userUid,
        generation: 1
<<<<<<< HEAD
=======
      },
      {
        id: `${userUid}_child2`,
        name: 'الابنة الثانية',
        firstName: 'الابنة',
        fatherName: 'الثانية',
        gender: 'female',
        relation: 'بنت',
        birthDate: '2002-01-01',
        familyUid: userUid,
        generation: 1
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      }
    ];
  }

<<<<<<< HEAD
=======
  // ==========================================================================
  // بناء العلاقات المشتقة (إضافة الدوال المفقودة)
  // ==========================================================================

  /**
   * بناء العلاقات المشتقة - الدالة المفقودة
   */
  buildDerivedRelations() {
    console.log('🔗 بناء العلاقات المشتقة...');
    
    try {
      // بناء علاقات الأجداد والأحفاد
      this.buildGrandparentRelations();
      
      // بناء علاقات الأعمام والعمات
      this.buildUncleAuntRelations();
      
      // بناء علاقات أبناء الأعمام
      this.buildCousinRelations();
      
      console.log('✅ تم بناء العلاقات المشتقة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ خطأ في بناء العلاقات المشتقة:', error);
      return false;
    }
  }

  /**
   * بناء علاقات الأجداد والأحفاد
   */
  buildGrandparentRelations() {
    for (const [memberId, member] of this.nodes) {
      // البحث عن الأجداد (والدي الوالدين)
      if (member.relations.parents.size > 0) {
        member.relations.parents.forEach(parentId => {
          const parent = this.nodes.get(parentId);
          if (parent && parent.relations.parents.size > 0) {
            parent.relations.parents.forEach(grandparentId => {
              this.addRelation(memberId, grandparentId, 'grandchild-grandparent', {
                source: 'derived',
                confidence: 0.8
              });
            });
          }
        });
      }
    }
  }

  /**
   * بناء علاقات الأعمام والعمات
   */
  buildUncleAuntRelations() {
    for (const [memberId, member] of this.nodes) {
      if (member.relations.parents.size > 0) {
        member.relations.parents.forEach(parentId => {
          const parent = this.nodes.get(parentId);
          if (parent && parent.relations.siblings.size > 0) {
            parent.relations.siblings.forEach(uncleAuntId => {
              this.addRelation(memberId, uncleAuntId, 'nephew-uncle', {
                source: 'derived',
                confidence: 0.7
              });
            });
          }
        });
      }
    }
  }

  /**
   * بناء علاقات أبناء الأعمام
   */
  buildCousinRelations() {
    for (const [memberId, member] of this.nodes) {
      if (member.relations.parents.size > 0) {
        member.relations.parents.forEach(parentId => {
          const parent = this.nodes.get(parentId);
          if (parent && parent.relations.siblings.size > 0) {
            parent.relations.siblings.forEach(uncleAuntId => {
              const uncleAunt = this.nodes.get(uncleAuntId);
              if (uncleAunt && uncleAunt.relations.children.size > 0) {
                uncleAunt.relations.children.forEach(cousinId => {
                  if (cousinId !== memberId) {
                    this.addRelation(memberId, cousinId, 'cousin', {
                      source: 'derived',
                      confidence: 0.6
                    });
                  }
                });
              }
            });
          }
        });
      }
    }
  }

  /**
   * تحسين الفهارس - الدالة المفقودة
   */
  optimizeIndexes() {
    console.log('⚡ تحسين الفهارس...');
    
    try {
      // تحسين فهرس الأسماء
      this.optimizeNameIndex();
      
      // تحسين فهرس الأجيال
      this.optimizeGenerationIndex();
      
      // تحسين فهرس العلاقات
      this.optimizeRelationIndexes();
      
      // تحديد أن التحسين تم
      this.optimized = true;
      
      console.log('✅ تم تحسين الفهارس بنجاح');
      return true;
    } catch (error) {
      console.error('❌ خطأ في تحسين الفهارس:', error);
      return false;
    }
  }

  /**
   * تحسين فهرس الأسماء
   */
  optimizeNameIndex() {
    this.nameIndex.clear();
    
    for (const [memberId, member] of this.nodes) {
      if (member.name) {
        const normalizedName = member.name.toLowerCase().trim();
        const words = normalizedName.split(/\s+/).filter(word => word.length > 1);
        
        words.forEach(word => {
          if (!this.nameIndex.has(word)) {
            this.nameIndex.set(word, new Set());
          }
          this.nameIndex.get(word).add(memberId);
        });
      }
    }
  }

  /**
   * تحسين فهرس الأجيال
   */
  optimizeGenerationIndex() {
    this.generationIndex.clear();
    
    for (const [memberId, member] of this.nodes) {
      const generation = member.generation || 0;
      if (!this.generationIndex.has(generation)) {
        this.generationIndex.set(generation, new Set());
      }
      this.generationIndex.get(generation).add(memberId);
    }
  }

  /**
   * تحسين فهرس العلاقات
   */
  optimizeRelationIndexes() {
    this.relationIndex.clear();
    
    for (const [relationId, relation] of this.edges) {
      const relationType = relation.type;
      if (!this.relationIndex.has(relationType)) {
        this.relationIndex.set(relationType, new Set());
      }
      this.relationIndex.get(relationType).add(relationId);
    }
  }

  // ==========================================================================
  // باقي الدوال (استكمال الكود الأصلي)
  // ==========================================================================

  /**
   * تحميل العائلات المرتبطة
   * @param {string} rootUserUid - معرف المستخدم الجذر
   * @param {number} maxDepth - أقصى عمق للتحميل
   * @param {number} currentDepth - العمق الحالي
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  async loadConnectedFamilies(rootUserUid, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      console.log(`🛑 وصل لأقصى عمق: ${maxDepth}`);
      return;
    }
    
    try {
      console.log(`🔍 البحث عن العائلات المرتبطة (المستوى: ${currentDepth + 1}/${maxDepth})`);
      
<<<<<<< HEAD
=======
      // البحث عن العائلات المرتبطة بطرق مختلفة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      const connectedFamilies = await this.findConnectedFamilies(rootUserUid);
      
      console.log(`📡 تم العثور على ${connectedFamilies.size} عائلة مرتبطة`);
      
<<<<<<< HEAD
=======
      // تحميل العائلات المرتبطة بالتوازي
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      const loadPromises = Array.from(connectedFamilies).map(async (familyUid) => {
        if (!this.loadedFamilies.has(familyUid)) {
          try {
            await this.loadSingleConnectedFamily(familyUid, rootUserUid);
            
<<<<<<< HEAD
=======
            // التحميل التدريجي للمستوى التالي
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
            if (currentDepth + 1 < maxDepth) {
              await this.loadConnectedFamilies(familyUid, maxDepth, currentDepth + 1);
            }
          } catch (error) {
            console.warn(`⚠️ فشل في تحميل العائلة المرتبطة ${familyUid}:`, error.message);
          }
        }
      });
      
<<<<<<< HEAD
=======
      // انتظار انتهاء جميع عمليات التحميل
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      await Promise.all(loadPromises);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات المرتبطة:', error);
    }
  }

<<<<<<< HEAD
=======
  /**
   * البحث عن العائلات المرتبطة
   * @param {string} familyUid - معرف العائلة
   * @returns {Set<string>} مجموعة معرفات العائلات المرتبطة
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  async findConnectedFamilies(familyUid) {
    const connectedFamilies = new Set();
    
    try {
<<<<<<< HEAD
=======
      // طريقة 1: البحث عن العائلات المرتبطة مباشرة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      const linkedQuery = query(
        collection(db, 'users'),
        where('linkedToFamilyHead', '==', familyUid),
        limit(50)
      );
      
      const linkedSnapshot = await getDocs(linkedQuery);
      linkedSnapshot.forEach(doc => {
        connectedFamilies.add(doc.id);
      });
      
    } catch (error) {
      console.warn('⚠️ خطأ في البحث عن العائلات المرتبطة:', error);
    }
    
    return connectedFamilies;
  }

<<<<<<< HEAD
=======
  /**
   * تحميل عائلة مرتبطة واحدة
   * @param {string} familyUid - معرف العائلة
   * @param {string} parentFamilyUid - معرف العائلة الأصل
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  async loadSingleConnectedFamily(familyUid, parentFamilyUid) {
    try {
      console.log(`📥 تحميل العائلة المرتبطة: ${familyUid}`);
      
      const familySnapshot = await getDocs(
        collection(db, 'users', familyUid, 'family')
      );
      
      if (familySnapshot.empty) {
        console.warn(`⚠️ العائلة ${familyUid} فارغة`);
        return;
      }
      
      const familyMembers = [];
      
      familySnapshot.forEach(doc => {
        const memberData = { 
          ...doc.data(), 
          id: doc.id, 
          familyUid: familyUid,
          connectedToFamily: parentFamilyUid
        };
        
<<<<<<< HEAD
        if (memberData.firstName && memberData.firstName.trim() !== '') {
=======
        if (memberData.name && memberData.name.trim() !== '') {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        }
      });
      
      if (familyMembers.length === 0) {
        console.warn(`⚠️ لا توجد أعضاء صالحين في العائلة: ${familyUid}`);
        return;
      }
      
<<<<<<< HEAD
      const family = this.createFamilyObject(familyUid, familyMembers, parentFamilyUid);
      this.families.set(familyUid, family);
      
      this.buildInternalFamilyRelations(familyUid);
=======
      // إنشاء كائن العائلة
      const family = this.createFamilyObject(familyUid, familyMembers, parentFamilyUid);
      this.families.set(familyUid, family);
      
      // بناء العلاقات الداخلية
      this.buildInternalFamilyRelations(familyUid);
      
      // ربط العائلة بالعائلة الأصل
      this.linkFamilies(parentFamilyUid, familyUid);
      
      // تسجيل العائلة كمحملة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      this.loadedFamilies.add(familyUid);
      
      console.log(`✅ تم تحميل العائلة المرتبطة: ${familyUid} (${familyMembers.length} أفراد)`);
      
    } catch (error) {
      console.error(`❌ خطأ في تحميل العائلة المرتبطة ${familyUid}:`, error);
      throw error;
    }
  }

  // ==========================================================================
<<<<<<< HEAD
  // بناء العلاقات
  // ==========================================================================

  buildAllRelations() {
    console.log(`🔧 بناء جميع العلاقات...`);
    
    try {
=======
  // بناء العلاقات (Relations Building)
  // ==========================================================================

  /**
   * بناء جميع العلاقات
   */
  async buildAllRelations() {
    console.log(`🔧 بناء جميع العلاقات...`);
    
    try {
      // بناء العلاقات داخل كل عائلة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      for (const familyUid of this.families.keys()) {
        this.buildInternalFamilyRelations(familyUid);
      }
      
<<<<<<< HEAD
=======
      // ربط العائلات ببعضها
      this.linkAllFamilies();
      
      // بناء العلاقات المشتقة (أجداد، أحفاد، إلخ)
      this.buildDerivedRelations();
      
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      console.log(`✅ تم بناء جميع العلاقات`);
      
    } catch (error) {
      console.error('❌ خطأ في بناء العلاقات:', error);
    }
  }

<<<<<<< HEAD
=======
  /**
   * بناء العلاقات داخل عائلة واحدة
   * @param {string} familyUid - معرف العائلة
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  buildInternalFamilyRelations(familyUid) {
    const family = this.families.get(familyUid);
    if (!family) return;
    
    const familyHead = family.head;
    if (!familyHead) return;
    
    console.log(`🔧 بناء العلاقات الداخلية للعائلة: ${familyUid}`);
    
<<<<<<< HEAD
=======
    // ربط الأطفال بالوالد
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    const children = family.members.filter(m => 
      m.relation === 'ابن' || m.relation === 'بنت'
    );
    
    children.forEach(child => {
<<<<<<< HEAD
      familyHead.relations.children.add(child.globalId);
      child.relations.parents.add(familyHead.globalId);
    });
    
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        children[i].relations.siblings.add(children[j].globalId);
        children[j].relations.siblings.add(children[i].globalId);
=======
      this.addRelation(familyHead.globalId, child.globalId, 'parent-child', {
        source: 'family-structure',
        confidence: 0.9
      });
    });
    
    // ربط الأشقاء ببعضهم البعض
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        this.addRelation(children[i].globalId, children[j].globalId, 'sibling', {
          source: 'family-structure',
          confidence: 0.9
        });
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      }
    }
  }

<<<<<<< HEAD
  // ==========================================================================
  // إنشاء كائنات مساعدة
  // ==========================================================================

=======
  /**
   * ربط جميع العائلات
   */
  linkAllFamilies() {
    console.log(`🔗 ربط جميع العائلات...`);
    
    const familyArray = Array.from(this.families.values());
    
    for (let i = 0; i < familyArray.length; i++) {
      for (let j = i + 1; j < familyArray.length; j++) {
        this.linkFamilies(familyArray[i].uid, familyArray[j].uid);
      }
    }
  }

  /**
   * ربط عائلتين ببعضهما البعض
   * @param {string} family1Uid - معرف العائلة الأولى
   * @param {string} family2Uid - معرف العائلة الثانية
   */
  linkFamilies(family1Uid, family2Uid) {
    const family1 = this.families.get(family1Uid);
    const family2 = this.families.get(family2Uid);
    
    if (!family1 || !family2 || family1Uid === family2Uid) return;
    
    // البحث عن الرابط بين العائلتين
    const linkInfo = this.findFamilyLinkage(family1, family2);
    
    if (linkInfo) {
      console.log(`🔗 ربط العائلات: ${family1.name} ←→ ${family2.name} (${linkInfo.type})`);
      
      this.addRelation(
        linkInfo.person1.globalId,
        linkInfo.person2.globalId,
        linkInfo.relationType,
        {
          source: 'inter-family-link',
          confidence: linkInfo.confidence,
          linkType: linkInfo.type
        }
      );
    }
  }

  /**
   * البحث عن الرابط بين عائلتين
   * @param {Object} family1 - العائلة الأولى
   * @param {Object} family2 - العائلة الثانية
   * @returns {Object|null} معلومات الرابط
   */
  findFamilyLinkage(family1, family2) {
    // طريقة أساسية: فحص العلاقات الأسرية
    if (family2.parentFamilyUid === family1.uid) {
      return {
        type: 'parent-child-families',
        person1: family1.head,
        person2: family2.head,
        relationType: 'parent-child',
        confidence: 0.9
      };
    }
    
    return null;
  }

  // ==========================================================================
  // إنشاء كائنات مساعدة (Helper Objects)
  // ==========================================================================

  /**
   * إنشاء كائن العائلة
   * @param {string} familyUid - معرف العائلة
   * @param {Array} members - أعضاء العائلة
   * @param {string} parentFamilyUid - معرف العائلة الأصل
   * @returns {Object} كائن العائلة
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  createFamilyObject(familyUid, members, parentFamilyUid = null) {
    const head = members.find(m => m.relation === 'رب العائلة') || members[0];
    
    const family = {
      uid: familyUid,
      name: head ? `عائلة ${head.firstName || head.name}` : `عائلة ${familyUid}`,
      head,
      members,
      parentFamilyUid,
      
<<<<<<< HEAD
=======
      // إحصائيات العائلة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      stats: {
        totalMembers: members.length,
        males: members.filter(m => m.gender === 'male').length,
        females: members.filter(m => m.gender === 'female').length,
<<<<<<< HEAD
        children: members.filter(m => m.relation === 'ابن' || m.relation === 'بنت').length
      },
      
=======
        children: members.filter(m => m.relation === 'ابن' || m.relation === 'بنت').length,
        generations: this.calculateFamilyGenerations(members)
      },
      
      // معلومات التحميل
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      metadata: {
        loadedAt: Date.now(),
        source: 'firebase',
        isConnected: !!parentFamilyUid
      }
    };
    
    return family;
  }

<<<<<<< HEAD
  // ==========================================================================
  // الفهرسة والبحث
  // ==========================================================================

=======
  /**
   * حساب أجيال العائلة
   * @param {Array} members - أعضاء العائلة
   * @returns {Object} معلومات الأجيال
   */
  calculateFamilyGenerations(members) {
    const generations = members.map(m => m.generation || 0);
    
    return {
      min: Math.min(...generations),
      max: Math.max(...generations),
      range: Math.max(...generations) - Math.min(...generations) + 1
    };
  }

  // ==========================================================================
  // الفهرسة والبحث (Indexing & Search)
  // ==========================================================================

  /**
   * تحديث جميع الفهارس
   * @param {Object} person - الشخص
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  updateIndexes(person) {
    this.updateNameIndex(person);
    this.updateGenerationIndex(person);
    this.updateRelationIndex(person);
  }

<<<<<<< HEAD
=======
  /**
   * تحديث فهرس الأسماء
   * @param {Object} person - الشخص
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  updateNameIndex(person) {
    const searchTerms = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname,
      person.name
    ].filter(Boolean).join(' ').toLowerCase();
    
    const words = searchTerms.split(/\s+/).filter(word => word.length > 1);
    
    words.forEach(word => {
      if (!this.nameIndex.has(word)) {
        this.nameIndex.set(word, new Set());
      }
      this.nameIndex.get(word).add(person.globalId);
    });
  }

<<<<<<< HEAD
=======
  /**
   * تحديث فهرس الأجيال
   * @param {Object} person - الشخص
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  updateGenerationIndex(person) {
    const generation = person.generation || 0;
    
    if (!this.generationIndex.has(generation)) {
      this.generationIndex.set(generation, new Set());
    }
    this.generationIndex.get(generation).add(person.globalId);
  }

<<<<<<< HEAD
=======
  /**
   * تحديث فهرس العلاقات
   * @param {Object} person - الشخص
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  updateRelationIndex(person) {
    const relation = person.relation || 'unknown';
    
    if (!this.relationIndex.has(relation)) {
      this.relationIndex.set(relation, new Set());
    }
    this.relationIndex.get(relation).add(person.globalId);
  }

<<<<<<< HEAD
  buildAllIndexes() {
    console.log(`📊 بناء جميع الفهارس...`);
    
=======
  /**
   * بناء جميع الفهارس
   */
  buildAllIndexes() {
    console.log(`📊 بناء جميع الفهارس...`);
    
    // مسح الفهارس الحالية
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    this.nameIndex.clear();
    this.generationIndex.clear();
    this.relationIndex.clear();
    
<<<<<<< HEAD
=======
    // إعادة بناء الفهارس
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    this.nodes.forEach(person => {
      this.updateIndexes(person);
    });
    
    console.log(`✅ تم بناء الفهارس:`, {
      أسماء: this.nameIndex.size,
      أجيال: this.generationIndex.size,
      علاقات: this.relationIndex.size
    });
  }

  // ==========================================================================
<<<<<<< HEAD
  // البحث المتقدم
  // ==========================================================================

  advancedSearch(query, filters = {}) {
    const results = [];
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);
    
    // البحث في فهرس الأسماء
    queryWords.forEach(word => {
      if (this.nameIndex.has(word)) {
        const personIds = this.nameIndex.get(word);
        personIds.forEach(personId => {
          const person = this.nodes.get(personId);
          if (person && !results.find(r => r.globalId === personId)) {
            // تطبيق الفلاتر
            if (filters.relation && person.relation !== filters.relation) return;
            if (filters.generation !== undefined && person.generation !== filters.generation) return;
            
            results.push(person);
          }
        });
      }
    });
    
    return results;
  }

  findOptimalPath(person1Id, person2Id) {
    // بحث بسيط للمسار
    if (person1Id === person2Id) return [];
    
    const person1 = this.nodes.get(person1Id);
    const person2 = this.nodes.get(person2Id);
    
    if (!person1 || !person2) return null;
    
    // فحص العلاقات المباشرة
    if (person1.relations.children.has(person2Id)) {
      return [person1, person2];
    }
    if (person1.relations.parents.has(person2Id)) {
      return [person1, person2];
    }
    if (person1.relations.siblings.has(person2Id)) {
      return [person1, person2];
    }
    
    return null; // لا يوجد مسار مباشر
  }

  // ==========================================================================
  // إنشاء بيانات الشجرة
  // ==========================================================================

=======
  // دوال مساعدة أخرى (Utility Functions)
  // ==========================================================================

  /**
   * مسح جميع البيانات
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.families.clear();
    this.pathIndex.clear();
    this.nameIndex.clear();
    this.generationIndex.clear();
    this.relationIndex.clear();
    this.cache.clear();
    this.loadedFamilies.clear();
    
    this.metadata = {
      totalNodes: 0,
      totalEdges: 0,
      maxDepth: 0,
      lastUpdated: Date.now(),
      loadingStats: {
        totalLoadTime: 0,
        averageQueryTime: 0,
        cacheHitRate: 0
      }
    };
  }

  /**
   * تحسين الأداء
   */
  optimizePerformance() {
    // تنظيف الذاكرة المؤقتة
    this.cleanupCache();
    
    // تحسين الفهارس
    this.optimizeIndexes();
    
    // تحديث إحصائيات الأداء
    this.updatePerformanceStats();
  }

  /**
   * تنظيف الذاكرة المؤقتة
   */
  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.config.cacheExpiry) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    // تقليل الحجم إذا لزم الأمر
    if (this.cache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - this.config.maxCacheSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * تحديث إحصائيات الأداء
   */
  updatePerformanceStats() {
    // حساب معدل إصابة الذاكرة المؤقتة
    this.metadata.loadingStats.cacheHitRate = this.cache.size / Math.max(this.nodes.size, 1);
    
    // حساب متوسط وقت الاستعلام
    this.metadata.loadingStats.averageQueryTime = 
      this.metadata.loadingStats.totalLoadTime / Math.max(this.loadedFamilies.size, 1);
  }

  /**
   * إنشاء بيانات الشجرة لـ react-d3-tree
   * @param {string} rootPersonId - معرف الشخص الجذر
   * @returns {Object|null} بيانات الشجرة
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  generateTreeData(rootPersonId = null) {
    if (!rootPersonId) {
      rootPersonId = this.selectOptimalRoot();
    }
    
    if (!rootPersonId) {
      console.warn('⚠️ لم يتم العثور على جذر مناسب للشجرة');
      return null;
    }
    
    console.log(`🌳 إنشاء بيانات الشجرة من الجذر: ${this.nodes.get(rootPersonId)?.name}`);
    
    const visited = new Set();
    const maxNodes = this.config.maxNodesPerQuery;
    let nodeCount = 0;
    
    const buildNode = (personId, depth = 0) => {
      if (visited.has(personId) || nodeCount >= maxNodes || depth > 15) {
        return null;
      }
      
      visited.add(personId);
      nodeCount++;
      
      const person = this.nodes.get(personId);
      if (!person) return null;
      
      const node = {
        name: person.name,
        id: person.globalId,
        avatar: person.avatar,
        attributes: {
          ...person,
          depth,
          childrenCount: person.relations.children.size,
          familyCount: person.familyUids.size,
          hasExtendedFamily: person.familyUids.size > 1
        },
        children: []
      };
      
<<<<<<< HEAD
=======
      // إضافة الأطفال
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      const childrenArray = Array.from(person.relations.children);
      for (const childId of childrenArray) {
        const childNode = buildNode(childId, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      }
      
      return node;
    };
    
    const treeData = buildNode(rootPersonId);
    
    console.log(`✅ تم إنشاء بيانات الشجرة: ${nodeCount} عقدة`);
    
    return treeData;
  }

<<<<<<< HEAD
=======
  /**
   * اختيار أفضل جذر للشجرة
   * @returns {string|null} معرف أفضل جذر
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  selectOptimalRoot() {
    let bestRoot = null;
    let maxScore = -1;
    
    this.nodes.forEach((person, personId) => {
      let score = 0;
      
<<<<<<< HEAD
      score += person.relations.children.size * 15;
      
      if (person.relation === 'رب العائلة') score += 100;
      
      score += (person.generation || 0) * 10;
      
      if (person.birthDate) score += 10;
      if (person.avatar && person.avatar !== '/boy.png') score += 10;
      
      if (person.metadata.verified) score += 25;
      score += person.metadata.confidence * 20;
      
=======
      // نقاط للأطفال
      score += person.relations.children.size * 15;
      
      // نقاط لكونه رب عائلة
      if (person.relation === 'رب العائلة') score += 100;
      
      // نقاط للجيل (الأجيال الأعلى أولوية)
      score += (person.generation || 0) * 10;
      
      // نقاط للمعلومات المكتملة
      if (person.birthDate) score += 10;
      if (person.avatar && person.avatar !== '/boy.png') score += 10;
      
      // نقاط للتحقق والثقة
      if (person.metadata.verified) score += 25;
      score += person.metadata.confidence * 20;
      
      // نقاط لتعدد العائلات
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
      score += person.familyUids.size * 5;
      
      if (score > maxScore) {
        maxScore = score;
        bestRoot = personId;
      }
    });
    
    return bestRoot;
  }

<<<<<<< HEAD
  // ==========================================================================
  // الإحصائيات
  // ==========================================================================

=======
  /**
   * الحصول على إحصائيات متقدمة
   * @returns {Object} الإحصائيات
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  getAdvancedStatistics() {
    return {
      overview: {
        totalPersons: this.nodes.size,
        totalFamilies: this.families.size,
        totalRelations: this.edges.size,
        loadedFamilies: this.loadedFamilies.size,
        lastUpdated: this.metadata.lastUpdated
      },
      
      performance: {
<<<<<<< HEAD
        totalLoadTime: 0,
=======
        totalLoadTime: this.metadata.loadingStats.totalLoadTime,
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        cacheSize: this.cache.size,
        indexSizes: {
          names: this.nameIndex.size,
          generations: this.generationIndex.size,
          relations: this.relationIndex.size
        }
      },
      
      families: Array.from(this.families.values()).map(family => ({
        uid: family.uid,
        name: family.name,
        memberCount: family.members.length,
        hasHead: !!family.head,
        isConnected: !!family.parentFamilyUid
      })),
      
      generations: this.getGenerationDistribution(),
      genders: this.getGenderDistribution()
    };
  }

<<<<<<< HEAD
=======
  /**
   * توزيع الأجيال
   * @returns {Object} توزيع الأجيال
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  getGenerationDistribution() {
    const distribution = {};
    
    this.generationIndex.forEach((personIds, generation) => {
      distribution[generation] = personIds.size;
    });
    
    return distribution;
  }

<<<<<<< HEAD
=======
  /**
   * توزيع الجنس
   * @returns {Object} توزيع الجنس
   */
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  getGenderDistribution() {
    const distribution = { male: 0, female: 0, unknown: 0 };
    
    this.nodes.forEach(person => {
      distribution[person.gender]++;
    });
    
    return distribution;
  }

  // ==========================================================================
<<<<<<< HEAD
  // دوال مساعدة
  // ==========================================================================

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.families.clear();
    this.nameIndex.clear();
    this.generationIndex.clear();
    this.relationIndex.clear();
    this.cache.clear();
    this.loadedFamilies.clear();
    
    this.metadata = {
      totalNodes: 0,
      totalEdges: 0,
      lastUpdated: Date.now()
    };
  }

  optimizePerformance() {
    this.cleanupCache();
    this.buildAllIndexes();
  }

  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > 300000) { // 5 دقائق
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (this.cache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - this.config.maxCacheSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }
}

=======
  // دوال مساعدة إضافية للوظائف المفقودة
  // ==========================================================================

  /**
   * بناء مسار الشخص
   * @param {Object} person - الشخص
   * @param {string} familyUid - معرف العائلة
   * @param {string} parentId - معرف الوالد
   * @returns {string} مسار الشخص
   */
  buildPersonPath(person, familyUid, parentId) {
    return `${familyUid}/${parentId || 'root'}/${person.globalId}`;
  }

  /**
   * حساب مستوى المسار
   * @param {Object} person - الشخص
   * @param {string} familyUid - معرف العائلة
   * @returns {number} مستوى المسار
   */
  calculatePathLevel(person, familyUid) {
    return person.generation || 0;
  }

  /**
   * تحديث فهرس المسارات
   * @param {Object} person - الشخص
   * @param {Object} pathData - بيانات المسار
   */
  updatePathIndex(person, pathData) {
    const pathKey = pathData.fullPath;
    if (!this.pathIndex.has(pathKey)) {
      this.pathIndex.set(pathKey, new Set());
    }
    this.pathIndex.get(pathKey).add(person.globalId);
  }

  /**
   * تحديث المسارات المشتقة
   * @param {string} person1Id - معرف الشخص الأول
   * @param {string} person2Id - معرف الشخص الثاني
   * @param {string} relationType - نوع العلاقة
   */
  updateDerivedPaths(person1Id, person2Id, relationType) {
    // تحديث بسيط للمسارات المشتقة
    console.log(`🔗 تحديث المسارات المشتقة: ${person1Id} -> ${person2Id} (${relationType})`);
  }

  /**
   * تحديث فهرس العلاقات
   * @param {Object} relation - العلاقة
   */
  updateRelationIndex(relation) {
    const relationType = relation.type;
    if (!this.relationIndex.has(relationType)) {
      this.relationIndex.set(relationType, new Set());
    }
    this.relationIndex.get(relationType).add(relation.id);
  }

  /**
   * فحص تشابه أسماء العائلات
   * @param {Object} family1 - العائلة الأولى
   * @param {Object} family2 - العائلة الثانية
   * @returns {Object} نتيجة التشابه
   */
  checkFamilyNameSimilarity(family1, family2) {
    // فحص بسيط لتشابه أسماء العائلات
    const name1 = family1.name.toLowerCase();
    const name2 = family2.name.toLowerCase();
    
    return {
      similarity: name1 === name2 ? 1.0 : 0.0
    };
  }

  /**
   * حساب تشابه الأسماء بين شخصين
   * @param {Object} person1 - الشخص الأول
   * @param {Object} person2 - الشخص الثاني
   * @returns {number} نسبة التشابه (0-1)
   */
  calculateNameSimilarity(person1, person2) {
    const name1 = person1.name.toLowerCase().trim();
    const name2 = person2.name.toLowerCase().trim();
    
    if (name1 === name2) return 1.0;
    
    // حساب تشابه مكونات الاسم
    const parts1 = [person1.firstName, person1.fatherName, person1.grandfatherName].filter(Boolean);
    const parts2 = [person2.firstName, person2.fatherName, person2.grandfatherName].filter(Boolean);
    
    let matchingParts = 0;
    const totalParts = Math.max(parts1.length, parts2.length);
    
    parts1.forEach(part1 => {
      if (parts2.some(part2 => part1.toLowerCase() === part2.toLowerCase())) {
        matchingParts++;
      }
    });
    
    return totalParts > 0 ? matchingParts / totalParts : 0;
  }

} // نهاية الكلاس

// تصدير الفئة
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
export default AdvancedFamilyGraph;
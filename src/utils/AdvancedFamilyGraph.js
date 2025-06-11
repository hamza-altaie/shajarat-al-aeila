// =============================================================================
// AdvancedFamilyGraph.js - نظام شجرة العائلة المتقدم (مُصحح ومُبسط)
// =============================================================================

import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export class AdvancedFamilyGraph {
  constructor() {
    // البيانات الأساسية
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
    };
  }

  // ==========================================================================
  // إدارة الأشخاص
  // ==========================================================================

  addPerson(personData) {
    try {
      const globalId = this.generateGlobalId(personData);
      
      const person = {
        globalId,
        id: personData.id || globalId,
        name: personData.name || this.buildFullName(personData),
        firstName: personData.firstName || '',
        fatherName: personData.fatherName || '',
        grandfatherName: personData.grandfatherName || '',
        surname: personData.surname || '',
        
        birthDate: personData.birthDate || personData.birthdate || null,
        gender: this.determineGender(personData),
        avatar: personData.avatar || '/boy.png',
        relation: personData.relation || 'عضو',
        
        familyUids: new Set([personData.familyUid].filter(Boolean)),
        primaryFamilyUid: personData.familyUid || null,
        generation: personData.generation || 0,
        
        relations: {
          parents: new Set(),
          children: new Set(),
          siblings: new Set(),
          spouses: new Set()
        },
        
        metadata: {
          addedAt: Date.now(),
          confidence: personData.confidence || 1.0,
          verified: personData.verified || false,
          source: personData.source || 'user',
          updatedAt: Date.now()
        },
        
        originalData: { ...personData }
      };

      this.nodes.set(globalId, person);
      this.metadata.totalNodes++;
      this.updateIndexes(person);
      
      return person;
      
    } catch (error) {
      console.error('❌ خطأ في إضافة الشخص:', error);
      throw new Error(`فشل في إضافة الشخص: ${error.message}`);
    }
  }

  buildFullName(personData) {
    const parts = [
      personData.firstName,
      personData.fatherName,
      personData.grandfatherName,
      personData.surname
    ].filter(Boolean);
    
    return parts.join(' ').trim() || 'غير محدد';
  }

  determineGender(personData) {
    if (personData.gender) return personData.gender;
    
    const femaleRelations = ['بنت', 'أخت', 'أم', 'جدة', 'عمة', 'خالة'];
    const maleRelations = ['ابن', 'أخ', 'أب', 'جد', 'عم', 'خال', 'رب العائلة'];
    
    const relation = personData.relation || '';
    
    if (femaleRelations.includes(relation)) return 'female';
    if (maleRelations.includes(relation)) return 'male';
    
    return 'unknown';
  }

  generateGlobalId(personData) {
    const uniqueString = [
      personData.firstName || '',
      personData.fatherName || '',
      personData.birthDate || personData.birthdate || '',
      personData.familyUid || '',
      personData.id || ''
    ].join('|').toLowerCase();
    
    let hash = 0;
    for (let i = 0; i < uniqueString.length; i++) {
      const char = uniqueString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substr(2, 5);
    
    return `person_${Math.abs(hash).toString(36)}_${timestamp}_${randomSuffix}`;
  }

  // ==========================================================================
  // تحميل البيانات
  // ==========================================================================

  async loadExtendedFamilies(userUid, options = {}) {
    const startTime = Date.now();
    
    const config = {
      maxDepth: options.maxDepth || this.config.maxLoadDepth,
      includeExtended: options.includeExtended !== false,
      ...options
    };
    
    console.log(`🚀 بدء تحميل الشجرة الموسعة للمستخدم: ${userUid}`);
    
    try {
      if (options.clearPrevious) {
        this.clear();
      }
      
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

  async loadPrimaryFamily(userUid) {
    if (this.loadedFamilies.has(userUid)) {
      console.log(`⚡ العائلة ${userUid} محملة مسبقاً`);
      return;
    }
    
    try {
      console.log(`📥 تحميل العائلة الأساسية: ${userUid}`);
      
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
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        }
      });
      
      if (familyMembers.length === 0) {
        console.warn(`⚠️ لا توجد أعضاء في العائلة: ${userUid}`);
        const sampleData = this.createSampleFamily(userUid);
        sampleData.forEach(memberData => {
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        });
      }
      
      const family = this.createFamilyObject(userUid, familyMembers);
      this.families.set(userUid, family);
      
      this.buildInternalFamilyRelations(userUid);
      this.loadedFamilies.add(userUid);
      
      console.log(`✅ تم تحميل العائلة: ${userUid} (${familyMembers.length} أفراد)`);
      
    } catch (error) {
      console.error(`❌ خطأ في تحميل العائلة ${userUid}:`, error);
      throw error;
    }
  }

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
        id: `${userUid}_child1`,
        name: 'الابن الأول',
        firstName: 'الابن',
        fatherName: 'الأول',
        gender: 'male',
        relation: 'ابن',
        birthDate: '2000-01-01',
        familyUid: userUid,
        generation: 1
      }
    ];
  }

  async loadConnectedFamilies(rootUserUid, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      console.log(`🛑 وصل لأقصى عمق: ${maxDepth}`);
      return;
    }
    
    try {
      console.log(`🔍 البحث عن العائلات المرتبطة (المستوى: ${currentDepth + 1}/${maxDepth})`);
      
      const connectedFamilies = await this.findConnectedFamilies(rootUserUid);
      
      console.log(`📡 تم العثور على ${connectedFamilies.size} عائلة مرتبطة`);
      
      const loadPromises = Array.from(connectedFamilies).map(async (familyUid) => {
        if (!this.loadedFamilies.has(familyUid)) {
          try {
            await this.loadSingleConnectedFamily(familyUid, rootUserUid);
            
            if (currentDepth + 1 < maxDepth) {
              await this.loadConnectedFamilies(familyUid, maxDepth, currentDepth + 1);
            }
          } catch (error) {
            console.warn(`⚠️ فشل في تحميل العائلة المرتبطة ${familyUid}:`, error.message);
          }
        }
      });
      
      await Promise.all(loadPromises);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل العائلات المرتبطة:', error);
    }
  }

  async findConnectedFamilies(familyUid) {
    const connectedFamilies = new Set();
    
    try {
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
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          const person = this.addPerson(memberData);
          familyMembers.push(person);
        }
      });
      
      if (familyMembers.length === 0) {
        console.warn(`⚠️ لا توجد أعضاء صالحين في العائلة: ${familyUid}`);
        return;
      }
      
      const family = this.createFamilyObject(familyUid, familyMembers, parentFamilyUid);
      this.families.set(familyUid, family);
      
      this.buildInternalFamilyRelations(familyUid);
      this.loadedFamilies.add(familyUid);
      
      console.log(`✅ تم تحميل العائلة المرتبطة: ${familyUid} (${familyMembers.length} أفراد)`);
      
    } catch (error) {
      console.error(`❌ خطأ في تحميل العائلة المرتبطة ${familyUid}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // بناء العلاقات
  // ==========================================================================

  buildAllRelations() {
    console.log(`🔧 بناء جميع العلاقات...`);
    
    try {
      for (const familyUid of this.families.keys()) {
        this.buildInternalFamilyRelations(familyUid);
      }
      
      console.log(`✅ تم بناء جميع العلاقات`);
      
    } catch (error) {
      console.error('❌ خطأ في بناء العلاقات:', error);
    }
  }

  buildInternalFamilyRelations(familyUid) {
    const family = this.families.get(familyUid);
    if (!family) return;
    
    const familyHead = family.head;
    if (!familyHead) return;
    
    console.log(`🔧 بناء العلاقات الداخلية للعائلة: ${familyUid}`);
    
    const children = family.members.filter(m => 
      m.relation === 'ابن' || m.relation === 'بنت'
    );
    
    children.forEach(child => {
      familyHead.relations.children.add(child.globalId);
      child.relations.parents.add(familyHead.globalId);
    });
    
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        children[i].relations.siblings.add(children[j].globalId);
        children[j].relations.siblings.add(children[i].globalId);
      }
    }
  }

  // ==========================================================================
  // إنشاء كائنات مساعدة
  // ==========================================================================

  createFamilyObject(familyUid, members, parentFamilyUid = null) {
    const head = members.find(m => m.relation === 'رب العائلة') || members[0];
    
    const family = {
      uid: familyUid,
      name: head ? `عائلة ${head.firstName || head.name}` : `عائلة ${familyUid}`,
      head,
      members,
      parentFamilyUid,
      
      stats: {
        totalMembers: members.length,
        males: members.filter(m => m.gender === 'male').length,
        females: members.filter(m => m.gender === 'female').length,
        children: members.filter(m => m.relation === 'ابن' || m.relation === 'بنت').length
      },
      
      metadata: {
        loadedAt: Date.now(),
        source: 'firebase',
        isConnected: !!parentFamilyUid
      }
    };
    
    return family;
  }

  // ==========================================================================
  // الفهرسة والبحث
  // ==========================================================================

  updateIndexes(person) {
    this.updateNameIndex(person);
    this.updateGenerationIndex(person);
    this.updateRelationIndex(person);
  }

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

  updateGenerationIndex(person) {
    const generation = person.generation || 0;
    
    if (!this.generationIndex.has(generation)) {
      this.generationIndex.set(generation, new Set());
    }
    this.generationIndex.get(generation).add(person.globalId);
  }

  updateRelationIndex(person) {
    const relation = person.relation || 'unknown';
    
    if (!this.relationIndex.has(relation)) {
      this.relationIndex.set(relation, new Set());
    }
    this.relationIndex.get(relation).add(person.globalId);
  }

  buildAllIndexes() {
    console.log(`📊 بناء جميع الفهارس...`);
    
    this.nameIndex.clear();
    this.generationIndex.clear();
    this.relationIndex.clear();
    
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

  selectOptimalRoot() {
    let bestRoot = null;
    let maxScore = -1;
    
    this.nodes.forEach((person, personId) => {
      let score = 0;
      
      score += person.relations.children.size * 15;
      
      if (person.relation === 'رب العائلة') score += 100;
      
      score += (person.generation || 0) * 10;
      
      if (person.birthDate) score += 10;
      if (person.avatar && person.avatar !== '/boy.png') score += 10;
      
      if (person.metadata.verified) score += 25;
      score += person.metadata.confidence * 20;
      
      score += person.familyUids.size * 5;
      
      if (score > maxScore) {
        maxScore = score;
        bestRoot = personId;
      }
    });
    
    return bestRoot;
  }

  // ==========================================================================
  // الإحصائيات
  // ==========================================================================

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
        totalLoadTime: 0,
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

  getGenerationDistribution() {
    const distribution = {};
    
    this.generationIndex.forEach((personIds, generation) => {
      distribution[generation] = personIds.size;
    });
    
    return distribution;
  }

  getGenderDistribution() {
    const distribution = { male: 0, female: 0, unknown: 0 };
    
    this.nodes.forEach(person => {
      distribution[person.gender]++;
    });
    
    return distribution;
  }

  // ==========================================================================
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

export default AdvancedFamilyGraph;
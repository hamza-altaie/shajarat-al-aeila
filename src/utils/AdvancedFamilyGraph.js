// src/utils/AdvancedFamilyGraph.js - إضافة الدالة المفقودة
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export class AdvancedFamilyGraph {
  constructor() {
    // البيانات الأساسية
    this.nodes = new Map();           
    this.edges = new Map();           
    this.families = new Map();        
    
    // الفهارس للبحث السريع
    this.pathIndex = new Map();       
    this.nameIndex = new Map();       
    this.generationIndex = new Map(); 
    this.relationIndex = new Map();   
    
    // الذاكرة المؤقتة والأداء
    this.cache = new Map();           
    this.loadedFamilies = new Set();  
    this.optimized = false;           
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
    };
  }

  /**
   * 🔥 الدالة الجديدة الشاملة للقبيلة
   */
  async loadCompleteTribalTree(userUid, options = {}) {
    const startTime = Date.now();
    
    console.log(`🏛️ بدء تحميل الشجرة الشاملة للقبيلة من: ${userUid}`);
    
    try {
      // تنظيف البيانات السابقة
      if (options.clearPrevious) {
        this.clear();
      }
      
      // callback للتقدم
      const updateProgress = (stage, progress) => {
        if (options.onProgress) {
          options.onProgress(stage, progress);
        }
      };
      
      // الخطوة 1: العثور على الجذر الأساسي للقبيلة
      updateProgress('البحث عن الجذر الأساسي للقبيلة...', 10);
      const tribalRoot = await this.findTribalRoot(userUid);
      
      // الخطوة 2: تحميل شجرة القبيلة الكاملة من الجذر
      updateProgress('تحميل شجرة القبيلة الكاملة...', 30);
      await this.loadCompleteTribalBranches(tribalRoot, updateProgress);
      
      // الخطوة 3: بناء العلاقات الهرمية الشاملة
      updateProgress('بناء العلاقات الهرمية الشاملة...', 60);
      await this.buildCompleteTribalRelationships();
      
      // الخطوة 4: تحسين وتنظيم الشجرة
      updateProgress('تحسين وتنظيم الشجرة...', 80);
      this.optimizeTribalTree();
      
      // الخطوة 5: إنشاء بيانات الشجرة الهرمية
      updateProgress('إنشاء بيانات الشجرة الهرمية...', 90);
      const treeData = this.generateTribalTreeData(tribalRoot);
      
      updateProgress('اكتمل التحميل الشامل', 100);
      
      const endTime = Date.now();
      this.metadata.loadingStats.totalLoadTime = endTime - startTime;
      this.metadata.lastUpdated = endTime;
      
      console.log(`✅ اكتملت الشجرة الشاملة في ${endTime - startTime}ms`);
      console.log(`📈 إحصائيات: ${this.nodes.size} شخص، ${this.families.size} عائلة`);
      
      return {
        success: true,
        treeData,
        tribalRoot,
        graph: this,
        stats: this.getTribalStatistics(),
        loadTime: endTime - startTime
      };
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الشاملة:', error);
      return {
        success: false,
        treeData: null,
        error: error.message
      };
    }
  }

  /**
   * العثور على الجذر الأساسي للقبيلة
   */
  async findTribalRoot(startUserUid) {
    const visited = new Set();
    let currentUid = startUserUid;
    let maxDepth = 10;
    
    console.log(`🔍 البحث عن جذر القبيلة بدءاً من: ${startUserUid}`);
    
    while (maxDepth > 0 && !visited.has(currentUid)) {
      visited.add(currentUid);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (!userDoc.exists()) {
          console.warn(`⚠️ المستخدم ${currentUid} غير موجود`);
          break;
        }
        
        const userData = userDoc.data();
        const linkedToHead = userData.linkedToFamilyHead;
        
        if (!linkedToHead || linkedToHead === currentUid) {
          console.log(`🏛️ تم العثور على جذر القبيلة: ${currentUid}`);
          return {
            uid: currentUid,
            userData: userData,
            isRoot: true,
            level: 0
          };
        }
        
        console.log(`⬆️ الانتقال من ${currentUid} إلى ${linkedToHead}`);
        currentUid = linkedToHead;
        maxDepth--;
        
      } catch (error) {
        console.error(`❌ خطأ في فحص المستخدم ${currentUid}:`, error);
        break;
      }
    }
    
    console.log(`🏛️ اعتماد ${startUserUid} كجذر افتراضي`);
    const userDoc = await getDoc(doc(db, 'users', startUserUid));
    return {
      uid: startUserUid,
      userData: userDoc.exists() ? userDoc.data() : {},
      isRoot: true,
      level: 0
    };
  }

  /**
   * تحميل جميع فروع القبيلة من الجذر
   */
  async loadCompleteTribalBranches(tribalRoot, updateProgress) {
    const processedUsers = new Set();
    const userQueue = [{ uid: tribalRoot.uid, level: 0, parentUid: null }];
    let totalFound = 0;
    
    console.log(`🌳 تحميل جميع فروع القبيلة من الجذر: ${tribalRoot.uid}`);
    
    while (userQueue.length > 0) {
      const { uid, level, parentUid } = userQueue.shift();
      
      if (processedUsers.has(uid)) continue;
      processedUsers.add(uid);
      totalFound++;
      
      try {
        console.log(`📥 تحميل المستوى ${level}: المستخدم ${uid}`);
        
        // تحميل عائلة المستخدم
        await this.loadUserFamily(uid, level, parentUid);
        
        // البحث عن الأطفال المرتبطين
        const childrenUids = await this.findLinkedChildren(uid);
        
        childrenUids.forEach(childUid => {
          if (!processedUsers.has(childUid)) {
            userQueue.push({ 
              uid: childUid, 
              level: level + 1, 
              parentUid: uid 
            });
          }
        });
        
        console.log(`✅ المستوى ${level}: تم تحميل ${uid} مع ${childrenUids.length} طفل`);
        
        // تحديث التقدم
        if (updateProgress) {
          const progress = 30 + (totalFound * 2); // من 30 إلى 60
          updateProgress(`تحميل العائلة ${totalFound}: ${uid}`, Math.min(progress, 58));
        }
        
      } catch (error) {
        console.error(`❌ خطأ في تحميل ${uid}:`, error);
      }
    }
    
    console.log(`✅ تم تحميل ${processedUsers.size} مستخدم في القبيلة`);
  }

  /**
   * تحميل عائلة مستخدم واحد
   */
  async loadUserFamily(userUid, level, parentUid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      
      const familySnapshot = await getDocs(collection(db, 'users', userUid, 'family'));
      const familyMembers = [];
      
      familySnapshot.forEach(doc => {
        const memberData = { 
          ...doc.data(), 
          id: doc.id, 
          familyUid: userUid,
          tribalLevel: level,
          parentFamilyUid: parentUid
        };
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          const person = this.createTribalPerson(memberData);
          familyMembers.push(person);
          this.nodes.set(person.globalId, person);
        }
      });
      
      if (familyMembers.length > 0) {
        const family = {
          uid: userUid,
          members: familyMembers,
          head: familyMembers.find(m => m.relation === 'رب العائلة') || familyMembers[0],
          level: level,
          parentFamilyUid: parentUid,
          userData: userData
        };
        
        this.families.set(userUid, family);
        console.log(`👨‍👩‍👧‍👦 عائلة ${userUid}: ${familyMembers.length} أفراد في المستوى ${level}`);
      }
      
    } catch (error) {
      console.error(`❌ خطأ في تحميل عائلة ${userUid}:`, error);
    }
  }

  /**
   * البحث عن الأطفال المرتبطين
   */
  async findLinkedChildren(parentUid) {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const linkedChildren = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        if (userId === parentUid) continue;
        
        if (userData.linkedToFamilyHead === parentUid) {
          linkedChildren.push(userId);
        }
        
        const linkedFamilies = userData.linkedFamilies || [];
        const isLinked = linkedFamilies.some(link => 
          link.targetFamilyUid === parentUid && 
          (link.linkType === 'child-parent' || link.linkType === 'parent-child')
        );
        
        if (isLinked && !linkedChildren.includes(userId)) {
          linkedChildren.push(userId);
        }
      }
      
      return linkedChildren;
      
    } catch (error) {
      console.error(`❌ خطأ في البحث عن الأطفال المرتبطين:`, error);
      return [];
    }
  }

  /**
   * إنشاء كائن شخص للقبيلة
   */
  createTribalPerson(memberData) {
    const globalId = `${memberData.familyUid}_${memberData.id}`;
    
    return {
      globalId,
      id: memberData.id,
      name: this.buildFullName(memberData),
      firstName: memberData.firstName || '',
      fatherName: memberData.fatherName || '',
      grandfatherName: memberData.grandfatherName || '',
      surname: memberData.surname || '',
      relation: memberData.relation || 'عضو',
      birthDate: memberData.birthDate || memberData.birthdate || null,
      avatar: memberData.avatar || '/boy.png',
      
      // معلومات القبيلة
      familyUid: memberData.familyUid,
      tribalLevel: memberData.tribalLevel || 0,
      parentFamilyUid: memberData.parentFamilyUid || null,
      
      // العلاقات
      children: new Set(),
      parents: new Set(),
      siblings: new Set(),
      familyChildren: new Set(),
      familyParents: new Set(),
      
      // معلومات إضافية
      generation: this.calculateGeneration(memberData),
      isHousehead: memberData.relation === 'رب العائلة',
      importance: 0,
      
      metadata: {
        addedAt: Date.now(),
        tribalSource: 'complete_scan'
      }
    };
  }

  /**
   * بناء العلاقات الهرمية الشاملة للقبيلة
   */
  async buildCompleteTribalRelationships() {
    console.log('🔗 بناء العلاقات الهرمية الشاملة...');
    
    // 1. بناء العلاقات داخل كل عائلة
    this.families.forEach(family => {
      this.buildInternalFamilyRelations(family);
    });
    
    // 2. بناء العلاقات بين العائلات
    await this.buildInterFamilyTribalRelations();
    
    // 3. بناء علاقات الأقارب الموسعة
    this.buildExtendedFamilyRelations();
    
    console.log('✅ تم بناء العلاقات الهرمية الشاملة');
  }

  /**
   * بناء العلاقات داخل العائلة الواحدة
   */
  buildInternalFamilyRelations(family) {
    const head = family.head;
    if (!head) return;
    
    family.members.forEach(member => {
      if (member.relation === 'ابن' || member.relation === 'بنت') {
        head.children.add(member.globalId);
        member.parents.add(head.globalId);
      }
    });
    
    // ربط الأشقاء
    const children = family.members.filter(m => m.relation === 'ابن' || m.relation === 'بنت');
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        children[i].siblings.add(children[j].globalId);
        children[j].siblings.add(children[i].globalId);
      }
    }
  }

  /**
   * بناء العلاقات بين العائلات في القبيلة
   */
  async buildInterFamilyTribalRelations() {
    console.log('🔗 بناء العلاقات بين العائلات...');
    
    const familiesByLevel = new Map();
    this.families.forEach(family => {
      const familyLevel = family.level || 0;
      if (!familiesByLevel.has(familyLevel)) {
        familiesByLevel.set(familyLevel, []);
      }
      familiesByLevel.get(familyLevel).push(family);
    });
    
    for (const [, families] of familiesByLevel) { // Removed unused 'familyLevel'
      for (const family of families) {
        if (family.parentFamilyUid) {
          await this.linkFamilyToParent(family, family.parentFamilyUid);
        }
      }
    }
  }

  /**
   * ربط عائلة بعائلة الوالد
   */
  async linkFamilyToParent(childFamily, parentFamilyUid) {
    const parentFamily = this.families.get(parentFamilyUid);
    if (!parentFamily) return;
    
    const childHead = childFamily.head;
    const parentHead = parentFamily.head;
    
    if (childHead && parentHead) {
      childHead.familyParents.add(parentFamilyUid);
      parentHead.familyChildren.add(childFamily.uid);
      
      parentHead.children.add(childHead.globalId);
      childHead.parents.add(parentHead.globalId);
      
      console.log(`🔗 ربط عائلة ${childFamily.uid} بعائلة الوالد ${parentFamilyUid}`);
    }
  }

  /**
   * بناء علاقات الأقارب الموسعة
   */
  buildExtendedFamilyRelations() {
    console.log('👥 بناء علاقات الأقارب الموسعة...');
    
    const familiesByLevel = new Map();
    this.families.forEach(family => {
      const level = family.level || 0;
      const parentUid = family.parentFamilyUid;
      const key = `${level}_${parentUid || 'root'}`;
      
      if (!familiesByLevel.has(key)) {
        familiesByLevel.set(key, []);
      }
      familiesByLevel.get(key).push(family);
    });
    
    familiesByLevel.forEach(families => {
      if (families.length > 1) {
        this.linkSiblingFamilies(families);
      }
    });
    
    this.buildCousinRelations();
  }

  /**
   * ربط العائلات الشقيقة
   */
  linkSiblingFamilies(siblingFamilies) {
    for (let i = 0; i < siblingFamilies.length; i++) {
      for (let j = i + 1; j < siblingFamilies.length; j++) {
        const family1 = siblingFamilies[i];
        const family2 = siblingFamilies[j];
        
        if (family1.head && family2.head) {
          family1.head.siblings.add(family2.head.globalId);
          family2.head.siblings.add(family1.head.globalId);
          
          console.log(`👥 ربط أشقاء: ${family1.head.name} ←→ ${family2.head.name}`);
        }
      }
    }
  }

  /**
   * بناء علاقات أولاد العم
   */
  buildCousinRelations() {
    console.log('👨‍👩‍👧‍👦 بناء علاقات أولاد العم...');
    
    this.nodes.forEach(person => {
      const parentIds = Array.from(person.parents);
      
      parentIds.forEach(parentId => {
        const parent = this.nodes.get(parentId);
        if (!parent) return;
        
        const uncleIds = Array.from(parent.siblings);
        
        uncleIds.forEach(uncleId => {
          const uncle = this.nodes.get(uncleId);
          if (!uncle) return;
          
          const cousinIds = Array.from(uncle.children);
          
          cousinIds.forEach(cousinId => {
            if (cousinId !== person.globalId) {
              person.cousins = person.cousins || new Set();
              person.cousins.add(cousinId);
              
              const cousin = this.nodes.get(cousinId);
              if (cousin) {
                cousin.cousins = cousin.cousins || new Set();
                cousin.cousins.add(person.globalId);
              }
            }
          });
        });
      });
    });
  }

  /**
   * تحسين وتنظيم الشجرة
   */
  optimizeTribalTree() {
    console.log('⚡ تحسين وتنظيم الشجرة...');
    
    this.calculatePreciseGenerations();
    this.rankPersonsByImportance();
    
    console.log('✅ تم تحسين الشجرة');
  }

  /**
   * حساب الأجيال بدقة
   */
  calculatePreciseGenerations() {
    const rootFamilies = Array.from(this.families.values()).filter(f => f.level === 0);
    
    rootFamilies.forEach(rootFamily => {
      if (rootFamily.head) {
        this.setGenerationRecursive(rootFamily.head, 0);
      }
    });
  }

  /**
   * تعيين الجيل بشكل تكراري
   */
  setGenerationRecursive(person, generation) {
    if (person.calculatedGeneration !== undefined) return;
    
    person.calculatedGeneration = generation;
    
    person.children.forEach(childId => {
      const child = this.nodes.get(childId);
      if (child) {
        this.setGenerationRecursive(child, generation + 1);
      }
    });
  }

  /**
   * ترتيب الأشخاص حسب الأهمية
   */
  rankPersonsByImportance() {
    this.nodes.forEach(person => {
      let importance = 0;
      
      if (person.isHousehead) importance += 50;
      importance += (10 - (person.calculatedGeneration || 0)) * 10;
      importance += person.children.size * 5;
      importance += person.siblings.size * 2;
      
      person.importance = importance;
    });
  }

  /**
   * إنشاء بيانات الشجرة الهرمية للقبيلة
   */
  generateTribalTreeData(tribalRoot) {
    console.log('🌳 إنشاء بيانات الشجرة الهرمية...');
    
    const rootFamily = this.families.get(tribalRoot.uid);
    if (!rootFamily || !rootFamily.head) {
      console.warn('⚠️ لم يتم العثور على رب العائلة الجذر');
      return null;
    }
    
    const rootPerson = rootFamily.head;
    const visited = new Set();
    
    const buildTreeNode = (person, depth = 0) => {
      if (visited.has(person.globalId) || depth > 8) {
        return null;
      }
      
      visited.add(person.globalId);
      
      const node = {
        name: person.name,
        id: person.globalId,
        avatar: person.avatar,
        attributes: {
          ...person,
          depth,
          generation: person.calculatedGeneration || person.generation || 0,
          importance: person.importance || 0,
          isTribalRoot: person.globalId === rootPerson.globalId,
          familyUid: person.familyUid,
          tribalLevel: person.tribalLevel || 0
        },
        children: []
      };
      
      const childrenArray = Array.from(person.children)
        .map(childId => this.nodes.get(childId))
        .filter(Boolean)
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));
      
      const children = []; // Defined 'children' to fix the no-undef error

      childrenArray.forEach(child => {
        const childNode = buildTreeNode(child, depth + 1);
        if (childNode) {
          children.push(childNode);
        }
      });
      
      return node;
    };
    
    const treeData = buildTreeNode(rootPerson);
    
    console.log('✅ تم إنشاء بيانات الشجرة الهرمية');
    return treeData;
  }

  /**
   * إحصائيات القبيلة
   */
  getTribalStatistics() {
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const totalFamilies = this.families.size;
    
    return {
      totalNodes,
      totalEdges,
      totalFamilies,
      averageDegree: totalEdges / (totalNodes || 1),
      depth: this.calculateMaxDepth()
    };
  }

  /**
   * حساب أقصى عمق للشجرة
   */
  calculateMaxDepth() {
    let maxDepth = 0;
    
    this.families.forEach(family => {
      if (family.level > maxDepth) {
        maxDepth = family.level;
      }
    });
    
    return maxDepth;
  }

  /**
   * مسح البيانات الحالية
   */
  clear() {
    console.log('🧹 مسح البيانات الحالية...');
    
    this.nodes.clear();
    this.edges.clear();
    this.families.clear();
    this.pathIndex.clear();
    this.nameIndex.clear();
    this.generationIndex.clear();
    this.relationIndex.clear();
    this.cache.clear();
    this.loadedFamilies.clear();
    this.optimized = false;
    
    console.log('✅ تم مسح البيانات الحالية');
  }
}
// =============================================================================
// AdvancedFamilyGraph.js - نظام شجرة العائلة الموسعة الشاملة
// =============================================================================

import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export class AdvancedFamilyGraph {
  constructor() {
    // البيانات الأساسية
    this.nodes = new Map();           // الأشخاص: Map<globalId, Person>
    this.edges = new Map();           // العلاقات المباشرة: Map<edgeId, Relation>
    this.families = new Map();        // العائلات: Map<familyUid, Family>
    
    // الفهارس للبحث السريع
    this.pathIndex = new Map();       // فهرس المسارات
    this.nameIndex = new Map();       // فهرس الأسماء
    this.generationIndex = new Map(); // فهرس الأجيال
    this.relationIndex = new Map();   // فهرس العلاقات
    
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
    };
  }

  /**
   * تحميل الشجرة الموسعة الشاملة للقبيلة
   * يربط جميع العائلات والأقارب في شجرة واحدة متكاملة
   */
  async loadExtendedFamilies(userUid, options = {}) {
    const startTime = Date.now();
    
    console.log(`🏛️ بدء تحميل الشجرة الموسعة الشاملة للقبيلة من: ${userUid}`);
    
    try {
      // تنظيف البيانات السابقة
      if (options.clearPrevious) {
        this.clear();
      }
      
      // الخطوة 1: العثور على الجذر الأساسي للقبيلة
      console.log(`🔍 1. البحث عن الجذر الأساسي للقبيلة...`);
      const tribalRoot = await this.findTribalRoot(userUid);
      
      // الخطوة 2: تحميل شجرة القبيلة الكاملة من الجذر
      console.log(`🌳 2. تحميل شجرة القبيلة الكاملة...`);
      await this.loadCompleteTribalBranches(tribalRoot);
      
      // الخطوة 3: بناء العلاقات الهرمية الشاملة
      console.log(`🔗 3. بناء العلاقات الهرمية الشاملة...`);
      await this.buildCompleteTribalRelationships();
      
      // الخطوة 4: تحسين وتنظيم الشجرة
      console.log(`⚡ 4. تحسين وتنظيم الشجرة...`);
      this.optimizeTribalTree();
      
      // الخطوة 5: إنشاء بيانات الشجرة الهرمية
      console.log(`📊 5. إنشاء بيانات الشجرة الهرمية...`);
      const treeData = this.generateTribalTreeData(tribalRoot);
      
      const endTime = Date.now();
      this.metadata.loadingStats.totalLoadTime = endTime - startTime;
      this.metadata.lastUpdated = endTime;
      
      console.log(`✅ اكتملت الشجرة الموسعة الشاملة في ${endTime - startTime}ms`);
      console.log(`📈 إحصائيات: ${this.nodes.size} شخص، ${this.families.size} عائلة`);
      
      return {
        treeData,
        tribalRoot,
        graph: this,
        stats: this.getTribalStatistics(),
        loadTime: endTime - startTime,
        success: true
      };
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الموسعة الشاملة:', error);
      return {
        treeData: null,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * العثور على الجذر الأساسي للقبيلة
   * يتتبع الروابط إلى أعلى حتى يصل للجد الأكبر
   */
  async findTribalRoot(startUserUid) {
    const visited = new Set();
    let currentUid = startUserUid;
    let maxDepth = 10; // حماية من الحلقات اللانهائية
    
    console.log(`🔍 البحث عن جذر القبيلة بدءاً من: ${startUserUid}`);
    
    while (maxDepth > 0 && !visited.has(currentUid)) {
      visited.add(currentUid);
      
      try {
        // جلب بيانات المستخدم الحالي
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (!userDoc.exists()) {
          console.warn(`⚠️ المستخدم ${currentUid} غير موجود`);
          break;
        }
        
        const userData = userDoc.data();
        const linkedToHead = userData.linkedToFamilyHead;
        
        // إذا لم يكن مرتبط بأحد، فهو الجذر
        if (!linkedToHead || linkedToHead === currentUid) {
          console.log(`🏛️ تم العثور على جذر القبيلة: ${currentUid}`);
          return {
            uid: currentUid,
            userData: userData,
            isRoot: true,
            level: 0
          };
        }
        
        // الانتقال إلى المستوى الأعلى
        console.log(`⬆️ الانتقال من ${currentUid} إلى ${linkedToHead}`);
        currentUid = linkedToHead;
        maxDepth--;
        
      } catch (error) {
        console.error(`❌ خطأ في فحص المستخدم ${currentUid}:`, error);
        break;
      }
    }
    
    // في حالة عدم وجود جذر واضح، نعتبر المستخدم الحالي هو الجذر
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
  async loadCompleteTribalBranches(tribalRoot) {
    const processedUsers = new Set();
    const userQueue = [{ uid: tribalRoot.uid, level: 0, parentUid: null }];
    
    console.log(`🌳 تحميل جميع فروع القبيلة من الجذر: ${tribalRoot.uid}`);
    
    while (userQueue.length > 0) {
      const { uid, level, parentUid } = userQueue.shift();
      
      if (processedUsers.has(uid)) continue;
      processedUsers.add(uid);
      
      try {
        console.log(`📥 تحميل المستوى ${level}: المستخدم ${uid}`);
        
        // تحميل عائلة المستخدم
        await this.loadUserFamily(uid, level, parentUid);
        
        // البحث عن الأطفال المرتبطين (العائلات التابعة)
        const childrenUids = await this.findLinkedChildren(uid);
        
        // إضافة الأطفال إلى القائمة
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
      // تحميل بيانات المستخدم
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      
      // تحميل أعضاء العائلة
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
      
      // إنشاء كائن العائلة
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
   * البحث عن الأطفال المرتبطين (العائلات التابعة)
   */
  async findLinkedChildren(parentUid) {
    try {
      // البحث في جميع المستخدمين عن من مرتبط بهذا المستخدم
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const linkedChildren = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // تجاهل المستخدم نفسه
        if (userId === parentUid) continue;
        
        // فحص إذا كان مرتبط بالوالد
        if (userData.linkedToFamilyHead === parentUid) {
          linkedChildren.push(userId);
        }
        
        // فحص linkedFamilies أيضاً
        const linkedFamilies = userData.linkedFamilies || [];
        const isLinked = linkedFamilies.some(link => 
          link.targetFamilyUid === parentUid && 
          link.linkType === 'child-parent'
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
      familyChildren: new Set(), // عائلات الأطفال
      familyParents: new Set(),  // عائلات الوالدين
      
      // معلومات إضافية
      generation: this.calculateGeneration(memberData),
      isHousehead: memberData.relation === 'رب العائلة',
      
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
    
    // 2. بناء العلاقات بين العائلات (الأجيال)
    await this.buildInterFamilyTribalRelations();
    
    // 3. بناء علاقات الأقارب (أعمام، أولاد عم، إلخ)
    this.buildExtendedFamilyRelations();
    
    console.log('✅ تم بناء العلاقات الهرمية الشاملة');
  }

  /**
   * بناء العلاقات داخل العائلة الواحدة
   */
  buildInternalFamilyRelations(family) {
    const head = family.head;
    if (!head) return;
    
    // ربط الأطفال بالوالد
    family.members.forEach(member => {
      if (member.relation === 'ابن' || member.relation === 'بنت') {
        // إضافة العلاقة والد-طفل
        head.children.add(member.globalId);
        member.parents.add(head.globalId);
      }
    });
    
    // ربط الأشقاء ببعضهم
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
    
    // ترتيب العائلات حسب المستوى
    const familiesByLevel = new Map();
    this.families.forEach(family => {
      const level = family.level || 0;
      if (!familiesByLevel.has(level)) {
        familiesByLevel.set(level, []);
      }
      familiesByLevel.get(level).push(family);
    });
    
    // ربط كل مستوى بالمستوى الذي فوقه
    for (const [level, families] of familiesByLevel) {
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
      // ربط العائلات
      childHead.familyParents.add(parentFamilyUid);
      parentHead.familyChildren.add(childFamily.uid);
      
      // ربط الأشخاص
      parentHead.children.add(childHead.globalId);
      childHead.parents.add(parentHead.globalId);
      
      console.log(`🔗 ربط عائلة ${childFamily.uid} بعائلة الوالد ${parentFamilyUid}`);
    }
  }

  /**
   * بناء علاقات الأقارب الموسعة (أعمام، أولاد عم، إلخ)
   */
  buildExtendedFamilyRelations() {
    console.log('👥 بناء علاقات الأقارب الموسعة...');
    
    // العثور على الأشقاء في نفس المستوى
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
    
    // ربط الأشقاء ببعضهم (العائلات الشقيقة)
    familiesByLevel.forEach(families => {
      if (families.length > 1) {
        this.linkSiblingFamilies(families);
      }
    });
    
    // بناء علاقات أولاد العم
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
    
    // للكل شخص، نجد أولاد عمه (أطفال أشقاء والده)
    this.nodes.forEach(person => {
      // العثور على والد الشخص
      const parentIds = Array.from(person.parents);
      
      parentIds.forEach(parentId => {
        const parent = this.nodes.get(parentId);
        if (!parent) return;
        
        // العثور على أشقاء الوالد (الأعمام)
        const uncleIds = Array.from(parent.siblings);
        
        uncleIds.forEach(uncleId => {
          const uncle = this.nodes.get(uncleId);
          if (!uncle) return;
          
          // العثور على أطفال العم (أولاد العم)
          const cousinIds = Array.from(uncle.children);
          
          cousinIds.forEach(cousinId => {
            if (cousinId !== person.globalId) {
              // إضافة علاقة ولد عم
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
    
    // حساب الأجيال بدقة
    this.calculatePreciseGenerations();
    
    // ترتيب الأشخاص حسب الأهمية
    this.rankPersonsByImportance();
    
    console.log('✅ تم تحسين الشجرة');
  }

  /**
   * حساب الأجيال بدقة
   */
  calculatePreciseGenerations() {
    // تعيين الجيل للجذر
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
    
    // تعيين الجيل لجميع الأطفال
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
      
      // رب العائلة لديه أهمية أكبر
      if (person.isHousehead) importance += 50;
      
      // الأجيال الأعلى لديها أهمية أكبر
      importance += (10 - (person.calculatedGeneration || 0)) * 10;
      
      // عدد الأطفال يزيد الأهمية
      importance += person.children.size * 5;
      
      // عدد الأشقاء يزيد الأهمية قليلاً
      importance += person.siblings.size * 2;
      
      person.importance = importance;
    });
  }

  /**
   * إنشاء بيانات الشجرة الهرمية للقبيلة
   */
  generateTribalTreeData(tribalRoot) {
    console.log('🌳 إنشاء بيانات الشجرة الهرمية...');
    
    // العثور على رب العائلة الجذر
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
      
      // إضافة الأطفال مرتبين حسب الأهمية
      const childrenArray = Array.from(person.children)
        .map(childId => this.nodes.get(childId))
        .filter(Boolean)
        .sort((a, b) => (b.importance || 0) - (a.importance || 0));
      
      childrenArray.forEach(child => {
        const childNode = buildTreeNode(child, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      return node;
    };
    
    const treeData = buildTreeNode(rootPerson);
    
    console.log(`✅ تم إنشاء شجرة هرمية تضم ${visited.size} شخص`);
    
    return treeData;
  }

  /**
   * إنشاء بيانات الشجرة - دالة بديلة مبسطة
   */
  generateTreeData(rootPersonId = null) {
    if (!rootPersonId) {
      rootPersonId = this.selectOptimalRoot();
    }
    
    if (!rootPersonId) {
      console.warn('⚠️ لم يتم العثور على جذر مناسب للشجرة');
      return null;
    }
    
    return this.generateTribalTreeData({ uid: rootPersonId.split('_')[0] });
  }

  /**
   * اختيار أفضل جذر للشجرة
   */
  selectOptimalRoot() {
    let bestRoot = null;
    let maxScore = -1;
    
    this.nodes.forEach((person, personId) => {
      let score = 0;
      
      // نقاط للأطفال
      score += person.children.size * 15;
      
      // نقاط لكونه رب عائلة
      if (person.relation === 'رب العائلة') score += 100;
      
      // نقاط للجيل (الأجيال الأعلى أولوية)
      score += (person.generation || 0) * 10;
      
      // نقاط للمعلومات المكتملة
      if (person.birthDate) score += 10;
      if (person.avatar && person.avatar !== '/boy.png') score += 10;
      
      // نقاط للأهمية
      score += person.importance || 0;
      
      if (score > maxScore) {
        maxScore = score;
        bestRoot = personId;
      }
    });
    
    return bestRoot;
  }

  /**
   * حساب الجيل للشخص
   */
  calculateGeneration(memberData) {
    const tribalLevel = memberData.tribalLevel || 0;
    
    // رب العائلة في المستوى 0 = الجيل 0
    // أطفاله = الجيل 1، إلخ
    if (memberData.relation === 'رب العائلة') {
      return tribalLevel;
    } else {
      return tribalLevel + 1;
    }
  }

  /**
   * بناء الاسم الكامل
   */
  buildFullName(memberData) {
    const parts = [
      memberData.firstName,
      memberData.fatherName,
      memberData.grandfatherName,
      memberData.surname
    ].filter(Boolean);
    
    return parts.join(' ').trim() || 'غير محدد';
  }

  /**
   * إحصائيات القبيلة
   */
  getTribalStatistics() {
    const persons = Array.from(this.nodes.values());
    const families = Array.from(this.families.values());
    
    return {
      overview: {
        totalPersons: persons.length,
        totalFamilies: families.length,
        tribalLevels: Math.max(...families.map(f => f.level || 0)) + 1,
        generations: new Set(persons.map(p => p.calculatedGeneration || 0)).size
      },
      generations: this.getGenerationDistribution(persons),
      families: families.map(f => ({
        uid: f.uid,
        level: f.level,
        memberCount: f.members.length,
        headName: f.head?.name || 'غير محدد'
      })),
      relations: this.getRelationDistribution(persons)
    };
  }

  /**
   * الحصول على إحصائيات متقدمة
   */
  getAdvancedStatistics() {
    return this.getTribalStatistics();
  }

  /**
   * توزيع الأجيال
   */
  getGenerationDistribution(persons) {
    const distribution = {};
    persons.forEach(person => {
      const generation = person.calculatedGeneration || person.generation || 0;
      distribution[generation] = (distribution[generation] || 0) + 1;
    });
    return distribution;
  }

  /**
   * توزيع العلاقات
   */
  getRelationDistribution(persons) {
    const distribution = {};
    persons.forEach(person => {
      const relation = person.relation || 'غير محدد';
      distribution[relation] = (distribution[relation] || 0) + 1;
    });
    return distribution;
  }

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
}

// تصدير الفئة
export default AdvancedFamilyGraph;
// src/utils/FamilyTreeBuilder.js - منطق بناء الشجرة العائلية

import { RelationUtils } from './FamilyRelations.js';

export class FamilyTreeBuilder {
  constructor() {
    this.addedChildrenIds = new Set();
  }

  // تنظيف وتنقيح بيانات العضو
  sanitizeMemberData = (memberData) => {
    return {
      ...memberData,
      firstName: memberData.firstName?.trim() || '',
      fatherName: memberData.fatherName?.trim() || '',
      grandfatherName: memberData.grandfatherName?.trim() || '',
      surname: memberData.surname?.trim() || '',
      relation: memberData.relation?.trim() || 'عضو'
    };
  };

  // التحقق من صحة ربط الأحفاد وإعطاء نصائح
  validateGrandchildrenConnections = (familyMembers) => {
    const accountOwner = familyMembers.find(m => m.relation === 'رب العائلة');
    const grandchildren = familyMembers.filter(m => m.relation === 'حفيد' || m.relation === 'حفيدة');
    const ownerChildren = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت')
    );

    console.warn(`👶 جميع الأطفال في العائلة:`, ownerChildren.map(c => `"${c.firstName}" (والده: "${c.fatherName}")`));

    // البحث عن الأطفال المباشرين لرب العائلة
    const directChildren = ownerChildren.filter(child => 
      child.fatherName === accountOwner?.firstName
    );

    if (grandchildren.length === 0) return;

    console.warn(`🔍 تم العثور على ${grandchildren.length} حفيد/حفيدة - التحقق من الربط:`);
    console.warn(`👨‍👦‍👦 رب العائلة: "${accountOwner?.firstName}"`);
    console.warn(`👶 الأطفال المباشرين:`, directChildren.map(c => `"${c.firstName}"`));
    
    grandchildren.forEach(grandchild => {
      const possibleParent = directChildren.find(child => 
        child.firstName === grandchild.fatherName
      );
      
      console.warn(`🔸 الحفيد: "${grandchild.firstName}" - والده: "${grandchild.fatherName}" - جده: "${grandchild.grandfatherName}"`);
      
      if (!possibleParent) {
        console.warn(`❌ الحفيد "${grandchild.firstName}" - لم يتم العثور على والد بالاسم "${grandchild.fatherName}"`);
        console.warn(`💡 تأكد من وجود ابن/بنت باسم "${grandchild.fatherName}" في العائلة`);
      } else if (grandchild.grandfatherName !== accountOwner?.firstName) {
        console.warn(`⚠️ الحفيد "${grandchild.firstName}" - اسم الجد "${grandchild.grandfatherName}" لا يطابق رب العائلة "${accountOwner?.firstName}"`);
      } else {
        console.warn(`✅ الحفيد "${grandchild.firstName}" - الربط صحيح`);
      }
    });
  };

  // العثور على رب العائلة
  findFamilyHead = (members) => {
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  };

  // بناء الاسم الكامل
  buildFullName = (person) => {
    if (!person) return '';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : '';
  };

  // التحقق من انتماء الطفل للوالد
  isChildOfParent = (child, parent) => {
    // تجنب إضافة نفس الطفل مرتين
    if (this.addedChildrenIds.has(child.globalId)) {
      return false;
    }

    // الطريقة الأولى: التحقق من اسم الوالد
    const isChildByFatherName = (
      (RelationUtils.isSiblingChild(child.relation) || 
       child.relation === 'ابن' || child.relation === 'بنت' ||
       child.relation === 'والد' || child.relation === 'والدة' ||
       child.relation === 'حفيد' || child.relation === 'حفيدة') &&
      child.fatherName === parent.firstName &&
      child.globalId !== parent.globalId
    );
    
    // الطريقة الثانية: التحقق من معرف الوالد
    const isChildByParentId = (
      child.parentId === parent.globalId ||
      child.fatherId === parent.globalId
    );
    
    // الطريقة الثالثة: التحقق من النسب الكامل
    const isChildByFullLineage = (
      RelationUtils.isSiblingChild(child.relation) &&
      child.fatherName === parent.firstName &&
      child.grandfatherName === parent.fatherName &&
      child.surname === parent.surname &&
      child.globalId !== parent.globalId
    );

    // الطريقة الرابعة: علاقة الوالد بالجد
    const isFatherOfGrandfather = (
      child.relation === 'والد' &&
      parent.relation === 'جد' &&
      child.fatherName === parent.firstName
    );

    return isChildByFatherName || isChildByParentId || isChildByFullLineage || isFatherOfGrandfather;
  };

  // التحقق من انتماء أبناء العم للعم
  isCousinOfUncle = (cousin, uncle) => {
    // تجنب إضافة نفس الطفل مرتين
    if (this.addedChildrenIds.has(cousin.globalId)) {
      return false;
    }

    // الطريقة الأولى: التحقق من علاقة ابن عم مباشرة مع اسم العم
    const isDirectCousin = (
      (cousin.relation === 'ابن عم' || cousin.relation === 'بنت عم') &&
      cousin.fatherName === uncle.firstName &&
      cousin.globalId !== uncle.globalId
    );
    
    // الطريقة الثانية: التحقق من النسب - العم والوالد إخوة
    const isCousinByLineage = (
      (cousin.relation === 'ابن عم' || cousin.relation === 'بنت عم') &&
      cousin.grandfatherName === uncle.fatherName && // نفس الجد
      cousin.fatherName !== uncle.firstName && // ليس ابن مباشر للعم
      cousin.globalId !== uncle.globalId
    );

    // الطريقة الثالثة: التحقق من معرف العم
    const isCousingByUncleId = (
      cousin.uncleId === uncle.globalId ||
      cousin.parentId === uncle.globalId
    );

    return isDirectCousin || isCousinByLineage || isCousingByUncleId;
  };

  // التحقق من انتماء الحفيد لرب العائلة
  isGrandchildOfOwner = (grandchild, accountOwner, familyMembers) => {
    // تجنب إضافة نفس الحفيد مرتين
    if (this.addedChildrenIds.has(grandchild.globalId)) {
      return false;
    }

    // الطريقة الأولى: التحقق من علاقة الحفيد المباشرة
    const isDirectGrandchild = (
      (grandchild.relation === 'حفيد' || grandchild.relation === 'حفيدة') &&
      grandchild.globalId !== accountOwner.globalId
    );

    // الطريقة الثانية: التحقق من النسب - الحفيد هو ابن أحد أطفال رب العائلة
    const ownerChildren = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      this.isChildOfParent(m, accountOwner)
    );

    const isGrandchildByLineage = ownerChildren.some(child => 
      grandchild.fatherName === child.firstName &&
      grandchild.grandfatherName === accountOwner.firstName &&
      grandchild.globalId !== child.globalId
    );

    // الطريقة الثالثة: التحقق من معرف الوالد
    const isGrandchildByParentId = ownerChildren.some(child =>
      grandchild.parentId === child.globalId ||
      grandchild.fatherId === child.globalId
    );

    return isDirectGrandchild || isGrandchildByLineage || isGrandchildByParentId;
  };

  // إضافة الأطفال للعقدة مع دعم الأحفاد
  addChildrenToNode = (parentNode, children, treeType, familyMembers = null, accountOwner = null) => {
    console.warn(`🔧 إضافة ${children.length} طفل لـ "${parentNode.attributes?.firstName || parentNode.name}"`);
    
    children.forEach(child => {
      // تسجيل الطفل كمُضاف لتجنب التكرار
      this.addedChildrenIds.add(child.globalId);
      
      const childNode = {
        name: this.buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType,
          isNephewNiece: RelationUtils.isSiblingChild(child.relation)
        },
        children: []
      };

      // إذا كان هذا الطفل يمكن أن يكون له أحفاد، أضف أحفاده
      if (familyMembers && accountOwner && 
          (child.relation === 'ابن' || child.relation === 'بنت')) {
        
        // البحث عن الأحفاد - طرق متعددة للربط
        const grandchildren = familyMembers.filter(m => {
          // تجنب إضافة نفس الحفيد مرتين
          if (this.addedChildrenIds.has(m.globalId)) {
            return false;
          }
          
          // تجنب إضافة الطفل نفسه أو رب العائلة
          if (m.globalId === child.globalId || m.globalId === accountOwner.globalId) {
            return false;
          }
          
          // الطريقة الأولى: علاقة حفيد/حفيدة مباشرة
          const isDirectGrandchild = (
            (m.relation === 'حفيد' || m.relation === 'حفيدة') &&
            (m.fatherName === child.firstName || m.parentId === child.globalId)
          );
          
          // الطريقة الثانية: النسب - الحفيد ابن هذا الطفل  
          const isChildByLineage = (
            m.fatherName === child.firstName &&
            (m.grandfatherName === accountOwner.firstName ||
             m.grandfatherName === accountOwner.name ||
             m.grandfatherName === this.buildFullName(accountOwner).split(' ')[0])
          );
          
          // الطريقة الثالثة: معرف الوالد يشير للطفل
          const isGrandchildByParentId = (
            m.parentId === child.globalId ||
            m.fatherId === child.globalId
          );
          
          // الطريقة الرابعة: أي شخص اسم والده يطابق اسم هذا الطفل (للأحفاد غير المصنفين)
          const isPotentialGrandchild = (
            m.fatherName === child.firstName &&
            !['والد', 'والدة', 'جد', 'جدة', 'عم', 'عمة', 'خال', 'خالة', 'أخ', 'أخت', 'زوجة', 'رب العائلة'].includes(m.relation)
          );
          
          const isGrandchild = isDirectGrandchild || isChildByLineage || isGrandchildByParentId || isPotentialGrandchild;
          
          // تسجيل للتشخيص
          if ((m.relation === 'حفيد' || m.relation === 'حفيدة') && !isGrandchild) {
            console.warn(`🔍 حفيد لم يتم ربطه: ${m.firstName}`, {
              'اسم والد الحفيد': m.fatherName,
              'اسم الطفل': child.firstName,
              'اسم جد الحفيد': m.grandfatherName,  
              'اسم رب العائلة': accountOwner.firstName,
              'معرف والد الحفيد': m.parentId,
              'معرف الطفل': child.globalId
            });
          }
          
          return isGrandchild;
        });

        // إضافة الأحفاد
        grandchildren.forEach(grandchild => {
          if (!this.addedChildrenIds.has(grandchild.globalId)) {
            this.addedChildrenIds.add(grandchild.globalId);
            childNode.children.push({
              name: this.buildFullName(grandchild),
              id: grandchild.globalId,
              avatar: grandchild.avatar || null,
              attributes: {
                ...grandchild,
                treeType,
                isGrandchild: true
              },
              children: []
            });
            console.warn(`✅ تم إضافة الحفيد "${grandchild.firstName}" تحت "${child.firstName}"`);
          }
        });

        if (grandchildren.length > 0) {
          console.warn(`📊 تم العثور على ${grandchildren.length} حفيد/حفيدة لـ "${child.firstName}"`);
        }
      }

      parentNode.children.push(childNode);
    });
  };

  // دالة مساعدة لإضافة الأطفال للوالد
  addChildrenToFather = (fatherNode, familyMembers, father, accountOwner) => {
    // إضافة رب العائلة كطفل للوالد
    const ownerNode = {
      name: this.buildFullName(accountOwner),
      id: accountOwner.globalId,
      avatar: accountOwner.avatar || null,
      attributes: {
        ...accountOwner,
        isCurrentUser: true,
        treeType: 'hierarchical'
      },
      children: []
    };

    // إضافة أطفال رب العائلة مع الأحفاد
    const ownerChildren = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      this.isChildOfParent(m, accountOwner)
    );

    this.addChildrenToNode(ownerNode, ownerChildren, 'hierarchical', familyMembers, accountOwner);
    fatherNode.children.push(ownerNode);

    // إضافة الإخوة والأخوات كأطفال للوالد
    const siblings = familyMembers.filter(m => 
      RelationUtils.isSibling(m.relation) && 
      m.globalId !== accountOwner.globalId && 
      m.globalId !== father.globalId
    );

    siblings.forEach(sibling => {
      const siblingNode = {
        name: this.buildFullName(sibling),
        id: sibling.globalId,
        avatar: sibling.avatar || null,
        attributes: {
          ...sibling,
          treeType: 'hierarchical'
        },
        children: []
      };

      // إضافة أطفال الأخ/الأخت
      const siblingChildren = familyMembers.filter(m => this.isChildOfParent(m, sibling));
      this.addChildrenToNode(siblingNode, siblingChildren, 'hierarchical', familyMembers, sibling);

      fatherNode.children.push(siblingNode);
    });

    // إضافة الزوجات كأطفال للوالد
    const spouses = familyMembers.filter(m => 
      (m.relation === 'زوجة' || RelationUtils.isAdditionalWife(m.relation)) && 
      m.globalId !== father.globalId
    );

    spouses.forEach(spouse => {
      fatherNode.children.push({
        name: this.buildFullName(spouse),
        id: spouse.globalId,
        avatar: spouse.avatar || null,
        attributes: {
          ...spouse,
          treeType: 'hierarchical'
        },
        children: []
      });
    });

    // ترتيب أطفال الوالد
    this.sortNodeChildren(fatherNode);
  };

  // بناء الشجرة الهرمية (مع وجود والد)
  buildHierarchicalTree = (familyMembers) => {
    const father = familyMembers.find(m => m.relation === 'والد');
    const accountOwner = familyMembers.find(m => m.relation === 'رب العائلة');
    
    if (!father || !accountOwner) return null;

    // البحث عن الجد الحقيقي في البيانات
    const grandfather = familyMembers.find(m => m.relation === 'جد');
    
    // البحث عن الأعمام
    const unclesAunts = familyMembers.filter(m => 
      RelationUtils.isUncleAunt(m.relation) && 
      m.globalId !== father.globalId && 
      m.globalId !== accountOwner.globalId
    );

    let rootNode;

    if (grandfather) {
      // استخدام بيانات الجد الحقيقي كجذر
      rootNode = {
        name: this.buildFullName(grandfather),
        id: grandfather.globalId,
        avatar: grandfather.avatar || null,
        attributes: {
          ...grandfather,
          isGrandfather: true,
          isRoot: true,
          treeType: 'hierarchical'
        },
        children: []
      };

      // إضافة الوالد كطفل للجد
      const fatherNode = {
        name: this.buildFullName(father),
        id: father.globalId,
        avatar: father.avatar || null,
        attributes: {
          ...father,
          isMainFather: true,
          treeType: 'hierarchical'
        },
        children: []
      };

      rootNode.children.push(fatherNode);

      // إضافة الأعمام كإخوة للوالد (أطفال الجد)
      unclesAunts.forEach(uncleAunt => {
        const uncleAuntNode = {
          name: this.buildFullName(uncleAunt),
          id: uncleAunt.globalId,
          avatar: uncleAunt.avatar || null,
          attributes: {
            ...uncleAunt,
            treeType: 'hierarchical'
          },
          children: []
        };

        // إضافة أبناء العم/العمة
        const cousins = familyMembers.filter(m => this.isCousinOfUncle(m, uncleAunt));
        this.addChildrenToNode(uncleAuntNode, cousins, 'hierarchical', familyMembers, accountOwner);

        rootNode.children.push(uncleAuntNode);
      });

      // إضافة الأطفال للوالد
      this.addChildrenToFather(fatherNode, familyMembers, father, accountOwner);

    } else if (unclesAunts.length > 0) {
      // إنشاء عقدة جد افتراضية ظاهرة عندما يوجد أعمام فقط
      rootNode = {
        name: father.fatherName || "الجد",
        id: "grandfather-root",
        avatar: null,
        attributes: {
          relation: "جد",
          firstName: father.fatherName || "الجد",
          isVirtualGrandfather: true,
          isGenerationRoot: true,
          treeType: 'hierarchical'
        },
        children: []
      };

      // إضافة الوالد كطفل للجد
      const fatherNode = {
        name: this.buildFullName(father),
        id: father.globalId,
        avatar: father.avatar || null,
        attributes: {
          ...father,
          isMainFather: true,
          treeType: 'hierarchical'
        },
        children: []
      };

      rootNode.children.push(fatherNode);

      // إضافة الأعمام كإخوة للوالد (أطفال الجد)
      unclesAunts.forEach(uncleAunt => {
        const uncleAuntNode = {
          name: this.buildFullName(uncleAunt),
          id: uncleAunt.globalId,
          avatar: uncleAunt.avatar || null,
          attributes: {
            ...uncleAunt,
            treeType: 'hierarchical'
          },
          children: []
        };

        // إضافة أبناء العم/العمة
        const cousins = familyMembers.filter(m => this.isCousinOfUncle(m, uncleAunt));
        this.addChildrenToNode(uncleAuntNode, cousins, 'hierarchical', familyMembers, accountOwner);

        rootNode.children.push(uncleAuntNode);
      });

      // إضافة الأطفال للوالد
      this.addChildrenToFather(fatherNode, familyMembers, father, accountOwner);

    } else {
      // إذا لم يكن هناك جد أو أعمام، الوالد هو الجذر
      rootNode = {
        name: this.buildFullName(father),
        id: father.globalId,
        avatar: father.avatar || null,
        attributes: {
          ...father,
          isRoot: true,
          treeType: 'hierarchical'
        },
        children: []
      };

      this.addChildrenToFather(rootNode, familyMembers, father, accountOwner);
    }

    // ترتيب العقد
    this.sortNodeChildren(rootNode);
    return rootNode;
  };

  // بناء الشجرة البسيطة (بدون والد)
  buildSimpleTree = (familyMembers) => {
    const head = this.findFamilyHead(familyMembers);
    if (!head) return null;

    const rootNode = {
      name: this.buildFullName(head),
      id: head.globalId,
      avatar: head.avatar || null,
      attributes: {
        ...head,
        isCurrentUser: true,
        treeType: 'simple'
      },
      children: []
    };

    // إضافة الأطفال مع الأحفاد
    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      this.isChildOfParent(m, head)
    );

    this.addChildrenToNode(rootNode, children, 'simple', familyMembers, head);

    // التحقق من وجود إخوة وأخوات
    const hasSiblings = familyMembers.some(m => RelationUtils.isSibling(m.relation));

    if (hasSiblings) {
      return this.buildSimpleTreeWithSiblings(familyMembers, rootNode, head);
    }

    return rootNode;
  };

  // بناء الشجرة البسيطة مع الإخوة
  buildSimpleTreeWithSiblings = (familyMembers, rootNode, head) => {
    const familyRoot = {
      name: 'العائلة',
      id: 'family_root',
      avatar: null,
      attributes: {
        relation: 'عائلة',
        isVirtualRoot: true,
        treeType: 'simple_with_siblings'
      },
      children: []
    };

    // إضافة رب العائلة
    familyRoot.children.push(rootNode);

    // إضافة الإخوة والأخوات
    const siblings = familyMembers.filter(m => 
      RelationUtils.isSibling(m.relation) && 
      m.globalId !== head.globalId
    );

    siblings.forEach(sibling => {
      const siblingNode = {
        name: this.buildFullName(sibling),
        id: sibling.globalId,
        avatar: sibling.avatar || null,
        attributes: {
          ...sibling,
          treeType: 'simple_with_siblings'
        },
        children: []
      };

      // إضافة أطفال الأخ/الأخت مع أحفادهم (إذا كان لديهم)
      const siblingChildren = familyMembers.filter(m => this.isChildOfParent(m, sibling));
      
      // أطفال الإخوة هم أبناء عم/خال، لكن قد يكون لهم أطفال (أحفاد أبناء العم)
      // نمرر sibling كـ accountOwner لأنه والد أطفاله
      this.addChildrenToNode(siblingNode, siblingChildren, 'simple_with_siblings', familyMembers, sibling);

      familyRoot.children.push(siblingNode);
    });

    return familyRoot;
  };

  // ترتيب أطفال العقدة
  sortNodeChildren = (node) => {
    if (node.children && node.children.length > 1) {
      node.children.sort((a, b) => {
        const aAttrs = a.attributes;
        const bAttrs = b.attributes;
        
        // ترتيب حسب الأولوية
        const aPriority = RelationUtils.getRelationPriority(aAttrs.relation);
        const bPriority = RelationUtils.getRelationPriority(bAttrs.relation);
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // ترتيب أبجدي داخل نفس الفئة
        return (aAttrs.firstName || '').localeCompare(bAttrs.firstName || '', 'ar');
      });
    }
  };

  // حساب عمق الشجرة
  calculateTreeDepth = (node, currentDepth = 0) => {
    if (!node || !node.children || node.children.length === 0) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    node.children.forEach(child => {
      const childDepth = this.calculateTreeDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    });
    
    return maxDepth;
  };

  // الدالة الرئيسية لبناء الشجرة
  buildTreeStructure = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    // إعادة تعيين مجموعة الأطفال المُضافين
    this.addedChildrenIds = new Set();

    // تنظيف البيانات
    const cleanMembers = familyMembers.map(this.sanitizeMemberData);

    // التحقق من صحة ربط الأحفاد
    this.validateGrandchildrenConnections(cleanMembers);

    // تحديد نوع الشجرة وبناؤها
    const treeType = RelationUtils.determineTreeType(cleanMembers);
    
    switch (treeType) {
      case 'hierarchical':
        return this.buildHierarchicalTree(cleanMembers);
      case 'simple_with_siblings':
      case 'simple':
        return this.buildSimpleTree(cleanMembers);
      default:
        return null;
    }
  };
}

// تصدير مثيل جاهز للاستخدام
export const familyTreeBuilder = new FamilyTreeBuilder();

export default familyTreeBuilder;

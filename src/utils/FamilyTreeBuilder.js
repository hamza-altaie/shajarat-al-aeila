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
       child.relation === 'ابن' || child.relation === 'بنت') &&
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

    return isChildByFatherName || isChildByParentId || isChildByFullLineage;
  };

  // إضافة الأطفال للعقدة
  addChildrenToNode = (parentNode, children, treeType) => {
    children.forEach(child => {
      // تسجيل الطفل كمُضاف لتجنب التكرار
      this.addedChildrenIds.add(child.globalId);
      
      parentNode.children.push({
        name: this.buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType,
          isNephewNiece: RelationUtils.isSiblingChild(child.relation)
        },
        children: []
      });
    });
  };

  // بناء الشجرة الهرمية (مع وجود والد)
  buildHierarchicalTree = (familyMembers) => {
    const father = familyMembers.find(m => m.relation === 'والد');
    const accountOwner = familyMembers.find(m => m.relation === 'رب العائلة');
    
    if (!father || !accountOwner) return null;

    // إنشاء عقدة الوالد (الجذر)
    const rootNode = {
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

    // إضافة رب العائلة
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

    // إضافة أطفال رب العائلة
    const ownerChildren = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      this.isChildOfParent(m, accountOwner)
    );

    this.addChildrenToNode(ownerNode, ownerChildren, 'hierarchical');
    rootNode.children.push(ownerNode);

    // إضافة الإخوة والأخوات
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
      this.addChildrenToNode(siblingNode, siblingChildren, 'hierarchical');

      rootNode.children.push(siblingNode);
    });

    // إضافة الزوجات
    const spouses = familyMembers.filter(m => 
      (m.relation === 'زوجة' || RelationUtils.isAdditionalWife(m.relation)) && 
      m.globalId !== father.globalId
    );

    spouses.forEach(spouse => {
      rootNode.children.push({
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

    // إضافة الأطفال
    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      this.isChildOfParent(m, head)
    );

    this.addChildrenToNode(rootNode, children, 'simple');

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

      // إضافة أطفال الأخ/الأخت
      const siblingChildren = familyMembers.filter(m => this.isChildOfParent(m, sibling));
      this.addChildrenToNode(siblingNode, siblingChildren, 'simple_with_siblings');

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

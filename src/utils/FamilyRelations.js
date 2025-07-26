// src/utils/FamilyRelations.js - إدارة العلاقات العائلية والتصنيفات

// تعريف العلاقات حسب الجنس
export const MALE_RELATIONS = [
  "ابن", "والد", "جد", "جد الجد", "أخ", "أخ غير شقيق", "عم", "ابن عم", 
  "خال", "ابن خال", "ابن أخ", "ابن أخت", "حفيد", "حفيد الحفيد", 
  "زوج الابنة", "صهر", "حمو", "أخو الزوج", "ابن عم الوالد", "قريب", 
  "متبنى", "ربيب", "رب العائلة"
];

export const FEMALE_RELATIONS = [
  "بنت", "زوجة", "والدة", "جدة", "جدة الجد", "أخت", "أخت غير شقيقة", 
  "عمة", "بنت عم", "خالة", "بنت خال", "بنت أخ", "بنت أخت", "حفيدة", 
  "حفيدة الحفيد", "زوجة الابن", "كنة", "حماة", "أخت الزوج", "زوجة ثانية", 
  "زوجة ثالثة", "زوجة رابعة", "بنت عم الوالد", "قريبة", "متبناة", "ربيبة"
];

// مجموعات العلاقات
export const RELATION_GROUPS = {
  // العلاقات الأساسية
  IMMEDIATE_FAMILY: ['رب العائلة', 'زوجة', 'ابن', 'بنت'],
  
  // الوالدين والأجداد
  PARENTS_GRANDPARENTS: ['والد', 'والدة', 'جد', 'جدة', 'جد الجد', 'جدة الجد'],
  
  // الإخوة والأخوات
  SIBLINGS: ['أخ', 'أخت', 'أخ غير شقيق', 'أخت غير شقيقة'],
  
  // أطفال الإخوة والأخوات
  SIBLINGS_CHILDREN: ['ابن أخ', 'بنت أخ', 'ابن أخت', 'بنت أخت'],
  
  // الأعمام والعمات
  UNCLES_AUNTS: ['عم', 'عمة', 'خال', 'خالة'],
  
  // أطفال الأعمام والأخوال
  COUSINS: ['ابن عم', 'بنت عم', 'ابن خال', 'بنت خال', 'ابن عم الوالد', 'بنت عم الوالد'],
  
  // الأحفاد
  GRANDCHILDREN: ['حفيد', 'حفيدة', 'حفيد الحفيد', 'حفيدة الحفيد'],
  
  // الزوجات الإضافيات
  ADDITIONAL_WIVES: ['زوجة ثانية', 'زوجة ثالثة', 'زوجة رابعة'],
  
  // الأقارب بالمصاهرة
  IN_LAWS: ['صهر', 'كنة', 'حمو', 'حماة', 'أخو الزوج', 'أخت الزوج', 'زوج الابنة'],
  
  // الأقارب والمتبنين
  EXTENDED: ['قريب', 'قريبة', 'متبنى', 'متبناة', 'ربيب', 'ربيبة']
};

// وظائف مساعدة للتحقق من العلاقات
export const RelationUtils = {
  // التحقق من الجنس بناءً على العلاقة
  isMaleRelation: (relation) => MALE_RELATIONS.includes(relation),
  isFemaleRelation: (relation) => FEMALE_RELATIONS.includes(relation),
  
  // التحقق من المجموعات
  isImmediateFamily: (relation) => RELATION_GROUPS.IMMEDIATE_FAMILY.includes(relation),
  isParentOrGrandparent: (relation) => RELATION_GROUPS.PARENTS_GRANDPARENTS.includes(relation),
  isSibling: (relation) => RELATION_GROUPS.SIBLINGS.includes(relation),
  isSiblingChild: (relation) => RELATION_GROUPS.SIBLINGS_CHILDREN.includes(relation),
  isUncleAunt: (relation) => RELATION_GROUPS.UNCLES_AUNTS.includes(relation),
  isCousin: (relation) => RELATION_GROUPS.COUSINS.includes(relation),
  isGrandchild: (relation) => RELATION_GROUPS.GRANDCHILDREN.includes(relation),
  isAdditionalWife: (relation) => RELATION_GROUPS.ADDITIONAL_WIVES.includes(relation),
  isInLaw: (relation) => RELATION_GROUPS.IN_LAWS.includes(relation),
  isExtended: (relation) => RELATION_GROUPS.EXTENDED.includes(relation),
  
  // تحديد نوع الشجرة بناءً على العلاقات الموجودة
  determineTreeType: (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) return 'empty';
    
    const hasFather = familyMembers.some(m => m.relation === 'والد');
    const hasSiblings = familyMembers.some(m => RelationUtils.isSibling(m.relation));
    
    if (hasFather) return 'hierarchical';
    if (hasSiblings) return 'simple_with_siblings';
    return 'simple';
  },
  
  // حساب الأولوية في الترتيب
  getRelationPriority: (relation) => {
    if (relation === 'رب العائلة') return 1;
    if (RelationUtils.isSibling(relation)) return 2;
    if (RelationUtils.isAdditionalWife(relation) || relation === 'زوجة') return 3;
    if (RelationUtils.isImmediateFamily(relation)) return 4;
    if (RelationUtils.isParentOrGrandparent(relation)) return 5;
    return 6;
  },
  
  // الحصول على الأيقونة المناسبة للعلاقة
  getRelationIcon: (relation, isNephewNiece = false) => {
    if (isNephewNiece) return '👶';
    if (relation === 'رب العائلة') return '👑';
    if (relation === 'والد') return '👨';
    if (relation === 'والدة') return '👩';
    if (RelationUtils.isSibling(relation)) return RelationUtils.isMaleRelation(relation) ? '👨‍🦰' : '👩‍🦰';
    if (relation === 'زوجة' || RelationUtils.isAdditionalWife(relation)) return '👰';
    return '';
  }
};

// ألوان العلاقات
export const RELATION_COLORS = {
  MALE: {
    fill: "#e3f2fd",
    stroke: "#2196f3"
  },
  FEMALE: {
    fill: "#fce4ec", 
    stroke: "#e91e63"
  },
  NEPHEW_NIECE_MALE: {
    fill: "#e8f4fd",
    stroke: "#42a5f5"
  },
  NEPHEW_NIECE_FEMALE: {
    fill: "#fde8f0",
    stroke: "#ec407a"
  },
  VIRTUAL_ROOT: {
    fill: "#f8fafc",
    stroke: "#e2e8f0"
  },
  DEFAULT: {
    fill: "#f3f4f6",
    stroke: "#cbd5e1"
  }
};

export default {
  MALE_RELATIONS,
  FEMALE_RELATIONS,
  RELATION_GROUPS,
  RelationUtils,
  RELATION_COLORS
};

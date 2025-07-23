// src/components/FamilyTreeAdvanced.jsx - النسخة المصححة مع الشجرة الموسعة الحقيقية
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, IconButton, Tooltip, Paper, LinearProgress, 
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, 
  FormControlLabel, Switch, TextField, InputAdornment
} from '@mui/material';

// استيراد الأيقونات بشكل منفصل لتحسين الأداء
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';

// استيرادات Firebase
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// استيراد المكونات
import ExtendedFamilyLinking from './ExtendedFamilyLinking';
import './FamilyTreeAdvanced.css';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());

  // ===========================================================================
  // دوال مساعدة ثابتة
  // ===========================================================================

// 🔧 إصلاح بسيط لـ iPhone
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const style = document.createElement('style');
      style.textContent = `
        svg {
          transform: translateZ(0) !important;
          opacity: 1 !important;
          visibility: visible !important;
          overflow: visible !important;
        }
        svg g, svg text, svg rect, svg circle {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const sanitizeMemberData = (memberData) => {
    return {
      ...memberData,
      firstName: memberData.firstName?.trim() || '',
      fatherName: memberData.fatherName?.trim() || '',
      grandfatherName: memberData.grandfatherName?.trim() || '',
      surname: memberData.surname?.trim() || '',
      relation: memberData.relation?.trim() || 'عضو'
    };
  };

  const findFamilyHead = (members) => {
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  };

  // ===========================================================================
  // دوال أساسية useCallback
  // ===========================================================================

  const buildFullName = useCallback((person) => {
    if (!person) return '';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : '';
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    if (nodeData.action === 'edit') {
      // منطق التعديل
    } else if (nodeData.action === 'view') {
      // منطق العرض
    }
    
    setSelectedNode(nodeData);
  }, []);

  const monitorPerformance = useCallback((metrics) => {
    // دمج الإحصائيات من النافذة العامة إن وجدت
    const globalMetrics = window.familyTreeMetrics || {};
    
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics,
      maxDepthReached: Math.max(prev.maxDepthReached || 0, globalMetrics.maxDepthReached || 0, metrics.maxDepthReached || 0)
    }));
    
    // رسائل تحسينية بناءً على الأداء
    if (metrics.personCount > 100) {
      showSnackbar(`🚀 أداء استثنائي! تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    } else if (metrics.personCount > 50) {
      showSnackbar(`✅ تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    }
    
    if (metrics.familyCount > 5) {
      showSnackbar(`🏛️ شجرة كبيرة: تم ربط ${metrics.familyCount} عائلة`, 'info');
    } else if (metrics.familyCount > 1) {
      showSnackbar(`🏛️ تم ربط ${metrics.familyCount} عائلة`, 'info');
    }
    
    // تتبع العمق المحقق مع تقييم متقدم للأجيال
    const actualDepth = globalMetrics.maxDepthReached || metrics.maxDepthReached;
    if (actualDepth >= 15) {
      showSnackbar(`🏛️ شجرة قبيلة عظيمة! ${actualDepth} جيل - نظام متقدم جداً`, 'success');
    } else if (actualDepth >= 10) {
      showSnackbar(`🌳 شجرة عميقة ممتازة: ${actualDepth} جيل`, 'success');
    } else if (actualDepth >= 5) {
      showSnackbar(`🌿 عمق جيد: ${actualDepth} أجيال`, 'info');
    } else if (actualDepth >= 2) {
      showSnackbar(`👨‍👩‍👧‍👦 شجرة عائلية: ${actualDepth} أجيال`, 'info');
    }
    
  }, [showSnackbar]);

  // ===========================================================================
  // دوال البناء
  // ===========================================================================

  const buildSimpleTreeStructure = useCallback((familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    const head = findFamilyHead(familyMembers);
    if (!head) {
      return null;
    }

    const rootNode = {
      name: buildFullName(head),
      id: head.globalId,
      avatar: head.avatar || null,
      attributes: {
        ...head,
        isCurrentUser: true,
        treeType: 'simple',
        isExtended: false
      },
      children: []
    };

    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت' || m.relation === 'child') && 
      m.globalId !== head.globalId
    );

    children.forEach(child => {
      rootNode.children.push({
        name: buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType: 'simple',
          isExtended: false
        },
        children: []
      });
    });

    return rootNode;
  }, [buildFullName]);

  const calculateTreeDepth = useCallback((node, currentDepth = 0) => {
    if (!node || !node.children || node.children.length === 0) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    node.children.forEach(child => {
      const childDepth = calculateTreeDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    });
    
    return maxDepth;
  }, []);

  const loadFamilyData = useCallback(async (familyUid) => {
  try {
    // إضافة تحميل بيانات المستخدم
    const userDoc = await getDoc(doc(db, 'users', familyUid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
    const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid: familyUid,
          isExtended: familyUid !== uid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length > 0) {
        const head = findFamilyHead(members);
        
        return {
          uid: familyUid,
          members,
          head,
          userData, // إضافة هذا السطر
          isExtended: familyUid !== uid
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }, [uid]);

  const findAllLinkedFamilies = useCallback(async (startUid) => {
    try {
      const linkedFamilyUids = new Set([startUid]);
      
      // البحث في بيانات المستخدم الحالي
      const userDoc = await getDoc(doc(db, 'users', startUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // إضافة العائلات من linkedFamilies
        if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
          userData.linkedFamilies.forEach(link => {
            if (link.targetFamilyUid) {
              linkedFamilyUids.add(link.targetFamilyUid);
            }
          });
        }
        
        // إضافة العائلة الرئيسية إن وجدت
        if (userData.linkedToFamilyHead) {
          linkedFamilyUids.add(userData.linkedToFamilyHead);
        }
      }
      
      // البحث في جميع المستخدمين عن روابط معكوسة
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      allUsersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // إذا كان مرتبط بعائلتك
        if (userData.linkedToFamilyHead === startUid) {
          linkedFamilyUids.add(userId);
        }
        
        // إذا كان لديه روابط معك
        if (userData.linkedFamilies && Array.isArray(userData.linkedFamilies)) {
          userData.linkedFamilies.forEach(link => {
            if (link.targetFamilyUid === startUid) {
              linkedFamilyUids.add(userId);
            }
          });
        }
      });
      
      const result = Array.from(linkedFamilyUids);
      return result;
      
    } catch {
      return [startUid]; // إرجاع العائلة الحالية فقط في حالة الخطأ
    }
  }, []);

  // دالة دمج الهويات المتعددة لنفس الشخص
  const mergePersonIdentities = useCallback((allFamiliesData) => {
    const personMap = new Map(); // خريطة الأشخاص بالاسم الكامل
    const mergedFamilies = [];

    allFamiliesData.forEach(familyData => {
      familyData.members.forEach(member => {
        const fullName = `${member.firstName?.trim() || ''}_${member.fatherName?.trim() || ''}`.toLowerCase();
        
        if (personMap.has(fullName)) {
          // هذا الشخص موجود بالفعل - دمج البيانات
          const existingPerson = personMap.get(fullName);
          
          // دمج الأدوار والمعلومات
          const mergedPerson = {
            ...existingPerson,
            // إبقاء أحدث المعلومات أو الأكثر تفصيلاً
            avatar: member.avatar || existingPerson.avatar,
            birthdate: member.birthdate || existingPerson.birthdate,
            phone: member.phone || existingPerson.phone,
            
            // دمج الأدوار من كلا الحسابين
            multipleRoles: [
              ...(existingPerson.multipleRoles || [{ 
                familyUid: existingPerson.familyUid, 
                relation: existingPerson.relation,
                isPrimary: true 
              }]),
              { 
                familyUid: familyData.uid, 
                relation: member.relation,
                isPrimary: false 
              }
            ],
            
            // تحديد الهوية الأساسية (عادة رب العائلة له الأولوية)
            primaryRole: member.relation === 'رب العائلة' ? {
              familyUid: familyData.uid,
              relation: member.relation
            } : existingPerson.primaryRole
          };
          
          personMap.set(fullName, mergedPerson);

        } else {
          // شخص جديد - إضافته للخريطة
          const newPerson = {
            ...member,
            primaryRole: {
              familyUid: familyData.uid,
              relation: member.relation
            }
          };
          
          personMap.set(fullName, newPerson);
        }
      });

      // معالجة العائلة مع الأعضاء المدموجين - الحفاظ على العلاقة الأصلية لكل عائلة
      const updatedMembers = familyData.members.map(member => {
        const fullName = `${member.firstName?.trim() || ''}_${member.fatherName?.trim() || ''}`.toLowerCase();
        const mergedPerson = personMap.get(fullName);
        
        // إرجاع نسخة من الشخص المدموج مع الحفاظ على العلاقة الأصلية في هذه العائلة
        return {
          ...mergedPerson,
          relation: member.relation, // الحفاظ على العلاقة الأصلية في هذه العائلة
          familyUid: familyData.uid // الحفاظ على معرف العائلة الحالي
        };
      });

      mergedFamilies.push({
        ...familyData,
        members: updatedMembers
      });
    });

    return mergedFamilies;
  }, []);

  // إصلاح دالة buildExtendedTreeStructure في FamilyTreeAdvanced.jsx

  const buildExtendedTreeStructure = useCallback((allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    // خطوة 1: دمج الهويات المتعددة لنفس الأشخاص
    const mergedFamiliesData = mergePersonIdentities(allFamiliesData);

    mergedFamiliesData.forEach((family) => {
      const mergedPersons = family.members.filter(m => m.multipleRoles);
      if (mergedPersons.length > 0) {
        // معالجة الأشخاص المدموجين
      }
    });

    // **خطوة جديدة: البحث المتقدم عن جميع الأجيال**
    
    // دالة للبحث عن جميع الأجداد (تصاعدي) - محسنة للأعماق الكبيرة
    function findAllAncestors(startFamily, maxDepth = 15) {

      const ancestors = [];
      const visitedFamilies = new Set(); // تجنب الدورات اللانهائية
      let currentFamily = startFamily;
      let depth = 0;
      
      while (currentFamily && depth < maxDepth) {
        // تجنب الدورات اللانهائية
        if (visitedFamilies.has(currentFamily.uid)) {

          break;
        }
        visitedFamilies.add(currentFamily.uid);
        
        // البحث عن أب هذه العائلة
        const parentFamily = mergedFamiliesData.find(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === currentFamily.uid && 
              (isFamilyHeadRelation(role.relation) || role.relation === 'child')
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              isChildRelation(role.relation)
            )
          );
        });
        
        if (parentFamily && parentFamily.uid !== currentFamily.uid && !visitedFamilies.has(parentFamily.uid)) {
          // استخدام الدالة المشتركة لتسمية الأجداد
          const relationName = getGenerationName(depth, 'ancestor');
          
          ancestors.push({
            family: parentFamily,
            depth: depth + 1,
            relation: relationName
          });

          currentFamily = parentFamily;
          depth++;
        } else {
          if (parentFamily && visitedFamilies.has(parentFamily.uid)) {
            // تجنب الدورة اللانهائية
          }
          break;
        }
      }
      
      if (depth >= maxDepth) {
        // تم الوصول للحد الأقصى من العمق
      }

      return ancestors;
    }
    
    // دالة للبحث عن جميع الأحفاد (تنازلي) - محسنة للأعماق الكبيرة
    function findAllDescendants(personFamily, maxDepth = 15) {

      const descendants = [];
      const visitedFamilies = new Set(); // تجنب الدورات اللانهائية
      
      function searchDeeper(currentFamily, currentDepth) {
        if (currentDepth >= maxDepth) {

          return;
        }
        
        // تجنب الدورات اللانهائية
        if (visitedFamilies.has(currentFamily.uid)) {

          return;
        }
        visitedFamilies.add(currentFamily.uid);
        
        // البحث عن عائلات الأطفال
        const childrenFamilies = mergedFamiliesData.filter(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === currentFamily.uid && 
              isChildRelation(role.relation)
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              isFamilyHeadRelation(role.relation)
            )
          ) && !visitedFamilies.has(family.uid);
        });
        
        childrenFamilies.forEach(childFamily => {
          if (childFamily.uid !== currentFamily.uid) {
            // استخدام الدالة المشتركة لتسمية الأحفاد
            const relationName = getGenerationName(currentDepth, 'descendant');
            
            descendants.push({
              family: childFamily,
              depth: currentDepth + 1,
              relation: relationName
            });

            // البحث التكراري للمستوى التالي
            searchDeeper(childFamily, currentDepth + 1);
          }
        });
      }
      
      searchDeeper(personFamily, 0);

      return descendants;
    }
    
    // دالة للبحث عن جميع الأقارب الجانبيين
    function findAllCousinsAndRelatives(ancestors) {

      const relatives = [];
      
      ancestors.forEach(ancestor => {
        // البحث عن إخوة هذا الجد
        const uncles = mergedFamiliesData.filter(family => {
          return family.members.some(member => 
            member.multipleRoles && 
            member.multipleRoles.some(role => 
              role.familyUid === ancestor.family.uid && 
              isChildRelation(role.relation)
            ) &&
            member.multipleRoles.some(role => 
              role.familyUid === family.uid && 
              isFamilyHeadRelation(role.relation)
            )
          ) && family.uid !== ancestor.family.uid;
        });
        
        uncles.forEach(uncle => {
          const relationName = ancestor.depth === 1 ? 'عم' : 
                             ancestor.depth === 2 ? 'عم الأب' : 
                             `عم الجد ${ancestor.depth - 1}`;
          
          relatives.push({
            family: uncle,
            depth: ancestor.depth,
            relation: relationName,
            ancestorDepth: ancestor.depth
          });

          // البحث عن أطفال العم (أبناء العم)
          const cousinDescendants = findAllDescendants(uncle, 5);
          cousinDescendants.forEach(cousin => {
            const cousinRelation = ancestor.depth === 1 ? 
              (cousin.depth === 1 ? 'ابن عم' : `حفيد العم ${cousin.depth - 1}`) :
              `ابن عم الجد ${ancestor.depth - 1}`;
              
            relatives.push({
              family: cousin.family,
              depth: ancestor.depth + cousin.depth,
              relation: cousinRelation,
              ancestorDepth: ancestor.depth
            });
          });
        });
      });

      return relatives;
    }

    const currentUserFamily = mergedFamiliesData.find(f => f.uid === rootFamilyUid);
    
    // **البحث الشامل عن جميع الأجيال والأقارب**

    // العثور على جميع الأجداد
    const allAncestors = findAllAncestors(currentUserFamily, 10);
    
    // العثور على جميع الأقارب الجانبيين
    const allRelatives = findAllCousinsAndRelatives(allAncestors);
    
    // تحديد الجذر الأقدم (أعلى جد في السلسلة)
    const oldestAncestor = allAncestors.length > 0 ? 
      allAncestors[allAncestors.length - 1] : 
      { family: currentUserFamily, depth: 0, relation: 'أنت' };

    // تحليل الروابط وتصنيفها - إصلاح محسن
    let relationships = {
      oldestRoot: oldestAncestor.family,        // الجذر الأقدم
      ancestors: allAncestors,                  // جميع الأجداد
      directParent: null,                       // الأب المباشر  
      siblings: [],                             // الإخوة
      uncles: [],                               // الأعمام
      cousins: [],                              // أبناء العم
      descendants: [],                          // الأحفاد
      relatives: allRelatives,                  // جميع الأقارب الجانبيين
      others: []                                // باقي الأقارب
    };

    // **خطوة 1: البحث عن الأب المباشر والإخوة من خلال الهويات المدموجة**

    // البحث عن الأب المباشر (الجيل السابق مباشرة)
    const directParent = allAncestors.length > 0 ? allAncestors[0] : null;
    if (directParent) {
      relationships.directParent = directParent.family;

    }
    
    // البحث عن الإخوة في عائلة الأب المباشرة
    if (relationships.directParent) {
      // البحث عن الإخوة في عائلة الأب المباشرة
      const siblingsInParentFamily = relationships.directParent.members.filter(member => 
        isChildRelation(member.relation) &&
        member.globalId !== currentUserFamily.head.globalId && // ليس المستخدم الحالي
        member.id !== currentUserFamily.head.id
      );

      // إضافة كل أخ كعائلة منفصلة للشجرة
      siblingsInParentFamily.forEach(sibling => {

        // البحث عن عائلة هذا الأخ (إذا كان له عائلة منفصلة)
        const siblingFamily = mergedFamiliesData.find(family => 
          family.head.globalId === sibling.globalId || 
          family.head.id === sibling.id
        );
        
        if (siblingFamily && siblingFamily.uid !== rootFamilyUid) {

          relationships.siblings.push(siblingFamily);
        }
      });
    }
    
    // **خطوة 2: تصنيف الأقارب الجانبيين**

    // تصنيف الأعمام وأبناء العم
    allRelatives.forEach(relative => {
      if (relative.relation.includes('عم') && !relative.relation.includes('ابن')) {
        relationships.uncles.push(relative.family);

      } else if (relative.relation.includes('ابن عم') || relative.relation.includes('حفيد العم')) {
        relationships.cousins.push(relative.family);

      } else {
        relationships.others.push({family: relative.family, type: relative.relation});

      }
    });
    
    // **خطوة 3: البحث عن جميع الأحفاد**

    relationships.descendants = findAllDescendants(currentUserFamily, 10);

    // **خطوة 4: معالجة الروابط التقليدية إذا لم نجد ما يكفي من الهويات المدموجة**
    if ((!relationships.directParent || relationships.siblings.length === 0) && currentUserFamily?.userData?.linkedFamilies) {

      currentUserFamily.userData.linkedFamilies.forEach(link => {
        const linkedFamily = mergedFamiliesData.find(f => f.uid === link.targetFamilyUid);
        
        if (linkedFamily?.head) {

          switch (link.linkType) {
            case 'father':
              if (!relationships.directParent) {
                relationships.directParent = linkedFamily;
              }
              break;
              
            case 'brother':
              if (!relationships.siblings.some(s => s.uid === linkedFamily.uid)) {
                relationships.siblings.push(linkedFamily);
              }
              break;
              
            case 'uncle':
            case 'nephew':
              if (!relationships.uncles.some(u => u.uid === linkedFamily.uid)) {
                relationships.uncles.push(linkedFamily);
              }
              break;
              
            case 'grandfather':
            case 'grandson':
              if (!relationships.others.some(o => o.family.uid === linkedFamily.uid)) {
                relationships.others.push({family: linkedFamily, type: 'grandparent'});
              }
              break;
              
            default:
              relationships.others.push({family: linkedFamily, type: link.linkType});
          }
        }
      });
    }

    // **خطوة إضافية: البحث عن الأعمام عبر الروابط المتبادلة**
    // البحث في جميع العائلات عن من يكون مرتبط بأبي كأخ
    console.warn('🔍 البحث عن الأعمام...', {
      hasDirectParent: !!relationships.directParent,
      currentUnclesCount: relationships.uncles.length,
      allFamiliesCount: mergedFamiliesData.length
    });
    
    if (relationships.directParent) {
      console.warn('👨 والدي:', relationships.directParent.head.firstName);
      
      mergedFamiliesData.forEach(family => {
        if (family.userData?.linkedFamilies && family.uid !== currentUserFamily.uid) {
          family.userData.linkedFamilies.forEach(link => {
            // إذا كانت هذه العائلة مرتبطة مع أبي كأخ، إذن هي عمي
            if (link.targetFamilyUid === relationships.directParent.uid && link.linkType === 'brother') {
              console.warn('✅ وجدت عم عبر رابط أخ مع الأب:', family.head.firstName);
              if (!relationships.uncles.some(u => u.uid === family.uid)) {
                relationships.uncles.push(family);
              }
            }
            // أو إذا كانت مرتبطة معي كعم
            else if (link.targetFamilyUid === currentUserFamily.uid && link.linkType === 'nephew') {
              console.warn('✅ وجدت عم عبر رابط ابن أخ معي:', family.head.firstName);
              if (!relationships.uncles.some(u => u.uid === family.uid)) {
                relationships.uncles.push(family);
              }
            }
          });
        }
      });
    }

    // **خطوة أخرى: البحث عن من هو مرتبط معي كعم مباشرة**
    mergedFamiliesData.forEach(family => {
      if (family.userData?.linkedFamilies && family.uid !== currentUserFamily.uid) {
        family.userData.linkedFamilies.forEach(link => {
          if (link.targetFamilyUid === currentUserFamily.uid && link.linkType === 'nephew') {
            console.warn('✅ وجدت عم مرتبط معي مباشرة:', family.head.firstName);
            if (!relationships.uncles.some(u => u.uid === family.uid)) {
              relationships.uncles.push(family);
            }
          }
        });
      }
    });
    
    console.warn('📊 نتائج البحث عن الأعمام:', {
      unclesFound: relationships.uncles.length,
      uncleNames: relationships.uncles.map(u => u.head.firstName)
    });

    console.warn('🏗️ حالة العلاقات قبل بناء الشجرة:', {
      hasDirectParent: !!relationships.directParent,
      parentName: relationships.directParent?.head?.firstName,
      unclesCount: relationships.uncles.length,
      siblingsCount: relationships.siblings.length,
      scenarioWillUse: relationships.directParent ? 'أب فقط' : 
                      relationships.uncles.length > 0 ? 'عم فقط' : 'شجرة بسيطة'
    });

    // خريطة للعقد المنشأة لتجنب التكرار
    const createdNodes = new Map();
    
    // دالة مساعدة لتحديد اسم الجيل/العلاقة بناءً على العمق والنوع
    function getGenerationName(depth, type = 'descendant') {
      if (type === 'ancestor') {
        // تسمية الأجداد
        switch(depth) {
          case 1:
            return 'أب';
          case 2:
            return 'جد';
          case 3:
            return 'جد الجد';
          case 4:
            return 'جد الجيل الرابع';
          case 5:
            return 'جد الجيل الخامس';
          case 6:
            return 'جد الجيل السادس';
          case 7:
            return 'جد الجيل السابع';
          case 8:
            return 'جد الجيل الثامن';
          case 9:
            return 'جد الجيل التاسع';
          case 10:
            return 'جد الجيل العاشر';
          case 11:
            return 'جد الجيل الحادي عشر';
          case 12:
            return 'جد الجيل الثاني عشر';
          case 13:
            return 'جد الجيل الثالث عشر';
          case 14:
            return 'جد الجيل الرابع عشر';
          case 15:
            return 'جد الجيل الخامس عشر';
          default:
            if (depth < 20) {
              return `جد الجيل ${depth}`;
            } else {
              return `من أجداد الجيل ${depth}`;
            }
        }
      } else {
        // تسمية الأحفاد/الأبناء
        switch(depth) {
          case 0:
            return 'ابن';
          case 1:
            return 'حفيد';
          case 2:
            return 'حفيد الحفيد';
          case 3:
            return 'ابن الجيل الرابع';
          case 4:
            return 'ابن الجيل الخامس';
          case 5:
            return 'ابن الجيل السادس';
          case 6:
            return 'ابن الجيل السابع';
          case 7:
            return 'ابن الجيل الثامن';
          case 8:
            return 'ابن الجيل التاسع';
          case 9:
            return 'ابن الجيل العاشر';
          case 10:
            return 'ابن الجيل الحادي عشر';
          case 11:
            return 'ابن الجيل الثاني عشر';
          case 12:
            return 'ابن الجيل الثالث عشر';
          case 13:
            return 'ابن الجيل الرابع عشر';
          case 14:
            return 'ابن الجيل الخامس عشر';
          default:
            if (depth < 20) {
              return `ابن الجيل ${depth + 1}`;
            } else {
              return `من ذرية الجيل ${depth + 1}`;
            }
        }
      }
    }

    // دالة مساعدة للتحقق من العلاقات الشائعة
    function isChildRelation(relation) {
      return relation === 'ابن' || relation === 'بنت';
    }

    function isFamilyHeadRelation(relation) {
      return relation === 'رب العائلة';
    }
    
    // دالة مساعدة لإنشاء عقدة شخص بدون إضافة الأطفال تلقائياً
    function createPersonNodeWithoutChildren(familyData, familyLabel, relationLabel, isCurrentUser = false) {
      const person = familyData.head;
      // إنشاء معرف فريد يعتمد على الشخص والدور لتجنب تضارب الهويات المدموجة
      const personKey = `${person.globalId || person.id}_${relationLabel}_${familyData.uid}`;
      
      // التحقق من وجود العقدة مسبقاً لتجنب التكرار
      if (createdNodes.has(personKey)) {
        const existingNode = createdNodes.get(personKey);
        
        // تحديث العلاقة إذا كانت أكثر أهمية
        const currentRelationPriority = getRelationPriority(relationLabel);
        const existingRelationPriority = getRelationPriority(existingNode.attributes.actualRelation);
        
        if (currentRelationPriority > existingRelationPriority) {
          existingNode.attributes.actualRelation = relationLabel;
          existingNode.attributes.familyName = familyLabel;
          
          // تحديث حالة المستخدم الحالي إذا لزم الأمر
          if (isCurrentUser) {
            existingNode.attributes.isCurrentUser = true;
          }
        }
        
        // إضافة الدور الجديد إلى القائمة (تجنب التكرار)
        if (person.multipleRoles) {
          const existingRoleIds = new Set(existingNode.attributes.allRoles.map(r => `${r.familyUid}_${r.relation}`));
          const newRoles = person.multipleRoles.filter(role => 
            !existingRoleIds.has(`${role.familyUid}_${role.relation}`)
          );
          
          existingNode.attributes.allRoles = [
            ...existingNode.attributes.allRoles,
            ...newRoles
          ];
          existingNode.attributes.hasMultipleRoles = existingNode.attributes.allRoles.length > 1;
        }

        return existingNode;
      }
      
      // تحديد الاسم والدور المناسب
      const displayName = buildFullName(person);
      
      // تحديد العلاقة الأساسية (أولوية للأب > رب العائلة > ابن)
      let primaryRelation = relationLabel;
      if (person.multipleRoles) {
        const relationPriorities = person.multipleRoles.map(r => ({
          relation: r.relation,
          priority: getRelationPriority(r.relation)
        }));
        
        const highestPriorityRole = relationPriorities.reduce((prev, current) => 
          current.priority > prev.priority ? current : prev
        );
        
        primaryRelation = highestPriorityRole.relation;
      }
      
      const node = {
        name: displayName,
        id: personKey,
        avatar: person.avatar || null,
        attributes: {
          ...person,
          isCurrentUser,
          treeType: 'extended',
          isExtended: !isCurrentUser,
          familyName: familyLabel,
          actualRelation: primaryRelation,
          // إضافة معلومات الأدوار المتعددة
          hasMultipleRoles: !!person.multipleRoles,
          allRoles: person.multipleRoles || [{ familyUid: familyData.uid, relation: relationLabel }]
        },
        children: []
      };

      // حفظ العقدة في الخريطة
      createdNodes.set(personKey, node);

      return node;
    }
    
    // دالة لإضافة الأطفال فقط من عائلة الشخص نفسه
    function addChildrenToNode(node, familyData) {
      const person = familyData.head;
      const children = familyData.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        (m.globalId !== person.globalId && m.id !== person.id)
      );

      children.forEach(child => {
        const childKey = child.globalId || child.id;
        
        // تجنب إضافة الطفل إذا كان موجود بالفعل في أي مكان من الشجرة
        if (!createdNodes.has(childKey)) {
          // تحقق إذا كان هذا الطفل له عائلة منفصلة (وبالتالي سيظهر في مستوى منفصل)
          const hasOwnFamily = mergedFamiliesData.some(family => 
            (family.head.globalId === child.globalId || family.head.id === child.id) &&
            family.uid !== familyData.uid
          );
          
          if (!hasOwnFamily) {
            // فقط إضافة الأطفال الذين ليس لهم عائلات منفصلة
            const childDisplayRelation = child.multipleRoles 
              ? getHighestPriorityRelation(child.multipleRoles)
              : child.relation;
              
            const childNode = {
              name: buildFullName(child),
              id: childKey,
              avatar: child.avatar || null,
              attributes: {
                ...child,
                isCurrentUser: false,
                treeType: 'extended',
                isExtended: true,
                familyName: `أطفال ${node.attributes.familyName}`,
                actualRelation: childDisplayRelation,
                hasMultipleRoles: !!child.multipleRoles,
                allRoles: child.multipleRoles || [{ familyUid: familyData.uid, relation: child.relation }]
              },
              children: []
            };
            
            createdNodes.set(childKey, childNode);
            node.children.push(childNode);
          }
        }
      });
    }

    // دالة لتحديد أولوية العلاقات
    function getRelationPriority(relation) {
      const priorities = {
        'جد': 100,
        'أب': 90,
        'عم': 80,
        'رب العائلة': 70,
        'ابن': 60,
        'بنت': 60,
        'أخ': 50,
        'أخت': 50,
        'ابن عم': 40,
        'قريب': 30
      };
      return priorities[relation] || 20;
    }
    
    // دالة للحصول على العلاقة ذات الأولوية الأعلى
    function getHighestPriorityRelation(roles) {
      return roles.reduce((prev, current) => 
        getRelationPriority(current.relation) > getRelationPriority(prev.relation) ? current : prev
      ).relation;
    }

    // دالة للبحث عن المستخدم في الشجرة
    function findUserNode(node) {
      if (node.attributes?.isCurrentUser) {
        return node;
      }
      for (let child of node.children) {
        const found = findUserNode(child);
        if (found) return found;
      }
      return null;
    }
    
    // دالة للبحث عن والد عقدة معينة
    function findParentOfNode(rootNode, targetNode) {
      for (let child of rootNode.children) {
        if (child.id === targetNode.id) {
          return rootNode;
        }
        const found = findParentOfNode(child, targetNode);
        if (found) return found;
      }
      return null;
    }

    // **اختيار السيناريو المناسب بالأولوية الصحيحة**
    
    // **السيناريو الشامل: إذا وُجد جذر أقدم، ابنِ الشجرة من الأعلى**
    if (relationships.ancestors.length > 0) {
      console.warn('🌟 دخول السيناريو الشامل:', {
        ancestorsCount: relationships.ancestors.length,
        hasDirectParent: !!relationships.directParent,
        unclesCount: relationships.uncles.length,
        willUseFallback: 'نعم - السيناريو الشامل'
      });

      // بناء الشجرة من الجذر الأقدم للأسفل
      function buildComprehensiveTree() {
        const rootNode = createPersonNodeWithoutChildren(
          relationships.oldestRoot, 
          buildFullName(relationships.oldestRoot.head), 
          relationships.oldestRoot.head.relation || 'رب العائلة'
        );
        
        // بناء الشجرة بشكل تدريجي من الأعلى للأسفل - محسن للأجيال العميقة
        function buildGenerationLevel(parentNode, parentFamily, currentDepth, maxDepth = 15) {
          if (currentDepth >= maxDepth) {

            return;
          }

          // البحث عن أطفال هذا المستوى (الذين لهم عائلات منفصلة)

          // إعادة تصميم منطق البحث - البحث مباشرة عن العائلات التي يكون فيها شخص رب عائلة وابن الوالد
          const childrenAtThisLevel = [];

          // البحث في عائلة الوالد عن الأطفال الذين لهم عائلات منفصلة
          parentFamily.members.forEach(member => {

            if (member.multipleRoles && isChildRelation(member.relation)) {

              // البحث عن العائلة التي يكون فيها رب عائلة
              const separateFamily = mergedFamiliesData.find(family => {
                return member.multipleRoles.some(role => 
                  role.familyUid === family.uid && isFamilyHeadRelation(role.relation)
                );
              });
              
              if (separateFamily && separateFamily.uid !== parentFamily.uid) {

                // التأكد من عدم الإضافة المكررة
                if (!childrenAtThisLevel.some(child => child.uid === separateFamily.uid)) {
                  childrenAtThisLevel.push(separateFamily);
                }
              }
            }
          });

          childrenAtThisLevel.forEach((childFamily) => {

            if (childFamily.uid !== parentFamily.uid) {

              // استخدام الدالة المشتركة لتسمية الأجيال
              const relationName = getGenerationName(currentDepth, 'descendant');
              
              // تحديد التسمية المعروضة
              let displayLabel;
              if (currentDepth <= 2) {
                displayLabel = relationName;
              } else if (currentDepth < 20) {
                displayLabel = `الجيل ${currentDepth + 1}`;
              } else {
                displayLabel = `نسل الجيل ${currentDepth + 1}`;
              }
              
              const isCurrentUser = childFamily.uid === rootFamilyUid;
              if (isCurrentUser) {
                displayLabel = 'أنت';
              }

              const childNode = createPersonNodeWithoutChildren(
                childFamily,
                displayLabel,
                relationName,
                isCurrentUser
              );
              
              // إضافة معلومات العمق للعقدة
              childNode.attributes.generationDepth = currentDepth + 1;
              childNode.attributes.generationLevel = `الجيل ${currentDepth + 1}`;

              parentNode.children.push(childNode);

              // إضافة الأطفال الفعليين من عائلة هذا الشخص
              addChildrenToNode(childNode, childFamily);
              
              // تتبع العمق الحقيقي للشجرة
              const currentActualDepth = currentDepth + 1;
              if (currentActualDepth > (window.familyTreeMetrics?.maxDepthReached || 0)) {
                window.familyTreeMetrics = window.familyTreeMetrics || {};
                window.familyTreeMetrics.maxDepthReached = currentActualDepth;
              }
              
              // الاستمرار في البناء للمستوى التالي مع حماية من التكرار اللانهائي
              buildGenerationLevel(childNode, childFamily, currentDepth + 1, maxDepth);
            }
          });
        }

        // إضافة أطفال الجذر الفعليين أولاً (الذين ليس لهم عائلات منفصلة)
        addChildrenToNode(rootNode, relationships.oldestRoot);
        
        // ثم بناء المستوى الأول (الأطفال بعائلات منفصلة)
        buildGenerationLevel(rootNode, relationships.oldestRoot, 0);

        // **إضافة خاصة: دمج الأعمام المُضافين عبر الروابط التقليدية**
        if (relationships.uncles.length > 0) {
          console.warn('🔧 إضافة الأعمام للسيناريو الشامل:', {
            unclesCount: relationships.uncles.length,
            uncleNames: relationships.uncles.map(u => u.head.firstName)
          });

          // البحث عن المستوى المناسب لإضافة الأعمام (نفس مستوى الأب)
          let grandparentLevel = null;
          let parentNode = null;
          
          const userNode = findUserNode(rootNode);
          if (userNode) {
            // البحث عن والد المستخدم (الأب)
            const userParent = findParentOfNode(rootNode, userNode);
            if (userParent) {
              parentNode = userParent;
              console.warn('🔍 تم العثور على الأب:', {
                parentName: userParent.name,
                parentId: userParent.id
              });
              
              // البحث عن والد الأب (الجد) - هنا سنضع الأعمام
              const grandparent = findParentOfNode(rootNode, userParent);
              if (grandparent) {
                grandparentLevel = grandparent;
                console.warn('✅ تم العثور على مستوى الجد لإضافة الأعمام:', {
                  grandparentName: grandparent.name,
                  currentChildrenCount: grandparent.children.length
                });
              } else {
                console.warn('⚠️ لم يتم العثور على الجد، سيتم إضافة الأعمام كإخوة للأب في نفس مستوى الأب');
                // البحث عن المستوى الذي يحتوي على الأب
                grandparentLevel = findParentOfNode(rootNode, userParent);
                if (!grandparentLevel) {
                  // إذا كان الأب في المستوى الأعلى، استخدم الجذر
                  grandparentLevel = rootNode;
                  console.warn('🔧 سيتم إضافة الأعمام في المستوى الجذر');
                }
              }
            }
          }
          
          // إضافة الأعمام كإخوة للأب في نفس المستوى
          if (grandparentLevel && parentNode) {
            relationships.uncles.forEach((uncle, index) => {
              const uncleKey = `${uncle.head.globalId || uncle.head.id}_عم_${uncle.uid}`;
              
              // تأكد من عدم وجود العم مسبقاً
              if (!createdNodes.has(uncleKey)) {
                const uncleNode = createPersonNodeWithoutChildren(uncle, `العم ${index + 1}`, 'عم');
                
                // إضافة العم في نفس المستوى مع الأب
                grandparentLevel.children.push(uncleNode);
                addChildrenToNode(uncleNode, uncle);
                
                console.warn(`✅ تمت إضافة العم للشجرة الشاملة:`, {
                  uncleName: uncle.head.firstName,
                  uncleId: uncleNode.id,
                  addedToLevel: grandparentLevel.name,
                  nowSiblingToParent: parentNode.name,
                  parentLevel: grandparentLevel.children.length
                });
              }
            });
          } else {
            console.warn('⚠️ لم يتم العثور على مستوى مناسب لإضافة الأعمام:', {
              hasGrandparentLevel: !!grandparentLevel,
              hasParentNode: !!parentNode,
              hasUserNode: !!userNode
            });
          }
        }

        // إحصائيات شاملة للشجرة المبنية
        const treeStats = {
          totalNodes: createdNodes.size,
          maxDepthReached: window.familyTreeMetrics?.maxDepthReached || 0,
          generationsCovered: relationships.ancestors.length + relationships.descendants.length + 1,
          ancestorGenerations: relationships.ancestors.length,
          descendantGenerations: relationships.descendants.length,
          lateralRelatives: relationships.siblings.length + relationships.uncles.length + relationships.cousins.length
        };
        
        // تحديث المتغيرات العامة للتتبع
        window.familyTreeMetrics = window.familyTreeMetrics || {};
        window.familyTreeMetrics.totalNodes = treeStats.totalNodes;
        window.familyTreeMetrics.actualMembersCount = treeStats.totalNodes; // العدد الفعلي للعقد

        // طباعة معلومات التحديث العام

        // تقييم كفاءة النظام
        // تم إزالة if فارغة else if (treeStats.maxDepthReached >= 5) {

        // تم إزالة else فارغة
        
        // عرض تنبيه للمستخدم حول حالة الشجرة
        // تم إزالة if فارغة else if (treeStats.totalNodes >= 20) {

        // تم إزالة else فارغة
        
        // طباعة تفاصيل الأطفال
        rootNode.children.forEach((child) => {
          child.children.forEach(() => { /* معالجة العناصر */ });
        });
        
        return rootNode;
      }
      
      return buildComprehensiveTree();
    }

    // **سيناريو: يوجد أب فقط - الأب هو الجذر**
    else if (relationships.directParent) {
      
      const parentNode = createPersonNodeWithoutChildren(relationships.directParent, 'الأب', 'أب');
      
      // إضافة المستخدم الحالي والإخوة تحت الأب
      const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن', true);
      
      // التحقق من أن المستخدم ليس هو نفسه الأب
      if (userNode.id !== parentNode.id) {
        parentNode.children.push(userNode);
      }
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن');
        
        // تجنب إضافة الأخ إذا كان هو نفسه الأب أو المستخدم
        if (siblingNode.id !== parentNode.id && siblingNode.id !== userNode.id) {
          parentNode.children.push(siblingNode);
        }
      });

      // إضافة الأعمام كإخوة للأب في نفس المستوى
      relationships.uncles.forEach((uncle, index) => {
        const uncleNode = createPersonNodeWithoutChildren(uncle, `العم ${index + 1}`, 'عم');
        
        // تجنب إضافة العم إذا كان هو نفسه الأب
        if (uncleNode.id !== parentNode.id) {
          // سنضع الأعمام بجانب الأب بدلاً من تحته
          // لكن هذا يتطلب إنشاء مستوى أعلى، لذا سنتجاهل الأعمام في هذا السيناريو
          addChildrenToNode(uncleNode, uncle);
        }
      });
      
      // إضافة أطفال كل عقدة من عائلتها المنفصلة
      addChildrenToNode(parentNode, relationships.directParent);
      
      if (userNode.id !== parentNode.id) {
        addChildrenToNode(userNode, currentUserFamily);
      }
      
      relationships.siblings.forEach((sibling) => {
        const siblingNode = parentNode.children.find(child => 
          child.id.includes(sibling.head.globalId || sibling.head.id)
        );
        if (siblingNode) {
          addChildrenToNode(siblingNode, sibling);
        }
      });

      return parentNode;
    }

    // **السيناريو الشامل: فقط إذا لم يكن هناك أب وعم**
    // إذا وُجد جذر أقدم، ابنِ الشجرة من الأعلى
    // (تمت إزالة الفرع المكرر للعلاقة ancestors.length > 0 لأنه مغطى بالفعل أعلاه)

    // **سيناريو: يوجد عم فقط - العم هو الجذر**
    else if (relationships.uncles.length > 0) {
      
      // استخدام العم الأول كجذر
      const uncleNode = createPersonNodeWithoutChildren(relationships.uncles[0], 'العم', 'عم');
      
      // إضافة المستخدم الحالي والإخوة كأبناء أخ
      const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'ابن أخ', true);
      
      // التحقق من أن المستخدم ليس هو نفسه العم
      if (userNode.id !== uncleNode.id) {
        uncleNode.children.push(userNode);
      }
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'ابن أخ');
        
        // تجنب إضافة الأخ إذا كان هو نفسه العم أو المستخدم
        if (siblingNode.id !== uncleNode.id && siblingNode.id !== userNode.id) {
          uncleNode.children.push(siblingNode);
        }
      });

      // إضافة الأعمام الإضافيين كإخوة للعم الأول
      relationships.uncles.slice(1).forEach((uncle, index) => {
        const additionalUncleNode = createPersonNodeWithoutChildren(uncle, `العم ${index + 2}`, 'عم');
        // يمكن إضافتهم كأطفال للعم الأول أو تجاهلهم
        addChildrenToNode(additionalUncleNode, uncle);
      });

      // إضافة أطفال كل عقدة من عائلتها المنفصلة
      addChildrenToNode(uncleNode, relationships.uncles[0]);
      
      if (userNode.id !== uncleNode.id) {
        addChildrenToNode(userNode, currentUserFamily);
      }
      
      relationships.siblings.forEach((sibling) => {
        const siblingNode = uncleNode.children.find(child => 
          child.id.includes(sibling.head.globalId || sibling.head.id)
        );
        if (siblingNode) {
          addChildrenToNode(siblingNode, sibling);
        }
      });

      return uncleNode;
    }

    // **سيناريو: لا يوجد أب أو عم - المستخدم هو الجذر**
    else {
      // إذا كان لديك إخوة أو أقارب آخرين، ضعهم كإخوة في نفس المستوى
      if (relationships.siblings.length > 0 || relationships.cousins.length > 0 || relationships.others.length > 0) {

        // إنشاء عقدة المستخدم الحالي كجذر
        const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'رب عائلة', true);

        // إضافة الإخوة كأطفال للمستخدم (أو يمكن تعديل هذا ليكونوا في نفس المستوى)
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNodeWithoutChildren(sibling, 'أخ', 'أخ');
          
          // تجنب إضافة الأخ إذا كان هو نفسه المستخدم
          if (siblingNode.id !== userNode.id) {
            userNode.children.push(siblingNode);
            addChildrenToNode(siblingNode, sibling);
          }
        });

        // إضافة أبناء العم كأطفال أيضاً
        relationships.cousins.forEach(cousin => {
          const cousinNode = createPersonNodeWithoutChildren(cousin, 'ابن عم', 'ابن عم');
          
          // تجنب التكرار
          if (!userNode.children.some(child => child.id === cousinNode.id)) {
            userNode.children.push(cousinNode);
            addChildrenToNode(cousinNode, cousin);
          }
        });

        // إضافة الأقارب الآخرين
        relationships.others.forEach(otherRel => {
          const otherNode = createPersonNodeWithoutChildren(otherRel.family, 'قريب', 'قريب');
          
          // تجنب التكرار
          if (!userNode.children.some(child => child.id === otherNode.id)) {
            userNode.children.push(otherNode);
            addChildrenToNode(otherNode, otherRel.family);
          }
        });

        // إضافة أطفال المستخدم من عائلته
        addChildrenToNode(userNode, currentUserFamily);

        return userNode;
      } else {
        // لا توجد أقارب آخرين - أرجع المستخدم الحالي كجذر مباشر
        const userNode = createPersonNodeWithoutChildren(currentUserFamily, 'أنت', 'رب العائلة', true);
        addChildrenToNode(userNode, currentUserFamily);
        return userNode;
      }
    }

  }, [buildFullName, mergePersonIdentities]);

  // ===========================================================================
  // دوال التحميل الرئيسية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) {
      return;
    }
    
    setLoading(true);
    setLoadingStage('تحميل عائلتك...');
    setLoadingProgress(0);

    try {
      const familySnapshot = await getDocs(collection(db, 'users', uid, 'family'));
      const familyMembers = [];
      
      setLoadingProgress(30);
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${uid}_${doc.id}`,
          familyUid: uid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          familyMembers.push(memberData);
        }
      });

      setLoadingProgress(60);
      setLoadingStage('بناء الشجرة...');

      const treeData = buildSimpleTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setSimpleTreeData(treeData);
      
      // تسجيل مقاييس الأداء
      monitorPerformance({
        personCount: familyMembers.length,
        maxDepthReached: 2,
        familyCount: 1,
        loadTime: 1000
      });
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد (رب العائلة وأولاده)`, 'success');

    } catch {
      setError('فشل في تحميل الشجرة');
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance, buildSimpleTreeStructure]);

  const loadExtendedTree = useCallback(async () => {
  if (!uid) return;

  const startTime = Date.now();
  setLoading(true);
  
  // 🔵 يمكنك تغيير هذه النصوص ولونها
  setLoadingStage('🔍 البحث عن العائلات المرتبطة...');
  setLoadingProgress(0);

  try {
    // الخطوة 1: تحميل عائلتك
    setLoadingProgress(10);
    setLoadingStage('📋 تحميل بيانات عائلتك...');
    const myFamilyData = await loadFamilyData(uid);
    
    // الخطوة 2: البحث عن العائلات المرتبطة
    setLoadingProgress(30);
    setLoadingStage('🔗 البحث عن الروابط...');
    const allLinkedFamilies = await findAllLinkedFamilies(uid);
    
    // الخطوة 3: تحميل بيانات جميع العائلات
    setLoadingProgress(50);
    setLoadingStage('🏠 تحميل بيانات العائلات...');
    const allFamiliesData = [];
    
    // إضافة عائلتك
    if (myFamilyData && myFamilyData.members.length > 0) {
      allFamiliesData.push(myFamilyData);
    }
    
    // إضافة العائلات المرتبطة
    for (const familyUid of allLinkedFamilies) {
      if (familyUid !== uid) {
        try {
          const familyData = await loadFamilyData(familyUid);
          if (familyData && familyData.members.length > 0) {
            allFamiliesData.push(familyData);
          }
        } catch {
          // تعذر تحميل العائلة - متابعة صامتة
        }
      }
    }
    
    setLoadingProgress(70);
    setLoadingStage('🌳 بناء الشجرة الموسعة...');
    
    // الخطوة 4: بناء الشجرة الموسعة
    const extendedTree = buildExtendedTreeStructure(allFamiliesData, uid);
    
    setLoadingProgress(90);
    setLoadingStage('⚡ تحسين وتنسيق الشجرة...');
    
    // الخطوة 5: حساب المقاييس
    const totalPersons = allFamiliesData.reduce((sum, family) => sum + family.members.length, 0);
    const endTime = Date.now();
    
    monitorPerformance({
      personCount: totalPersons,
      familyCount: allFamiliesData.length,
      maxDepthReached: calculateTreeDepth(extendedTree),
      loadTime: endTime - startTime
    });
    
    setLoadingProgress(100);
    setLoadingStage('✅ اكتمل التحميل بنجاح!');
    
    setExtendedTreeData(extendedTree);
    
    showSnackbar(`🏛️ تم تحميل ${allFamiliesData.length} عائلة بـ ${totalPersons} شخص في الشجرة الموسعة`, 'success');

  } catch {
    setError('فشل في تحميل الشجرة الموسعة');
    showSnackbar('❌ فشل في تحميل الشجرة الموسعة', 'error');
  } finally {
    setLoading(false);
  }
  }, [uid, showSnackbar, monitorPerformance, buildExtendedTreeStructure, calculateTreeDepth, loadFamilyData, findAllLinkedFamilies]);

  const loadLinkedFamilies = useCallback(async () => {
    if (!uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linked = userData.linkedFamilies || [];
        setLinkedFamilies(linked);
      }
    } catch {
      // خطأ صامت في تحميل العائلات المرتبطة
    }
  }, [uid]);

  // ===========================================================================
  // دوال التحكم
  // ===========================================================================

  const handleRefresh = useCallback(() => {
    // تنظيف البيانات السابقة
    if (showExtendedTree) {
      setExtendedTreeData(null);
      loadExtendedTree();
    } else {
      setSimpleTreeData(null);
      loadSimpleTree();
    }
  }, [showExtendedTree, loadExtendedTree, loadSimpleTree]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  // استبدل دالة drawTreeWithD3 بهذا الكود الذي يحافظ على التصميم الأصلي مع أنيميشن بسيط:

const drawTreeWithD3 = useCallback((data) => {
  if (!data || !svgRef.current || !containerRef.current) return;

  const screenWidth = window.innerWidth;

  let cardWidth = 220;
  let cardHeight = 110;

  if (screenWidth < 480) {
    cardWidth = 160;
    cardHeight = 90;
  } else if (screenWidth < 768) {
    cardWidth = 190;
    cardHeight = 100;
  }

  const avatarSize = cardHeight * 0.45;
  const padding = 10;
  const textStartX = padding + avatarSize + 16;

  const svg = d3.select(svgRef.current);
  // ✅ إصلاح زووم iPhone
  svg
    .style("touch-action", "none")         // يمنع سحب الصفحة في iOS
    .style("overflow", "visible");         // يسمح للخريطة بالخروج من svg

  svg.attr('transform', null); 
  svg.property('__zoom', d3.zoomIdentity); 
  svg.selectAll('*').remove(); 

  // إعداد الأبعاد
  const container = containerRef.current;
  const width = container.clientWidth;
  const height = container.clientHeight;
  svg.attr('width', width).attr('height', height).style('background', 'transparent');

  // ✅ أنشئ g ثم فعّل الزووم عليه
  const g = svg.append('g');
  g
    .attr('transform', null)
    .style("touch-action", "manipulation")
    .style("will-change", "transform");

  // إعداد الزووم وربطه على g فقط
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);
    svg.property('__zoom', d3.zoomIdentity); 

  // إعداد بيانات الشجرة
  const root = d3.hierarchy(data);
  // حساب عمق الشجرة (عدد الأجيال)
  let maxDepth = 1;
  let generationCounts = {};
  let maxBreadth = 1;
  root.each(d => {
    if (d.depth > maxDepth) maxDepth = d.depth;
    generationCounts[d.depth] = (generationCounts[d.depth] || 0) + 1;
    if (generationCounts[d.depth] > maxBreadth) maxBreadth = generationCounts[d.depth];
  });

  // تمييز بين الشجرة العادية والموسعة
  let verticalGap, dynamicHeight, horizontalGap, dynamicWidth;
  if (showExtendedTree) {
    // الشجرة الموسعة: مساحة رأسية أكبر لكن ليست مبالغ فيها، ومسافة أفقية أكبر
    verticalGap = 80; 
    horizontalGap = 220; 
    dynamicHeight = Math.max(verticalGap * maxDepth, 350);
    dynamicWidth = Math.max(horizontalGap * maxBreadth, width - 100);
  } else {
    verticalGap = 55;
    horizontalGap = 180;
    dynamicHeight = Math.max(verticalGap * maxDepth, 180);
    dynamicWidth = width - 100;
  }

  // إعداد تخطيط الشجرة مع توزيع أفقي متساوٍ تماماً (بدون أي تراكب)
  const treeLayout = d3.tree()
    .size([dynamicWidth, dynamicHeight])
    .separation(() => {
      // توزيع أفقي متساوٍ تماماً بين جميع العقد في نفس الجيل (1)
      return 1;
    }); 

  treeLayout(root);

  // رسم الروابط مع أنيميشن بسيط
  const links = g.selectAll(".link")
    .data(root.links())
    .enter().append("path")
    .attr("class", "link")
    .style("fill", "none")
    .attr("d", d => {
        const source = d.source;
        const target = d.target;
        const midY = source.y + (target.y - source.y) / 2;
        const radius = 18;
        return `M${source.x},${source.y}
                L${source.x},${midY - radius}
                Q${source.x},${midY} ${source.x + (target.x > source.x ? radius : -radius)},${midY}
                L${target.x - (target.x > source.x ? radius : -radius)},${midY}
                Q${target.x},${midY} ${target.x},${midY + radius}
                L${target.x},${target.y}`;
      })
    .style("stroke", "#cbd5e1")
    .style("stroke-width", 2)
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round")
    .style("opacity", 0) // بدء مخفي للأنيميشن
    .style("filter", "none")
    .style("stroke-dasharray", "none");

  // أنيميشن بسيط للروابط
  links.transition()
    .delay(500)
    .duration(800)
    .ease(d3.easeQuadOut)
    .style("opacity", 0.85);

  // رسم العقد مع أنيميشن بسيط
  const nodes = g.selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", "node")
    .attr("data-depth", d => d.depth) // للأنيميشن CSS
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("opacity", 0); // بدء مخفي للأنيميشن

  // أنيميشن بسيط للعقد
  nodes.transition()
    .delay((d, i) => d.depth * 200 + i * 50)
    .duration(600)
    .ease(d3.easeBackOut)
    .style("opacity", 1);

  // إضافة محتوى العقد - نفس التصميم الأصلي تماماً
  nodes.each(function(d) {
  const nodeGroup = d3.select(this);
  const nodeData = d.data.attributes || d.data;
  
  const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
  const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || '';
  const relation = nodeData.relation || 'عضو';
  const nameY = -cardHeight / 2 + padding + 14;
  const relationY = nameY + 18;
  const childBoxWidth = 40;
  const childBoxHeight = 16;
  const childBoxX = -cardWidth / 2 + padding;
  const childBoxY = cardHeight / 2 - childBoxHeight - 4;
  const childTextX = childBoxX + childBoxWidth / 2;
  const childTextY = childBoxY + childBoxHeight / 2 + 1.5;
  const ageBoxWidth = 40;
  const ageBoxHeight = 16;
  const ageBoxX = cardWidth / 2 - padding - ageBoxWidth;
  const ageBoxY = cardHeight / 2 - ageBoxHeight - 4;
  const ageTextX = ageBoxX + ageBoxWidth / 2;
  const ageTextY = ageBoxY + ageBoxHeight / 2 + 1.5;
  // عمر محسوب
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    const birth = new Date(birthdate);
    const today = new Date();
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : '';
  };
  const age = calculateAge(nodeData.birthdate || nodeData.birthDate);

  // الكارت
  // 🟦 تحديد الألوان حسب الجنس
  let cardFill = "#f3f4f6";
  let cardStroke = "#cbd5e1";

  if (nodeData.gender === "male" || relation.includes("ابن")) {
    cardFill = "#e3f2fd";
    cardStroke = "#2196f3";
  } else if (nodeData.gender === "female" || relation.includes("بنت")) {
    cardFill = "#fce4ec";
    cardStroke = "#e91e63";
  }

  nodeGroup.append("rect")
    .attr("width", cardWidth)
    .attr("height", cardHeight)
    .attr("x", -cardWidth / 2)
    .attr("y", -cardHeight / 2)
    .attr("rx", 14)
    .attr("fill", cardFill)
    .attr("stroke", cardStroke)
    .attr("stroke-width", 2)
    .attr("class", "family-node-card");

  // صورة أو أفاتار
  // ⭕️ دائرة خلفية الصورة
nodeGroup.append("circle")
  .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
  .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
  .attr("r", avatarSize / 2)
  .attr("fill", "#fff")
  .attr("stroke", "#ddd")
  .attr("stroke-width", 1.5);

// 🟢 ClipPath دائري للصورة
nodeGroup.append("clipPath")
  .attr("id", `avatar-circle-${uniqueId}`)
  .append("circle")
  .attr("cx", -cardWidth / 2 + padding + avatarSize / 2)
  .attr("cy", -cardHeight / 2 + padding + avatarSize / 2)
  .attr("r", avatarSize / 2);

// 🖼️ صورة داخل الدائرة مع تقطيع وتوسيط
nodeGroup.append("image")
  .attr("href",
    nodeData.avatar ||
    (nodeData.gender === "female" || relation.includes("بنت")
      ? "/icons/girl.png"
      : "/icons/boy.png")
  )
  .attr("x", -cardWidth / 2 + padding)
  .attr("y", -cardHeight / 2 + padding)
  .attr("width", avatarSize)
  .attr("height", avatarSize)
  .attr("clip-path", `url(#avatar-circle-${uniqueId})`)
  .attr("preserveAspectRatio", "xMidYMid slice");

  // الاسم
  nodeGroup.append("text")
    .text(name.length > 22 ? name.slice(0, 20) + '…' : name)
    .attr("x", textStartX)
    .attr("y", nameY)
    .attr("font-size", 13)
    .attr("font-weight", "bold")
    .attr("fill", "#111");

  // العلاقة
  nodeGroup.append("text")
    .text(relation)
    .attr("x", textStartX)
    .attr("y", relationY)
    .attr("font-size", 11)
    .attr("fill", "#666");

  if (age) {
  // الخلفية
  nodeGroup.append("rect")
    .attr("x", ageBoxX)
    .attr("y", ageBoxY)
    .attr("width", ageBoxWidth)
    .attr("height", ageBoxHeight)
    .attr("rx", 8)
    .attr("fill", "rgba(25, 118, 210, 0.08)")
    .attr("stroke", "#1976d2")
    .attr("stroke-width", 0.8);

  // النص في المنتصف تمامًا
  nodeGroup.append("text")
  .text(age + " سنة") // إضافة كلمة سنة بجانب العمر
  .attr("x", ageTextX)
  .attr("y", ageTextY)
  .attr("font-size", 10)
  .attr("fill", "#1976d2")
  .attr("font-weight", "600")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "middle");
}

  // ✅ الخلفية خلف عدد الأطفال
  if (d.children && d.children.length > 0) {
    const childText = ` ${d.children.length}`;
  nodeGroup.append("rect")
    .attr("x", childBoxX)
    .attr("y", childBoxY)
    .attr("width", childBoxWidth)
    .attr("height", childBoxHeight)
    .attr("rx", 8)
    .attr("fill", "rgba(76, 175, 80, 0.08)")
    .attr("stroke", "#4caf50")
    .attr("stroke-width", 0.8);

  nodeGroup.append("text")
    .text(childText)
    .attr("x", childTextX)
    .attr("y", childTextY)
    .attr("font-size", 10)
    .attr("fill", "#4caf50")
    .attr("font-weight", "600")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle");
}

if (searchQuery.length > 1 && name.toLowerCase().includes(searchQuery.toLowerCase())) {
  nodeGroup.select("rect.family-node-card")
    .transition()
    .duration(600)
    .attr("stroke", "#f59e0b")
    .attr("stroke-width", 3);
}

  // عند الضغط
  nodeGroup.on("click", () => {
    handleNodeClick?.({
      ...nodeData,
      name,
      age,
      children: d.children || []
    });
  });
});

  // معالجة تداخل العقد - نفس الطريقة الأصلية
  const nodesByDepth = {};
  root.each(d => {
    if (!nodesByDepth[d.depth]) nodesByDepth[d.depth] = [];
    nodesByDepth[d.depth].push(d);
  });
  
  Object.values(nodesByDepth).forEach(nodes => {
    nodes.sort((a, b) => a.x - b.x);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      // إذا كان هناك تداخل أو تقاطع بين الكروت، نحرك العقدة الحالية يميناً
      const minDistance = 340; 
      if (curr.x - prev.x < minDistance) {
        const shift = minDistance - (curr.x - prev.x);
        curr.x += shift;
        // إعادة ضبط x لجميع الأبناء أيضاً
        function shiftChildren(node, delta) {
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              child.x += delta;
              shiftChildren(child, delta);
            });
          }
        }
        shiftChildren(curr, shift);
      }
    }
  });

  // تمركز تلقائي بسيط (اختياري)
  setTimeout(() => {
    if (svgRef.current && containerRef.current) {
      const svg = d3.select(svgRef.current);
      const g = svg.select('g');
      
      try {
        const bounds = g.node().getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        
        if (fullWidth > 0 && fullHeight > 0) {
          const scale = Math.min(
            (width * 0.9) / fullWidth,
            (height * 0.9) / fullHeight,
            1.2
          );
          
          const centerX = bounds.x + fullWidth / 2;
          const centerY = bounds.y + fullHeight / 2;
          const targetX = width / 2 - centerX * scale;
          const targetY = height / 2 - centerY * scale;
          
          svg.transition()
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .call(
              zoom.transform,
              d3.zoomIdentity
                .translate(targetX, targetY)
                .scale(scale)
            );
        }
      } catch {
        // Removed unused 'error'
      }
    }
  }, 1200);

}, [showExtendedTree, handleNodeClick, searchQuery]);

  // دالة البحث المحلية - مبسطة
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      // إزالة التميز إذا كان البحث فارغ
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('.node rect')
          .style('stroke', '#ddd')
          .style('stroke-width', '2px');
        svg.selectAll('.node text')
          .style('font-weight', 'normal');
      }
      return;
    }
    
    const queryLower = query.trim().toLowerCase();
    
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      
      // إعادة تعيين كل العقد لحالتها الطبيعية أولاً
      svg.selectAll('.node rect')
        .style('stroke', '#ddd')
        .style('stroke-width', '2px');
      svg.selectAll('.node text')
        .style('font-weight', 'normal');
      
      // البحث وتميز العقد المطابقة
      svg.selectAll('.node').each(function(d) {
        const name = d.data?.name?.toLowerCase() || '';
        if (name.includes(queryLower)) {
          // تميز العقدة المطابقة
          d3.select(this).select('rect')
            .style('stroke', '#ffeb3b')
            .style('stroke-width', '4px');
          d3.select(this).select('text')
            .style('font-weight', 'bold');
        }
      });
    }
  }, []);

  // ===========================================================================
  // تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    loadSimpleTree();
    loadLinkedFamilies();
  }, [uid, navigate, loadSimpleTree, loadLinkedFamilies]);

  useEffect(() => {
    if (!uid) return;
    
    if (showExtendedTree && !extendedTreeData) {
      loadExtendedTree();
    }
  }, [showExtendedTree, uid, extendedTreeData, loadExtendedTree]);

  // تأثير رسم الشجرة
  useEffect(() => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    if (currentTreeData && svgRef.current && containerRef.current) {
      const timer = setTimeout(() => {
        drawTreeWithD3(currentTreeData);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [drawTreeWithD3, showExtendedTree, simpleTreeData, extendedTreeData]);

  // تأثير البحث
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    const currentReactRoots = reactRootsRef.current;
    return () => {
      currentReactRoots.forEach(root => {
        try {
          if (!ReactDOM.unstable_isNewReconciler) {
            root.unmount();
          }
        } catch {
          // Silent cleanup
        }
      });
      currentReactRoots.clear();
    };
  }, []);

  // ===========================================================================
  // واجهة المستخدم
  // ===========================================================================

  const renderTreeView = () => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    const treeTitle = showExtendedTree ? 'الشجرة الموسعة للقبيلة' : 'شجرة عائلتك';
    
    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: '#fff', 
          fontFamily: 'Cairo, sans-serif'
        }}
      >
        {error ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            sx={{ color: '#ef4444', textAlign: 'center' }}
          >
            <WarningIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
              حدث خطأ في التحميل
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontFamily: 'Cairo, sans-serif' }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              sx={{ fontFamily: 'Cairo, sans-serif' }}
            >
              إعادة المحاولة
            </Button>
          </Box>
        ) : currentTreeData ? (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ 
              cursor: 'grab', 
              userSelect: 'none',
              background: 'transparent'
            }}
            onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
            onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
            onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
          />
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            sx={{ color: '#f8fafc', textAlign: 'center' }}
          >
            {loading ? (
              <Box textAlign="center" maxWidth={600}>
                <CircularProgress size={80} sx={{ color: showExtendedTree ? '#8b5cf6' : '#10b981', mb: 3 }} />
                <Typography variant="h5" sx={{ mb: 2, fontFamily: 'Cairo, sans-serif' }}>
                  {loadingStage || `جاري تحميل ${treeTitle}...`}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={loadingProgress} 
                  sx={{ 
                    width: '100%', 
                    height: 8, 
                    borderRadius: 4, 
                    mb: 2,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: showExtendedTree ? '#8b5cf6' : '#10b981'
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: showExtendedTree ? '#8b5cf6' : '#10b981', fontFamily: 'Cairo, sans-serif' }}>
                  {Math.round(loadingProgress)}% مكتمل
                </Typography>
              </Box>
            ) : (
              <Box textAlign="center">
                <AccountTreeIcon sx={{ fontSize: 120, color: showExtendedTree ? '#8b5cf6' : '#10b981', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif', color: showExtendedTree ? '#8b5cf6' : '#10b981' }}>
                  {showExtendedTree ? '🏛️ ابنِ شجرة قبيلتك الموسعة' : '🌳 ابنِ شجرة عائلتك'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree 
                    ? '🔗 اربط عائلتك مع العائلات الأخرى لبناء شجرة قبيلة شاملة تضم جميع الأقارب والفروع'
                    : '👨‍👩‍👧‍👦 أضف أفراد عائلتك المباشرين: رب العائلة وأولاده وبناته'
                  }
                </Typography>
                <Box display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="contained"
                    sx={{ 
                      backgroundColor: '#10b981',
                      '&:hover': { backgroundColor: '#059669' },
                      fontFamily: 'Cairo, sans-serif'
                    }}
                    size="large"
                    onClick={() => navigate('/family')}
                    startIcon={<PersonIcon />}
                  >
                    إضافة أفراد العائلة
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ 
                      borderColor: showExtendedTree ? '#8b5cf6' : '#10b981',
                      color: showExtendedTree ? '#8b5cf6' : '#10b981',
                      '&:hover': { 
                        borderColor: showExtendedTree ? '#7c3aed' : '#059669',
                        backgroundColor: showExtendedTree ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                      },
                      fontFamily: 'Cairo, sans-serif'
                    }}
                    size="large"
                    onClick={() => setShowLinkingPanel(true)}
                    startIcon={<LinkIcon />}
                  >
                    ربط عائلات
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderToolbar = () => (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 50%, rgba(243,244,246,0.98) 100%)',
        backdropFilter: 'blur(25px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: showExtendedTree 
            ? 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)' 
            : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      {/* Container الرئيسي مع تصميم متجاوب وارتفاع مقلل */}
      <Box sx={{ 
        px: { xs: 1, sm: 2, md: 3 }, 
        py: { xs: 0.5, sm: 1 },
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        
        {/* العنوان والوصف - ارتفاع مقلل */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 0,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              color: showExtendedTree ? '#8b5cf6' : '#10b981',
              fontWeight: 700,
              fontFamily: 'Cairo, sans-serif',
              transition: 'all 0.3s ease',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              background: showExtendedTree 
                ? 'linear-gradient(45deg, #8b5cf6 0%, #d946ef 100%)' 
                : 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك'}
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontFamily: 'Cairo, sans-serif',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              opacity: 0.8,
              maxWidth: '600px',
              margin: '0 auto',
              display: 'block'
            }}
          >
            {showExtendedTree 
              ? '📊 استكشف جميع العائلات المرتبطة في شجرة موحدة وشاملة' 
              : '👨‍👩‍👧‍👦 عرض بسيط لرب العائلة وأولاده المباشرين'
            }
          </Typography>
        </Box>

        {/* شريط التحميل - ارتفاع مقلل */}
        {loading && (
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ 
              mb: 1,
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': {
                background: showExtendedTree 
                  ? 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)' 
                  : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                borderRadius: 3,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
              }
            }}
          />
        )}

        {/* الأزرار الرئيسية - أحجام مقللة */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: { xs: 0.5, sm: 1 }, 
          flexWrap: 'wrap', 
          mb: 1,
          alignItems: 'center'
        }}>
          {/* أزرار الإجراءات الأساسية */}
          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/family')} 
            disabled={loading} 
            startIcon={<PersonAddIcon />} 
            sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.25, sm: 0.5 },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              borderRadius: 2,
              background: 'linear-gradient(45deg, #1976d2 0%, #1565c0 100%)',
              boxShadow: '0 2px 8px rgba(25,118,210,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #1565c0 0%, #0d47a1 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            إدارة العائلة
          </Button>

          <Button 
            variant="outlined" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => setShowLinkingPanel(true)} 
            disabled={loading} 
            startIcon={<LinkIcon />} 
            sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.25, sm: 0.5 },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              borderRadius: 2,
              borderColor: '#8b5cf6',
              color: '#8b5cf6',
              '&:hover': {
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(139,92,246,0.05)',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(139,92,246,0.15)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            ربط العائلات
          </Button>

          <Button 
            variant="contained" 
            size={window.innerWidth < 600 ? "small" : "medium"}
            onClick={() => navigate('/statistics')}
            disabled={loading} 
            startIcon={<BarChartIcon />} 
            sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.25, sm: 0.5 },
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              borderRadius: 2,
              background: 'linear-gradient(45deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #059669 0%, #047857 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            الإحصائيات
          </Button>

          {/* زر التحديث */}
          <IconButton 
            onClick={handleRefresh} 
            disabled={loading} 
            size={window.innerWidth < 600 ? "small" : "medium"}
            sx={{ 
              ml: 0.5,
              borderRadius: 1.5,
              background: 'rgba(0,0,0,0.04)',
              '&:hover': {
                background: 'rgba(0,0,0,0.08)',
                transform: 'rotate(180deg) scale(1.05)',
              },
              transition: 'all 0.2s ease'
            }}
            title="إعادة تحميل الشجرة"
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* شريط البحث المحسن - ارتفاع مقلل */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mb: 1,
          px: { xs: 1, sm: 0 }
        }}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              performSearch(value);
            }}
            placeholder="🔍 ابحث عن أي شخص في الشجرة للتركيز عليه..."
            variant="outlined"
            sx={{
              width: { xs: '100%', sm: '350px', md: '450px' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 3,
                fontFamily: 'Cairo, sans-serif',
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: `0 0 0 2px ${showExtendedTree ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  borderColor: showExtendedTree ? '#8b5cf6' : '#10b981'
                },
                transition: 'all 0.2s ease'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSearchQuery('');
                      if (svgRef.current) {
                        const svg = d3.select(svgRef.current);
                        const g = svg.select('g');
                        g.selectAll('.node').classed('search-highlight', false);
                        g.selectAll('.node foreignObject > div')
                          .classed('search-highlight', false)
                          .style('transform', null)
                          .style('border', null)
                          .style('box-shadow', null)
                          .style('background', null);
                      }
                    }}
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'rgba(244,67,54,0.1)',
                        color: '#f44336'
                      } 
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* مفتاح تبديل نوع الشجرة محسن - ارتفاع مقلل */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showExtendedTree}
                onChange={(e) => setShowExtendedTree(e.target.checked)}
                disabled={loading}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#8b5cf6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#8b5cf6',
                  },
                  '& .MuiSwitch-switchBase': {
                    color: '#10b981',
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: '#10b981',
                  },
                }}
              />
            }
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'Cairo, sans-serif', 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.75rem', sm: '0.85rem' }
                  }}
                >
                  {showExtendedTree ? '🏛️ الشجرة الموسعة (القبيلة)' : '🌳 الشجرة العادية (العائلة)'}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontFamily: 'Cairo, sans-serif', 
                    color: 'text.secondary',
                    display: 'block',
                    fontSize: { xs: '0.65rem', sm: '0.7rem' }
                  }}
                >
                  {showExtendedTree ? 'جميع العائلات المرتبطة' : 'رب العائلة وأولاده فقط'}
                </Typography>
              </Box>
            }
            sx={{
              '& .MuiFormControlLabel-label': {
                px: 0.5
              }
            }}
          />
        </Box>

        {/* إحصائيات الأداء - أحجام مقللة */}
        {performanceMetrics.personCount > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 0.5, sm: 0.75 }, 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Chip 
              size="small" 
              label={`👥 ${performanceMetrics.personCount} شخص`} 
              variant="outlined"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 }
              }}
            />
            
            {showExtendedTree && (
              <>
                {performanceMetrics.familyCount > 1 && (
                  <Chip 
                    size="small" 
                    label={`🏛️ ${performanceMetrics.familyCount} عائلة`} 
                    variant="outlined" 
                    color="secondary"
                    sx={{
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      height: { xs: 20, sm: 24 }
                    }}
                  />
                )}
                
                {linkedFamilies.length > 0 && (
                  <Chip 
                    size="small" 
                    label={`🔗 ${linkedFamilies.length} رابط`} 
                    variant="outlined" 
                    color="primary"
                    sx={{
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      height: { xs: 20, sm: 24 }
                    }}
                  />
                )}
                
                {performanceMetrics.maxDepthReached > 0 && (
                  <Chip 
                    size="small" 
                    label={`📊 ${performanceMetrics.maxDepthReached + 1} جيل`} 
                    variant="outlined" 
                    color="info"
                    sx={{
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      height: { xs: 20, sm: 24 }
                    }}
                  />
                )}
              </>
            )}
            
            {!showExtendedTree && (
              <Chip 
                size="small" 
                label="🌳 شجرة بسيطة (جيلان)" 
                variant="outlined" 
                color="success"
                sx={{
                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                  height: { xs: 20, sm: 24 }
                }}
              />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box className="family-tree-advanced-root" sx={{ width: '100vw', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      {renderToolbar()}
      <Box sx={{ position: 'absolute', top: 120, left: 0, right: 0, bottom: 0 }}>
        {renderTreeView()}
      </Box>

      {/* الحوارات */}
      <Dialog open={showLinkingPanel} onClose={() => setShowLinkingPanel(false)} maxWidth="lg" fullWidth>
        <DialogTitle>🔗 ربط العائلات للشجرة الموسعة</DialogTitle>
        <DialogContent>
          <ExtendedFamilyLinking
            currentUserUid={uid}
            onLinkingComplete={() => {
              setShowLinkingPanel(false);
              setExtendedTreeData(null);
              // تحديث قائمة العائلات المرتبطة
              loadLinkedFamilies();
              if (showExtendedTree) {
                loadExtendedTree();
              }
            }}
            existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}>
          {(selectedNode?.gender === 'female' || selectedNode?.relation === 'بنت') ? '♀️' : '♂️'} {selectedNode?.name || 'تفاصيل الشخص'}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {selectedNode.name || buildFullName(selectedNode) || ''}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={selectedNode.relation || ''} color="primary" variant="outlined" />
                {selectedNode.isExtended && (
                  <Chip label="عائلة مرتبطة" color="secondary" variant="outlined" />
                )}
                {selectedNode.familyName && (
                  <Chip label={selectedNode.familyName} color="info" variant="outlined" />
                )}
              </Box>
              {selectedNode.age && <Typography variant="body2" sx={{ mb: 1 }}>العمر: {selectedNode.age} سنة</Typography>}
              {/* أضف هذا الجزء هنا - عدد الأطفال */}
                    {(selectedNode.relation === 'رب العائلة' && selectedNode.children && selectedNode.children.length > 0) && (
                      <Typography variant="body2" sx={{ mb: 1, color: '#4caf50', fontWeight: 'bold' }}>
                         عدد الأطفال: {selectedNode.children.length}
                      </Typography>
                    )}

              {selectedNode.phone && <Typography variant="body2" sx={{ mb: 1 }}>الهاتف: {selectedNode.phone}</Typography>}
              {selectedNode.location && (
                <Typography variant="body2">المكان: {selectedNode.location}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ fontFamily: 'Cairo, sans-serif' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
}
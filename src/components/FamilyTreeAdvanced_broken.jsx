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
  const [isZoomedToNode, setIsZoomedToNode] = useState(false);
  
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
    if (!person) return 'غير محدد';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
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

  // هيكل شجرة موسع بسيط وشامل - يعمل مع جميع الروابط تلقائياً
  const buildExtendedTreeStructure = useCallback((allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    // خطوة 1: إنشاء خريطة شاملة لجميع العائلات والروابط
    const familyMap = new Map();
    const allConnections = new Map(); // جميع الروابط في النظام
    
    // تسجيل جميع العائلات
    allFamiliesData.forEach(family => {
      familyMap.set(family.uid, {
        ...family,
        connections: new Set(), // الروابط مع العائلات الأخرى
        relationshipType: family.uid === rootFamilyUid ? 'self' : 'unknown'
      });
    });

  // دوال مساعدة للروابط
  const getReverseLinkType = useCallback((linkType) => {
    switch (linkType) {
      case 'parent-child': return 'child-parent';
      case 'child-parent': return 'parent-child';
      case 'sibling': return 'sibling';
      case 'marriage': return 'marriage';
      case 'cousin': return 'cousin';
      case 'extended': return 'extended';
      default: return 'extended';
    }
  }, []);

  const getReverseDescription = useCallback((description) => {
    if (description.includes('ابن أخ')) return 'عم';
    if (description.includes('عم')) return 'ابن أخ';
    if (description.includes('أب')) return 'ابن';
    if (description.includes('ابن')) return 'أب';
    return description;
  }, []);

  // هيكل شجرة موسع بسيط وشامل - يعمل مع جميع الروابط تلقائياً
  // **نظام بناء الشجرة الممتدة المحسن - نسخة جديدة مبسطة**
  const buildExtendedTreeStructure = useCallback((mergedFamiliesData) => {
    if (!mergedFamiliesData || mergedFamiliesData.length === 0) {
      return null;
    }
    
    const currentUserFamily = mergedFamiliesData.find(f => f.uid === rootFamilyUid);
    if (!currentUserFamily) return null;

    // خريطة للعقد المنشأة لتجنب التكرار
    const createdNodes = new Map();
    
    // خريطة شاملة للعائلات والعلاقات
    const familyMap = new Map();
    mergedFamiliesData.forEach(family => {
      familyMap.set(family.uid, family);
    });

    // دالة لتحليل جميع الروابط وتصنيفها
    function analyzeAllRelationships() {
      const relationships = {
        directParent: null,
        siblings: [],
        uncles: [],
        cousins: [],
        children: [],
        others: []
      };

      // تحليل الروابط المباشرة من عائلة المستخدم
      if (currentUserFamily.userData?.linkedFamilies) {
        currentUserFamily.userData.linkedFamilies.forEach(link => {
          const linkedFamily = familyMap.get(link.targetFamilyUid);
          if (linkedFamily) {
            switch (link.linkType) {
              case 'child-parent':
                relationships.directParent = linkedFamily;
                break;
              case 'parent-child':
                relationships.children.push(linkedFamily);
                break;
              case 'sibling':
                relationships.siblings.push(linkedFamily);
                break;
              case 'extended':
                // تحليل العلاقة الممتدة
                if (link.relationDescription?.includes('عم') || 
                    link.relationDescription?.includes('uncle')) {
                  relationships.uncles.push(linkedFamily);
                } else if (link.relationDescription?.includes('ابن عم') ||
                          link.relationDescription?.includes('cousin')) {
                  relationships.cousins.push(linkedFamily);
                } else {
                  relationships.others.push({family: linkedFamily, type: 'extended'});
                }
                break;
              default:
                relationships.others.push({family: linkedFamily, type: link.linkType});
            }
          }
        });
      }

      // تحليل الروابط المعكوسة (العائلات التي ربطت بنا)
      mergedFamiliesData.forEach(family => {
        if (family.uid !== rootFamilyUid && family.userData?.linkedFamilies) {
          family.userData.linkedFamilies.forEach(link => {
            if (link.targetFamilyUid === rootFamilyUid) {
              const reverseType = getReverseLinkType(link.linkType);
              
              switch (reverseType) {
                case 'child-parent':
                  if (!relationships.directParent) {
                    relationships.directParent = family;
                  }
                  break;
                case 'sibling':
                  if (!relationships.siblings.some(s => s.uid === family.uid)) {
                    relationships.siblings.push(family);
                  }
                  break;
                case 'extended':
                  // تحليل الرابط المعكوس
                  if (link.relationDescription?.includes('ابن أخ') ||
                      link.relationDescription?.includes('nephew')) {
                    if (!relationships.uncles.some(u => u.uid === family.uid)) {
                      relationships.uncles.push(family);
                    }
                  }
                  break;
              }
            }
          });
        }
      });

      return relationships;
    }

    // تحليل العلاقات
    const relationships = analyzeAllRelationships();

    // دالة لإنشاء عقدة شخص
    function createPersonNode(familyData, relationLabel, familyLabel, isCurrentUser = false) {
      const person = familyData.head;
      const personKey = person.globalId || person.id;
      
      if (createdNodes.has(personKey)) {
        return createdNodes.get(personKey);
      }
      
      const displayName = buildFullName(person);
      
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
          actualRelation: relationLabel,
          hasMultipleRoles: !!person.multipleRoles,
          allRoles: person.multipleRoles || [{familyUid: familyData.uid, relation: relationLabel}]
        },
        children: []
      };

      createdNodes.set(personKey, node);
      return node;
    }

    // دالة لإضافة الأطفال من العائلة نفسها
    function addFamilyChildren(parentNode, familyData) {
      const children = familyData.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== familyData.head.globalId && 
        m.id !== familyData.head.id
      );

      children.forEach(child => {
        const childKey = child.globalId || child.id;
        if (!createdNodes.has(childKey)) {
          const childNode = {
            name: buildFullName(child),
            id: childKey,
            avatar: child.avatar || null,
            attributes: {
              ...child,
              isCurrentUser: false,
              treeType: 'extended',
              isExtended: true,
              familyName: `أطفال ${parentNode.attributes.familyName}`,
              actualRelation: child.relation,
              hasMultipleRoles: !!child.multipleRoles,
              allRoles: child.multipleRoles || [{familyUid: familyData.uid, relation: child.relation}]
            },
            children: []
          };
          
          createdNodes.set(childKey, childNode);
          parentNode.children.push(childNode);
        }
      });
    }

    // بناء الشجرة حسب السيناريو المناسب
    
    // السيناريو 1: يوجد أب وعم - إنشاء جد وهمي
    if (relationships.directParent && relationships.uncles.length > 0) {
      const grandparentNode = {
        name: "الجد الكبير",
        id: "virtual_grandparent",
        avatar: null,
        attributes: {
          isCurrentUser: false,
          treeType: 'extended',
          isExtended: false,
          familyName: 'الجد',
          actualRelation: 'جد',
          relation: 'جد'
        },
        children: []
      };

      // إضافة الأب
      const parentNode = createPersonNode(relationships.directParent, 'أب', 'الوالد');
      grandparentNode.children.push(parentNode);
      
      // إضافة المستخدم والإخوة تحت الأب
      const userNode = createPersonNode(currentUserFamily, 'ابن', 'أنت', true);
      parentNode.children.push(userNode);
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNode(sibling, 'ابن', 'شقيق');
        parentNode.children.push(siblingNode);
        addFamilyChildren(siblingNode, sibling);
      });

      // إضافة الأعمام
      relationships.uncles.forEach(uncle => {
        const uncleNode = createPersonNode(uncle, 'عم', `العم ${uncle.head.firstName}`);
        grandparentNode.children.push(uncleNode);
        addFamilyChildren(uncleNode, uncle);
      });
      
      addFamilyChildren(parentNode, relationships.directParent);
      addFamilyChildren(userNode, currentUserFamily);

      return grandparentNode;
    }
    
    // السيناريو 2: يوجد أب فقط
    else if (relationships.directParent) {
      const parentNode = createPersonNode(relationships.directParent, 'أب', 'الوالد');
      
      const userNode = createPersonNode(currentUserFamily, 'ابن', 'أنت', true);
      parentNode.children.push(userNode);
      
      relationships.siblings.forEach(sibling => {
        const siblingNode = createPersonNode(sibling, 'ابن', 'شقيق');
        parentNode.children.push(siblingNode);
        addFamilyChildren(siblingNode, sibling);
      });

      addFamilyChildren(parentNode, relationships.directParent);
      addFamilyChildren(userNode, currentUserFamily);

      return parentNode;
    }
    
    // السيناريو 3: يوجد عم فقط
    else if (relationships.uncles.length > 0) {
      if (relationships.uncles.length === 1) {
        const uncleNode = createPersonNode(relationships.uncles[0], 'عم', 'العم');
        
        const userNode = createPersonNode(currentUserFamily, 'ابن أخ', 'أنت (ابن الأخ)', true);
        uncleNode.children.push(userNode);
        
        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNode(sibling, 'ابن أخ', 'شقيق (ابن الأخ)');
          uncleNode.children.push(siblingNode);
          addFamilyChildren(siblingNode, sibling);
        });

        addFamilyChildren(uncleNode, relationships.uncles[0]);
        addFamilyChildren(userNode, currentUserFamily);

        return uncleNode;
      } else {
        // عدة أعمام - جذر وهمي
        const virtualRoot = {
          name: "عائلة الأعمام الكبيرة",
          id: "virtual_uncles_root",
          avatar: null,
          attributes: {
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: false,
            familyName: 'عائلة الأعمام',
            actualRelation: 'جذر عائلي',
            relation: 'جذر عائلي'
          },
          children: []
        };
        
        relationships.uncles.forEach(uncle => {
          const uncleNode = createPersonNode(uncle, 'عم', `العم ${uncle.head.firstName}`);
          virtualRoot.children.push(uncleNode);
          addFamilyChildren(uncleNode, uncle);
        });
        
        // إضافة المستخدم تحت أول عم
        if (relationships.uncles.length > 0) {
          const firstUncle = virtualRoot.children[0];
          const userNode = createPersonNode(currentUserFamily, 'ابن أخ', 'أنت (ابن الأخ)', true);
          firstUncle.children.push(userNode);
          addFamilyChildren(userNode, currentUserFamily);
          
          relationships.siblings.forEach(sibling => {
            const siblingNode = createPersonNode(sibling, 'ابن أخ', 'شقيق (ابن الأخ)');
            firstUncle.children.push(siblingNode);
            addFamilyChildren(siblingNode, sibling);
          });
        }
        
        return virtualRoot;
      }
    }
    
    // السيناريو 4: لا يوجد أب أو عم
    else {
      if (relationships.siblings.length > 0 || relationships.cousins.length > 0 || relationships.others.length > 0) {
        const virtualRoot = {
          name: "العائلة",
          id: "virtual_family_root",
          avatar: null,
          attributes: {
            isCurrentUser: false,
            treeType: 'extended',
            isExtended: false,
            familyName: 'العائلة',
            actualRelation: 'جذر عائلي',
            relation: 'جذر عائلي'
          },
          children: []
        };

        const userNode = createPersonNode(currentUserFamily, 'رب عائلة', 'أنت', true);
        virtualRoot.children.push(userNode);

        relationships.siblings.forEach(sibling => {
          const siblingNode = createPersonNode(sibling, 'رب عائلة', 'أخ');
          virtualRoot.children.push(siblingNode);
          addFamilyChildren(siblingNode, sibling);
        });

        relationships.cousins.forEach(cousin => {
          const cousinNode = createPersonNode(cousin, 'ابن عم', 'ابن عم');
          virtualRoot.children.push(cousinNode);
          addFamilyChildren(cousinNode, cousin);
        });

        relationships.others.forEach(otherRel => {
          const otherNode = createPersonNode(otherRel.family, 'قريب', 'قريب');
          virtualRoot.children.push(otherNode);
          addFamilyChildren(otherNode, otherRel.family);
        });

        addFamilyChildren(userNode, currentUserFamily);
        return virtualRoot;
      } else {
        // المستخدم فقط
        const userNode = createPersonNode(currentUserFamily, 'رب العائلة', 'أنت', true);
        addFamilyChildren(userNode, currentUserFamily);
        return userNode;
      }
    }
  }, [rootFamilyUid, buildFullName, getReverseLinkType]);

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
    const extendedTree = buildExtendedTreeStructure(allFamiliesData);
    
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
  const name = nodeData.name || `${nodeData.firstName || ''} ${nodeData.fatherName || ''}`.trim() || 'غير محدد';
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
    if (isZoomedToNode) return; // لا تعيد التمركز إذا الكاميرا مقفلة على كارت
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

}, [showExtendedTree, handleNodeClick, searchQuery, isZoomedToNode]);

  // دالة البحث المحلية - مبسطة
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      return;
    }
    
    // بحث بسيط - يمكن تطويره لاحقاً
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
                      setIsZoomedToNode(false);
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
                {selectedNode.name || buildFullName(selectedNode) || 'غير محدد'}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={selectedNode.relation || 'غير محدد'} color="primary" variant="outlined" />
                {selectedNode.isExtended && (
                  <Chip label="عائلة مرتبطة" color="secondary" variant="outlined" />
                )}
                {selectedNode.familyName && (
                  <Chip label={selectedNode.familyName} color="info" variant="outlined" />
                )}
              </Box>
              {selectedNode.age && <Typography variant="body2" sx={{ mb: 1 }}>العمر: {selectedNode.age} سنة</Typography>}
              {/* عدد الأطفال */}
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
// src/components/FamilyTreeAdvanced.jsx - النسخة المُحدثة مع إصلاح التكرار
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, Card, CardContent, Grid, IconButton, Tooltip, 
  Paper, LinearProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, Tabs, Tab, Divider, FormControlLabel, Switch
} from '@mui/material';
import {
  AccountTree, Groups, Edit, Person, Visibility, Close, 
  ZoomIn, ZoomOut, Refresh, Warning, Link as LinkIcon, 
  PersonAdd, Timeline as TimelineIcon
} from '@mui/icons-material';

// استيرادات Firebase
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// استيراد المكونات
import ExtendedFamilyLinking from './ExtendedFamilyLinking';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6);
  const [activeTab, setActiveTab] = useState(0);
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
  
  const [personModalOpen, setPersonModalOpen] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // حالات البيانات
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // ===========================================================================
  // دوال مساعدة لمعالجة البيانات
  // ===========================================================================

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

  const buildFullName = (person) => {
    if (!person) return 'غير محدد';
    
    const parts = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
  };

  const findFamilyHead = (members) => {
    // البحث عن رب العائلة
    const head = members.find(m => m.relation === 'رب العائلة');
    if (head) return head;
    
    // إذا لم يوجد، البحث عن أقدم عضو
    const sorted = [...members].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
    
    return sorted[0] || members[0];
  };

  // ===========================================================================
  // تحميل الشجرة العادية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) return;

    console.log('🌳 تحميل الشجرة العادية (الحساب الحالي فقط)...');
    
    setLoading(true);
    setError(null);
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

      console.log('📋 أعضاء العائلة المُحمَّلة:', familyMembers);

      setLoadingProgress(60);
      setLoadingStage('بناء الشجرة...');

      const treeData = buildSimpleTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setSimpleTreeData(treeData);
      
      console.log(`✅ تم تحميل الشجرة العادية: ${familyMembers.length} أفراد`);
      showSnackbar(`تم تحميل عائلتك: ${familyMembers.length} أفراد`, 'success');

    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة العادية:', error);
      setError(error.message);
      showSnackbar('فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // ===========================================================================
  // تحميل الشجرة الموسعة المُحسنة
  // ===========================================================================

  const loadExtendedTree = useCallback(async () => {
    if (!uid) return;

    console.log('🏛️ تحميل الشجرة الموسعة (جميع العائلات المرتبطة)...');
    
    setLoading(true);
    setError(null);
    setLoadingStage('البحث عن الجذر الأساسي...');
    setLoadingProgress(0);

    try {
      const rootUid = await findFamilyRoot(uid);
      setLoadingProgress(20);
      
      setLoadingStage('جمع العائلات المرتبطة...');
      const allFamilies = await collectAllLinkedFamilies(rootUid);
      setLoadingProgress(60);
      
      setLoadingStage('بناء الشجرة الموسعة المُحسنة...');
      const treeData = await buildExtendedTreeStructure(allFamilies, rootUid);
      setLoadingProgress(90);
      
      setLoadingStage('اكتمل التحميل الموسع');
      setLoadingProgress(100);
      
      setExtendedTreeData(treeData);
      
      console.log(`✅ تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة`);
      showSnackbar(`تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة`, 'success');

    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الموسعة:', error);
      setError(error.message);
      showSnackbar('فشل في تحميل الشجرة الموسعة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // ===========================================================================
  // بناء الشجرة العادية
  // ===========================================================================

  const buildSimpleTreeStructure = (familyMembers) => {
    console.log('🏗️ بناء الشجرة العادية مع:', familyMembers);
    
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    const head = findFamilyHead(familyMembers);
    if (!head) {
      console.warn('⚠️ لم يتم العثور على رب عائلة');
      return null;
    }

    console.log('👑 رب العائلة المختار:', head.firstName);

    const rootNode = {
      name: buildFullName(head),
      id: head.globalId,
      avatar: head.avatar || '/boy.png',
      attributes: {
        ...head,
        isCurrentUser: true,
        treeType: 'simple'
      },
      children: []
    };

    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      m.globalId !== head.globalId
    );

    const childrenNames = children.map(c => buildFullName(c));
    console.log('👶 الأطفال المُضافون:', childrenNames);

    children.forEach(child => {
      rootNode.children.push({
        name: buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || '/boy.png',
        attributes: {
          ...child,
          treeType: 'simple'
        },
        children: []
      });
    });

    console.log('✅ الشجرة العادية جاهزة:', rootNode);
    return rootNode;
  };

  // ===========================================================================
  // العثور على جذر العائلة
  // ===========================================================================

  const findFamilyRoot = async (startUid) => {
    console.log('🔍 البحث عن جذر القبيلة بدءاً من:', startUid);
    
    let currentUid = startUid;
    let maxDepth = 10;
    const visited = new Set();

    while (maxDepth > 0 && !visited.has(currentUid)) {
      visited.add(currentUid);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (!userDoc.exists()) break;
        
        const userData = userDoc.data();
        const linkedToHead = userData.linkedToFamilyHead;
        
        if (!linkedToHead || linkedToHead === currentUid) {
          console.log('🏛️ تم العثور على جذر القبيلة:', currentUid);
          return currentUid;
        }
        
        console.log(`⬆️ الانتقال من ${currentUid} إلى ${linkedToHead}`);
        currentUid = linkedToHead;
        maxDepth--;
      } catch (error) {
        console.error(`خطأ في فحص ${currentUid}:`, error);
        break;
      }
    }
    
    console.log('🏛️ اعتماد', startUid, 'كجذر افتراضي');
    return startUid;
  };

  // ===========================================================================
  // جمع جميع العائلات المرتبطة
  // ===========================================================================

  const collectAllLinkedFamilies = async (rootUid) => {
    const allFamilies = new Map();
    const toProcess = [{ uid: rootUid, level: 0, parentUid: null }];
    const processed = new Set();

    while (toProcess.length > 0) {
      const { uid, level, parentUid } = toProcess.shift();
      
      if (processed.has(uid)) continue;
      processed.add(uid);

      try {
        const familyData = await loadFamilyData(uid, level, parentUid);
        if (familyData) {
          allFamilies.set(uid, familyData);
          console.log(`👨‍👩‍👧‍👦 عائلة ${uid} - رب العائلة: ${familyData.head?.firstName || 'غير محدد'}`);
          
          const linkedChildren = await findLinkedChildren(uid);
          linkedChildren.forEach(childUid => {
            if (!processed.has(childUid)) {
              toProcess.push({ uid: childUid, level: level + 1, parentUid: uid });
            }
          });
        }
      } catch (error) {
        console.error(`خطأ في معالجة العائلة ${uid}:`, error);
      }
    }

    return Array.from(allFamilies.values());
  };

  const loadFamilyData = async (familyUid, level, parentUid) => {
    try {
      const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid,
          level,
          parentFamilyUid: parentUid
        });
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length > 0) {
        const head = findFamilyHead(members);
        
        return {
          uid: familyUid,
          level,
          parentFamilyUid: parentUid,
          members,
          head
        };
      }
      
      return null;
    } catch (error) {
      console.error(`خطأ في تحميل عائلة ${familyUid}:`, error);
      return null;
    }
  };

  const findLinkedChildren = async (parentUid) => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const children = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        if (userId === parentUid) continue;
        
        if (userData.linkedToFamilyHead === parentUid) {
          children.push(userId);
        }
        
        const linkedFamilies = userData.linkedFamilies || [];
        const hasLink = linkedFamilies.some(link => 
          link.targetFamilyUid === parentUid && 
          (link.linkType === 'child-parent' || link.linkType === 'parent-child')
        );
        
        if (hasLink && !children.includes(userId)) {
          children.push(userId);
        }
      }
      
      return children;
    } catch (error) {
      console.error('خطأ في البحث عن الأطفال:', error);
      return [];
    }
  };

  // ===========================================================================
  // 🔥 بناء الشجرة الموسعة المُحسنة - بدون تكرار
  // ===========================================================================

  const buildExtendedTreeStructure = async (families, rootUid) => {
    console.log('🏗️ بناء الشجرة الموسعة المُحسنة من الجذر:', rootUid);
    
    const rootFamily = families.find(f => f.uid === rootUid);
    if (!rootFamily || !rootFamily.head) {
      throw new Error('لم يتم العثور على العائلة الجذر');
    }

    const processedPersons = new Set(); // لتتبع الأشخاص المُعالجين
    const globalPersonMap = new Map(); // خريطة شاملة للأشخاص

    // الخطوة 1: إنشاء خريطة شاملة لجميع الأشخاص
    families.forEach(family => {
      family.members.forEach(member => {
        const personKey = `${member.firstName}_${member.fatherName}_${member.grandfatherName}`;
        
        if (!globalPersonMap.has(personKey)) {
          globalPersonMap.set(personKey, {
            ...member,
            roles: [member.relation], // الأدوار المتعددة
            families: [family.uid], // العائلات التي ينتمي إليها
            isMultiRole: false
          });
        } else {
          // شخص موجود - إضافة دور جديد
          const existingPerson = globalPersonMap.get(personKey);
          existingPerson.roles.push(member.relation);
          existingPerson.families.push(family.uid);
          existingPerson.isMultiRole = true;
          
          // إذا كان رب عائلة، يصبح هو المرجع الأساسي
          if (member.relation === 'رب العائلة') {
            existingPerson.globalId = member.globalId;
            existingPerson.familyUid = member.familyUid;
          }
        }
      });
    });

    console.log('🗺️ الخريطة الشاملة للأشخاص:', globalPersonMap);

    // الخطوة 2: بناء الهيكل الهرمي بدون تكرار
    const buildPersonNode = (person, family, depth = 0) => {
      const personKey = `${person.firstName}_${person.fatherName}_${person.grandfatherName}`;
      
      if (processedPersons.has(personKey) || depth > 6) {
        return null;
      }
      
      processedPersons.add(personKey);
      const globalPerson = globalPersonMap.get(personKey);
      
      console.log(`🔗 بناء عقدة: ${buildFullName(person)} (الأدوار: ${globalPerson.roles.join(', ')})`);

      // إنشاء العقدة مع الأدوار المتعددة
      const node = {
        name: buildFullName(person),
        id: person.globalId,
        avatar: person.avatar || '/boy.png',
        attributes: {
          ...person,
          roles: globalPerson.roles,
          isMultiRole: globalPerson.isMultiRole,
          familyUids: globalPerson.families,
          isExtended: family.uid !== rootUid,
          treeType: 'extended',
          familyLevel: family.level || 0,
          primaryRole: globalPerson.roles.includes('رب العائلة') ? 'رب العائلة' : globalPerson.roles[0]
        },
        children: []
      };

      // إضافة الأطفال المباشرين (من نفس العائلة)
      const directChildren = family.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== person.globalId &&
        !processedPersons.has(`${m.firstName}_${m.fatherName}_${m.grandfatherName}`)
      );

      directChildren.forEach(child => {
        const childNode = buildPersonNode(child, family, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      // إضافة العائلات التي يرأسها هذا الشخص (إذا كان رب عائلة)
      if (globalPerson.roles.includes('رب العائلة')) {
        const ledFamilies = families.filter(f => 
          f.head && 
          `${f.head.firstName}_${f.head.fatherName}_${f.head.grandfatherName}` === personKey &&
          f.uid !== family.uid // تجنب نفس العائلة
        );

        ledFamilies.forEach(ledFamily => {
          const familyChildren = ledFamily.members.filter(m => 
            (m.relation === 'ابن' || m.relation === 'بنت') &&
            !processedPersons.has(`${m.firstName}_${m.fatherName}_${m.grandfatherName}`)
          );

          familyChildren.forEach(child => {
            const childNode = buildPersonNode(child, ledFamily, depth + 1);
            if (childNode) {
              node.children.push(childNode);
            }
          });
        });
      }

      return node;
    };

    // الخطوة 3: بناء الشجرة من الجذر
    const rootNode = buildPersonNode(rootFamily.head, rootFamily);
    
    console.log('✅ تم بناء الشجرة الموسعة المُحسنة');
    return rootNode;
  };

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
  }, [uid, navigate, loadSimpleTree]);

  useEffect(() => {
    if (!uid) return;
    
    if (showExtendedTree) {
      if (!extendedTreeData) {
        loadExtendedTree();
      }
    }
  }, [showExtendedTree, uid, extendedTreeData, loadExtendedTree]);

  const loadLinkedFamilies = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linked = userData.linkedFamilies || [];
        setLinkedFamilies(linked);
      }
    } catch (error) {
      console.error('خطأ في تحميل العائلات المرتبطة:', error);
    }
  }, [uid]);

  // ===========================================================================
  // دوال التفاعل
  // ===========================================================================

  const handleNodeClick = useCallback((nodeData) => {
    console.log('👆 تم النقر على:', nodeData.name);
    setSelectedNode(nodeData);
    setPersonModalOpen(true);
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    if (showExtendedTree) {
      setExtendedTreeData(null);
      loadExtendedTree();
    } else {
      setSimpleTreeData(null);
      loadSimpleTree();
    }
  }, [showExtendedTree, loadExtendedTree, loadSimpleTree]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(0.6);
  }, []);

  const handleTreeTypeToggle = useCallback((event) => {
    const newValue = event.target.checked;
    setShowExtendedTree(newValue);
    
    if (newValue) {
      showSnackbar('تحويل للشجرة الموسعة...', 'info');
    } else {
      showSnackbar('تحويل للشجرة العادية', 'info');
    }
  }, []);

  // ===========================================================================
  // 🎨 عرض العقدة المُحسن مع الأدوار المتعددة
  // ===========================================================================

  
  // دالة renderNodeElement مطابقة لتصميم صفحة العائلة

  const renderNodeElement = useCallback(({ nodeDatum }) => {
    const person = nodeDatum.attributes;
    const isExtended = person?.isExtended || false;
    const isMultiRole = person?.isMultiRole || false;
    const roles = person?.roles || [person?.relation || 'عضو'];
    
    // نفس ألوان صفحة العائلة الخضراء
    const getNodeColors = () => {
      if (roles.includes('رب العائلة')) {
        return {
          primary: '#2e7d32', // نفس الأخضر
          light: '#4caf50',
          bg: '#e8f5e8'
        };
      }
      if (isExtended) {
        return {
          primary: '#f57c00', // برتقالي للمرتبطين
          light: '#ff9800',
          bg: '#fff3e0'
        };
      }
      return {
        primary: '#1976d2', // أزرق للأطفال
        light: '#42a5f5',
        bg: '#e3f2fd'
      };
    };
    
    const colors = getNodeColors();
    
    // تحسين عرض الاسم
    const getDisplayName = (name) => {
      if (!name || name === 'غير محدد') return 'غير محدد';
      const words = name.trim().split(' ');
      if (words.length <= 2) return name;
      return `${words[0]} ${words[1]}`;
    };
    
    return (
      <g>
        <defs>
          {/* تدرج مشابه لصفحة العائلة */}
          <linearGradient id={`familyGrad-${nodeDatum.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={colors.bg} />
          </linearGradient>
          
          {/* ظل ناعم مثل الكاردات */}
          <filter id={`familyShadow-${nodeDatum.id}`}>
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.12)"/>
          </filter>
        </defs>
        
        {/* الكارت الرئيسي - نفس ستايل صفحة العائلة */}
        <rect
          width="280"
          height="160"
          x="-140"
          y="-80"
          rx="16"
          fill={`url(#familyGrad-${nodeDatum.id})`}
          stroke={colors.primary}
          strokeWidth="2"
          style={{ 
            cursor: 'pointer',
            filter: `url(#familyShadow-${nodeDatum.id})`,
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* شارة الأدوار المتعددة - بستايل Material */}
        {isMultiRole && (
          <g>
            <circle
              cx="-110"
              cy="-60"
              r="16"
              fill={colors.primary}
              stroke="white"
              strokeWidth="2"
              style={{ filter: `url(#familyShadow-${nodeDatum.id})` }}
            />
            <text
              x="-110"
              y="-55"
              textAnchor="middle"
              style={{
                fontSize: '12px',
                fill: 'white',
                fontWeight: '600',
                fontFamily: '"Cairo", "Roboto", sans-serif'
              }}
            >
              {roles.length}
            </text>
          </g>
        )}
        
        {/* الصورة الشخصية - مثل الأفاتار في صفحة العائلة */}
        <circle
          cx="0"
          cy="-25"
          r="35"
          fill="white"
          stroke={colors.primary}
          strokeWidth="3"
          style={{ filter: `url(#familyShadow-${nodeDatum.id})` }}
        />
        
        <image
          href={nodeDatum.avatar || '/boy.png'}
          x="-30"
          y="-55"
          width="60"
          height="60"
          clipPath="circle(30px at 30px 30px)"
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* منطقة النص - نفس ستايل الكاردات */}
        <rect
          x="-130"
          y="25"
          width="260"
          height="45"
          rx="8"
          fill="rgba(255,255,255,0.9)"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />
        
        {/* الاسم - نفس typography صفحة العائلة */}
        <text
          x="0"
          y="42"
          textAnchor="middle"
          style={{
            fontSize: '16px',
            fontWeight: '600',
            fill: '#333',
            fontFamily: '"Cairo", "Roboto", sans-serif',
            cursor: 'pointer'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {getDisplayName(nodeDatum.name)}
        </text>
        
        {/* الدور - مع Chip style */}
        <rect
          x="-60"
          y="50"
          width="120"
          height="20"
          rx="10"
          fill={colors.primary}
          opacity="0.1"
        />
        
        <text
          x="0"
          y="62"
          textAnchor="middle"
          style={{
            fontSize: '12px',
            fill: colors.primary,
            fontFamily: '"Cairo", "Roboto", sans-serif',
            fontWeight: '500'
          }}
        >
          {isMultiRole ? roles.slice(0,2).join(' + ') : roles[0]}
        </text>
        
        {/* عدد الأطفال - مثل الشارات في صفحة العائلة */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <g>
            <circle
              cx="110"
              cy="-60"
              r="16"
              fill="#4caf50"
              stroke="white"
              strokeWidth="2"
              style={{ filter: `url(#familyShadow-${nodeDatum.id})` }}
            />
            <text
              x="110"
              y="-55"
              textAnchor="middle"
              style={{
                fontSize: '11px',
                fill: 'white',
                fontWeight: '600',
                fontFamily: '"Cairo", "Roboto", sans-serif'
              }}
            >
              {nodeDatum.children.length}
            </text>
          </g>
        )}
        
        {/* تأثير hover مثل الكاردات */}
        <rect
          width="280"
          height="160"
          x="-140"
          y="-80"
          rx="16"
          fill="rgba(46, 125, 50, 0)"
          stroke="none"
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.previousSibling.style.transform = 'translateY(-2px)';
            e.target.previousSibling.style.filter = 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))';
          }}
          onMouseLeave={(e) => {
            e.target.previousSibling.style.transform = 'translateY(0px)';
            e.target.previousSibling.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))';
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
      </g>
    );
  }, [handleNodeClick]);

  // ===========================================================================
  // عرض الشجرة
  // ===========================================================================

  const renderTreeView = () => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    const treeTitle = showExtendedTree ? 'الشجرة الموسعة للقبيلة' : 'شجرة عائلتك';
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: showExtendedTree 
            ? 'linear-gradient(135deg, #f3e5f5 0%, #e1f5fe 100%)'
            : 'linear-gradient(135deg, #e3f2fd 0%, #f1f8e9 100%)'
        }}
      >
        {currentTreeData ? (
          <Tree
            data={currentTreeData}
            orientation="vertical"
            translate={{ x: window.innerWidth / 2, y: 120 }}
            zoomable
            zoom={zoomLevel}
            collapsible={false}
            pathFunc="step"
            separation={{ siblings: 1.5, nonSiblings: 2 }}
            nodeSize={{ x: 300, y: 220 }}
            renderCustomNodeElement={renderNodeElement}
            styles={{
              links: {
                stroke: showExtendedTree ? '#ff9800' : '#2196f3',
                strokeWidth: 2,
                strokeDasharray: showExtendedTree ? '5,5' : 'none'
              }
            }}
            onNodeClick={handleNodeClick}
            enableLegacyTransitions={false}
            transitionDuration={500}
          />
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            {loading ? (
              <Box textAlign="center" maxWidth={600}>
                <CircularProgress size={80} sx={{ color: '#2e7d32', mb: 3 }} />
                <Typography variant="h5" sx={{ mb: 2, color: '#2e7d32' }}>
                  {loadingStage || `جاري تحميل ${treeTitle}...`}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={loadingProgress} 
                  sx={{ width: '100%', height: 8, borderRadius: 4, mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {Math.round(loadingProgress)}% مكتمل
                </Typography>
              </Box>
            ) : error ? (
              <Box textAlign="center">
                <Warning sx={{ fontSize: 100, color: '#f44336', mb: 2 }} />
                <Typography variant="h4" color="error" gutterBottom>
                  حدث خطأ في {treeTitle}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRefresh}
                  startIcon={<Refresh />}
                  size="large"
                >
                  إعادة تحميل
                </Button>
              </Box>
            ) : (
              <Box textAlign="center">
                <AccountTree sx={{ fontSize: 120, color: '#2e7d32', mb: 2 }} />
                <Typography variant="h4" color="text.secondary" gutterBottom>
                  {showExtendedTree ? '🏛️ ابنِ شجرتك الموسعة' : '🌳 ابنِ شجرة عائلتك'}
                </Typography>
                <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3, maxWidth: 500 }}>
                  {showExtendedTree 
                    ? 'اربط عائلتك مع العائلات الأخرى لبناء شجرة موسعة شاملة'
                    : 'أضف أفراد عائلتك لبناء شجرة عائلية جميلة'
                  }
                </Typography>
                <Box display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/family')}
                    startIcon={<Person />}
                  >
                    إضافة أفراد العائلة
                  </Button>
                  {showExtendedTree && (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={() => setShowLinkingPanel(true)}
                      startIcon={<LinkIcon />}
                    >
                      ربط عائلات
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // ===========================================================================
  // شريط الأدوات
  // ===========================================================================

  const renderToolbar = () => (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid #e0e0e0'
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography 
          variant="h4" 
          textAlign="center" 
          sx={{ 
            mb: 2, 
            color: showExtendedTree ? '#ff9800' : '#2196f3',
            fontWeight: 'bold'
          }}
        >
          {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك'}
        </Typography>
        
        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={loadingProgress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
              {loadingStage} - {Math.round(loadingProgress)}%
            </Typography>
          </Box>
        )}
        
        <Box
          display="flex"
          gap={2}
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          sx={{ mb: 2 }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/family')}
            disabled={loading}
            startIcon={<Edit />}
          >
            إدارة الأفراد
          </Button>
          
          <Button
            variant="contained"
            size="small"
            color="success"
            onClick={() => navigate('/family')}
            disabled={loading}
            startIcon={<PersonAdd />}
          >
            إضافة فرد
          </Button>

          {showExtendedTree && (
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={() => setShowLinkingPanel(true)}
              disabled={loading}
              startIcon={<LinkIcon />}
            >
              ربط عائلات
            </Button>
          )}

          <Divider orientation="vertical" flexItem />

          <Box component="span">
            <Tooltip title="تكبير">
              <IconButton size="small" onClick={handleZoomIn} disabled={loading}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Chip 
            label={`${Math.round(zoomLevel * 100)}%`} 
            size="small" 
            onClick={handleResetZoom}
            style={{ cursor: 'pointer', minWidth: 70 }}
            disabled={loading}
          />
          
          <Box component="span">
            <Tooltip title="تصغير">
              <IconButton size="small" onClick={handleZoomOut} disabled={loading}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box component="span">
            <Tooltip title="إعادة تحميل">
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showExtendedTree}
                onChange={handleTreeTypeToggle}
                color="primary"
                size="medium"
                disabled={loading}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body1" fontWeight="bold">
                  {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك فقط'}
                </Typography>
              </Box>
            }
          />
        </Box>

        <Box display="flex" justifyContent="center" gap={3}>
          <Chip
            size="small"
            icon={<Groups />}
            label="شجرة تفاعلية"
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<AccountTree />}
            label={showExtendedTree ? "متعددة العائلات" : "عائلة واحدة"}
            color="secondary"
            variant="outlined"
          />
          {linkedFamilies.length > 0 && (
            <Chip
              size="small"
              icon={<LinkIcon />}
              label={`${linkedFamilies.length} رابط`}
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Paper>
  );

  // ===========================================================================
  // العرض الرئيسي
  // ===========================================================================

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {renderToolbar()}

      <Box
        sx={{
          position: 'absolute',
          top: 200,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto'
        }}
      >
        {renderTreeView()}
      </Box>

      <Dialog
        open={showLinkingPanel}
        onClose={() => setShowLinkingPanel(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight="bold">
              ربط العائلات للشجرة الموسعة
            </Typography>
            <IconButton onClick={() => setShowLinkingPanel(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <ExtendedFamilyLinking
            currentUserUid={uid}
            onLinkingComplete={() => {
              setShowLinkingPanel(false);
              setExtendedTreeData(null);
              if (showExtendedTree) {
                loadExtendedTree();
              }
            }}
            existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
          />
        </DialogContent>
      </Dialog>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
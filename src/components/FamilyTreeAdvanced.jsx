// src/components/FamilyTreeAdvanced.jsx - النسخة المُصححة
import React, { useState, useEffect, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, IconButton, Tooltip, Paper, LinearProgress, 
  Dialog, DialogTitle, DialogContent, Divider, 
  FormControlLabel, Switch
} from '@mui/material';
import {
  AccountTree, Groups, Edit, Person, Close, 
  ZoomIn, ZoomOut, Refresh, Warning, Link as LinkIcon, 
  PersonAdd
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
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);

  // ===========================================================================
  // إعدادات الشجرة القابلة للتخصيص
  // ===========================================================================
  
  const [treeSettings] = useState({
    maxDepth: 15, // عمق أكبر للقبائل الكبيرة
    maxPersonsPerLevel: 50,
    maxTotalPersons: 2000,
    enableSmartLimits: true,
    showDepthWarning: true,
    autoOptimize: true
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // مراقبة الأداء أثناء بناء الشجرة
  const monitorPerformance = useCallback((metrics) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics
    }));
    
    // تحذيرات تلقائية
    if (metrics.personCount > 1000) {
      showSnackbar('⚠️ الشجرة كبيرة - قد يتأثر الأداء', 'warning');
    }
    
    if (metrics.maxDepthReached > 12) {
      showSnackbar('📏 تم الوصول لعمق كبير في الشجرة', 'info');
    }
    
    if (metrics.loadTime > 10000) { // 10 ثواني
      showSnackbar('🐌 التحميل بطيء - فكر في تقليل العمق', 'warning');
    }
  }, []);
  
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
  // تحميل الشجرة العادية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) return;

    console.log('🌳 تحميل الشجرة العادية...');
    
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

      console.log('📋 أعضاء العائلة:', familyMembers);

      setLoadingProgress(60);
      setLoadingStage('بناء الشجرة...');

      const treeData = buildSimpleTreeStructure(familyMembers);
      
      setLoadingProgress(100);
      setLoadingStage('اكتمل التحميل');
      
      setSimpleTreeData(treeData);
      
      console.log(`✅ تم تحميل الشجرة العادية: ${familyMembers.length} أفراد`);
      showSnackbar(`تم تحميل عائلتك: ${familyMembers.length} أفراد`, 'success');

    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة:', error);
      setError(error.message);
      showSnackbar('فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // ===========================================================================
  // تحميل الشجرة الموسعة
  // ===========================================================================

  const loadExtendedTree = useCallback(async () => {
    if (!uid) return;

    console.log('🏛️ تحميل الشجرة الموسعة...');
    
    const startTime = Date.now();
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
      
      setLoadingStage('بناء الشجرة الموسعة الذكية...');
      const { treeData, metrics } = await buildExtendedTreeStructure(allFamilies, rootUid, treeSettings);
      setLoadingProgress(90);
      
      // تسجيل المقاييس
      const endTime = Date.now();
      const finalMetrics = {
        ...metrics,
        loadTime: endTime - startTime
      };
      
      monitorPerformance(finalMetrics);
      
      setLoadingStage('اكتمل التحميل الموسع');
      setLoadingProgress(100);
      
      setExtendedTreeData(treeData);
      
      console.log(`✅ تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة`);
      showSnackbar(`تم تحميل الشجرة الموسعة: ${allFamilies.length} عائلة، ${metrics.personCount} شخص`, 'success');

    } catch (error) {
      console.error('❌ خطأ في تحميل الشجرة الموسعة:', error);
      setError(error.message);
      showSnackbar('فشل في تحميل الشجرة الموسعة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, treeSettings, monitorPerformance]);

  // ===========================================================================
  // بناء الشجرة العادية
  // ===========================================================================

  const buildSimpleTreeStructure = (familyMembers) => {
    console.log('🏗️ بناء الشجرة العادية...');
    
    if (!familyMembers || familyMembers.length === 0) {
      return null;
    }

    const head = findFamilyHead(familyMembers);
    if (!head) {
      console.warn('⚠️ لم يتم العثور على رب عائلة');
      return null;
    }

    console.log('👑 رب العائلة:', head.firstName);

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

    console.log('✅ الشجرة العادية جاهزة');
    return rootNode;
  };

  // ===========================================================================
  // العثور على جذر العائلة
  // ===========================================================================

  const findFamilyRoot = async (startUid) => {
    console.log('🔍 البحث عن جذر القبيلة من:', startUid);
    
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
          console.log('🏛️ جذر القبيلة:', currentUid);
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
    
    console.log('🏛️ اعتماد', startUid, 'كجذر');
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
          console.log(`👨‍👩‍👧‍👦 عائلة ${uid}`);
          
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
  // 🔥 بناء الشجرة الموسعة الذكية
  // ===========================================================================

  const buildExtendedTreeStructure = async (families, rootUid, settings) => {
    console.log('🏗️ بناء الشجرة الموسعة الذكية...');
    
    const rootFamily = families.find(f => f.uid === rootUid);
    if (!rootFamily || !rootFamily.head) {
      throw new Error('لم يتم العثور على العائلة الجذر');
    }

    const processedPersons = new Set();
    const globalPersonMap = new Map();

    // الخطوة 1: إنشاء خريطة شاملة للأشخاص
    families.forEach(family => {
      family.members.forEach(member => {
        const personKey = `${member.firstName}_${member.fatherName}_${member.grandfatherName}`;
        
        if (!globalPersonMap.has(personKey)) {
          globalPersonMap.set(personKey, {
            ...member,
            roles: [member.relation], 
            families: [family.uid], 
            isMultiRole: false,
            originalFamily: family.uid
          });
        } else {
          const existingPerson = globalPersonMap.get(personKey);
          existingPerson.roles.push(member.relation);
          existingPerson.families.push(family.uid);
          existingPerson.isMultiRole = true;
          
          if (member.relation === 'رب العائلة') {
            existingPerson.globalId = member.globalId;
            existingPerson.familyUid = member.familyUid;
            existingPerson.primaryFamily = family.uid;
          }
        }
      });
    });

    console.log('🗺️ تم إنشاء خريطة الأشخاص');

    // الخطوة 2: بناء الهيكل الهرمي
    const buildPersonNode = (person, family, depth = 0, parentId = null) => {
      const personKey = `${person.firstName}_${person.fatherName}_${person.grandfatherName}`;
      
      // فحص الحدود الذكية
      if (processedPersons.has(personKey)) {
        return null;
      }
      
      if (depth > settings.maxDepth) {
        console.log(`⚠️ توقف عند العمق ${depth}`);
        return null;
      }
      
      if (processedPersons.size > settings.maxTotalPersons) {
        console.log(`⚠️ تجاوز الحد الأقصى للأشخاص`);
        return null;
      }
      
      if (parentId && person.globalId === parentId) {
        console.log(`🚫 منع الدائرة المرجعية`);
        return null;
      }
      
      processedPersons.add(personKey);
      const globalPerson = globalPersonMap.get(personKey);
      
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
          generationDepth: depth,
          primaryRole: globalPerson.roles.includes('رب العائلة') ? 'رب العائلة' : globalPerson.roles[0]
        },
        children: []
      };

      // إضافة الأطفال
      const allChildren = [];

      if (person.relation === 'رب العائلة') {
        const directChildren = family.members.filter(m => 
          (m.relation === 'ابن' || m.relation === 'بنت') && 
          m.globalId !== person.globalId &&
          !processedPersons.has(`${m.firstName}_${m.fatherName}_${m.grandfatherName}`)
        );
        
        allChildren.push(...directChildren.map(child => ({ child, family })));

        if (globalPerson.roles.includes('رب العائلة') && globalPerson.families.length > 1) {
          const otherFamilies = families.filter(f => 
            f.head && 
            `${f.head.firstName}_${f.head.fatherName}_${f.head.grandfatherName}` === personKey &&
            f.uid !== family.uid
          );

          otherFamilies.forEach(otherFamily => {
            const otherFamilyChildren = otherFamily.members.filter(m => 
              (m.relation === 'ابن' || m.relation === 'بنت') &&
              !processedPersons.has(`${m.firstName}_${m.fatherName}_${m.grandfatherName}`)
            );
            
            allChildren.push(...otherFamilyChildren.map(child => ({ child, family: otherFamily })));
          });
        }
      } else if (person.relation === 'ابن' || person.relation === 'بنت') {
        const familiesHeaded = families.filter(f => 
          f.head && 
          `${f.head.firstName}_${f.head.fatherName}_${f.head.grandfatherName}` === personKey
        );

        familiesHeaded.forEach(headedFamily => {
          const childrenInHeadedFamily = headedFamily.members.filter(m => 
            (m.relation === 'ابن' || m.relation === 'بنت') &&
            !processedPersons.has(`${m.firstName}_${m.fatherName}_${m.grandfatherName}`)
          );
          
          allChildren.push(...childrenInHeadedFamily.map(child => ({ child, family: headedFamily })));
        });
      }

      // فلترة الأطفال الصحيحين
      const validChildren = allChildren.filter(({ child }) => {
        const childKey = `${child.firstName}_${child.fatherName}_${child.grandfatherName}`;
        const childGlobalPerson = globalPersonMap.get(childKey);
        
        if (childGlobalPerson && (childGlobalPerson.roles.includes('أخ') || childGlobalPerson.roles.includes('أخت'))) {
          return false;
        }
        
        return child.relation === 'ابن' || child.relation === 'بنت';
      });

      // ترتيب وإضافة الأطفال
      const sortedChildren = validChildren.sort((a, b) => {
        if (a.child.birthDate && b.child.birthDate) {
          return new Date(a.child.birthDate) - new Date(b.child.birthDate);
        }
        return (a.child.firstName || '').localeCompare(b.child.firstName || '', 'ar');
      });
      
      sortedChildren.forEach(({ child, family: childFamily }) => {
        const childNode = buildPersonNode(child, childFamily, depth + 1, person.globalId);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      return node;
    };

    // بناء الشجرة من الجذر
    let maxDepthReached = 0;
    let totalPersonsProcessed = 0;
    
    const rootNode = buildPersonNode(rootFamily.head, rootFamily);
    
    totalPersonsProcessed = processedPersons.size;
    
    // حساب العمق الأقصى
    const calculateMaxDepth = (node, currentDepth = 0) => {
      maxDepthReached = Math.max(maxDepthReached, currentDepth);
      if (node && node.children) {
        node.children.forEach(child => calculateMaxDepth(child, currentDepth + 1));
      }
    };
    
    if (rootNode) {
      calculateMaxDepth(rootNode);
    }
    
    const metrics = {
      personCount: totalPersonsProcessed,
      maxDepthReached,
      familyCount: families.length,
      processedFamilies: families.length
    };
    
    console.log(`📊 المقاييس: ${metrics.personCount} شخص، عمق أقصى: ${metrics.maxDepthReached}`);
    
    return { treeData: rootNode, metrics };
  };

  // ===========================================================================
  // دوال مساعدة
  // ===========================================================================

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    console.log('👆 تم النقر على:', nodeData.name);
    setSelectedNode(nodeData);
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
  }, [showSnackbar]);

  // ===========================================================================
  // عرض العقدة
  // ===========================================================================

  const renderNodeElement = useCallback(({ nodeDatum }) => {
    const person = nodeDatum.attributes;
    const isExtended = person?.isExtended || false;
    const isMultiRole = person?.isMultiRole || false;
    const roles = person?.roles || [person?.relation || 'عضو'];
    
    const getNodeColors = () => {
      if (roles.includes('رب العائلة')) {
        return {
          primary: '#2e7d32',
          light: '#4caf50',
          bg: '#e8f5e8'
        };
      }
      if (isExtended) {
        return {
          primary: '#f57c00',
          light: '#ff9800',
          bg: '#fff3e0'
        };
      }
      return {
        primary: '#1976d2',
        light: '#42a5f5',
        bg: '#e3f2fd'
      };
    };
    
    const colors = getNodeColors();
    
    const getDisplayName = (name) => {
      if (!name || name === 'غير محدد') return 'غير محدد';
      const words = name.trim().split(' ');
      if (words.length <= 2) return name;
      return `${words[0]} ${words[1]}`;
    };
    
    return (
      <g>
        <defs>
          <linearGradient id={`grad-${nodeDatum.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={colors.bg} />
          </linearGradient>
          
          <filter id={`shadow-${nodeDatum.id}`}>
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.12)"/>
          </filter>
        </defs>
        
        <rect
          width="280"
          height="160"
          x="-140"
          y="-80"
          rx="16"
          fill={`url(#grad-${nodeDatum.id})`}
          stroke={colors.primary}
          strokeWidth="2"
          style={{ 
            cursor: 'pointer',
            filter: `url(#shadow-${nodeDatum.id})`
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {isMultiRole && (
          <g>
            <circle
              cx="-110"
              cy="-60"
              r="16"
              fill={colors.primary}
              stroke="white"
              strokeWidth="2"
            />
            <text
              x="-110"
              y="-55"
              textAnchor="middle"
              style={{
                fontSize: '12px',
                fill: 'white',
                fontWeight: '600'
              }}
            >
              {roles.length}
            </text>
          </g>
        )}
        
        <circle
          cx="0"
          cy="-25"
          r="35"
          fill="white"
          stroke={colors.primary}
          strokeWidth="3"
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
        
        <text
          x="0"
          y="42"
          textAnchor="middle"
          style={{
            fontSize: '16px',
            fontWeight: '600',
            fill: '#333',
            cursor: 'pointer'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {getDisplayName(nodeDatum.name)}
        </text>
        
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
            fontWeight: '500'
          }}
        >
          {isMultiRole ? roles.slice(0,2).join(' + ') : roles[0]}
        </text>
        
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <g>
            <circle
              cx="110"
              cy="-60"
              r="16"
              fill="#4caf50"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x="110"
              y="-55"
              textAnchor="middle"
              style={{
                fontSize: '11px',
                fill: 'white',
                fontWeight: '600'
              }}
            >
              {nodeDatum.children.length}
            </text>
          </g>
        )}
      </g>
    );
  }, [handleNodeClick]);

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
    
    if (showExtendedTree && !extendedTreeData) {
      loadExtendedTree();
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
            separation={{ 
              siblings: showExtendedTree ? 2.2 : 1.8,
              nonSiblings: showExtendedTree ? 3 : 2.5 
            }}
            nodeSize={{ 
              x: showExtendedTree ? 350 : 300,
              y: 220 
            }}
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
            scaleExtent={{ min: 0.1, max: 2 }}
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
                  حدث خطأ
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

          <Tooltip title="تكبير">
            <span>
              <IconButton size="small" onClick={handleZoomIn} disabled={loading}>
                <ZoomIn />
              </IconButton>
            </span>
          </Tooltip>
          
          <Chip 
            label={`${Math.round(zoomLevel * 100)}%`} 
            size="small" 
            onClick={handleResetZoom}
            style={{ cursor: 'pointer', minWidth: 70 }}
            disabled={loading}
          />
          
          <Tooltip title="تصغير">
            <span>
              <IconButton size="small" onClick={handleZoomOut} disabled={loading}>
                <ZoomOut />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="إعادة تحميل">
            <span>
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
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
              <Typography variant="body1" fontWeight="bold">
                {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك فقط'}
              </Typography>
            }
          />
        </Box>

        <Box display="flex" justifyContent="center" gap={3} flexWrap="wrap">
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
          {performanceMetrics.personCount > 0 && (
            <Chip
              size="small"
              icon={<Groups />}
              label={`${performanceMetrics.personCount} شخص`}
              color="info"
              variant="outlined"
            />
          )}
          {performanceMetrics.maxDepthReached > 0 && (
            <Chip
              size="small"
              icon={<AccountTree />}
              label={`عمق: ${performanceMetrics.maxDepthReached}`}
              color={performanceMetrics.maxDepthReached > 10 ? "warning" : "default"}
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

      {/* حوار ربط العائلات */}
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
      
      {/* رسائل التنبيه */}
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
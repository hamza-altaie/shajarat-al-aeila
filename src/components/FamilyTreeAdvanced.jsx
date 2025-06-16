// src/components/FamilyTreeAdvanced.jsx - النسخة المُصححة
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
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
import './FamilyTreeAdvanced.css';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const familyChartRef = useRef(null);
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

  // أضف هذه الدالة قبل useEffect
  // استبدل دالة renderFamilyChart بالكامل بهذا الكود المحسن:

const renderFamilyChart = useCallback(() => {
  if (!familyChartRef.current) return;
  
  const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
  if (!currentTreeData) return;
  
  // تنظيف الحاوي
  d3.select(familyChartRef.current).selectAll("*").remove();
  
  // إعدادات الشجرة
  const width = familyChartRef.current.clientWidth || 1200;
  const height = familyChartRef.current.clientHeight || 800;
  
  // إنشاء SVG
  const svg = d3.select(familyChartRef.current)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "family-tree-svg");
  
  // إضافة التدرجات والفلاتر المحسنة
  const defs = svg.append("defs");
  
  // تدرج محسن للوالد
  const parentGradient = defs.append("linearGradient")
    .attr("id", "parentGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "100%");
  parentGradient.append("stop").attr("offset", "0%").style("stop-color", "#4caf50");
  parentGradient.append("stop").attr("offset", "50%").style("stop-color", "#66bb6a");
  parentGradient.append("stop").attr("offset", "100%").style("stop-color", "#2e7d32");
  
  // تدرج محسن للأطفال
  const childGradient = defs.append("linearGradient")
    .attr("id", "childGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "100%");
  childGradient.append("stop").attr("offset", "0%").style("stop-color", "#2196f3");
  childGradient.append("stop").attr("offset", "50%").style("stop-color", "#42a5f5");
  childGradient.append("stop").attr("offset", "100%").style("stop-color", "#1565c0");
  
  // فلتر الظل المحسن
  const shadow = defs.append("filter")
    .attr("id", "familyCardShadow")
    .attr("x", "-30%").attr("y", "-30%")
    .attr("width", "160%").attr("height", "160%");
  shadow.append("feDropShadow")
    .attr("dx", "0").attr("dy", "4")
    .attr("stdDeviation", "8")
    .attr("flood-color", "rgba(0,0,0,0.15)")
    .attr("flood-opacity", "1");
  
  // clipPath للصور الدائرية
  const circleClip = defs.append("clipPath")
    .attr("id", "circleClip");
  circleClip.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 25);
  
  // مجموعة للرسم مع zoom
  const g = svg.append("g");
  
  // إعداد التكبير/التصغير
  const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  
  svg.call(zoom);
  
  // إعداد شجرة D3 مع مسافات محسنة
  const treeLayout = d3.tree()
    .size([width * 2.5, height - 150])
    .separation((a, b) => {
      if (a.parent === b.parent) {
        return 10;
      } else {
        return 12;
      }
    });
  
  // تحويل البيانات
  const root = d3.hierarchy(currentTreeData);
  const treeData = treeLayout(root);
  
  // رسم الخطوط مع الكلاسات الجديدة
  g.selectAll(".link")
    .data(treeData.links())
    .enter()
    .append("path")
    .attr("class", "link family-tree-link")
    .attr("d", d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y)
    );
  
  // رسم العقد مع الكلاسات المحسنة
  const nodes = g.selectAll(".node")
    .data(treeData.descendants())
    .enter()
    .append("g")
    .attr("class", "node family-tree-node")
    .attr("transform", d => `translate(${d.x},${d.y})`);
  
  // إعدادات الكارت المحسنة
  const cardWidth = 300;
  const cardHeight = 110;
  
  // مستطيلات العقد مع الكلاسات
  nodes.append("rect")
    .attr("class", d => {
      const relation = d.data.attributes?.relation || '';
      const isExtended = d.data.attributes?.isExtended || false;
      let classes = "family-node-card";
      
      if (relation === 'رب العائلة') {
        classes += " parent";
      } else {
        classes += " child";
      }
      
      if (isExtended) {
        classes += " extended";
      }
      
      return classes;
    })
    .attr("width", cardWidth)
    .attr("height", cardHeight)
    .attr("x", -cardWidth/2)
    .attr("y", -cardHeight/2)
    .attr("rx", 18)
    .style("fill", d => {
      const relation = d.data.attributes?.relation || '';
      return relation === 'رب العائلة' ? "url(#parentGradient)" : "url(#childGradient)";
    })
    .style("filter", "url(#familyCardShadow)");
  
  // دائرة خلفية الصورة مع الكلاسات
  nodes.append("circle")
    .attr("class", d => {
      const relation = d.data.attributes?.relation || '';
      let classes = "family-avatar-background";
      
      if (relation === 'رب العائلة') {
        classes += " parent";
      } else {
        classes += " child";
      }
      
      return classes;
    })
    .attr("cx", -cardWidth/2 + 45)
    .attr("cy", 0)
    .attr("r", 30);
  
  // مجموعة للصور
  const imageGroups = nodes.append("g")
    .attr("transform", `translate(${-cardWidth/2 + 45}, 0)`);
  
  // الصور مع الكلاسات المحسنة
  imageGroups.each(function(d) {
    const group = d3.select(this);
    const hasAvatar = d.data.attributes?.avatar && 
                     d.data.attributes.avatar !== '/boy.png' && 
                     d.data.attributes.avatar.trim() !== '';
    
    if (hasAvatar) {
      group.append("image")
        .attr("class", "family-avatar-image")
        .attr("x", -27)
        .attr("y", -27)
        .attr("width", 54)
        .attr("height", 54)
        .attr("href", d.data.attributes.avatar)
        .attr("clip-path", "url(#circleClip)")
        .on("error", function() {
          d3.select(this).remove();
          group.append("text")
            .attr("class", "family-avatar-icon")
            .attr("x", 0)
            .attr("y", 8)
            .text(() => {
              const relation = d.data.attributes?.relation || '';
              return relation === 'رب العائلة' ? '👑' : 
                     relation === 'ابن' ? '👦' : 
                     relation === 'بنت' ? '👧' : '👤';
            });
        });
    } else {
      group.append("text")
        .attr("class", "family-avatar-icon")
        .attr("x", 0)
        .attr("y", 8)
        .text(() => {
          const relation = d.data.attributes?.relation || '';
          return relation === 'رب العائلة' ? '👑' : 
                 relation === 'ابن' ? '👦' : 
                 relation === 'بنت' ? '👧' : '👤';
        });
    }
  });
  
  // النصوص مع الكلاسات المحسنة
  nodes.each(function(d) {
    const nodeGroup = d3.select(this);
    const name = d.data.name || 'غير محدد';
    const textStartX = -cardWidth/2 + 90;
    
    // تقسيم الاسم للأسطر المتعددة
    const words = name.split(' ');
    const maxCharsPerLine = 20;
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // عرض الاسم
    if (lines.length === 1) {
      nodeGroup.append("text")
        .attr("class", "family-name-text")
        .attr("x", textStartX)
        .attr("y", -20)
        .attr("text-anchor", "start")
        .text(lines[0]);
    } else {
      lines.slice(0, 2).forEach((line, index) => {
        nodeGroup.append("text")
          .attr("class", index === 0 ? "family-name-text" : "family-name-text secondary-line")
          .attr("x", textStartX)
          .attr("y", -30 + (index * 18))
          .attr("text-anchor", "start")
          .text(line);
      });
    }
  });
  
  // العلاقة
  nodes.append("text")
    .attr("class", "family-relation-text")
    .attr("x", -cardWidth/2 + 90)
    .attr("y", 5)
    .attr("text-anchor", "start")
    .text(d => {
      const relation = d.data.attributes?.relation || 'عضو';
      return `🔹 ${relation}`;
    });
  
  // معلومات العمر
  nodes.filter(d => d.data.attributes?.birthDate)
    .append("text")
    .attr("class", "family-info-text")
    .attr("x", -cardWidth/2 + 90)
    .attr("y", 25)
    .attr("text-anchor", "start")
    .text(d => {
      const birthDate = new Date(d.data.attributes.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      return `📅 ${age} سنة`;
    });
  
  // شارة الشجرة الموسعة
  nodes.filter(d => showExtendedTree && d.data.attributes?.isExtended)
    .append("circle")
    .attr("class", "family-badge extended")
    .attr("cx", cardWidth/2 - 20)
    .attr("cy", -cardHeight/2 + 20)
    .attr("r", 12);
  
  nodes.filter(d => showExtendedTree && d.data.attributes?.isExtended)
    .append("text")
    .attr("class", "family-badge-text")
    .attr("x", cardWidth/2 - 20)
    .attr("y", -cardHeight/2 + 25)
    .text("🏛️");
  
  // عداد الأطفال
  nodes.filter(d => d.children && d.children.length > 0)
    .append("circle")
    .attr("class", "family-badge children")
    .attr("cx", cardWidth/2 - 25)
    .attr("cy", cardHeight/2 - 25)
    .attr("r", 18);
  
  nodes.filter(d => d.children && d.children.length > 0)
    .append("text")
    .attr("class", "family-badge-text")
    .attr("x", cardWidth/2 - 25)
    .attr("y", cardHeight/2 - 20)
    .text(d => d.children.length);
  
  // تأثيرات التفاعل
  nodes.on("click", (event, d) => {
    handleNodeClick(d.data);
  });
  
  // موضع ابتدائي محسن
  const initialTransform = d3.zoomIdentity.translate(width / 4, 120).scale(0.7);
  svg.call(zoom.transform, initialTransform);
  
}, [showExtendedTree, extendedTreeData, simpleTreeData, handleNodeClick]);

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


  useEffect(() => {
  const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
  
  if (currentTreeData && familyChartRef.current) {
    const timer = setTimeout(() => {
      renderFamilyChart();
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [showExtendedTree, extendedTreeData, simpleTreeData, renderFamilyChart]);

  // ===========================================================================
  // عرض الشجرة
  // ===========================================================================

  const renderTreeView = () => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    const treeTitle = showExtendedTree ? 'الشجرة الموسعة للقبيلة' : 'شجرة عائلتك';
    
    return (
      <Box
        className={`family-tree-advanced-root ${showExtendedTree ? 'extended' : ''}`}
        sx={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {currentTreeData ? (
        <div 
          ref={familyChartRef}
          className="family-tree-chart-container"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
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
            <IconButton size="small" onClick={handleZoomIn} disabled={loading}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Chip 
            label={`${Math.round(zoomLevel * 100)}%`} 
            size="small" 
            onClick={handleResetZoom}
            style={{ cursor: 'pointer', minWidth: 70 }}
            disabled={loading}
          />
          
          <Tooltip title="تصغير">
            <IconButton size="small" onClick={handleZoomOut} disabled={loading}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="إعادة تحميل">
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
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
      className={`family-tree-advanced-root ${showExtendedTree ? 'extended' : ''}`}
      sx={{
        width: '100vw',
        height: '100vh',
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
// src/components/FamilyTreeAdvanced.jsx - النسخة المُحدثة مع D3.js النقي
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, IconButton, Tooltip, Paper, LinearProgress, 
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, 
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
  // الحالات الأساسية - نفسها بالضبط كما كانت
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6);
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);

  // ===========================================================================
  // إعدادات الشجرة القابلة للتخصيص - نفسها بالضبط
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

  // مراقبة الأداء أثناء بناء الشجرة - نفسها بالضبط
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
  
  // حالات البيانات - نفسها بالضبط
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // المراجع الجديدة للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // ===========================================================================
  // دوال مساعدة لمعالجة البيانات - نفسها بالضبط
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
  // دوال D3.js الجديدة لرسم الشجرة
  // ===========================================================================

  const drawTreeWithD3 = useCallback((data) => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    
    // تنظيف المحتوى السابق
    svg.selectAll("*").remove();

    // إعداد الأبعاد
    const width = container.clientWidth;
    const height = container.clientHeight;

    // إعداد SVG
    svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent");

    // مجموعة رئيسية مع إمكانية التكبير والتصغير
    const g = svg.append("g");

    // إعداد الـ zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // إعداد بيانات الشجرة
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree()
      .size([width - 200, height - 200])
      .separation((a, b) => {
        const siblingDistance = showExtendedTree ? 2.2 : 1.8;
        const nonSiblingDistance = showExtendedTree ? 3 : 2.5;
        return a.parent === b.parent ? siblingDistance : nonSiblingDistance;
      });

    treeLayout(root);

    // رسم الروابط
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .style("fill", "none")
      .style("stroke", showExtendedTree ? "#ff9800" : "#2196f3")
      .style("stroke-width", 3)
      .style("stroke-linecap", "round")
      .style("stroke-linejoin", "round")
      .style("opacity", 0.7)
      .style("stroke-dasharray", showExtendedTree ? "5,5" : "none");

    // رسم العقد
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => handleNodeClick(d.data));

    // إضافة محتوى العقد
    nodes.each(function(d) {
      const nodeGroup = d3.select(this);
      const nodeData = d.data;
      
      // الحصول على الألوان
      const getNodeColors = () => {
        const relation = nodeData.relation || '';
        if (relation.includes('رب العائلة')) {
          return { primary: '#2e7d32', bg: '#e8f5e8' };
        }
        if (showExtendedTree) {
          return { primary: '#f57c00', bg: '#fff3e0' };
        }
        return { primary: '#1976d2', bg: '#e3f2fd' };
      };
      
      const colors = getNodeColors();
      
      const getDisplayName = (name) => {
        if (!name || name === 'غير محدد') return 'غير محدد';
        const words = name.trim().split(' ');
        if (words.length <= 2) return name;
        return `${words[0]} ${words[1]}`;
      };

      // البطاقة الرئيسية
      nodeGroup.append("rect")
        .attr("width", 280)
        .attr("height", 160)
        .attr("x", -140)
        .attr("y", -80)
        .attr("rx", 16)
        .style("fill", "white")
        .style("stroke", colors.primary)
        .style("stroke-width", 2)
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.15))");

      // دائرة الصورة
      nodeGroup.append("circle")
        .attr("cx", 0)
        .attr("cy", -25)
        .attr("r", 35)
        .style("fill", "white")
        .style("stroke", colors.primary)
        .style("stroke-width", 3);

      // الصورة الشخصية
      nodeGroup.append("image")
        .attr("href", nodeData.avatar || '/boy.png')
        .attr("x", -30)
        .attr("y", -55)
        .attr("width", 60)
        .attr("height", 60)
        .style("clip-path", "circle(30px)");

      // خلفية النص
      nodeGroup.append("rect")
        .attr("x", -130)
        .attr("y", 25)
        .attr("width", 260)
        .attr("height", 45)
        .attr("rx", 8)
        .style("fill", "rgba(255,255,255,0.9)")
        .style("stroke", "rgba(0,0,0,0.06)")
        .style("stroke-width", 1);

      // اسم الشخص
      nodeGroup.append("text")
        .attr("x", 0)
        .attr("y", 42)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#333")
        .style("font-family", "Cairo, Arial, sans-serif")
        .text(getDisplayName(nodeData.name));

      // خلفية العلاقة
      nodeGroup.append("rect")
        .attr("x", -60)
        .attr("y", 50)
        .attr("width", 120)
        .attr("height", 20)
        .attr("rx", 10)
        .style("fill", colors.primary)
        .style("opacity", 0.1);

      // نص العلاقة
      nodeGroup.append("text")
        .attr("x", 0)
        .attr("y", 62)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", colors.primary)
        .style("font-weight", "500")
        .style("font-family", "Cairo, Arial, sans-serif")
        .text(nodeData.relation || 'عضو');

      // شارة عدد الأطفال
      if (nodeData.children && nodeData.children.length > 0) {
        nodeGroup.append("circle")
          .attr("cx", 110)
          .attr("cy", -60)
          .attr("r", 16)
          .style("fill", "#4caf50")
          .style("stroke", "white")
          .style("stroke-width", 2);

        nodeGroup.append("text")
          .attr("x", 110)
          .attr("y", -55)
          .attr("text-anchor", "middle")
          .style("font-size", "11px")
          .style("fill", "white")
          .style("font-weight", "600")
          .text(nodeData.children.length);
      }
    });

    // إضافة التأثيرات التفاعلية
    nodes
      .on("mouseover", function(event, d) {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .style("transform", "scale(1.05)")
          .style("filter", "drop-shadow(0 8px 16px rgba(0,0,0,0.2))");
      })
      .on("mouseout", function(event, d) {
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .style("transform", "scale(1)")
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.15))");
      });

    // تحديد التكبير الأولي
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, 100)
      .scale(zoomLevel);
    
    svg.call(zoom.transform, initialTransform);

  }, [showExtendedTree, zoomLevel]);

  // ===========================================================================
  // دوال التحكم - نفسها بالضبط
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
  }, [showExtendedTree]);

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
  // تحميل الشجرة العادية - نفسها بالضبط
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
  // تحميل الشجرة الموسعة - نفسها بالضبط
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
  // بناء الشجرة العادية - نفسها بالضبط
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
  // العثور على جذر العائلة - نفسه بالضبط
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
  // جمع جميع العائلات المرتبطة - نفسه بالضبط
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
  // 🔥 بناء الشجرة الموسعة الذكية - نفسه بالضبط
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
  // تأثيرات ودورة الحياة - نفسها بالضبط
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

  // تأثير جديد لرسم الشجرة باستخدام D3
  useEffect(() => {
    const currentTreeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    if (currentTreeData && svgRef.current && containerRef.current) {
      // تأخير بسيط للتأكد من تحديث DOM
      setTimeout(() => {
        drawTreeWithD3(currentTreeData);
      }, 100);
    }
  }, [drawTreeWithD3, showExtendedTree, simpleTreeData, extendedTreeData]);

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
  // عرض الشجرة الجديد مع D3
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
          background: showExtendedTree 
            ? 'linear-gradient(135deg, #f3e5f5 0%, #e1f5fe 100%)'
            : 'linear-gradient(135deg, #e3f2fd 0%, #f1f8e9 100%)'
        }}
      >
        {currentTreeData ? (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ 
              cursor: 'grab', 
              userSelect: 'none',
              background: 'transparent'
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
  // شريط الأدوات - نفسه بالضبط
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
  // العرض الرئيسي - نفسه بالضبط
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

      {/* نافذة تفاصيل الشخص */}
      <Dialog
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">تفاصيل الشخص</Typography>
            <IconButton onClick={() => setSelectedNode(null)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>
                {selectedNode.name || 'غير محدد'}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {selectedNode.relation || 'غير محدد'}
              </Typography>
              {selectedNode.birthDate && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  تاريخ الميلاد: {selectedNode.birthDate}
                </Typography>
              )}
              {selectedNode.location && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  المكان: {selectedNode.location}
                </Typography>
              )}
              {selectedNode.phone && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  الهاتف: {selectedNode.phone}
                </Typography>
              )}
              {selectedNode.notes && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  ملاحظات: {selectedNode.notes}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)}>إغلاق</Button>
          <Button variant="contained" startIcon={<Edit />}>تعديل</Button>
        </DialogActions>
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
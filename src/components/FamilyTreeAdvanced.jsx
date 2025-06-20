// src/components/FamilyTreeAdvanced.jsx - النسخة المصححة مع الشجرة الموسعة الحقيقية
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { createRoot } from 'react-dom/client';
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
import ModernFamilyNodeHTML from './ModernFamilyNodeHTML';
import './FamilyTreeAdvanced.css';
import { useSearchZoom } from '../hooks/useSearchZoom';
import { SearchBar } from './SearchBar';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6);
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);

  // إعدادات الشجرة
  const [treeSettings] = useState({
    maxDepth: 15,
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

  // حالات البيانات
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());

  const {searchQuery: hookSearchQuery, setSearchQuery: setHookSearchQuery, searchResults: hookSearchResults, searchAndZoom: hookSearchAndZoom, resetView, manualZoom, clearHighlights
} = useSearchZoom(svgRef, showExtendedTree ? extendedTreeData : simpleTreeData);

  // إعداد البحث المحلي
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // ===========================================================================
  // دوال مساعدة
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
  // دوال التحكم
  // ===========================================================================

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    if (nodeData.action === 'edit') {
      // console.log('تعديل الشخص:', nodeData.name);
    } else if (nodeData.action === 'view') {
      // console.log('عرض تفاصيل الشخص:', nodeData.name);
    }
    
    setSelectedNode(nodeData);
  }, []);

  const handleRefresh = useCallback(() => {
    // تنظيف البيانات السابقة
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
      showSnackbar('🔄 تحميل الشجرة الموسعة...', 'info');
      // تحميل الشجرة الموسعة فوراً
      if (!extendedTreeData) {
        loadExtendedTree();
      }
    } else {
      showSnackbar('✅ تحويل للشجرة العادية', 'info');
    }
  }, [showSnackbar, extendedTreeData]);

  // ===========================================================================
  // دالة رسم الشجرة
  // ===========================================================================

  const drawTreeWithD3 = useCallback((data) => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    
    // تنظيف المحتوى السابق
    reactRootsRef.current.forEach(root => {
      try {
        root.unmount();
      } catch (e) {
        // تنظيف صامت
      }
    });
    reactRootsRef.current.clear();
    
    svg.selectAll("*").remove();

    // إعداد الأبعاد
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr("width", width).attr("height", height).style("background", "transparent");

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
    // زيادة المسافة الأفقية فقط، وتقليل المسافة الرأسية
    const treeLayout = d3.tree()
      .size([width - 100, height - 220]) // تقليل الارتفاع
      .separation((a, b) => {
        // مسافة أفقية أكبر، رأسية أقل
        return a.parent === b.parent ? 4.5 : 5.2;
      }); 

    treeLayout(root);

    // رسم الروابط
    g.selectAll(".link")
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
      .style("opacity", 0.85)
      .style("filter", "none")
      .style("stroke-dasharray", "none")
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .style("opacity", 1);

    // رسم العقد
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 100)
      .style("opacity", 1);

    // إضافة محتوى العقد
    nodes.each(function(d) {
      const nodeGroup = d3.select(this);
      const nodeData = d.data.attributes || d.data;
      const uniqueId = nodeData.id || nodeData.globalId || Math.random().toString(36).substring(7);
      // إضافة خاصية highlightMatch بناءً على البحث
      let highlightMatch = false;
      if (searchQuery && searchQuery.length > 1) {
        const q = searchQuery.trim();
        if (
          (nodeData.name && nodeData.name.includes(q)) ||
          (nodeData.firstName && nodeData.firstName.includes(q))
        ) {
          highlightMatch = true;
        }
      }
      try {
        const foreignObject = nodeGroup.append("foreignObject")
          .attr("width", 350)
          .attr("height", 200)
          .attr("x", -175)
          .attr("y", -100)
          .style("overflow", "visible");

        const htmlContainer = foreignObject.append("xhtml:div")
          .style("width", "100%")
          .style("height", "100%")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("font-family", "Cairo, sans-serif");

        const reactContainer = htmlContainer.append("xhtml:div")
          .attr("id", `react-node-${uniqueId}`)
          .style("width", "320px")
          .style("height", "180px")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center");

        const reactElement = reactContainer.node();
        if (reactElement) {
          const root = createRoot(reactElement);
          reactRootsRef.current.set(uniqueId, root);
          root.render(
            <ModernFamilyNodeHTML 
              nodeDatum={{
                ...nodeData,
                name: nodeData.name || buildFullName(nodeData),
                isExtended: showExtendedTree && nodeData.isExtended,
                highlightMatch // تمرير خاصية التمييز
              }}
              onNodeClick={handleNodeClick}
              isParent={
                nodeData.relation?.includes('رب العائلة') || 
                nodeData.relation === 'parent' ||
                nodeData.relation === 'الأب' ||
                nodeData.relation === 'الأم'
              }
              isChild={
                nodeData.relation === 'ابن' || 
                nodeData.relation === 'بنت' || 
                nodeData.relation === 'child' ||
                nodeData.relation === 'الابن' ||
                nodeData.relation === 'الابنة'
              }
              isSpouse={
                nodeData.relation === 'زوج' || 
                nodeData.relation === 'زوجة' || 
                nodeData.relation === 'spouse' ||
                nodeData.relation === 'الزوج' ||
                nodeData.relation === 'الزوجة'
              }
            />
          );
        }
      } catch (error) {
        // خطأ صامت في إنشاء العقدة
      }
    });

    // حساب تموضع الشجرة بدقة ليكون مركزها في منتصف الحاوية
    let minX = Infinity, maxX = -Infinity;
    root.descendants().forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
    });
    const treeWidth = maxX - minX;
    // توسيط أدق مع مراعاة التكبير
    const centerX = (width / 2 - ((minX + maxX) / 2) * zoomLevel);
    // زيادة المسافة من الأعلى (مثلاً 180 بدلاً من 60)
    const centerY = 180; // يمكنك تعديل الرقم حسب الحاجة
    const initialTransform = d3.zoomIdentity
      .translate(centerX, centerY)
      .scale(zoomLevel);
    svg.transition()
      .duration(750)
      .call(zoom.transform, initialTransform);

  }, [showExtendedTree, zoomLevel, handleNodeClick, buildFullName, searchQuery]);

  // مراقبة الأداء
  const monitorPerformance = useCallback((metrics) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics
    }));
    
    if (metrics.personCount > 50) {
      showSnackbar(`✅ تم تحميل ${metrics.personCount} شخص بنجاح`, 'success');
    }
    
    if (metrics.familyCount > 1) {
      showSnackbar(`🏛️ تم ربط ${metrics.familyCount} عائلة`, 'info');
    }
  }, [showSnackbar]);

  // ===========================================================================
  // تحميل الشجرة العادية
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) {
      return;
    }
    
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
      
      showSnackbar(`✅ تم تحميل عائلتك: ${familyMembers.length} أفراد`, 'success');

    } catch (error) {
      setError(error.message);
      showSnackbar('❌ فشل في تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance]);

  const buildSimpleTreeStructure = (familyMembers) => {
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
  };

  // ===========================================================================
  // 🔥 تحميل الشجرة الموسعة الحقيقية
  // ===========================================================================

  const loadExtendedTree = useCallback(async () => {
    if (!uid) return;

    const startTime = Date.now();
    setLoading(true);
    setError(null);
    setLoadingStage('البحث عن العائلات المرتبطة...');
    setLoadingProgress(0);

    try {
      // الخطوة 1: تحميل عائلتك
      setLoadingProgress(10);
      const myFamilyData = await loadFamilyData(uid);
      
      // الخطوة 2: البحث عن العائلات المرتبطة
      setLoadingProgress(30);
      setLoadingStage('البحث عن الروابط...');
      const allLinkedFamilies = await findAllLinkedFamilies(uid);
      
      // الخطوة 3: تحميل بيانات جميع العائلات
      setLoadingProgress(50);
      setLoadingStage('تحميل بيانات العائلات...');
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
          } catch (error) {
            // تعذر تحميل العائلة - متابعة صامتة
          }
        }
      }
      
      setLoadingProgress(70);
      setLoadingStage('بناء الشجرة الموسعة...');
      
      // الخطوة 4: بناء الشجرة الموسعة
      const extendedTree = buildExtendedTreeStructure(allFamiliesData, uid);
      
      setLoadingProgress(90);
      setLoadingStage('تحسين الشجرة...');
      
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
      setLoadingStage('اكتمل التحميل الموسع');
      
      setExtendedTreeData(extendedTree);
      
      showSnackbar(`🏛️ تم تحميل ${allFamiliesData.length} عائلة بـ ${totalPersons} شخص`, 'success');

    } catch (error) {
      setError(error.message);
      showSnackbar('❌ فشل في تحميل الشجرة الموسعة', 'error');
    } finally {
      setLoading(false);
    }
  }, [uid, showSnackbar, monitorPerformance]);

  // دالة تحميل بيانات عائلة واحدة
  const loadFamilyData = async (familyUid) => {
    try {
      const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = sanitizeMemberData({ 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid: familyUid,
          isExtended: familyUid !== uid // تمييز العائلات الخارجية
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
          isExtended: familyUid !== uid
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // دالة البحث عن جميع العائلات المرتبطة
  const findAllLinkedFamilies = async (startUid) => {
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
      
    } catch (error) {
      return [startUid]; // إرجاع العائلة الحالية فقط في حالة الخطأ
    }
  };

  // دالة بناء الشجرة الموسعة
  const buildExtendedTreeStructure = (allFamiliesData, rootFamilyUid) => {
    if (!allFamiliesData || allFamiliesData.length === 0) {
      return null;
    }

    // العثور على العائلة الجذر
    const rootFamily = allFamiliesData.find(f => f.uid === rootFamilyUid) || allFamiliesData[0];
    if (!rootFamily || !rootFamily.head) {
      return null;
    }

    // بناء العقدة الجذر
    const rootNode = {
      name: buildFullName(rootFamily.head),
      id: rootFamily.head.globalId,
      avatar: rootFamily.head.avatar || null,
      attributes: {
        ...rootFamily.head,
        isCurrentUser: true,
        treeType: 'extended',
        isExtended: false,
        familyName: 'عائلتك'
      },
      children: []
    };

    // إضافة أطفال العائلة الجذر
    const rootChildren = rootFamily.members.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && 
      m.globalId !== rootFamily.head.globalId
    );

    rootChildren.forEach(child => {
      const childNode = {
        name: buildFullName(child),
        id: child.globalId,
        avatar: child.avatar || null,
        attributes: {
          ...child,
          treeType: 'extended',
          isExtended: false,
          familyName: 'عائلتك'
        },
        children: []
      };

      // البحث عن أطفال هذا الشخص في العائلات الأخرى
      const childFamily = allFamiliesData.find(f => 
        f.uid !== rootFamilyUid && 
        f.head && 
        buildFullName(f.head) === buildFullName(child)
      );

      if (childFamily) {
        const grandChildren = childFamily.members.filter(m => 
          (m.relation === 'ابن' || m.relation === 'بنت') &&
          m.globalId !== childFamily.head.globalId
        );

        grandChildren.forEach(grandChild => {
          childNode.children.push({
            name: buildFullName(grandChild),
            id: grandChild.globalId,
            avatar: grandChild.avatar || null,
            attributes: {
              ...grandChild,
              treeType: 'extended',
              isExtended: true,
              familyName: `عائلة ${buildFullName(child)}`
            },
            children: []
          });
        });
      }

      rootNode.children.push(childNode);
    });

    // إضافة العائلات المرتبطة كأشقاء
    const otherFamilies = allFamiliesData.filter(f => 
      f.uid !== rootFamilyUid && 
      f.head &&
      !rootChildren.some(child => buildFullName(child) === buildFullName(f.head))
    );

    otherFamilies.forEach(family => {
      const familyNode = {
        name: buildFullName(family.head),
        id: family.head.globalId,
        avatar: family.head.avatar || null,
        attributes: {
          ...family.head,
          treeType: 'extended',
          isExtended: true,
          familyName: `عائلة ${buildFullName(family.head)}`
        },
        children: []
      };

      // إضافة أطفال هذه العائلة
      const familyChildren = family.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== family.head.globalId
      );

      familyChildren.forEach(child => {
        familyNode.children.push({
          name: buildFullName(child),
          id: child.globalId,
          avatar: child.avatar || null,
          attributes: {
            ...child,
            treeType: 'extended',
            isExtended: true,
            familyName: `عائلة ${buildFullName(family.head)}`
          },
          children: []
        });
      });

      rootNode.children.push(familyNode);
    });

    return rootNode;
  };

  // دالة حساب عمق الشجرة
  const calculateTreeDepth = (node, currentDepth = 0) => {
    if (!node || !node.children || node.children.length === 0) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    node.children.forEach(child => {
      const childDepth = calculateTreeDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    });
    
    return maxDepth;
  };

  const loadLinkedFamilies = useCallback(async () => {
    if (!uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const linked = userData.linkedFamilies || [];
        setLinkedFamilies(linked);
      }
    } catch (error) {
      // خطأ صامت في تحميل العائلات المرتبطة
    }
  }, [uid]);

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
    return () => {
      reactRootsRef.current.forEach(root => {
        try {
          root.unmount();
        } catch (e) {
          // تنظيف صامت
        }
      });
      reactRootsRef.current.clear();
    };
  }, []);

  // دالة البحث المحلية
  const performSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return [];
    }

    const treeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    if (!treeData) return [];

    const results = [];
    const normalizedQuery = query.toLowerCase().trim();
    
    function searchInNode(node, depth = 0) {
      if (!node) return;
      
      const name = node.name || node.attributes?.name || '';
      const firstName = node.attributes?.firstName || '';
      const relation = node.attributes?.relation || node.relation || '';
      
      if (name.toLowerCase().includes(normalizedQuery) || 
          firstName.toLowerCase().includes(normalizedQuery)) {
        results.push({
          node: node,
          type: 'name',
          score: 3,
          depth: depth
        });
      } else if (relation.toLowerCase().includes(normalizedQuery)) {
        results.push({
          node: node,
          type: 'relation', 
          score: 2,
          depth: depth
        });
      }
      
      if (node.children) {
        node.children.forEach(child => searchInNode(child, depth + 1));
      }
    }
    
    searchInNode(treeData);
    
    // ترتيب النتائج
    results.sort((a, b) => b.score - a.score || a.depth - b.depth);
    
    setSearchResults(results);
    return results;
  }, [showExtendedTree, extendedTreeData, simpleTreeData]);
  // دالة البحث والزووم المحسنة للعمل مع D3
  const handleSearchAndZoom = useCallback((query) => {
    if (!query || (!simpleTreeData && !extendedTreeData)) return;
    
    const treeData = showExtendedTree ? extendedTreeData : simpleTreeData;
    let foundNode = null;
    
    function traverse(node) {
      if (!node) return;
      const name = node.name || node.attributes?.name || '';
      const firstName = node.attributes?.firstName || '';
      
      if (name.toLowerCase().includes(query.toLowerCase()) ||
          firstName.toLowerCase().includes(query.toLowerCase())) {
        foundNode = node;
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
          if (foundNode) return;
        }
      }
    }
    
    traverse(treeData);
    
    if (foundNode && svgRef.current && containerRef.current) {
      // البحث عن العقدة في D3 hierarchy
      const svg = d3.select(svgRef.current);
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      const root = d3.hierarchy(treeData);
      let d3Node = null;
      
      root.each(d => {
        const dName = d.data.name || d.data.attributes?.name || '';
        const foundName = foundNode.name || foundNode.attributes?.name || '';
        
        if (dName === foundName || d.data.id === foundNode.id) {
          d3Node = d;
        }
      });
      
      if (d3Node) {
        // التحقق من صحة البيانات قبل الزووم
        if (!d3Node || isNaN(d3Node.x) || isNaN(d3Node.y)) {
          return;
        }
        
        // إنشاء zoom behavior جديد
        const zoom = d3.zoom().scaleExtent([0.1, 3]);
        const g = svg.select('g');
        
        // حساب الموقع المطلوب
        const scale = 1.5;
        const centerX = width / 2 - d3Node.x * scale;
        const centerY = height / 2 - d3Node.y * scale;
        
        // تطبيق الزووم مع أنيميشن سلس
        svg.transition()
          .duration(1200)
          .ease(d3.easeCubicInOut)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(centerX, centerY).scale(scale)
          );
        
        // إضافة التمييز
        d3.selectAll('.node').classed('search-highlight', false);
        g.selectAll('.node').filter(d => d === d3Node).classed('search-highlight', true);
        
        // تمييز الكارد أيضاً
        setTimeout(() => {
          g.selectAll('.node').filter(d => d === d3Node)
            .select('foreignObject > div > div')
            .classed('search-highlight', true);
        }, 200);
      }
    }
  }, [showExtendedTree, simpleTreeData, extendedTreeData]);

  // تنفيذ البحث عند تغيير searchQuery
  useEffect(() => {
    if (searchQuery.length > 1) {
      performSearch(searchQuery);
      handleSearchAndZoom(searchQuery);
    } else {
      setSearchResults([]);
      // مسح التمييز
      if (svgRef.current) {
        d3.selectAll('.node').classed('search-highlight', false);
        d3.selectAll('.node foreignObject > div > div').classed('search-highlight', false);
      }
    }
  }, [searchQuery, performSearch, handleSearchAndZoom]);

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
          background: '#fff', // خلفية بيضاء دائماً
          fontFamily: 'Cairo, sans-serif'
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
                <CircularProgress size={80} sx={{ color: showExtendedTree ? '#8b5cf6' : '#6366f1', mb: 3 }} />
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
                      backgroundColor: showExtendedTree ? '#8b5cf6' : '#6366f1'
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo, sans-serif' }}>
                  {Math.round(loadingProgress)}% مكتمل
                </Typography>
              </Box>
            ) : error ? (
              <Box textAlign="center">
                <Warning sx={{ fontSize: 100, color: '#ef4444', mb: 2 }} />
                <Typography variant="h4" sx={{ color: '#ef4444', mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                  حدث خطأ
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, fontFamily: 'Cairo, sans-serif' }}>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ 
                    backgroundColor: showExtendedTree ? '#8b5cf6' : '#6366f1',
                    '&:hover': { backgroundColor: showExtendedTree ? '#7c3aed' : '#4f46e5' },
                    fontFamily: 'Cairo, sans-serif'
                  }}
                  onClick={handleRefresh}
                  startIcon={<Refresh />}
                  size="large"
                >
                  إعادة تحميل
                </Button>
              </Box>
            ) : (
              <Box textAlign="center">
                <AccountTree sx={{ fontSize: 120, color: showExtendedTree ? '#8b5cf6' : '#6366f1', mb: 2 }} />
                <Typography variant="h4" sx={{ mb: 1, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree ? '🏛️ ابنِ شجرتك الموسعة' : '🌳 ابنِ شجرة عائلتك'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, maxWidth: 500, fontFamily: 'Cairo, sans-serif' }}>
                  {showExtendedTree 
                    ? 'اربط عائلتك مع العائلات الأخرى لبناء شجرة موسعة شاملة'
                    : 'أضف أفراد عائلتك لبناء شجرة عائلية جميلة'
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
                    startIcon={<Person />}
                  >
                    إضافة أفراد العائلة
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ 
                      borderColor: showExtendedTree ? '#8b5cf6' : '#6366f1',
                      color: showExtendedTree ? '#8b5cf6' : '#6366f1',
                      '&:hover': { 
                        borderColor: showExtendedTree ? '#7c3aed' : '#4f46e5',
                        backgroundColor: showExtendedTree ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)'
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
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="h5" 
          textAlign="center" 
          sx={{ 
            mb: 2, 
            color: showExtendedTree ? '#8b5cf6' : '#6366f1',
            fontWeight: 'bold',
            fontFamily: 'Cairo, sans-serif'
          }}
        >
          {showExtendedTree ? '🏛️ الشجرة الموسعة للقبيلة' : '🌳 شجرة عائلتك'}
        </Typography>
        
        {loading && (
          <LinearProgress 
            variant="determinate" 
            value={loadingProgress} 
            sx={{ 
              mb: 2,
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: showExtendedTree ? '#8b5cf6' : '#6366f1'
              }
            }}
          />
        )}
        
        <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/family')} disabled={loading} startIcon={<Edit />}>
            إدارة
          </Button>
          <Button variant="contained" size="small" onClick={() => navigate('/family')} disabled={loading} startIcon={<PersonAdd />}>
            إضافة
          </Button>
          <Button variant="outlined" size="small" onClick={() => setShowLinkingPanel(true)} disabled={loading} startIcon={<LinkIcon />}>
            ربط
          </Button>
          <IconButton size="small" onClick={handleZoomIn} disabled={loading}><ZoomIn /></IconButton>
          <Chip label={`${Math.round(zoomLevel * 100)}%`} size="small" onClick={handleResetZoom} sx={{ minWidth: 60 }} />
          <IconButton size="small" onClick={handleZoomOut} disabled={loading}><ZoomOut /></IconButton>
          <IconButton size="small" onClick={handleRefresh} disabled={loading}><Refresh /></IconButton>
          <IconButton size="small" onClick={resetView} disabled={loading} title="إعادة تعيين الرؤية">
            <Refresh />
          </IconButton>
          <IconButton size="small" onClick={() => {
            setSearchQuery('');
            if (svgRef.current) {
              d3.selectAll('.node').classed('search-highlight', false);
              d3.selectAll('.node foreignObject > div > div').classed('search-highlight', false);
            }
          }} disabled={loading} title="مسح التمييز">
            <Close />
          </IconButton>
          {/* شريط البحث المحسن */}
          <SearchBar
            onSearch={(query) => {
              setSearchQuery(query);
              performSearch(query);
            }}
            onSelectResult={(node) => {
              const nodeName = node.data?.name || node.name || '';
              setSearchQuery(nodeName);
              handleSearchAndZoom(nodeName);
            }}
            searchResults={searchResults}
            placeholder="البحث في شجرة العائلة..."
            sx={{ minWidth: 300, mx: 1 }}
          />
        </Box>

        <Box display="flex" justifyContent="center" sx={{ mb: 1 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={showExtendedTree} 
                onChange={handleTreeTypeToggle} 
                disabled={loading} 
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#8b5cf6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#8b5cf6',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontFamily: 'Cairo, sans-serif' }}>
                {showExtendedTree ? '🏛️ موسعة' : '🌳 عادية'}
              </Typography>
            }
          />
        </Box>

        {performanceMetrics.personCount > 0 && (
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            <Chip size="small" label={`👥 ${performanceMetrics.personCount}`} variant="outlined" />
            {performanceMetrics.familyCount > 1 && (
              <Chip size="small" label={`🏠 ${performanceMetrics.familyCount} عائلة`} variant="outlined" color="primary" />
            )}
            {linkedFamilies.length > 0 && (
              <Chip size="small" label={`🔗 ${linkedFamilies.length}`} variant="outlined" color="success" />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box className="family-tree-advanced-root" sx={{ width: '100vw', height: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      {renderToolbar()}
      <Box sx={{ position: 'absolute', top: 140, left: 0, right: 0, bottom: 0 }}>
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
              // إعادة تحميل الشجرة الموسعة
              setExtendedTreeData(null);
              if (showExtendedTree) {
                loadExtendedTree();
              }
              // إعادة تحميل قائمة الروابط
              loadLinkedFamilies();
            }}
            existingLinks={linkedFamilies.map(link => link.targetFamilyUid)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedNode} onClose={() => setSelectedNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle>👤 {selectedNode?.name || 'تفاصيل الشخص'}</DialogTitle>
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
              {selectedNode.phone && <Typography variant="body2" sx={{ mb: 1 }}>الهاتف: {selectedNode.phone}</Typography>}
              {selectedNode.location && <Typography variant="body2">المكان: {selectedNode.location}</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNode(null)}>إغلاق</Button>
          <Button variant="contained" startIcon={<Edit />}>تعديل</Button>
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
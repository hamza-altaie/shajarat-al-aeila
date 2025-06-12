// src/components/FamilyTreeAdvanced.jsx - إصلاح منطق الشجرة
import React, { useState, useEffect, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, 
  Chip, LinearProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, Paper, IconButton, Tooltip, FormControlLabel, Switch
} from '@mui/material';
import {
  AccountTree, Groups, Edit, Person, Visibility, Close, 
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
  // 🎯 الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false); // ❌ البداية بالشجرة العادية
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6);
  
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // 🔄 حالات البيانات - منفصلة تماماً
  const [simpleTreeData, setSimpleTreeData] = useState(null); // 🌳 الشجرة العادية
  const [extendedTreeData, setExtendedTreeData] = useState(null); // 🏛️ الشجرة الموسعة
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();

  // ===========================================================================
  // 🌳 دالة تحميل الشجرة العادية (الحساب الحالي فقط)
  // ===========================================================================

  const loadSimpleTree = useCallback(async () => {
    if (!uid) return;

    console.log('🌳 تحميل الشجرة العادية (الحساب الحالي فقط)...');
    
    setLoading(true);
    setError(null);
    setLoadingStage('تحميل عائلتك...');
    setLoadingProgress(0);

    try {
      // جلب أعضاء العائلة من الحساب الحالي فقط
      const familySnapshot = await getDocs(collection(db, 'users', uid, 'family'));
      const familyMembers = [];
      
      setLoadingProgress(30);
      
      familySnapshot.forEach(doc => {
        const memberData = { 
          ...doc.data(), 
          id: doc.id,
          globalId: `${uid}_${doc.id}`,
          familyUid: uid
        };
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          familyMembers.push(memberData);
        }
      });

      setLoadingProgress(60);
      setLoadingStage('بناء الشجرة...');

      // بناء الشجرة العادية
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
  // 🏛️ دالة تحميل الشجرة الموسعة (جميع العائلات المرتبطة)
  // ===========================================================================

  const loadExtendedTree = useCallback(async () => {
    if (!uid) return;

    console.log('🏛️ تحميل الشجرة الموسعة (جميع العائلات المرتبطة)...');
    
    setLoading(true);
    setError(null);
    setLoadingStage('البحث عن الجذر الأساسي...');
    setLoadingProgress(0);

    try {
      // 1. العثور على الجذر الأساسي للقبيلة
      const rootUid = await findTribalRoot(uid);
      setLoadingProgress(20);
      
      // 2. جمع جميع العائلات المرتبطة
      setLoadingStage('جمع العائلات المرتبطة...');
      const allFamilies = await collectAllLinkedFamilies(rootUid);
      setLoadingProgress(60);
      
      // 3. بناء الشجرة الموسعة بدون تكرار
      setLoadingStage('بناء الشجرة الموسعة...');
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
  // 🛠️ دوال البناء والمعالجة
  // ===========================================================================

  // بناء الشجرة العادية (الحساب الحالي فقط)
  const buildSimpleTreeStructure = (familyMembers) => {
    // العثور على رب العائلة
    const head = familyMembers.find(m => m.relation === 'رب العائلة') || familyMembers[0];
    
    if (!head) {
      return null;
    }

    // بناء العقدة الجذر
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

    // إضافة الأطفال فقط (بدون تكرار)
    const children = familyMembers.filter(m => 
      (m.relation === 'ابن' || m.relation === 'بنت') && m.id !== head.id
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

    return rootNode;
  };

  // العثور على جذر القبيلة
  const findTribalRoot = async (startUid) => {
    let currentUid = startUid;
    let maxDepth = 10;
    const visited = new Set();

    console.log(`🔍 البحث عن جذر القبيلة بدءاً من: ${startUid}`);

    while (maxDepth > 0 && !visited.has(currentUid)) {
      visited.add(currentUid);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (!userDoc.exists()) break;
        
        const userData = userDoc.data();
        const linkedToHead = userData.linkedToFamilyHead;
        
        if (!linkedToHead || linkedToHead === currentUid) {
          console.log(`🏛️ تم العثور على جذر القبيلة: ${currentUid}`);
          return currentUid; // هذا هو الجذر
        }
        
        console.log(`⬆️ الانتقال من ${currentUid} إلى ${linkedToHead}`);
        currentUid = linkedToHead;
        maxDepth--;
      } catch (error) {
        console.error(`خطأ في فحص ${currentUid}:`, error);
        break;
      }
    }
    
    console.log(`🏛️ اعتماد ${startUid} كجذر افتراضي`);
    return startUid; // fallback
  };

  // جمع جميع العائلات المرتبطة
  const collectAllLinkedFamilies = async (rootUid) => {
    const allFamilies = new Map();
    const toProcess = [{ uid: rootUid, level: 0, parentUid: null }];
    const processed = new Set();

    while (toProcess.length > 0) {
      const { uid, level, parentUid } = toProcess.shift();
      
      if (processed.has(uid)) continue;
      processed.add(uid);

      try {
        // جلب بيانات العائلة
        const familyData = await loadFamilyData(uid, level, parentUid);
        if (familyData) {
          allFamilies.set(uid, familyData);
          
          // البحث عن العائلات المرتبطة
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

  // تحميل بيانات عائلة واحدة
  const loadFamilyData = async (familyUid, level, parentUid) => {
    try {
      const familySnapshot = await getDocs(collection(db, 'users', familyUid, 'family'));
      const members = [];
      
      familySnapshot.forEach(doc => {
        const memberData = { 
          ...doc.data(), 
          id: doc.id,
          globalId: `${familyUid}_${doc.id}`,
          familyUid,
          level,
          parentFamilyUid: parentUid
        };
        
        if (memberData.firstName && memberData.firstName.trim() !== '') {
          members.push(memberData);
        }
      });

      if (members.length > 0) {
        const head = members.find(m => m.relation === 'رب العائلة') || members[0];
        
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

  // البحث عن العائلات المرتبطة كأطفال
  const findLinkedChildren = async (parentUid) => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const children = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        if (userId === parentUid) continue;
        
        // فحص الربط المباشر
        if (userData.linkedToFamilyHead === parentUid) {
          children.push(userId);
        }
        
        // فحص الروابط في linkedFamilies
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

  // بناء الشجرة الموسعة بدون تكرار
  const buildExtendedTreeStructure = async (families, rootUid) => {
    console.log(`🏗️ بناء الشجرة الموسعة من الجذر: ${rootUid}`);
    
    // العثور على العائلة الجذر
    const rootFamily = families.find(f => f.uid === rootUid);
    if (!rootFamily || !rootFamily.head) {
      throw new Error('لم يتم العثور على العائلة الجذر');
    }

    const processed = new Set();

    const buildFamilyNode = (family, depth = 0) => {
      const familyKey = `${family.uid}_${depth}`;
      
      if (processed.has(familyKey) || depth > 6) {
        return null;
      }
      
      processed.add(familyKey);
      
      console.log(`🔗 بناء عقدة العائلة: ${family.head.name} (مستوى ${family.level || 0})`);
      
      // رب العائلة كعقدة رئيسية
      const headNode = {
        name: buildFullName(family.head),
        id: family.head.globalId,
        avatar: family.head.avatar || '/boy.png',
        attributes: {
          ...family.head,
          isExtended: family.uid !== uid,
          treeType: 'extended',
          familyLevel: family.level || 0,
          familyUid: family.uid
        },
        children: []
      };

      // ✅ إضافة أطفال رب العائلة (من نفس العائلة فقط)
      const directChildren = family.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== family.head.globalId
      );

      directChildren.forEach(child => {
        headNode.children.push({
          name: buildFullName(child),
          id: child.globalId,
          avatar: child.avatar || '/boy.png',
          attributes: {
            ...child,
            isExtended: family.uid !== uid,
            treeType: 'extended'
          },
          children: []
        });
      });

      // ✅ إضافة العائلات المرتبطة كأطفال (مستوى أعلى)
      const childFamilies = families.filter(f => f.parentFamilyUid === family.uid);
      
      childFamilies.forEach(childFamily => {
        const childFamilyNode = buildFamilyNode(childFamily, depth + 1);
        if (childFamilyNode) {
          headNode.children.push(childFamilyNode);
        }
      });

      return headNode;
    };

    const result = buildFamilyNode(rootFamily);
    console.log(`✅ تم بناء الشجرة الموسعة بنجاح`);
    
    return result;
  };

  // بناء الاسم الكامل
  const buildFullName = (person) => {
    const parts = [
      person.firstName,
      person.fatherName,
      person.grandfatherName,
      person.surname
    ].filter(Boolean);
    
    return parts.join(' ').trim() || 'غير محدد';
  };

  // ===========================================================================
  // 🔄 تأثيرات ودورة الحياة
  // ===========================================================================

  useEffect(() => {
    if (!uid) {
      navigate('/login');
      return;
    }

    // تحميل الشجرة العادية في البداية
    loadSimpleTree();
    loadLinkedFamilies();
  }, [uid, navigate, loadSimpleTree]);

  // عند تغيير نوع الشجرة
  useEffect(() => {
    if (!uid) return;
    
    if (showExtendedTree) {
      // تحميل الشجرة الموسعة
      if (!extendedTreeData) {
        loadExtendedTree();
      }
    }
  }, [showExtendedTree, uid, extendedTreeData, loadExtendedTree]);

  // تحميل العائلات المرتبطة
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
  // 🎮 دوال التفاعل
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

  // 🔥 تبديل نوع الشجرة (الميزة الرئيسية)
  const handleTreeTypeToggle = useCallback((event) => {
    const newValue = event.target.checked;
    setShowExtendedTree(newValue);
    
    if (newValue) {
      showSnackbar('🏛️ تحويل للشجرة الموسعة للقبيلة...', 'info');
    } else {
      showSnackbar('🌳 تحويل للشجرة العادية', 'info');
    }
  }, []);

  // ===========================================================================
  // 🎨 عرض العقدة المحسن
  // ===========================================================================

  const renderNodeElement = useCallback(({ nodeDatum }) => {
    const person = nodeDatum.attributes;
    const isExtended = person?.isExtended || false;
    const treeType = person?.treeType || 'simple';
    
    // تحديد الألوان حسب نوع الشجرة
    const getNodeColor = () => {
      if (treeType === 'simple') return '#2196f3'; // أزرق للشجرة العادية
      if (isExtended) return '#ff9800'; // برتقالي للعائلات المرتبطة
      return '#4caf50'; // أخضر للحساب الحالي في الشجرة الموسعة
    };
    
    return (
      <g>
        <defs>
          <linearGradient id={`grad-${nodeDatum.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={isExtended ? '#fff3e0' : '#f8f9fa'} />
          </linearGradient>
        </defs>
        
        {/* الإطار الرئيسي */}
        <rect
          width="260"
          height="160"
          x="-130"
          y="-80"
          rx="15"
          fill={`url(#grad-${nodeDatum.id})`}
          stroke={getNodeColor()}
          strokeWidth={isExtended ? 3 : 2}
          style={{ 
            cursor: 'pointer', 
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* شارة نوع الشجرة */}
        {isExtended && (
          <circle
            cx="-110"
            cy="-60"
            r="12"
            fill={getNodeColor()}
            stroke="white"
            strokeWidth="2"
          />
        )}
        
        {/* الصورة الشخصية */}
        <circle
          cx="0"
          cy="-25"
          r="30"
          fill="white"
          stroke={getNodeColor()}
          strokeWidth="3"
        />
        
        <image
          href={nodeDatum.avatar || '/boy.png'}
          x="-25"
          y="-50"
          width="50"
          height="50"
          clipPath="circle(25px at 25px 25px)"
          style={{ cursor: 'pointer' }}
          onClick={() => handleNodeClick(nodeDatum)}
        />
        
        {/* اسم الشخص */}
        <text
          x="0"
          y="15"
          textAnchor="middle"
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            fill: getNodeColor(),
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif'
          }}
          onClick={() => handleNodeClick(nodeDatum)}
        >
          {nodeDatum.name && nodeDatum.name.length > 20 
            ? nodeDatum.name.substring(0, 20) + '...' 
            : nodeDatum.name || 'غير محدد'}
        </text>
        
        {/* العلاقة */}
        <text
          x="0"
          y="35"
          textAnchor="middle"
          style={{
            fontSize: '12px',
            fill: '#666',
            fontFamily: 'Cairo, sans-serif'
          }}
        >
          {person?.relation || 'عضو'}
        </text>
        
        {/* معلومات إضافية */}
        {isExtended && (
          <text
            x="0"
            y="55"
            textAnchor="middle"
            style={{
              fontSize: '10px',
              fill: getNodeColor(),
              fontWeight: 'bold'
            }}
          >
            🏠 عائلة مرتبطة
          </text>
        )}
        
        {/* عدد الأطفال */}
        {nodeDatum.children && nodeDatum.children.length > 0 && (
          <>
            <circle
              cx="100"
              cy="-50"
              r="15"
              fill="#4caf50"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x="100"
              y="-45"
              textAnchor="middle"
              style={{
                fontSize: '11px',
                fill: 'white',
                fontWeight: 'bold'
              }}
            >
              {nodeDatum.children.length}
            </text>
          </>
        )}
      </g>
    );
  }, [handleNodeClick]);

  // ===========================================================================
  // 🖼️ عرض الشجرة
  // ===========================================================================

  const renderTreeView = () => {
    // ✅ تحديد أي شجرة نعرض بدقة
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
            nodeSize={{ x: 280, y: 200 }}
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
  // 🛠️ شريط الأدوات المحسن
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

        {/* 🔥 المفتاح الأساسي: تبديل نوع الشجرة */}
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

        {/* إحصائيات سريعة */}
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
  // 🖥️ العرض الرئيسي
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
          top: 180,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto'
        }}
      >
        {renderTreeView()}
      </Box>

      {/* 🔗 النوافذ المنبثقة */}
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
              setExtendedTreeData(null); // إعادة تحميل الشجرة الموسعة
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
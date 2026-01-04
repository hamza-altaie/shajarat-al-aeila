// src/components/UnifiedTribeTree.jsx
// شجرة القبيلة الموحدة الاحترافية

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import {
  Box, Typography, CircularProgress, Alert, Paper, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, InputAdornment, Tooltip, Badge, Fab, Zoom, Snackbar
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Close as CloseIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useTribe } from '../contexts/TribeContext';
import { buildUnifiedTree } from '../services/tribeService';
import './UnifiedTribeTree.css';

// =============================================
// 🎨 ثوابت التصميم
// =============================================
const TREE_CONFIG = {
  nodeWidth: 180,
  nodeHeight: 80,
  levelHeight: 140,
  siblingGap: 30,
  colors: {
    male: {
      bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      border: '#1976d2',
      text: '#0d47a1'
    },
    female: {
      bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
      border: '#c2185b',
      text: '#880e4f'
    },
    unknown: {
      bg: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
      border: '#757575',
      text: '#424242'
    },
    root: {
      bg: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
      border: '#f57c00',
      text: '#e65100'
    },
    deceased: {
      bg: 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)',
      border: '#607d8b',
      text: '#455a64'
    }
  }
};

// =============================================
// 🌳 المكون الرئيسي
// =============================================
export default function UnifiedTribeTree() {
  const { tribe, loading: tribeLoading } = useTribe();
  
  // الحالات الأساسية
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // حالات العرض
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // حالات التحكم
  const [zoom, setZoom] = useState(1);
  
  // الإشعارات
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // المراجع
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const allNodesRef = useRef([]);

  // =============================================
  // 📊 تحميل الشجرة
  // =============================================
  const loadTree = useCallback(async () => {
    if (!tribe?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await buildUnifiedTree(tribe.id);
      
      if (!result || !result.roots || result.roots.length === 0) {
        setTreeData(null);
        setStats({ totalPersons: 0, rootsCount: 0, maxGeneration: 0 });
        return;
      }
      
      // تحويل إلى تنسيق مناسب للرسم
      const convertNode = (node, depth = 0) => ({
        ...node,
        depth,
        children: (node.children || []).map(child => convertNode(child, depth + 1))
      });
      
      // إذا كان هناك جذر واحد فقط
      let rootNode;
      if (result.roots.length === 1) {
        rootNode = convertNode(result.roots[0]);
      } else {
        // عدة جذور - ننشئ جذراً افتراضياً
        rootNode = {
          id: 'tribe-root',
          firstName: '🏛️ شجرة القبيلة',
          fullName: '🏛️ شجرة القبيلة',
          isVirtualRoot: true,
          depth: 0,
          children: result.roots.map(r => convertNode(r, 1))
        };
      }
      
      setTreeData(rootNode);
      setStats(result.stats);
      
      // حفظ قائمة بجميع العقد للبحث
      const collectNodes = (node, list = []) => {
        list.push(node);
        (node.children || []).forEach(child => collectNodes(child, list));
        return list;
      };
      allNodesRef.current = collectNodes(rootNode);
      
      showSnackbar(`✅ تم تحميل ${result.stats.totalPersons} شخص في ${result.stats.maxGeneration + 1} أجيال`, 'success');
      
    } catch (err) {
      console.error('❌ خطأ في تحميل الشجرة:', err);
      setError('حدث خطأ أثناء تحميل الشجرة');
      showSnackbar('❌ فشل تحميل الشجرة', 'error');
    } finally {
      setLoading(false);
    }
  }, [tribe?.id]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // =============================================
  // 🎨 رسم الشجرة
  // =============================================
  const drawTree = useCallback(() => {
    if (!treeData || !svgRef.current || !containerRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const container = containerRef.current;
    const width = container.clientWidth;
    
    // إنشاء مجموعة الرسم
    const g = svg.append('g')
      .attr('class', 'tree-group');
    
    // إعداد Zoom
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });
    
    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;
    
    // إنشاء هيكل الشجرة
    const root = d3.hierarchy(treeData);
    
    // حساب الحجم المطلوب
    const nodeCount = root.descendants().length;
    const treeWidth = Math.max(width * 2, nodeCount * 80);
    const treeHeight = (root.height + 1) * TREE_CONFIG.levelHeight;
    
    // إنشاء التخطيط
    const treeLayout = d3.tree()
      .size([treeWidth, treeHeight])
      .separation((a, b) => {
        return a.parent === b.parent ? 1.2 : 2;
      });
    
    treeLayout(root);
    
    // رسم الخطوط
    const linkGenerator = d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y);
    
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#90a4ae')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .style('transition', 'all 0.3s ease');
    
    // رسم العقد
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', d => `node ${highlightedNodes.has(d.data.id) ? 'highlighted' : ''}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (!d.data.isVirtualRoot) {
          setSelectedNode(d.data);
        }
      });
    
    // رسم مستطيل العقدة
    nodes.append('rect')
      .attr('x', -TREE_CONFIG.nodeWidth / 2)
      .attr('y', -TREE_CONFIG.nodeHeight / 2)
      .attr('width', TREE_CONFIG.nodeWidth)
      .attr('height', TREE_CONFIG.nodeHeight)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => getNodeColor(d.data).bg)
      .attr('stroke', d => getNodeColor(d.data).border)
      .attr('stroke-width', d => highlightedNodes.has(d.data.id) ? 3 : 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
      .style('transition', 'all 0.3s ease');
    
    // أيقونة الجنس
    nodes.filter(d => !d.data.isVirtualRoot)
      .append('text')
      .attr('x', -TREE_CONFIG.nodeWidth / 2 + 12)
      .attr('y', -TREE_CONFIG.nodeHeight / 2 + 20)
      .attr('font-size', '16px')
      .text(d => d.data.gender === 'M' ? '👨' : d.data.gender === 'F' ? '👩' : '👤');
    
    // الاسم
    nodes.append('text')
      .attr('class', 'node-name')
      .attr('y', d => d.data.isVirtualRoot ? 5 : -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.data.isVirtualRoot ? '16px' : '14px')
      .attr('font-weight', 'bold')
      .attr('fill', d => getNodeColor(d.data).text)
      .text(d => truncateName(d.data.firstName || d.data.fullName, 15));
    
    // اسم الأب
    nodes.filter(d => !d.data.isVirtualRoot && d.data.fatherName)
      .append('text')
      .attr('class', 'node-father')
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#666')
      .text(d => `بن ${truncateName(d.data.fatherName, 12)}`);
    
    // عدد الأبناء
    nodes.filter(d => d.data.children && d.data.children.length > 0 && !d.data.isVirtualRoot)
      .append('text')
      .attr('x', TREE_CONFIG.nodeWidth / 2 - 15)
      .attr('y', -TREE_CONFIG.nodeHeight / 2 + 18)
      .attr('font-size', '11px')
      .attr('fill', '#666')
      .text(d => `(${d.data.children.length})`);
    
    // حالة الحياة
    nodes.filter(d => !d.data.isVirtualRoot && d.data.isAlive === false)
      .append('text')
      .attr('x', TREE_CONFIG.nodeWidth / 2 - 20)
      .attr('y', TREE_CONFIG.nodeHeight / 2 - 10)
      .attr('font-size', '12px')
      .text('🕊️');
    
    // توسيط الشجرة
    const bounds = g.node().getBBox();
    const initialX = (width - bounds.width) / 2 - bounds.x;
    const initialY = 50 - bounds.y;
    
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(initialX, initialY).scale(0.8)
    );
    
  }, [treeData, highlightedNodes]);

  useEffect(() => {
    if (treeData) {
      drawTree();
    }
  }, [treeData, drawTree]);

  // إعادة الرسم عند تغيير حجم النافذة
  useEffect(() => {
    const handleResize = () => {
      if (treeData) {
        drawTree();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [treeData, drawTree]);

  // =============================================
  // 🔍 التركيز على عقدة
  // =============================================
  const focusOnNode = useCallback((nodeId) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const node = svg.selectAll('.node').filter(d => d.data.id === nodeId);
    
    if (!node.empty()) {
      const transform = d3.zoomIdentity
        .translate(
          containerRef.current.clientWidth / 2,
          containerRef.current.clientHeight / 3
        )
        .scale(1.2)
        .translate(
          -node.datum().x,
          -node.datum().y
        );
      
      svg.transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, transform);
    }
  }, []);

  // =============================================
  // 🔍 البحث
  // =============================================
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setHighlightedNodes(new Set());
      return;
    }
    
    const results = allNodesRef.current.filter(node => {
      if (node.isVirtualRoot) return false;
      const searchText = `${node.firstName} ${node.fatherName} ${node.surname}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    setSearchResults(results);
    setHighlightedNodes(new Set(results.map(r => r.id)));
    
    // التركيز على أول نتيجة
    if (results.length > 0) {
      focusOnNode(results[0].id);
    }
  }, [focusOnNode]);

  // =============================================
  // 🎛️ أدوات التحكم
  // =============================================
  const handleZoom = (direction) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const newScale = direction === 'in' ? zoom * 1.3 : zoom / 1.3;
    
    svg.transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleTo, newScale);
  };

  const handleCenter = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    
    svg.transition()
      .duration(500)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
          .translate(container.clientWidth / 2, 80)
          .scale(0.8)
      );
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `شجرة_القبيلة_${new Date().toLocaleDateString('ar')}.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSnackbar('✅ تم تحميل الشجرة بنجاح', 'success');
  };

  // =============================================
  // 🛠️ دوال مساعدة
  // =============================================
  const getNodeColor = (node) => {
    if (node.isVirtualRoot) return TREE_CONFIG.colors.root;
    if (node.isAlive === false) return TREE_CONFIG.colors.deceased;
    if (node.gender === 'M') return TREE_CONFIG.colors.male;
    if (node.gender === 'F') return TREE_CONFIG.colors.female;
    return TREE_CONFIG.colors.unknown;
  };

  const truncateName = (name, maxLength) => {
    if (!name) return '';
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // =============================================
  // 🖼️ العرض
  // =============================================
  
  // حالة التحميل
  if (tribeLoading || loading) {
    return (
      <Box className="tree-loading">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          جاري تحميل شجرة القبيلة...
        </Typography>
      </Box>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // حالة عدم وجود بيانات
  if (!treeData) {
    return (
      <Box className="tree-empty">
        <TreeIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
        <Typography variant="h5" color="textSecondary">
          لا توجد بيانات في الشجرة
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
          ابدأ بإضافة نفسك وأفراد عائلتك
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="unified-tree-container" ref={containerRef}>
      {/* شريط الأدوات */}
      <Paper className="tree-toolbar" elevation={3}>
        {/* البحث */}
        <TextField
          size="small"
          placeholder="بحث في الشجرة..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearch('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 200 }}
        />
        
        {/* نتائج البحث */}
        {searchResults.length > 0 && (
          <Chip
            label={`${searchResults.length} نتيجة`}
            size="small"
            color="primary"
          />
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* الإحصائيات */}
        {stats && (
          <Box className="tree-stats">
            <Chip
              icon={<PersonIcon />}
              label={`${stats.totalPersons} شخص`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TreeIcon />}
              label={`${stats.maxGeneration + 1} جيل`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
        
        {/* أزرار التحكم */}
        <Box className="tree-controls">
          <Tooltip title="تكبير">
            <IconButton onClick={() => handleZoom('in')} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="تصغير">
            <IconButton onClick={() => handleZoom('out')} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="توسيط">
            <IconButton onClick={handleCenter} size="small">
              <CenterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}>
            <IconButton onClick={handleFullscreen} size="small">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="تحميل كصورة">
            <IconButton onClick={handleDownload} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* منطقة الرسم */}
      <svg
        ref={svgRef}
        className="tree-svg"
        width="100%"
        height="100%"
      />

      {/* معلومات التكبير */}
      <Box className="zoom-indicator">
        {Math.round(zoom * 100)}%
      </Box>

      {/* نافذة تفاصيل الشخص */}
      <Dialog
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        {selectedNode && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedNode.gender === 'M' ? (
                  <MaleIcon color="primary" />
                ) : selectedNode.gender === 'F' ? (
                  <FemaleIcon sx={{ color: '#c2185b' }} />
                ) : (
                  <PersonIcon />
                )}
                <Typography variant="h6">
                  {selectedNode.firstName} {selectedNode.fatherName && `بن ${selectedNode.fatherName}`}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {selectedNode.surname && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">العائلة</Typography>
                    <Typography>{selectedNode.surname}</Typography>
                  </Box>
                )}
                {selectedNode.birthDate && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">تاريخ الميلاد</Typography>
                    <Typography>{new Date(selectedNode.birthDate).toLocaleDateString('ar')}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="textSecondary">الحالة</Typography>
                  <Typography>
                    {selectedNode.isAlive !== false ? '🟢 على قيد الحياة' : '🕊️ متوفي'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">الجيل</Typography>
                  <Typography>الجيل {(selectedNode.generation || 0) + 1}</Typography>
                </Box>
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">الأبناء</Typography>
                    <Typography>{selectedNode.children.length} {selectedNode.children.length === 1 ? 'ابن/بنت' : 'أبناء'}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button 
                startIcon={<LinkIcon />}
                onClick={() => {
                  focusOnNode(selectedNode.id);
                  setSelectedNode(null);
                }}
              >
                التركيز في الشجرة
              </Button>
              <Button onClick={() => setSelectedNode(null)}>
                إغلاق
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* زر تحديث */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          className="refresh-fab"
          onClick={loadTree}
          sx={{ position: 'absolute', bottom: 20, left: 20 }}
        >
          <TreeIcon />
        </Fab>
      </Zoom>

      {/* الإشعارات */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

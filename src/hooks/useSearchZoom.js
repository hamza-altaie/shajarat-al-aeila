// src/hooks/useSearchZoom.js
import { useCallback, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export const useSearchZoom = (svgRef, treeData, lastZoomTransformRef, zoomRef, highlightedPersonName) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const zoomBehavior = useRef(null);

  /**
   * مسح التمييز - تم نقلها لأعلى لتجنب مشكلة الاستدعاء قبل التعريف
   */
  const clearHighlights = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    if (!g.empty()) {
      g.selectAll('.node').classed('search-highlight', false);
      g.selectAll('rect, .family-node-card')
        .attr('stroke', null)
        .attr('stroke-width', null);
    }
    setHighlightedNode(null);
  }, [svgRef]);

  /**
   * دالة البحث المحسنة
   */
  const searchInTree = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setHighlightedNode(null);
      clearHighlights();
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // البحث الشامل في جميع البيانات
    const searchInNode = (node) => {
      const matches = [];
      
      // البحث في الاسم مع التحقق من null/undefined
      const nameMatch = (node.name?.toLowerCase() || '').includes(normalizedQuery) ||
                       (node.data?.name?.toLowerCase() || '').includes(normalizedQuery) ||
                       (node.firstName?.toLowerCase() || '').includes(normalizedQuery) ||
                       (node.attributes?.name?.toLowerCase() || '').includes(normalizedQuery);
      
      // البحث في العلاقة
      const relationMatch = (node.relation?.toLowerCase() || '').includes(normalizedQuery) ||
                           (node.data?.relation?.toLowerCase() || '').includes(normalizedQuery) ||
                           (node.attributes?.relation?.toLowerCase() || '').includes(normalizedQuery);
      
      // البحث في الموقع
      const locationMatch = (node.location?.toLowerCase() || '').includes(normalizedQuery) ||
                           (node.data?.location?.toLowerCase() || '').includes(normalizedQuery) ||
                           (node.attributes?.location?.toLowerCase() || '').includes(normalizedQuery);
      
      if (nameMatch || relationMatch || locationMatch) {
        matches.push({
          node: node,
          type: nameMatch ? 'name' : relationMatch ? 'relation' : 'location',
          score: nameMatch ? 3 : relationMatch ? 2 : 1
        });
      }
      
      // البحث المتكرر في الأطفال
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          matches.push(...searchInNode(child));
        });
      }
      
      return matches;
    };

    const results = treeData ? searchInNode(treeData) : [];
    
    // ترتيب النتائج حسب الدرجة
    results.sort((a, b) => b.score - a.score);
    
    setSearchResults(results);
    return results;
  }, [treeData, clearHighlights]);

  /**
   * دالة تمييز العقدة
   */
  const highlightNode = useCallback((nodeElement) => {
    if (!svgRef.current || !nodeElement || nodeElement.empty()) return;
    nodeElement.classed('search-highlight', true);
    nodeElement.select('rect, .family-node-card')
      .attr('stroke', '#ff9800')
      .attr('stroke-width', 3);
  }, [svgRef]);

  /**
   * دالة الزووم إلى شخص محدد - محسنة
   */
  const zoomToPerson = useCallback((targetNode, duration = 900) => {
    if (!svgRef.current || !targetNode) return;
    const svg = d3.select(svgRef.current);
    const groupElement = svg.select('g');
    
    // إعداد سلوك الزووم إذا لم يكن موجوداً
    if (!zoomBehavior.current) {
      zoomBehavior.current = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          groupElement.attr('transform', event.transform);
        });
      
      svg.call(zoomBehavior.current);
    }

    // البحث عن العقدة في DOM بطرق متعددة
    let nodeElement = null;
    
    // الطريقة الأولى: البحث بالمطابقة المباشرة
    nodeElement = groupElement.selectAll('.node')
      .filter(d => {
        return d === targetNode || 
               d.data === targetNode ||
               d.data === targetNode.data ||
               (d.data?.globalId && targetNode.data?.globalId && d.data.globalId === targetNode.data.globalId) ||
               (d.data?.name && targetNode.data?.name && d.data.name === targetNode.data.name) ||
               (d.data?.name && targetNode.name && d.data.name === targetNode.name);
      });

    // الطريقة الثانية: البحث بالاسم إذا فشلت الأولى
    if (nodeElement.empty()) {
      const targetName = targetNode.name || targetNode.data?.name || targetNode.attributes?.name;
      
      if (targetName) {
        nodeElement = groupElement.selectAll('.node')
          .filter(d => {
            const nodeName = d.data?.name || d.data?.attributes?.name || d.name;
            return nodeName === targetName || 
                   (nodeName && nodeName.includes(targetName)) ||
                   (targetName && targetName.includes(nodeName));
          });
      }
    }

    if (nodeElement.empty()) {
      console.error('❌ لم يتم العثور على العقدة في DOM');
      return;
    }

    // الحصول على موقع العقدة
    const nodeData = nodeElement.datum();
    const containerRect = svgRef.current.getBoundingClientRect();
    
    // حساب الموقع المركزي
    const scale = 1.8; // مستوى الزووم المحسن
    const centerX = containerRect.width / 2 - nodeData.x * scale;
    const centerY = containerRect.height / 2 - nodeData.y * scale;

    // تطبيق التحويل مع الأنيميشن
    svg.transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .call(
        (zoomRef && zoomRef.current) ? zoomRef.current.transform : zoomBehavior.current.transform,
        d3.zoomIdentity.translate(centerX, centerY).scale(scale)
      );

    // بعد الزووم، أضف التمييز مباشرة
    setTimeout(() => {
      let nodeElement = groupElement.selectAll('.node')
        .filter(d => {
          const name = d.data?.name || d.data?.attributes?.name || d.name;
          return highlightedPersonName ? name === highlightedPersonName : (d === targetNode || d.data === targetNode);
        });
      if (!nodeElement.empty()) {
        highlightNode(nodeElement);
        setHighlightedNode(targetNode);
      }
    }, duration + 50);

  }, [svgRef, highlightNode, zoomRef, highlightedPersonName]);

  /**
   * البحث والزووم المدمج
   */
  const searchAndZoom = useCallback((query) => {
    const results = searchInTree(query);
    if (results.length > 0) {
      zoomToPerson(results[0].node);
      return results[0].node;
    }
    return null;
  }, [searchInTree, zoomToPerson]);

  /**
   * إعادة تعيين الرؤية
   */
  const resetView = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // إعداد الزووم إذا لم يكن موجوداً
    if (!zoomBehavior.current) {
      zoomBehavior.current = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          svg.select('g').attr('transform', event.transform);
        });
      
      svg.call(zoomBehavior.current);
    }
    
    clearHighlights();
    
    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity.translate(0, 0).scale(0.8)
      );
      
    setSearchQuery('');
    setSearchResults([]);
    setHighlightedNode(null);
  }, [svgRef, clearHighlights]);

  /**
   * الزووم اليدوي
   */
  const manualZoom = useCallback((direction) => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node());
    
    const scaleFactor = direction === 'in' ? 1.3 : 0.7;
    const newScale = Math.max(0.1, Math.min(3, currentTransform.k * scaleFactor));
    
    svg.transition()
      .duration(300)
      .call(
        zoomBehavior.current.scaleTo,
        newScale
      );
  }, [svgRef]);

  // تنظيف المستمعين عند إلغاء التحميل
  useEffect(() => {
    const svgRefCopy = svgRef.current;
    return () => {
      if (zoomBehavior.current && svgRefCopy) {
        d3.select(svgRefCopy).on('.zoom', null);
      }
    };
  }, [svgRef]);

  // حفظ آخر زووم مطبق في كل عملية زووم
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    const handleZoom = (event) => {
      g.attr('transform', event.transform);
      if (lastZoomTransformRef) {
        lastZoomTransformRef.current = event.transform.toString();
      }
    };
    svg.call(d3.zoom().on('zoom', handleZoom));
    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, lastZoomTransformRef]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    highlightedNode,
    searchInTree,
    zoomToPerson,
    searchAndZoom,
    resetView,
    manualZoom,
    clearHighlights
  };
};

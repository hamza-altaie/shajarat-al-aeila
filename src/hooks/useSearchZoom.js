// src/hooks/useSearchZoom.js
import { useCallback, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export const useSearchZoom = (svgRef, treeData) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const zoomBehavior = useRef(null);

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
      
      // البحث في الاسم
      const nameMatch = node.name?.toLowerCase().includes(normalizedQuery) ||
                       node.data?.name?.toLowerCase().includes(normalizedQuery) ||
                       node.firstName?.toLowerCase().includes(normalizedQuery);
      
      // البحث في العلاقة
      const relationMatch = node.relation?.toLowerCase().includes(normalizedQuery) ||
                           node.data?.relation?.toLowerCase().includes(normalizedQuery);
      
      // البحث في الموقع
      const locationMatch = node.location?.toLowerCase().includes(normalizedQuery) ||
                           node.data?.location?.toLowerCase().includes(normalizedQuery);
      
      if (nameMatch || relationMatch || locationMatch) {
        matches.push({
          node: node,
          type: nameMatch ? 'name' : relationMatch ? 'relation' : 'location',
          score: nameMatch ? 3 : relationMatch ? 2 : 1
        });
      }
      
      // البحث المتكرر في الأطفال
      if (node.children) {
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
  }, [treeData]);

  /**
   * دالة الزووم إلى شخص محدد
   */
  const zoomToPerson = useCallback((targetNode, duration = 900) => {
    if (!svgRef.current || !targetNode) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!zoomBehavior.current) {
      zoomBehavior.current = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      
      svg.call(zoomBehavior.current);
    }

    // البحث عن العقدة في DOM
    const nodeElement = g.selectAll('.node')
      .filter(d => d === targetNode || 
                   d.data?.globalId === targetNode.data?.globalId ||
                   d.data?.name === targetNode.data?.name);

    if (nodeElement.empty()) {
      console.warn('لم يتم العثور على العقدة في DOM');
      return;
    }

    // الحصول على موقع العقدة
    const nodeData = nodeElement.datum();
    const containerRect = svgRef.current.getBoundingClientRect();
    
    // حساب الموقع المركزي
    const scale = 1.5; // مستوى الزووم
    const centerX = containerRect.width / 2 - nodeData.x * scale;
    const centerY = containerRect.height / 2 - nodeData.y * scale;

    // تطبيق التحويل مع الأنيميشن
    svg.transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity.translate(centerX, centerY).scale(scale)
      );

    // تمييز العقدة
    highlightNode(nodeElement);
    setHighlightedNode(targetNode);

  }, [svgRef]);

  /**
   * دالة تمييز العقدة
   */
  const highlightNode = useCallback((nodeElement) => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g');

    // إزالة التمييز السابق
    g.selectAll('.node').classed('search-highlight', false);
    g.selectAll('.node foreignObject > div').classed('search-highlight', false);

    // إضافة التمييز الجديد
    nodeElement.classed('search-highlight', true);
    nodeElement.select('foreignObject > div').classed('search-highlight', true);

    // إضافة تأثير النبض
    nodeElement.select('rect, .family-node-card')
      .transition()
      .duration(300)
      .attr('stroke', '#ffeb3b')
      .attr('stroke-width', '4px')
      .transition()
      .duration(300)
      .attr('stroke', '#ff9800')
      .transition()
      .duration(300)
      .attr('stroke', '#ffeb3b');

  }, [svgRef]);

  /**
   * مسح التمييز
   */
  const clearHighlights = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g');

    g.selectAll('.node').classed('search-highlight', false);
    g.selectAll('.node foreignObject > div').classed('search-highlight', false);
    g.selectAll('.node rect, .node .family-node-card')
      .transition()
      .duration(200)
      .attr('stroke', null)
      .attr('stroke-width', null);

    setHighlightedNode(null);
  }, [svgRef]);

  /**
   * البحث والزووم المدمج
   */
  const searchAndZoom = useCallback((query) => {
    const results = searchInTree(query);
    
    if (results.length > 0) {
      // الزووم إلى أول نتيجة
      zoomToPerson(results[0].node);
      return results[0].node;
    }
    
    return null;
  }, [searchInTree, zoomToPerson]);

  /**
   * إعادة تعيين الرؤية
   */
  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    
    clearHighlights();
    
    svg.transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity
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
    return () => {
      if (zoomBehavior.current && svgRef.current) {
        d3.select(svgRef.current).on('.zoom', null);
      }
    };
  }, [svgRef]);

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
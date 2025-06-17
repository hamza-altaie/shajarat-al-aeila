import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

const EnhancedFamilyTreeD3 = ({ 
  treeData, 
  onNodeClick, 
  onNodeHover,
  width = 1200,
  height = 800 
}) => {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(d3.zoomIdentity);
  const [layout, setLayout] = useState('tree');
  const [nodeSize, setNodeSize] = useState(150);
  const [linkStyle, setLinkStyle] = useState('curved');
  const [colorScheme, setColorScheme] = useState('generation');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // بيانات تجريبية للشجرة
  const defaultTreeData = treeData || {
    name: "محمد العلي",
    relation: "رب العائلة",
    isHead: true,
    avatar: "/avatar1.jpg",
    children: [
      {
        name: "أحمد محمد",
        relation: "ابن",
        avatar: "/avatar2.jpg",
        children: [
          { name: "سارة أحمد", relation: "بنت", avatar: "/avatar3.jpg" },
          { name: "علي أحمد", relation: "ابن", avatar: "/avatar4.jpg" }
        ]
      },
      {
        name: "فاطمة محمد", 
        relation: "بنت",
        avatar: "/avatar5.jpg",
        children: [
          { name: "نور فاطمة", relation: "بنت", avatar: "/avatar6.jpg" },
          { name: "حسن فاطمة", relation: "ابن", avatar: "/avatar7.jpg" }
        ]
      },
      {
        name: "خالد محمد",
        relation: "ابن", 
        avatar: "/avatar8.jpg",
        children: [
          { name: "ليلى خالد", relation: "بنت", avatar: "/avatar9.jpg" },
          { name: "يوسف خالد", relation: "ابن", avatar: "/avatar10.jpg" },
          { name: "زينب خالد", relation: "بنت", avatar: "/avatar11.jpg" }
        ]
      }
    ]
  };

  // إعداد الألوان
  const colorSchemes = {
    generation: d3.scaleOrdinal(d3.schemeCategory10),
    gender: d3.scaleOrdinal(['#4FC3F7', '#F8BBD9']),
    family: d3.scaleOrdinal(d3.schemePastel1),
    role: d3.scaleOrdinal(d3.schemeSet3)
  };

  // دالة رسم الشجرة
  const drawTree = useCallback(() => {
    if (!defaultTreeData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "tree-container");

    // إعداد التخطيط
    let treeLayout;
    switch(layout) {
      case 'radial':
        treeLayout = d3.tree()
          .size([2 * Math.PI, Math.min(width, height) / 3])
          .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        break;
      case 'cluster':
        treeLayout = d3.cluster()
          .size([width - 200, height - 200]);
        break;
      default:
        treeLayout = d3.tree()
          .size([width - 200, height - 200])
          .nodeSize([nodeSize, nodeSize]);
    }

    // تحويل البيانات
    const root = d3.hierarchy(defaultTreeData);
    treeLayout(root);

    // رسم الروابط
    const linkGenerator = layout === 'radial' 
      ? d3.linkRadial()
          .angle(d => d.x)
          .radius(d => d.y)
      : linkStyle === 'curved'
      ? d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y)
      : d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveLinear);

    // إضافة الروابط
    const links = container.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .attr("fill", "none")
      .attr("stroke", "#64b5f6")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .style("filter", "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))");

    if (animationEnabled) {
      links.attr("stroke-dasharray", function() {
        return this.getTotalLength();
      })
      .attr("stroke-dashoffset", function() {
        return this.getTotalLength();
      })
      .transition()
      .duration(1000)
      .attr("stroke-dashoffset", 0);
    }

    // إضافة العقد
    const nodes = container.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => {
        if (layout === 'radial') {
          return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`;
        }
        return `translate(${d.x},${d.y})`;
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        console.log('تم النقر على:', d.data.name);
        onNodeClick && onNodeClick(d.data);
      })
      .on("mouseenter", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", d => d.data.isHead ? 40 : 30)
          .attr("stroke-width", 4);
        
        onNodeHover && onNodeHover(d.data, event);
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", d => d.data.isHead ? 35 : 25)
          .attr("stroke-width", 3);
        
        onNodeHover && onNodeHover(null);
      });

    // رسم خلفية العقد (دائرة ملونة)
    nodes.append("circle")
      .attr("r", 25)
      .attr("fill", d => {
        switch(colorScheme) {
          case 'generation':
            return colorSchemes.generation(d.depth);
          case 'gender':
            return d.data.relation === 'بنت' ? '#F8BBD9' : '#4FC3F7';
          case 'family':
            return colorSchemes.family(d.data.familyId || 0);
          case 'role':
            return d.data.isHead ? '#FF6B6B' : '#4ECDC4';
          default:
            return '#2196F3';
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(2px 2px 6px rgba(0,0,0,0.4))")
      .transition()
      .duration(animationEnabled ? 800 : 0)
      .attr("r", d => d.data.isHead ? 35 : 25);

    // إضافة أيقونات للأشخاص
    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", "20px")
      .style("pointer-events", "none")
      .text(d => {
        if (d.data.isHead) return "👑";
        return d.data.relation === 'بنت' ? "👩" : "👨";
      })
      .style("opacity", 0)
      .transition()
      .duration(animationEnabled ? 600 : 0)
      .style("opacity", 1);

    // إضافة النصوص
    nodes.append("text")
      .attr("dy", layout === 'radial' ? ".31em" : 50)
      .attr("x", layout === 'radial' ? (d => d.x < Math.PI ? 6 : -6) : 0)
      .style("text-anchor", layout === 'radial' ? (d => d.x < Math.PI ? "start" : "end") : "middle")
      .style("font-family", "Cairo, Tahoma, Arial, sans-serif")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#2c3e50")
      .style("text-shadow", "2px 2px 4px rgba(255,255,255,0.9)")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.name || 'غير محدد';
        return name.length > 12 ? name.substring(0, 12) + '...' : name;
      })
      .style("opacity", 0)
      .transition()
      .duration(animationEnabled ? 1000 : 0)
      .style("opacity", 1);

    // إضافة نص العلاقة
    nodes.append("text")
      .attr("dy", layout === 'radial' ? ".31em" : 65)
      .attr("x", 0)
      .style("text-anchor", "middle")
      .style("font-family", "Cairo, Tahoma, Arial, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "normal")
      .style("fill", "#666")
      .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
      .style("pointer-events", "none")
      .text(d => d.data.relation || '')
      .style("opacity", 0)
      .transition()
      .duration(animationEnabled ? 1200 : 0)
      .style("opacity", 0.8);

    // إعداد التكبير والتصغير
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        setZoom(event.transform);
      });

    svg.call(zoomBehavior);

    // توسيط الشجرة
    if (layout !== 'radial') {
      const bounds = container.node().getBBox();
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      
      if (fullWidth > 0 && fullHeight > 0) {
        const centerX = bounds.x + fullWidth / 2;
        const centerY = bounds.y + fullHeight / 2;
        
        const scale = Math.min(width / fullWidth, height / fullHeight) * 0.7;
        const translate = [width / 2 - scale * centerX, height / 2 - scale * centerY];
        
        svg.transition()
          .duration(animationEnabled ? 750 : 0)
          .call(zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    }

  }, [defaultTreeData, layout, nodeSize, linkStyle, colorScheme, animationEnabled, width, height, onNodeClick, onNodeHover]);

  // رسم الشجرة عند التغيير
  useEffect(() => {
    drawTree();
  }, [drawTree]);

  // دوال التحكم
  const zoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom().scaleBy, 1.5
    );
  };

  const zoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom().scaleBy, 0.75
    );
  };

  const resetZoom = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom().transform, d3.zoomIdentity
    );
  };

  const exportAsSVG = () => {
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'family-tree.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: 'Cairo, Arial, sans-serif' }}>
      {/* شريط الأدوات */}
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        left: '16px', 
        zIndex: 1000,
        background: 'white',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <button onClick={zoomIn} style={buttonStyle} title="تكبير">🔍+</button>
        <button onClick={zoomOut} style={buttonStyle} title="تصغير">🔍-</button>
        <button onClick={resetZoom} style={buttonStyle} title="إعادة تعيين">🎯</button>
        
        <select 
          value={layout} 
          onChange={(e) => setLayout(e.target.value)}
          style={selectStyle}
        >
          <option value="tree">شجرة عادية</option>
          <option value="radial">دائرية</option>
          <option value="cluster">مجمعة</option>
        </select>

        <select 
          value={colorScheme} 
          onChange={(e) => setColorScheme(e.target.value)}
          style={selectStyle}
        >
          <option value="generation">حسب الجيل</option>
          <option value="gender">حسب الجنس</option>
          <option value="role">حسب الدور</option>
        </select>

        <button onClick={() => setSettingsOpen(!settingsOpen)} style={buttonStyle} title="الإعدادات">⚙️</button>
        <button onClick={exportAsSVG} style={buttonStyle} title="تصدير SVG">💾</button>
      </div>

      {/* معلومات التكبير */}
      <div style={{
        position: 'absolute', 
        bottom: '16px', 
        left: '16px', 
        zIndex: 1000,
        background: '#333',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        التكبير: {Math.round(zoom.k * 100)}%
      </div>

      {/* الشجرة */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '8px'
        }}
      />

      {/* نافذة الإعدادات */}
      {settingsOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '16px',
          zIndex: 1001,
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          minWidth: '250px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>إعدادات الشجرة</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={animationEnabled} 
                onChange={(e) => setAnimationEnabled(e.target.checked)}
              />
              تفعيل الحركة
            </label>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>
              حجم العقد: {nodeSize}px
            </label>
            <input
              type="range"
              value={nodeSize}
              onChange={(e) => setNodeSize(Number(e.target.value))}
              min="100"
              max="300"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>نمط الروابط</label>
            <select 
              value={linkStyle} 
              onChange={(e) => setLinkStyle(e.target.value)}
              style={{ ...selectStyle, width: '100%' }}
            >
              <option value="curved">منحنية</option>
              <option value="straight">مستقيمة</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setSettingsOpen(false)} style={buttonStyle}>إغلاق</button>
            <button onClick={drawTree} style={{ ...buttonStyle, background: '#4CAF50' }}>تطبيق</button>
          </div>
        </div>
      )}
    </div>
  );
};

// أنماط CSS
const buttonStyle = {
  padding: '6px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: '#f8f9fa',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s',
  outline: 'none'
};

const selectStyle = {
  padding: '4px 8px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: 'white',
  fontSize: '12px',
  outline: 'none'
};

export default EnhancedFamilyTreeD3;
// src/components/enhanced/EnhancedFamilyTreeD3.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material';

const EnhancedFamilyTreeD3 = ({ 
  treeData, 
  onNodeClick, 
  onNodeHover,
  selectedPerson,
  searchHighlight = []
}) => {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const treeContainerRef = useRef();

  // تمركز الشجرة عند التحميل
  useEffect(() => {
    if (treeContainerRef.current) {
      const dimensions = treeContainerRef.current.getBoundingClientRect();
      setTranslate({
        x: dimensions.width / 2,
        y: dimensions.height / 6
      });
    }
  }, [treeData]);

  // عرض العقدة المحسن
  const renderNode = useCallback(({ nodeDatum, toggleNode }) => {
    const isSelected = selectedPerson?.id === nodeDatum.id;
    const isHighlighted = searchHighlight.includes(nodeDatum.id);
    
    return (
      <g>
        {/* العقدة الرئيسية */}
        <circle
          r={30}
          fill={isSelected ? '#4caf50' : isHighlighted ? '#ff9800' : '#2196f3'}
          stroke="#fff"
          strokeWidth={3}
          style={{ cursor: 'pointer' }}
          onClick={() => onNodeClick?.(nodeDatum)}
          onMouseEnter={() => onNodeHover?.(nodeDatum)}
        />
        
        {/* الصورة الشخصية */}
        <image
          href={nodeDatum.avatar || '/default-avatar.png'}
          x="-25"
          y="-25"
          width="50"
          height="50"
          clipPath="circle(25px at 25px 25px)"
          style={{ cursor: 'pointer' }}
          onClick={() => onNodeClick?.(nodeDatum)}
        />
        
        {/* النص */}
        <text
          x="0"
          y="45"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#333"
          style={{ cursor: 'pointer' }}
          onClick={() => onNodeClick?.(nodeDatum)}
        >
          {nodeDatum.name}
        </text>
        
        <text
          x="0"
          y="60"
          textAnchor="middle"
          fontSize="12"
          fill="#666"
        >
          {nodeDatum.relation}
        </text>
      </g>
    );
  }, [selectedPerson, searchHighlight, onNodeClick, onNodeHover]);

  // أزرار التحكم بالتكبير
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleCenter = () => {
    if (treeContainerRef.current) {
      const dimensions = treeContainerRef.current.getBoundingClientRect();
      setTranslate({
        x: dimensions.width / 2,
        y: dimensions.height / 6
      });
      setZoom(0.8);
    }
  };

  if (!treeData) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="400px"
      >
        لا توجد بيانات لعرضها
      </Box>
    );
  }

  return (
    <Box position="relative" height="600px">
      {/* أزرار التحكم */}
      <Box 
        position="absolute" 
        top={10} 
        right={10} 
        zIndex={1000}
        display="flex"
        flexDirection="column"
        gap={1}
      >
        <Tooltip title="تكبير">
          <IconButton onClick={handleZoomIn} size="small">
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="تصغير">
          <IconButton onClick={handleZoomOut} size="small">
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="توسيط">
          <IconButton onClick={handleCenter} size="small">
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
      </Box>

      {/* الشجرة */}
      <div 
        ref={treeContainerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <Tree
          data={treeData}
          orientation="vertical"
          translate={translate}
          zoom={zoom}
          renderCustomNodeElement={renderNode}
          separation={{ siblings: 2, nonSiblings: 2 }}
          nodeSize={{ x: 200, y: 150 }}
          pathFunc="diagonal"
          styles={{
            links: {
              stroke: '#ccc',
              strokeWidth: 2
            }
          }}
        />
      </div>
    </Box>
  );
};

export default EnhancedFamilyTreeD3;
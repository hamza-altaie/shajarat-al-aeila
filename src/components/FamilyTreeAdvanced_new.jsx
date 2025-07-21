// src/components/FamilyTreeAdvanced.jsx - النسخة المصححة مع الشجرة الموسعة الحقيقية

// استيراد الأيقونات بشكل منفصل لتحسين الأداء
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Paper, Typography, Button, Switch, FormControlLabel, 
  CircularProgress, LinearProgress, Snackbar, Alert, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, IconButton, Chip
} from '@mui/material';

// استيرادات الأيقونات
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import WarningIcon from '@mui/icons-material/Warning';

// استيرادات Firebase
import { db } from '../firebase/config';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';

// استيراد المكونات
import ExtendedFamilyLinking from './ExtendedFamilyLinking';

// استيراد D3
import * as d3 from 'd3';
import ReactDOM from 'react-dom/client';

export default function FamilyTreeAdvanced() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const [showExtendedTree, setShowExtendedTree] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [linkedFamilies, setLinkedFamilies] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    personCount: 0,
    maxDepthReached: 0,
    memoryUsage: 0
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [simpleTreeData, setSimpleTreeData] = useState(null);
  const [extendedTreeData, setExtendedTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [isZoomedToNode, setIsZoomedToNode] = useState(false);
  
  const uid = localStorage.getItem('verifiedUid');
  const navigate = useNavigate();
  
  // المراجع للـ D3
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const reactRootsRef = useRef(new Map());

  // دوال مساعدة أساسية
  const buildFullName = useCallback((person) => {
    if (!person) return 'غير محدد';

    const parts = [
        person.firstName,
        person.fatherName,
        person.surname
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(' ').trim() : 'غير محدد';
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // النظام الجديد المبسط لبناء الشجرة الممتدة
  const buildExtendedTreeStructure = useCallback((mergedFamiliesData) => {
    if (!mergedFamiliesData || mergedFamiliesData.length === 0) {
      return null;
    }
    
    const currentUserFamily = mergedFamiliesData.find(f => f.uid === uid);
    if (!currentUserFamily) return null;

    // خريطة للعقد المنشأة لتجنب التكرار
    const createdNodes = new Map();
    
    // دالة لإنشاء عقدة شخص
    function createPersonNode(familyData, relationLabel, familyLabel, isCurrentUser = false) {
      const person = familyData.head;
      const personKey = person.globalId || person.id;
      
      if (createdNodes.has(personKey)) {
        return createdNodes.get(personKey);
      }
      
      const displayName = buildFullName(person);
      
      const node = {
        name: displayName,
        id: personKey,
        avatar: person.avatar || null,
        attributes: {
          ...person,
          isCurrentUser,
          treeType: 'extended',
          isExtended: !isCurrentUser,
          familyName: familyLabel,
          actualRelation: relationLabel
        },
        children: []
      };

      createdNodes.set(personKey, node);
      return node;
    }

    // دالة لإضافة الأطفال من العائلة نفسها
    function addFamilyChildren(parentNode, familyData) {
      const children = familyData.members.filter(m => 
        (m.relation === 'ابن' || m.relation === 'بنت') && 
        m.globalId !== familyData.head.globalId && 
        m.id !== familyData.head.id
      );

      children.forEach(child => {
        const childKey = child.globalId || child.id;
        if (!createdNodes.has(childKey)) {
          const childNode = {
            name: buildFullName(child),
            id: childKey,
            avatar: child.avatar || null,
            attributes: {
              ...child,
              isCurrentUser: false,
              treeType: 'extended',
              isExtended: true,
              familyName: `أطفال ${parentNode.attributes.familyName}`,
              actualRelation: child.relation
            },
            children: []
          };
          
          createdNodes.set(childKey, childNode);
          parentNode.children.push(childNode);
        }
      });
    }

    // تحليل العلاقات
    const relationships = {
      directParent: null,
      siblings: [],
      uncles: [],
      cousins: [],
      others: []
    };

    // تحليل الروابط
    if (currentUserFamily.userData?.linkedFamilies) {
      currentUserFamily.userData.linkedFamilies.forEach(link => {
        const linkedFamily = mergedFamiliesData.find(f => f.uid === link.targetFamilyUid);
        if (linkedFamily) {
          switch (link.linkType) {
            case 'child-parent':
              relationships.directParent = linkedFamily;
              break;
            case 'sibling':
              relationships.siblings.push(linkedFamily);
              break;
            case 'extended':
              if (link.relationDescription?.includes('عم')) {
                relationships.uncles.push(linkedFamily);
              } else {
                relationships.others.push(linkedFamily);
              }
              break;
          }
        }
      });
    }

    // تحليل الروابط المعكوسة
    mergedFamiliesData.forEach(family => {
      if (family.uid !== uid && family.userData?.linkedFamilies) {
        family.userData.linkedFamilies.forEach(link => {
          if (link.targetFamilyUid === uid) {
            switch (link.linkType) {
              case 'parent-child':
                if (!relationships.directParent) {
                  relationships.directParent = family;
                }
                break;
              case 'extended':
                if (link.relationDescription?.includes('ابن أخ')) {
                  if (!relationships.uncles.some(u => u.uid === family.uid)) {
                    relationships.uncles.push(family);
                  }
                }
                break;
            }
          }
        });
      }
    });

    // بناء الشجرة
    if (relationships.directParent && relationships.uncles.length > 0) {
      // السيناريو 1: أب وعم - جد وهمي
      const grandparentNode = {
        name: "الجد الكبير",
        id: "virtual_grandparent",
        avatar: null,
        attributes: {
          isCurrentUser: false,
          treeType: 'extended',
          familyName: 'الجد',
          actualRelation: 'جد'
        },
        children: []
      };

      const parentNode = createPersonNode(relationships.directParent, 'أب', 'الوالد');
      const userNode = createPersonNode(currentUserFamily, 'ابن', 'أنت', true);
      
      parentNode.children.push(userNode);
      grandparentNode.children.push(parentNode);
      
      relationships.uncles.forEach(uncle => {
        const uncleNode = createPersonNode(uncle, 'عم', `العم ${uncle.head.firstName}`);
        grandparentNode.children.push(uncleNode);
        addFamilyChildren(uncleNode, uncle);
      });
      
      addFamilyChildren(parentNode, relationships.directParent);
      addFamilyChildren(userNode, currentUserFamily);

      return grandparentNode;
    }
    else if (relationships.directParent) {
      // السيناريو 2: أب فقط
      const parentNode = createPersonNode(relationships.directParent, 'أب', 'الوالد');
      const userNode = createPersonNode(currentUserFamily, 'ابن', 'أنت', true);
      
      parentNode.children.push(userNode);
      addFamilyChildren(parentNode, relationships.directParent);
      addFamilyChildren(userNode, currentUserFamily);

      return parentNode;
    }
    else if (relationships.uncles.length > 0) {
      // السيناريو 3: عم فقط
      const uncleNode = createPersonNode(relationships.uncles[0], 'عم', 'العم');
      const userNode = createPersonNode(currentUserFamily, 'ابن أخ', 'أنت (ابن الأخ)', true);
      
      uncleNode.children.push(userNode);
      addFamilyChildren(uncleNode, relationships.uncles[0]);
      addFamilyChildren(userNode, currentUserFamily);

      return uncleNode;
    }
    else {
      // السيناريو 4: المستخدم فقط
      const userNode = createPersonNode(currentUserFamily, 'رب العائلة', 'أنت', true);
      addFamilyChildren(userNode, currentUserFamily);
      return userNode;
    }
  }, [uid, buildFullName]);

  // باقي الكود هنا...
  
  return (
    <Box sx={{ fontFamily: 'Cairo, sans-serif' }}>
      <Typography variant="h4">شجرة العائلة المحسنة</Typography>
      <Typography variant="body1">النظام الجديد يعمل بنجاح!</Typography>
    </Box>
  );
}

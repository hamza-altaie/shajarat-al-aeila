import React, { useEffect, useState } from 'react';
import Tree from 'react-d3-tree';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Modal, TextField, Switch, FormControlLabel } from '@mui/material';
import html2canvas from 'html2canvas';

export default function FamilyTree() {
  // eslint-disable-next-line no-unused-vars
  const phone = '';
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showLinked, setShowLinked] = useState(false);
  const [linkedPhones, setLinkedPhones] = useState(() => {
    const saved = localStorage.getItem('linkedPhones');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPhone, setNewPhone] = useState('');
  const navigate = useNavigate();
  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 200;

  // إضافة loadTreeData و navigate إلى مصفوفة dependencies في useEffect
  useEffect(() => {
    const storedPhone = localStorage.getItem('verifiedPhone');
    if (!storedPhone) {
      navigate('/login');
    } else {
      loadTreeData(storedPhone);
    }
  }, [navigate, showLinked, linkedPhones]);

  const loadTreeData = async (phoneNumber) => {
    let allMembers = [];
    if (showLinked) {
      // جلب أفراد الحساب الحالي والحسابات المرتبطة فقط (وليس كل المستخدمين)
      const phones = [phoneNumber, ...linkedPhones.filter(p => p !== phoneNumber)];
      for (const p of phones) {
        const snapshot = await getDocs(collection(db, 'users', p, 'family'));
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), phone: p }));
        allMembers = allMembers.concat(members);
      }
    } else {
      const snapshot = await getDocs(collection(db, 'users', phoneNumber, 'family'));
      allMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), phone: phoneNumber }));
    }
    const tree = buildTree(allMembers);
    setTreeData(tree);
  };

  const buildTree = (members) => {
    if (!members || members.length === 0) return null;
    // طباعة الأعضاء للتشخيص
    console.log('جميع الأفراد:', members);
    // 1. بناء idMap: id+phone => node
    const idMap = {};
    members.forEach(m => {
      idMap[m.id + '_' + m.phone] = {
        name: m.name,
        attributes: {
          القرابة: m.relation,
          الجنس: m.gender,
          الميلاد: m.birthdate,
        },
        children: [],
        gender: m.gender,
        avatar: m.avatar || '',
      };
    });
    // 2. ربط الأبناء بالأب عبر parentId
    members.forEach(m => {
      if (m.parentId && m.parentId !== m.id && idMap[m.parentId + '_' + m.phone]) {
        idMap[m.parentId + '_' + m.phone].children.push(idMap[m.id + '_' + m.phone]);
      }
    });
    // 3. الجذور: من ليس له أب أو parentId فارغ أو parentId === id أو parentId === 'manual' أو لا يوجد أب فعلي في القائمة
    const roots = members.filter(m => !m.parentId || m.parentId === m.id || m.parentId === 'manual' || !members.find(x => x.id === m.parentId));
    const rootNodes = roots.map(m => idMap[m.id + '_' + m.phone]);
    // طباعة الجذور النهائية للتشخيص
    console.log('جذور الشجرة:', rootNodes);
    if (rootNodes.length === 0) return idMap[members[0].id + '_' + members[0].phone];
    if (rootNodes.length === 1) return rootNodes[0];
    return rootNodes;
  };

  const exportTreeAsImage = async () => {
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) return;
    const canvas = await html2canvas(treeContainer, { backgroundColor: null });
    const link = document.createElement('a');
    link.download = 'family-tree.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Box
      sx={{
        width: '100vw',
        minWidth: 350,
        height: { xs: 'auto', md: '100vh' },
        minHeight: '100vh',
        overflowX: 'auto',
        overflowY: 'auto',
        backgroundColor: '#eeeeee',
        pb: { xs: 4, md: 0 },
        position: 'relative',
        backgroundImage: `url('/tree-bg.png')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        '::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 0,
        },
      }}
    >
      {/* رفع zIndex لكل المحتوى ليظهر فوق الطبقة الشفافة */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100vw', minWidth: 350, px: { xs: 0, sm: 0 } }}>
        <Box textAlign="center" py={{ xs: 1, md: 2 }}>
          <Typography variant="h5" fontSize={{ xs: 18, sm: 22 }} sx={{ mb: 2 }}>
            🌳 شجرة العائلة
          </Typography>
          <Box
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            gap={2} // مسافة بين الأزرار
            mt={2}
            justifyContent="center" // توسيط الأزرار داخل الحاوية
            alignItems="center"
            sx={{ maxWidth: '90%', margin: '0 auto' }} // ضبط الحاوية لتتناسب مع عرض الشاشة
          >
            <Button
              variant="outlined"
              onClick={() => navigate('/family')}
              sx={{
                fontSize: { xs: 14, sm: 16 },
                px: { xs: 1, sm: 2 },
                width: { xs: '100%', sm: 'auto' }, // عرض كامل في الشاشات الصغيرة
              }}
            >
              ⬅️ الرجوع إلى إدارة الأفراد
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => navigate('/family')}
              sx={{
                fontSize: { xs: 14, sm: 16 },
                px: { xs: 1, sm: 2 },
                width: { xs: '100%', sm: 'auto' }, // عرض كامل في الشاشات الصغيرة
              }}
            >
              ➕ إضافة فرد جديد
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={exportTreeAsImage}
              sx={{
                fontSize: { xs: 14, sm: 16 },
                px: { xs: 1, sm: 2 },
                width: { xs: '100%', sm: 'auto' }, // عرض كامل في الشاشات الصغيرة
              }}
            >
              🖼️ تصدير الشجرة كصورة
            </Button>
            <FormControlLabel
              control={<Switch checked={showLinked} onChange={e => setShowLinked(e.target.checked)} color="primary" />}
              label="عرض الشجرة الموسعة (الحسابات المرتبطة)"
              sx={{ mx: 1 }}
            />
          </Box>
        </Box>
        {treeData ? (
          <div
            id="tree-container"
            style={{
              width: '100vw',
              minWidth: 350,
              height: '75vh',
              minHeight: 350,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              overflow: 'auto',
              paddingBottom: 24,
            }}
          >
            <Tree
              data={Array.isArray(treeData) && treeData.length === 1 ? treeData[0] : treeData}
              // إذا كان هناك أكثر من جذر، مرر المصفوفة كما هي، إذا جذر واحد مرره ككائن
              orientation="top"
              translate={{ x: window.innerWidth / 2, y: window.innerHeight < 700 ? 90 : 140 }}
              zoomable
              zoom={window.innerWidth < 600 ? 0.95 : 1.1}
              collapsible
              pathFunc="elbow"
              separation={{ siblings: window.innerWidth < 600 ? 1.2 : 2, nonSiblings: window.innerWidth < 600 ? 2 : 2.5 }}
              nodeSize={{ x: window.innerWidth < 600 ? 130 : 180, y: window.innerWidth < 600 ? 170 : 210 }}
              renderCustomNodeElement={({ nodeDatum }) => (
                <foreignObject width={window.innerWidth < 600 ? 110 : 140} height={window.innerWidth < 600 ? 120 : 160} x={window.innerWidth < 600 ? -55 : -70} y={window.innerWidth < 600 ? -60 : -80} style={{ overflow: 'visible' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.93)',
                      border: '1.2px solid #4caf50',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: window.innerWidth < 600 ? '8px 2px 6px 2px' : '14px 8px 10px 8px',
                      fontFamily: "'Tajawal', sans-serif",
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(76,175,80,0.10)',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      gap: 4,
                      margin: 4,
                    }}
                    onClick={() => setSelectedNode(nodeDatum)}
                  >
                    <img
                      src={nodeDatum.avatar || '/boy.png'}
                      alt="avatar"
                      style={{
                        width: window.innerWidth < 600 ? 44 : 60,
                        height: window.innerWidth < 600 ? 44 : 60,
                        borderRadius: '50%',
                        marginBottom: 4,
                        border: 'none',
                        background: '#fff',
                        boxShadow: '0 0 0 4px #e2d1c3',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: window.innerWidth < 600 ? 12 : 15, color: '#222', marginBottom: 2, marginTop: 2 }}>
                      {nodeDatum.name}
                    </div>
                    <div style={{ fontSize: window.innerWidth < 600 ? 10 : 13, color: '#388e3c', marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'rtl' }}>
                      {nodeDatum.attributes?.القرابة}
                    </div>
                    <div style={{ fontSize: window.innerWidth < 600 ? 9 : 11, color: '#888', marginTop: 2 }}>
                      الميلاد: {nodeDatum.attributes?.الميلاد}
                    </div>
                  </div>
                </foreignObject>
              )}
            />
          </div>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
            لا توجد بيانات لعرض الشجرة. الرجاء إضافة أفراد العائلة أولاً.
          </Typography>
        )}
        <Modal open={Boolean(selectedNode)} onClose={() => setSelectedNode(null)}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: 220, sm: 300 },
              bgcolor: 'background.paper',
              boxShadow: 24,
              p: 2,
              borderRadius: 2,
            }}
          >
            {selectedNode && (
              <>
                <Typography variant="h6" gutterBottom fontSize={{ xs: 16, sm: 20 }} mb={1.5}>{selectedNode.name}</Typography>
                <Typography variant="body2" mb={1.2}>
                  القرابة: {selectedNode.attributes?.القرابة ? selectedNode.attributes.القرابة : 'غير محدد'}
                </Typography>
                <Typography variant="body2" mb={1.2}>
                  تاريخ الميلاد: {selectedNode.attributes?.الميلاد ? selectedNode.attributes.الميلاد : 'غير محدد'}
                </Typography>
                <Box mt={2} textAlign="center">
                  <Button variant="contained" onClick={() => setSelectedNode(null)} fullWidth sx={{ py: 1, fontWeight: 700, fontSize: { xs: 15, sm: 17 } }}>
                    إغلاق
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Modal>
      </Box>
    </Box>
  );
}

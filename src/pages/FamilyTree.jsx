
// FamilyTree.jsx
import React, { useEffect, useState } from 'react';
import Tree from 'react-d3-tree';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc  } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Modal, TextField, Switch, FormControlLabel } from '@mui/material';
import html2canvas from 'html2canvas';


export default function FamilyTree() {
  // eslint-disable-next-line no-unused-vars
  const [treeData, setTreeData] = useState(null);
  const [showExtendedTree, setShowExtendedTree] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newPhone, setNewPhone] = useState('');
  const navigate = useNavigate();
  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 200;


  const ensureUserFieldsExist = async (phoneNumber) => {
  const userRef = doc(db, 'users', phoneNumber);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();

      if (!userData.linkedParentUid && userData.parentId) {
        const parentSnap = await getDoc(doc(db, 'users', userData.parentId));
        if (parentSnap.exists()) {
          await setDoc(userRef, { linkedParentUid: parentSnap.id }, { merge: true });
          console.log('🔗 تم ربط linkedParentUid تلقائيًا لهذا المستخدم');
        }
      }
    const requiredFields = ['firstName', 'fatherName', 'grandfatherName', 'surname', 'birthdate', 'relation'];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      const updatedFields = {
        firstName: userData.firstName || 'الاسم',
        fatherName: userData.fatherName || 'الأب',
        grandfatherName: userData.grandfatherName || 'الجد',
        surname: userData.surname || 'اللقب',
        birthdate: userData.birthdate || '1900-01-01',
        relation: userData.relation || 'رب العائلة',
        avatar: userData.avatar || '',
        phone: phoneNumber,
        isFamilyRoot: true,
      };

      await setDoc(userRef, updatedFields, { merge: true });
      console.log('✅ تم تحديث بيانات المستخدم الأساسية');
    }
  } else {
    await setDoc(userRef, {
      firstName: 'الاسم',
      fatherName: 'الأب',
      grandfatherName: 'الجد',
      surname: 'اللقب',
      birthdate: '1900-01-01',
      relation: 'رب العائلة',
      avatar: '',
      phone: phoneNumber,
      isFamilyRoot: true,
    });
    console.log('✅ تم إنشاء وثيقة المستخدم الأساسية');
  }
};


  // إضافة loadTreeData و navigate إلى مصفوفة dependencies في useEffect
  useEffect(() => {
  const run = async () => {
    const storedPhone = localStorage.getItem('verifiedPhone');
    if (!storedPhone) {
      navigate('/login');
    } else {
      await ensureUserFieldsExist(storedPhone);
      loadTreeData(storedPhone);
    }
  };
  run();
}, [navigate]);



  const loadTreeData = async (phoneNumber) => {
    await ensureUserFieldsExist(phoneNumber);

    let allMembers = [];
    let dynamicPhones = new Set();
    dynamicPhones.add(phoneNumber);
    try {
      // 🌀 نتابع سلسلة الآباء تلقائيًا
      let currentPhone = phoneNumber;
      while (true) {
        const userDoc = await getDoc(doc(db, 'users', currentPhone));
        const userData = userDoc.data();
        const linkedParentUid = userData?.linkedParentUid || userData?.parentId;

        if (linkedParentUid && !dynamicPhones.has(linkedParentUid)) {
          dynamicPhones.add(linkedParentUid);
          currentPhone = linkedParentUid;
        } else {
          break;
        }
      }
    } catch (error) {
      console.error('فشل تتبع سلسلة الآباء:', error);
    }

  // تحميل جميع أفراد العائلة من الحسابات المرتبطة
  for (const phone of dynamicPhones) {
    // 1. أفراد العائلة من /family
    const familySnapshot = await getDocs(collection(db, 'users', phone, 'family'));
    const familyMembers = familySnapshot.docs.map(doc => ({
      id: doc.id,
      docId: doc.id, // ✅ هذا السطر هو اللي أضفناه
      ...doc.data(),
      phone
    }));


    // 🔧 نضيف linkedParentUid إذا مفقود لأي عضو
    for (const member of familySnapshot.docs) {
      const data = member.data();
      if (!data.linkedParentUid && data.parentId && data.parentId !== 'manual') {
        const parentSnap = await getDoc(doc(db, 'users', phone, 'family', data.parentId));
        if (parentSnap.exists()) {
          await setDoc(doc.ref, { linkedParentUid: parentSnap.id }, { merge: true });
        }
      }
    }



    // 2. رب العائلة من /users/{phone}
    const userDoc = await getDoc(doc(db, 'users', phone));
    const userData = userDoc.exists() ? {
      id: phone,
      docId: userDoc.id,
      uid: userDoc.id,
      parentId: userDoc.data().parentId || '',
      firstName: userDoc.data().firstName || '',
      fatherName: userDoc.data().fatherName || '',
      grandfatherName: userDoc.data().grandfatherName || '',
      surname: userDoc.data().surname || '',
      birthdate: userDoc.data().birthdate || '',
      relation: userDoc.data().relation || '',
      avatar: userDoc.data().avatar || '',
      phone
    } : null;


    const combined = userData ? [userData, ...familyMembers] : familyMembers;
    allMembers = [...allMembers, ...combined];
  }

    console.log('🔥 allMembers:', allMembers);
    if (allMembers.length > 0) {
    const tree = buildTree(allMembers);
    setTreeData(tree);
  } else {
    setTreeData(null);
  }
};

  
  const buildTree = (members) => {
  if (!members || members.length === 0) return null;

  const personKey = (m) => {
    if (
      m.linkedParentUid &&
      m.parentId === m.phone &&
      m.firstName === '' &&
      m.fatherName === '' &&
      m.grandfatherName === ''
    ) return null;

    return `${m.firstName}|${m.fatherName}|${m.grandfatherName}|${m.surname}|${m.birthdate}|${m.phone}`;
  };

  const mergedMap = {};
  const refMap = {}; // يستخدم لربط parentId بالـ key الصحيح

  members.forEach(m => {
    if (!m.firstName || m.firstName === '') return;

    const key = personKey(m);
    if (!key) return;

  const docId = m.docId || m.id || m.uid || m.phone || '';


    // حفظ المرجع للربط لاحقًا
    if (docId) refMap[docId] = key;
    if (m.uid) refMap[m.uid] = key;

    if (!mergedMap[key]) {
      mergedMap[key] = { ...m, mergedIds: [docId], children: [] };
    } else {
      if (docId && !mergedMap[key].mergedIds.includes(docId)) {
        mergedMap[key].mergedIds.push(docId);
      }
    }
  });

  const idMap = {};
  Object.entries(mergedMap).forEach(([key, m]) => {
    idMap[key] = {
      name: `${m.firstName} ${m.fatherName} ${m.grandfatherName} ${m.surname}`,
      attributes: {
        القرابة: m.relation,
        الميلاد: m.birthdate,
      },
      children: [],
      avatar: m.avatar || '',
      mergedIds: m.mergedIds,
    };
  });

  Object.values(mergedMap).forEach(m => {
    if (m.parentId && m.parentId !== m.id) {
      const parentKey = refMap[m.linkedParentUid || m.parentId];
      const childKey = personKey(m);

      if (!parentKey) {
        console.warn(`🚫 لم يتم العثور على الأب للعضو ${m.firstName} - parentId: ${m.parentId}`);
      } else {
        if (idMap[parentKey] && idMap[childKey]) {
          idMap[parentKey].children.push(idMap[childKey]);
        }
      }
    }
  });

  const roots = Object.values(mergedMap).filter(m =>
    !m.parentId ||
    m.parentId === m.id ||
    m.parentId === 'manual' ||
    !refMap[m.parentId]
  );

  const rootNodes = roots.map(m => idMap[personKey(m)]);
  if (rootNodes.length === 0) return idMap[Object.keys(idMap)[0]];
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
              control={
                <Switch
                  checked={showExtendedTree}
                  onChange={(e) => {
                    setShowExtendedTree(e.target.checked);
                    const phone = localStorage.getItem('verifiedPhone');
                    if (phone) loadTreeData(phone); // إعادة تحميل الشجرة عند تغيير السويتش
                  }}
                  color="primary"
                />
              }
              label="عرض الشجرة الموسعة (تشمل الأب)"
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
                {/* يمكن إضافة المزيد من المعلومات هنا حسب الحاجة */}
              </>
            )}
          </Box>
        </Modal>
      </Box>
    </Box>
  );
}

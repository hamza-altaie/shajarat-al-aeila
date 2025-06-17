import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const FamilyAnalyticsDashboard = ({ treeData, familyData = [] }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // معالجة البيانات وحساب الإحصائيات
  const analytics = useMemo(() => {
    if (!treeData) return null;

    const allPersons = [];
    const generationData = {};
    const relationCounts = {};
    const phoneNumbers = [];
    const birthYears = [];
    const familyDistribution = {};

    // جمع البيانات من الشجرة
    const collectData = (node, depth = 0, parentName = '') => {
      if (!node) return;

      allPersons.push({
        ...node,
        depth,
        parentName,
        hasPhone: Boolean(node.phone),
        hasBirthDate: Boolean(node.birthDate)
      });

      // إحصائيات الأجيال
      generationData[depth] = (generationData[depth] || 0) + 1;

      // إحصائيات العلاقات
      const relation = node.relation || 'غير محدد';
      relationCounts[relation] = (relationCounts[relation] || 0) + 1;

      // أرقام الهواتف
      if (node.phone) {
        phoneNumbers.push(node.phone);
      }

      // سنوات الميلاد
      if (node.birthDate) {
        const year = new Date(node.birthDate).getFullYear();
        if (year > 1900 && year < new Date().getFullYear()) {
          birthYears.push(year);
        }
      }

      // توزيع العائلات
      if (node.familyUid) {
        familyDistribution[node.familyUid] = (familyDistribution[node.familyUid] || 0) + 1;
      }

      // معالجة الأطفال
      if (node.children) {
        node.children.forEach(child => collectData(child, depth + 1, node.name));
      }
    };

    collectData(treeData);

    // تحليل الأعمار
    const currentYear = new Date().getFullYear();
    const ages = birthYears.map(year => currentYear - year);
    const ageGroups = {
      'أطفال (0-12)': ages.filter(age => age >= 0 && age <= 12).length,
      'مراهقون (13-18)': ages.filter(age => age >= 13 && age <= 18).length,
      'شباب (19-35)': ages.filter(age => age >= 19 && age <= 35).length,
      'بالغون (36-55)': ages.filter(age => age >= 36 && age <= 55).length,
      'كبار السن (56+)': ages.filter(age => age >= 56).length
    };

    // بيانات الأجيال للرسم البياني
    const generationChartData = Object.entries(generationData).map(([generation, count]) => ({
      generation: `الجيل ${parseInt(generation) + 1}`,
      count: count,
      percentage: ((count / allPersons.length) * 100).toFixed(1)
    }));

    // بيانات العلاقات للرسم الدائري
    const relationChartData = Object.entries(relationCounts).map(([relation, count]) => ({
      name: relation,
      value: count,
      percentage: ((count / allPersons.length) * 100).toFixed(1)
    }));

    // بيانات الأعمار للرسم البياني
    const ageChartData = Object.entries(ageGroups).map(([group, count]) => ({
      group,
      count,
      percentage: ages.length > 0 ? ((count / ages.length) * 100).toFixed(1) : 0
    }));

    // احصائيات الاتصال
    const contactStats = {
      totalPhones: phoneNumbers.length,
      phonePercentage: ((phoneNumbers.length / allPersons.length) * 100).toFixed(1),
      duplicatePhones: phoneNumbers.length - new Set(phoneNumbers).size,
      totalBirthDates: birthYears.length,
      birthDatePercentage: ((birthYears.length / allPersons.length) * 100).toFixed(1)
    };

    // احصائيات الشجرة
    const treeStats = {
      totalPersons: allPersons.length,
      totalGenerations: Object.keys(generationData).length,
      totalFamilies: Object.keys(familyDistribution).length,
      averageChildrenPerGeneration: (allPersons.length / Object.keys(generationData).length).toFixed(1),
      maleCount: allPersons.filter(p => p.relation !== 'بنت' && p.relation !== 'أم').length,
      femaleCount: allPersons.filter(p => p.relation === 'بنت' || p.relation === 'أم').length,
      completenessScore: (
        (phoneNumbers.length * 0.3 + birthYears.length * 0.3 + allPersons.length * 0.4) / 
        allPersons.length * 100
      ).toFixed(1)
    };

    return {
      allPersons,
      generationChartData,
      relationChartData,
      ageChartData,
      contactStats,
      treeStats,
      ageGroups,
      familyDistribution
    };
  }, [treeData]);

  if (!analytics) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: '#666',
        background: '#f8f9fa',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3>لا توجد بيانات للتحليل</h3>
        <p>يرجى تحميل شجرة العائلة أولاً</p>
      </div>
    );
  }

  // ألوان للرسوم البيانية
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];

  return (
    <div style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Cairo, Arial, sans-serif'
    }}>
      {/* العنوان الرئيسي */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>📊 تحليلات شجرة العائلة</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          رؤى وإحصائيات شاملة عن عائلتك
        </p>
      </div>

      {/* تبويبات التحليل */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'overview', label: '📋 نظرة عامة', icon: '📋' },
          { id: 'generations', label: '👥 الأجيال', icon: '👥' },
          { id: 'demographics', label: '📈 الديموغرافيا', icon: '📈' },
          { id: 'contact', label: '📞 الاتصال', icon: '📞' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '20px',
              background: activeTab === tab.id ? '#2196F3' : '#f0f0f0',
              color: activeTab === tab.id ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {activeTab === 'overview' && (
        <div>
          {/* البطاقات الإحصائية */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <StatCard 
              title="إجمالي الأشخاص" 
              value={analytics.treeStats.totalPersons}
              icon="👥" 
              color="#4ECDC4"
            />
            <StatCard 
              title="عدد الأجيال" 
              value={analytics.treeStats.totalGenerations}
              icon="⏳" 
              color="#FF6B6B"
            />
            <StatCard 
              title="عدد العائلات" 
              value={analytics.treeStats.totalFamilies}
              icon="🏠" 
              color="#45B7D1"
            />
            <StatCard 
              title="اكتمال البيانات" 
              value={`${analytics.treeStats.completenessScore}%`}
              icon="✅" 
              color="#96CEB4"
            />
          </div>

          {/* الرسوم البيانية */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* توزيع الأجيال */}
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>توزيع الأجيال</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.generationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="generation" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4ECDC4" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* توزيع العلاقات */}
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>توزيع العلاقات</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.relationChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({name, percentage}) => `${name} ${percentage}%`}
                  >
                    {analytics.relationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'generations' && (
        <div>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>تحليل الأجيال</h2>
          
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h3>تفاصيل كل جيل</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {analytics.generationChartData.map((gen, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors[index % colors.length]}`
                }}>
                  <span style={{ fontWeight: 'bold' }}>{gen.generation}</span>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span>{gen.count} شخص</span>
                    <span style={{ 
                      background: colors[index % colors.length],
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {gen.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>متوسط عدد الأشخاص لكل جيل</h3>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#4ECDC4',
              textAlign: 'center',
              padding: '20px'
            }}>
              {analytics.treeStats.averageChildrenPerGeneration} شخص
            </div>
          </div>
        </div>
      )}

      {activeTab === 'demographics' && (
        <div>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>التحليل الديموغرافي</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* الفئات العمرية */}
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3>الفئات العمرية</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.ageChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF6B6B" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* النوع الاجتماعي */}
            <div style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3>التوزيع حسب النوع</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👨 ذكور</span>
                  <span style={{ fontWeight: 'bold', color: '#45B7D1' }}>
                    {analytics.treeStats.maleCount} ({((analytics.treeStats.maleCount / analytics.treeStats.totalPersons) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👩 إناث</span>
                  <span style={{ fontWeight: 'bold', color: '#F8BBD9' }}>
                    {analytics.treeStats.femaleCount} ({((analytics.treeStats.femaleCount / analytics.treeStats.totalPersons) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <div style={{ 
                  height: '20px', 
                  background: '#eee', 
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex'
                }}>
                  <div style={{ 
                    width: `${(analytics.treeStats.maleCount / analytics.treeStats.totalPersons) * 100}%`,
                    background: '#45B7D1'
                  }}></div>
                  <div style={{ 
                    width: `${(analytics.treeStats.femaleCount / analytics.treeStats.totalPersons) * 100}%`,
                    background: '#F8BBD9'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>إحصائيات الاتصال</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <StatCard 
              title="أرقام الهاتف المتوفرة" 
              value={`${analytics.contactStats.totalPhones} (${analytics.contactStats.phonePercentage}%)`}
              icon="📞" 
              color="#4ECDC4"
            />
            <StatCard 
              title="تواريخ الميلاد المتوفرة" 
              value={`${analytics.contactStats.totalBirthDates} (${analytics.contactStats.birthDatePercentage}%)`}
              icon="🎂" 
              color="#FF6B6B"
            />
          </div>

          {analytics.contactStats.duplicatePhones > 0 && (
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7',
              padding: '16px', 
              borderRadius: '8px',
              marginTop: '16px'
            }}>
              <strong>⚠️ تنبيه:</strong> يوجد {analytics.contactStats.duplicatePhones} رقم هاتف مكرر
            </div>
          )}

          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3>توصيات لتحسين البيانات</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analytics.contactStats.phonePercentage < 50 && (
                <div style={{ color: '#e17055' }}>
                  • أضف المزيد من أرقام الهواتف لتحسين التواصل
                </div>
              )}
              {analytics.contactStats.birthDatePercentage < 50 && (
                <div style={{ color: '#e17055' }}>
                  • أضف المزيد من تواريخ الميلاد للحصول على تحليل عمري أفضل
                </div>
              )}
              {analytics.treeStats.completenessScore < 70 && (
                <div style={{ color: '#e17055' }}>
                  • اكتمال البيانات أقل من 70%، حاول إضافة المزيد من التفاصيل
                </div>
              )}
              {analytics.contactStats.duplicatePhones === 0 && analytics.contactStats.phonePercentage > 70 && (
                <div style={{ color: '#00b894' }}>
                  ✅ بيانات الاتصال في حالة ممتازة!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// مكون البطاقة الإحصائية
const StatCard = ({ title, value, icon, color }) => (
  <div style={{ 
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    borderTop: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ color: '#666', fontSize: '14px' }}>{title}</div>
  </div>
);

export default FamilyAnalyticsDashboard;
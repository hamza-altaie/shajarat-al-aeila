// src/utils/FamilyAnalytics.js
// محرك إحصائيات ذكي لتحليل شجرة العائلة

export class FamilyAnalytics {
  constructor() {
    this.cache = new Map();
    this.lastAnalysis = null;
  }

  /**
   * التحليل الشامل لشجرة العائلة
   * @param {Object} treeData - بيانات الشجرة
   * @param {Array} familyMembers - أعضاء العائلة (اختياري)
   * @returns {Object} تحليل شامل للعائلة
   */
  analyzeFamily(treeData, familyMembers = []) {
    console.log('🔍 بدء تحليل شجرة العائلة...');
    
    const startTime = Date.now();
    
    // استخراج البيانات
    const allMembers = this.extractAllMembers(treeData, familyMembers);
    console.log(`📊 تم استخراج ${allMembers.length} عضو`);
    
    // التحليل الأساسي
    const basicStats = this.calculateBasicStatistics(allMembers);
    
    // تحليل الأجيال
    const generationAnalysis = this.analyzeGenerations(allMembers);
    
    // التحليل الديموغرافي
    const demographicAnalysis = this.analyzeDemographics(allMembers);
    
    // تحليل العلاقات
    const relationshipAnalysis = this.analyzeRelationships(allMembers);
    
    // التحليل الجغرافي والمهني
    const professionalAnalysis = this.analyzeProfessionalData(allMembers);
    
    // الرؤى الذكية
    const insights = this.generateSmartInsights(allMembers, basicStats);
    
    // تجميع النتائج
    const analysis = {
      metadata: {
        totalMembers: allMembers.length,
        analysisDate: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataQuality: this.assessDataQuality(allMembers)
      },
      basicStats,
      generationAnalysis,
      demographicAnalysis,
      relationshipAnalysis,
      professionalAnalysis,
      insights,
      rawData: allMembers
    };
    
    this.lastAnalysis = analysis;
    console.log(`✅ انتهى التحليل في ${analysis.metadata.processingTime}ms`);
    
    return analysis;
  }

  /**
   * استخراج جميع الأعضاء من الشجرة
   */
  extractAllMembers(treeData, familyMembers = []) {
    let allMembers = [];
    
    // إذا كان لدينا بيانات شجرة، استخراج من الشجرة
    if (treeData) {
      allMembers = this.extractFromTreeStructure(treeData);
    }
    
    // إضافة أعضاء إضافيين إن وجدوا
    if (familyMembers && familyMembers.length > 0) {
      const additionalMembers = familyMembers.filter(fm => 
        !allMembers.some(am => am.id === fm.id || am.globalId === fm.globalId)
      );
      allMembers = [...allMembers, ...additionalMembers];
    }
    
    // تنظيف وتوحيد البيانات
    return allMembers.map(member => this.normalizeMemberData(member));
  }

  /**
   * استخراج الأعضاء من هيكل الشجرة
   */
  extractFromTreeStructure(node, generation = 0, parentId = null) {
    if (!node) return [];
    
    const members = [];
    
    // استخراج بيانات العضو الحالي
    const memberData = {
      id: node.id || node.attributes?.globalId || this.generateId(),
      name: node.name || this.buildFullName(node.attributes || node),
      generation: generation,
      parentId: parentId,
      ...this.extractMemberAttributes(node)
    };
    
    members.push(memberData);
    
    // استخراج الأطفال
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        const childMembers = this.extractFromTreeStructure(
          child, 
          generation + 1, 
          memberData.id
        );
        members.push(...childMembers);
      });
    }
    
    return members;
  }

  /**
   * استخراج خصائص العضو من العقدة
   */
  extractMemberAttributes(node) {
    const attrs = node.attributes || node;
    
    return {
      firstName: attrs.firstName || '',
      fatherName: attrs.fatherName || '',
      surname: attrs.surname || '',
      gender: this.normalizeGender(attrs.gender),
      age: this.parseAge(attrs.age),
      birthDate: attrs.birthDate,
      relation: attrs.relation || 'عضو',
      isMarried: this.parseBoolean(attrs.isMarried),
      education: attrs.education,
      profession: attrs.profession,
      location: attrs.location,
      phone: attrs.phone,
      email: attrs.email,
      avatar: attrs.avatar,
      isExtended: attrs.isExtended || false,
      familyUid: attrs.familyUid,
      familyName: attrs.familyName
    };
  }

  /**
   * توحيد بيانات العضو
   */
  normalizeMemberData(member) {
    return {
      ...member,
      name: member.name || this.buildFullName(member),
      gender: this.normalizeGender(member.gender),
      age: this.parseAge(member.age),
      isMarried: this.parseBoolean(member.isMarried),
      generation: member.generation || 0
    };
  }

  /**
   * بناء الاسم الكامل
   */
  buildFullName(person) {
    if (!person) return 'غير محدد';
    
    const parts = [
      person.firstName,
      person.fatherName,
      person.surname
    ].filter(part => part && part.trim() !== '');
    
    return parts.length > 0 ? parts.join(' ').trim() : (person.name || 'غير محدد');
  }

  /**
   * توحيد الجنس
   */
  normalizeGender(gender) {
    if (!gender) return 'غير محدد';
    
    const genderStr = gender.toString().toLowerCase();
    
    if (genderStr.includes('ذكر') || genderStr.includes('male') || genderStr.includes('رجل')) {
      return 'ذكر';
    }
    if (genderStr.includes('أنثى') || genderStr.includes('female') || genderStr.includes('امرأة')) {
      return 'أنثى';
    }
    
    return 'غير محدد';
  }

  /**
   * تحليل العمر
   */
  parseAge(age) {
    if (!age) return null;
    
    if (typeof age === 'number') return age;
    
    const ageMatch = String(age).match(/(\d+)/);
    return ageMatch ? parseInt(ageMatch[1]) : null;
  }

  /**
   * تحليل القيم المنطقية
   */
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const val = value.toLowerCase();
      return val === 'true' || val === 'متزوج' || val === 'نعم';
    }
    return false;
  }

  /**
   * حساب الإحصائيات الأساسية
   */
  calculateBasicStatistics(members) {
    const total = members.length;
    const males = members.filter(m => m.gender === 'ذكر').length;
    const females = members.filter(m => m.gender === 'أنثى').length;
    const married = members.filter(m => m.isMarried).length;
    
    // حساب الأعمار
    const ages = members.map(m => m.age).filter(age => age !== null);
    const ageStats = ages.length > 0 ? {
      average: Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length),
      min: Math.min(...ages),
      max: Math.max(...ages),
      median: this.calculateMedian(ages)
    } : { average: 0, min: 0, max: 0, median: 0 };
    
    return {
      totalMembers: total,
      genderDistribution: {
        males: males,
        females: females,
        unknown: total - males - females,
        malePercentage: total > 0 ? Math.round((males / total) * 100) : 0,
        femalePercentage: total > 0 ? Math.round((females / total) * 100) : 0
      },
      marriageStats: {
        married: married,
        single: total - married,
        marriageRate: total > 0 ? Math.round((married / total) * 100) : 0
      },
      ageStatistics: ageStats,
      dataCompleteness: this.calculateDataCompleteness(members)
    };
  }

  /**
   * تحليل الأجيال
   */
  analyzeGenerations(members) {
    const generationMap = new Map();
    
    members.forEach(member => {
      const gen = member.generation || 0;
      if (!generationMap.has(gen)) {
        generationMap.set(gen, []);
      }
      generationMap.get(gen).push(member);
    });
    
    const generations = Array.from(generationMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([genNumber, genMembers]) => ({
        generation: genNumber + 1,
        count: genMembers.length,
        percentage: Math.round((genMembers.length / members.length) * 100),
        members: genMembers,
        averageAge: this.calculateAverageAge(genMembers),
        genderRatio: this.calculateGenderRatio(genMembers)
      }));
    
    return {
      totalGenerations: generations.length,
      generations: generations,
      largestGeneration: generations.reduce((max, gen) => 
        gen.count > max.count ? gen : max, { count: 0, generation: 0 }
      ),
      generationGrowth: this.calculateGenerationGrowth(generations)
    };
  }

  /**
   * التحليل الديموغرافي
   */
  analyzeDemographics(members) {
    return {
      ageGroups: this.categorizeByAge(members),
      marriageByAge: this.analyzeMarriageByAge(members),
      genderByGeneration: this.analyzeGenderByGeneration(members),
      populationPyramid: this.createPopulationPyramid(members)
    };
  }

  /**
   * تحليل العلاقات
   */
  analyzeRelationships(members) {
    const relations = this.groupBy(members, 'relation');
    const familyStructure = this.analyzeFamilyStructure(members);
    
    return {
      relationshipTypes: relations,
      uniqueRelations: Object.keys(relations).length,
      familyStructure: familyStructure,
      connectivity: this.calculateFamilyConnectivity(members)
    };
  }

  /**
   * التحليل المهني والجغرافي
   */
  analyzeProfessionalData(members) {
    return {
      professions: this.groupBy(members, 'profession'),
      education: this.groupBy(members, 'education'),
      locations: this.groupBy(members, 'location'),
      employmentRate: this.calculateEmploymentRate(members),
      educationLevel: this.analyzeEducationLevel(members),
      geographicDistribution: this.analyzeGeographicDistribution(members)
    };
  }

  /**
   * توليد رؤى ذكية
   */
  generateSmartInsights(members, basicStats) {
    const insights = [];
    
    // رؤى حول الأجيال
    const generations = this.analyzeGenerations(members);
    if (generations.totalGenerations > 3) {
      insights.push({
        type: 'generations',
        level: 'positive',
        title: 'شجرة عائلة متعددة الأجيال',
        description: `تضم شجرتك ${generations.totalGenerations} أجيال، مما يظهر تاريخاً عائلياً غنياً`,
        icon: '🏛️'
      });
    }
    
    // رؤى حول النمو
    if (generations.largestGeneration.count > 5) {
      insights.push({
        type: 'growth',
        level: 'info',
        title: 'نمو عائلي قوي',
        description: `الجيل ${generations.largestGeneration.generation} هو الأكبر بـ ${generations.largestGeneration.count} أفراد`,
        icon: '📈'
      });
    }
    
    // رؤى حول التوازن الجنسي
    const genderBalance = Math.abs(basicStats.genderDistribution.malePercentage - 50);
    if (genderBalance < 10) {
      insights.push({
        type: 'balance',
        level: 'positive',
        title: 'توازن جنسي مثالي',
        description: 'يوجد توازن جيد بين الذكور والإناث في العائلة',
        icon: '⚖️'
      });
    }
    
    // رؤى حول البيانات
    if (basicStats.dataCompleteness > 80) {
      insights.push({
        type: 'data',
        level: 'positive',
        title: 'بيانات شاملة',
        description: `${basicStats.dataCompleteness}% من البيانات مكتملة`,
        icon: '✅'
      });
    }
    
    return insights;
  }

  /**
   * دوال مساعدة
   */
  
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateAverageAge(members) {
    const ages = members.map(m => m.age).filter(age => age !== null);
    return ages.length > 0 
      ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
      : 0;
  }

  calculateGenderRatio(members) {
    const males = members.filter(m => m.gender === 'ذكر').length;
    const females = members.filter(m => m.gender === 'أنثى').length;
    const total = males + females;
    
    return total > 0 ? {
      males: Math.round((males / total) * 100),
      females: Math.round((females / total) * 100)
    } : { males: 0, females: 0 };
  }

  categorizeByAge(members) {
    const categories = {
      'أطفال (0-12)': 0,
      'مراهقون (13-17)': 0,
      'شباب (18-35)': 0,
      'متوسطو العمر (36-55)': 0,
      'كبار السن (56+)': 0,
      'غير محدد': 0
    };

    members.forEach(member => {
      const age = member.age;
      if (age === null) {
        categories['غير محدد']++;
      } else if (age <= 12) {
        categories['أطفال (0-12)']++;
      } else if (age <= 17) {
        categories['مراهقون (13-17)']++;
      } else if (age <= 35) {
        categories['شباب (18-35)']++;
      } else if (age <= 55) {
        categories['متوسطو العمر (36-55)']++;
      } else {
        categories['كبار السن (56+)']++;
      }
    });

    return categories;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      if (value && value.trim() !== '') {
        const groupKey = value.trim();
        groups[groupKey] = (groups[groupKey] || 0) + 1;
      }
      return groups;
    }, {});
  }

  calculateDataCompleteness(members) {
    if (members.length === 0) return 0;
    
    const fields = ['name', 'gender', 'age', 'relation'];
    let totalFields = members.length * fields.length;
    let completedFields = 0;
    
    members.forEach(member => {
      fields.forEach(field => {
        if (member[field] && member[field] !== 'غير محدد' && member[field] !== '') {
          completedFields++;
        }
      });
    });
    
    return Math.round((completedFields / totalFields) * 100);
  }

  calculateGenerationGrowth(generations) {
    if (generations.length < 2) return [];
    
    const growth = [];
    for (let i = 1; i < generations.length; i++) {
      const current = generations[i].count;
      const previous = generations[i - 1].count;
      const growthRate = previous > 0 
        ? Math.round(((current - previous) / previous) * 100)
        : 0;
      
      growth.push({
        fromGeneration: generations[i - 1].generation,
        toGeneration: generations[i].generation,
        growthRate: growthRate,
        absolute: current - previous
      });
    }
    
    return growth;
  }

  generateId() {
    return 'member_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  assessDataQuality(members) {
    const completeness = this.calculateDataCompleteness(members);
    
    if (completeness >= 90) return 'ممتازة';
    if (completeness >= 70) return 'جيدة';
    if (completeness >= 50) return 'متوسطة';
    return 'تحتاج تحسين';
  }

  // دوال إضافية للتحليلات المتقدمة
  analyzeMarriageByAge(members) {
    const ageGroups = this.categorizeByAge(members);
    const marriageByAge = {};
    
    Object.keys(ageGroups).forEach(ageGroup => {
      const groupMembers = members.filter(m => {
        const age = m.age;
        switch(ageGroup) {
          case 'أطفال (0-12)': return age !== null && age <= 12;
          case 'مراهقون (13-17)': return age !== null && age > 12 && age <= 17;
          case 'شباب (18-35)': return age !== null && age > 17 && age <= 35;
          case 'متوسطو العمر (36-55)': return age !== null && age > 35 && age <= 55;
          case 'كبار السن (56+)': return age !== null && age > 55;
          default: return age === null;
        }
      });
      
      const married = groupMembers.filter(m => m.isMarried).length;
      marriageByAge[ageGroup] = {
        total: groupMembers.length,
        married: married,
        rate: groupMembers.length > 0 ? Math.round((married / groupMembers.length) * 100) : 0
      };
    });
    
    return marriageByAge;
  }

  analyzeGenderByGeneration(members) {
    const generations = new Map();
    
    members.forEach(member => {
      const gen = member.generation || 0;
      if (!generations.has(gen)) {
        generations.set(gen, { males: 0, females: 0, unknown: 0 });
      }
      
      const genData = generations.get(gen);
      if (member.gender === 'ذكر') genData.males++;
      else if (member.gender === 'أنثى') genData.females++;
      else genData.unknown++;
    });
    
    return Array.from(generations.entries()).map(([gen, data]) => ({
      generation: gen + 1,
      ...data,
      total: data.males + data.females + data.unknown
    }));
  }

  createPopulationPyramid(members) {
    const ageRanges = [
      { min: 0, max: 9, label: '0-9' },
      { min: 10, max: 19, label: '10-19' },
      { min: 20, max: 29, label: '20-29' },
      { min: 30, max: 39, label: '30-39' },
      { min: 40, max: 49, label: '40-49' },
      { min: 50, max: 59, label: '50-59' },
      { min: 60, max: 100, label: '60+' }
    ];
    
    return ageRanges.map(range => {
      const rangeMembers = members.filter(m => 
        m.age !== null && m.age >= range.min && m.age <= range.max
      );
      
      return {
        ageRange: range.label,
        males: rangeMembers.filter(m => m.gender === 'ذكر').length,
        females: rangeMembers.filter(m => m.gender === 'أنثى').length,
        total: rangeMembers.length
      };
    });
  }

  analyzeFamilyStructure(members) {
    const parents = members.filter(m => 
      m.relation && (
        m.relation.includes('أب') || 
        m.relation.includes('أم') || 
        m.relation.includes('والد') ||
        m.relation.includes('parent')
      )
    );
    
    const children = members.filter(m => 
      m.relation && (
        m.relation.includes('ابن') || 
        m.relation.includes('بنت') || 
        m.relation.includes('child')
      )
    );
    
    return {
      parents: parents.length,
      children: children.length,
      avgChildrenPerParent: parents.length > 0 ? Math.round(children.length / parents.length * 100) / 100 : 0,
      familySize: members.length
    };
  }

  calculateFamilyConnectivity(members) {
    const connectedMembers = members.filter(m => m.parentId || 
      members.some(other => other.parentId === m.id)
    ).length;
    
    return members.length > 0 
      ? Math.round((connectedMembers / members.length) * 100)
      : 0;
  }

  calculateEmploymentRate(members) {
    const workingAge = members.filter(m => m.age !== null && m.age >= 18 && m.age <= 65);
    const employed = workingAge.filter(m => m.profession && m.profession.trim() !== '');
    
    return workingAge.length > 0 
      ? Math.round((employed.length / workingAge.length) * 100)
      : 0;
  }

  analyzeEducationLevel(members) {
    const education = this.groupBy(members, 'education');
    const levels = {
      'ابتدائي': 0,
      'متوسط': 0,
      'ثانوي': 0,
      'جامعي': 0,
      'دراسات عليا': 0
    };
    
    Object.entries(education).forEach(([edu, count]) => {
      const eduLower = edu.toLowerCase();
      if (eduLower.includes('ابتدائي') || eduLower.includes('primary')) {
        levels['ابتدائي'] += count;
      } else if (eduLower.includes('متوسط') || eduLower.includes('middle')) {
        levels['متوسط'] += count;
      } else if (eduLower.includes('ثانوي') || eduLower.includes('high')) {
        levels['ثانوي'] += count;
      } else if (eduLower.includes('جامعي') || eduLower.includes('bachelor')) {
        levels['جامعي'] += count;
      } else if (eduLower.includes('ماجستير') || eduLower.includes('دكتوراه') || eduLower.includes('master') || eduLower.includes('phd')) {
        levels['دراسات عليا'] += count;
      }
    });
    
    return levels;
  }

  analyzeGeographicDistribution(members) {
    const locations = this.groupBy(members, 'location');
    const totalWithLocation = Object.values(locations).reduce((sum, count) => sum + count, 0);
    
    return {
      locations: locations,
      uniqueLocations: Object.keys(locations).length,
      coverage: members.length > 0 ? Math.round((totalWithLocation / members.length) * 100) : 0,
      mostPopular: Object.entries(locations).sort(([,a], [,b]) => b - a)[0] || ['غير محدد', 0]
    };
  }

  /**
   * تصدير البيانات
   */
  exportAnalysis(format = 'json') {
    if (!this.lastAnalysis) {
      throw new Error('لا يوجد تحليل متاح للتصدير');
    }
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(this.lastAnalysis, null, 2);
      
      case 'csv':
        return this.exportToCSV(this.lastAnalysis.rawData);
      
      case 'summary':
        return this.exportSummary(this.lastAnalysis);
      
      default:
        throw new Error('تنسيق التصدير غير مدعوم');
    }
  }

  exportToCSV(members) {
    const headers = [
      'الاسم', 'الجنس', 'العمر', 'العلاقة', 'الحالة الاجتماعية',
      'التعليم', 'المهنة', 'الموقع', 'الجيل', 'رقم الهاتف'
    ];
    
    const rows = members.map(member => [
      `"${member.name || ''}"`,
      `"${member.gender || ''}"`,
      `"${member.age || ''}"`,
      `"${member.relation || ''}"`,
      `"${member.isMarried ? 'متزوج' : 'غير متزوج'}"`,
      `"${member.education || ''}"`,
      `"${member.profession || ''}"`,
      `"${member.location || ''}"`,
      `"${(member.generation || 0) + 1}"`,
      `"${member.phone || ''}"`
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  exportSummary(analysis) {
    return `
تقرير إحصائيات شجرة العائلة
=====================================

📊 الإحصائيات الأساسية:
- إجمالي الأعضاء: ${analysis.basicStats.totalMembers}
- عدد الأجيال: ${analysis.generationAnalysis.totalGenerations}
- متوسط العمر: ${analysis.basicStats.ageStatistics.average} سنة
- نسبة الزواج: ${analysis.basicStats.marriageStats.marriageRate}%

👥 التوزيع الجنسي:
- ذكور: ${analysis.basicStats.genderDistribution.males} (${analysis.basicStats.genderDistribution.malePercentage}%)
- إناث: ${analysis.basicStats.genderDistribution.females} (${analysis.basicStats.genderDistribution.femalePercentage}%)

🏛️ أكبر جيل:
- الجيل ${analysis.generationAnalysis.largestGeneration.generation} بـ ${analysis.generationAnalysis.largestGeneration.count} أفراد

📈 الرؤى الذكية:
${analysis.insights.map(insight => `- ${insight.icon} ${insight.title}: ${insight.description}`).join('\n')}

تاريخ التحليل: ${new Date(analysis.metadata.analysisDate).toLocaleDateString('ar-SA')}
جودة البيانات: ${analysis.metadata.dataQuality}
    `.trim();
  }
}

// تصدير مثيل واحد للاستخدام العام
export const familyAnalytics = new FamilyAnalytics();
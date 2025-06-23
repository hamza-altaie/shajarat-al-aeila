// Helper functions for FamilyTreeContext

export function calculateAverageAge(stats) {
  if (!stats.familyStats || !stats.familyStats.members) return 0;

  const membersWithAge = stats.familyStats.members.filter(m => m.birthDate);
  if (membersWithAge.length === 0) return 0;

  const totalAge = membersWithAge.reduce((sum, member) => {
    const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
    return sum + age;
  }, 0);

  return Math.round(totalAge / membersWithAge.length);
}

export function findMostCommonRelation(stats) {
  if (!stats.familyStats || !stats.familyStats.relations) return null;

  const relations = stats.familyStats.relations;
  let maxCount = 0;
  let mostCommon = null;

  Object.entries(relations).forEach(([relation, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = relation;
    }
  });

  return mostCommon;
}

export function calculateGenerationSpread(stats) {
  if (!stats.familyStats || !stats.familyStats.generations) return 0;

  const generations = Object.keys(stats.familyStats.generations).map(Number);
  return Math.max(...generations) - Math.min(...generations);
}

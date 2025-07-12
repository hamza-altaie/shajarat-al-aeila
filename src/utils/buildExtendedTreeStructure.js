export function buildExtendedTreeStructure(allMembers, rootUid) {
  const visited = new Set();

  function buildNode(uid) {
    if (visited.has(uid)) return null;
    visited.add(uid);

    const person = allMembers.find(p => p.uid === uid);
    if (!person) return null;

    const children = allMembers
      .filter(child => child.linkedParentUid === uid)
      .map(child => buildNode(child.uid))
      .filter(Boolean);

    return {
      name: person.name,
      uid: person.uid,
      gender: person.gender,
      relation: person.relation,
      isExtended: person.linkedParentUid !== rootUid,
      attributes: {
        ...person,
        childrenCount: children.length,
        type: person.relationType || 'direct',
      },
      children,
    };
  }

  return buildNode(rootUid);
}

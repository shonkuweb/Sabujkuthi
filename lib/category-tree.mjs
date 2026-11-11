export function buildCategoryTree(categories = []) {
  const map = {};
  const roots = [];

  for (const cat of categories) {
    map[cat.id] = { ...cat, children: [] };
  }

  for (const cat of categories) {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  }

  return roots;
}

export function flattenCategoryTree(tree = [], depth = 0, result = []) {
  for (const node of tree) {
    const prefix = depth === 0 ? '' : '  '.repeat(depth - 1) + '└─ ';
    result.push({ ...node, depth, prefix });
    if (node.children && node.children.length > 0) {
      flattenCategoryTree(node.children, depth + 1, result);
    }
  }
  return result;
}

export function getDescendantIds(categoryId, categories = []) {
  const descendants = new Set();
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    for (const cat of categories) {
      if (cat.parentId === currentId && !descendants.has(cat.id)) {
        descendants.add(cat.id);
        queue.push(cat.id);
      }
    }
  }

  return descendants;
}

export function getCategoryPath(categoryId, categories = []) {
  const path = [];
  let currentId = categoryId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const cat = categories.find(c => c.id === currentId);
    if (!cat) break;
    path.unshift(cat);
    currentId = cat.parentId || null;
  }

  return path;
}

export function getCategoryAndDescendantIds(categoryId, categories = []) {
  const ids = new Set([categoryId]);
  const descendants = getDescendantIds(categoryId, categories);
  for (const id of descendants) ids.add(id);
  return Array.from(ids);
}

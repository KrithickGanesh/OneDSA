export const PLATFORMS = [
  { id: 'codeforces', name: 'Codeforces', color: '#1890FF', icon: 'code' },
  { id: 'leetcode', name: 'LeetCode', color: '#FFA116', icon: 'code' },
  { id: 'codechef', name: 'CodeChef', color: '#5B4638', icon: 'chef-hat' },
  { id: 'hackerrank', name: 'HackerRank', color: '#2EC866', icon: 'terminal' },
  { id: 'gfg', name: 'GeeksforGeeks', color: '#2F8D46', icon: 'book-open' }
];

export const DIFFICULTY_LEVELS = [
  { id: 'Easy', name: 'Easy', color: '#22c55e' },
  { id: 'Medium', name: 'Medium', color: '#eab308' },
  { id: 'Hard', name: 'Hard', color: '#ef4444' }
];

export const DIFFICULTY_RANGES = {
  codeforces: {
    Easy: { min: 800, max: 1200 },
    Medium: { min: 1300, max: 1800 },
    Hard: { min: 1900, max: 3500 }
  },
  leetcode: {
    Easy: { min: 0, max: 0 },
    Medium: { min: 1, max: 1 },
    Hard: { min: 2, max: 2 }
  },
  codechef: {
    Easy: { min: 0, max: 1400 },
    Medium: { min: 1401, max: 1800 },
    Hard: { min: 1801, max: 3000 }
  }
};

export const TAG_CANONICAL_MAP: Record<string, string> = {
  // Array
  'arrays': 'Array',
  'array': 'Array',
  
  // Hash Table
  'hash-table': 'Hash Table',
  'hashing': 'Hash Table',
  
  // Math
  'math': 'Math',
  'mathematics': 'Math',
  'number theory': 'Math',
  
  // DP
  'dynamic programming': 'Dynamic Programming',
  'dp': 'Dynamic Programming',
  
  // Graph
  'graph': 'Graph',
  'graphs': 'Graph',
  
  // String
  'string': 'String',
  'strings': 'String',
  
  // Sorting
  'sortings': 'Sorting',
  'sorting': 'Sorting',
  
  // Greedy
  'greedy': 'Greedy',
  
  // Binary Search
  'binary search': 'Binary Search',
  'binary-search': 'Binary Search',
  
  // Trees
  'trees': 'Tree',
  'tree': 'Tree',
  
  // DFS and BFS
  'dfs': 'Depth-First Search',
  'depth-first search': 'Depth-First Search',
  'dfs and similar': 'Depth-First Search',
  'bfs': 'Breadth-First Search',
  'breadth-first search': 'Breadth-First Search',
  
  // Matrix
  'matrix': 'Matrix',
  'matrices': 'Matrix',
  
  // Two Pointers
  'two pointers': 'Two Pointers',
  'two-pointers': 'Two Pointers',
  
  // Bit Manipulation
  'bit manipulation': 'Bit Manipulation',
  'bitmasks': 'Bit Manipulation',
  
  // Stack
  'stack': 'Stack',
  
  // Design
  'design': 'Design',
  
  // Heap
  'heap': 'Heap (Priority Queue)',
  'priority queue': 'Heap (Priority Queue)',
  
  // Backtracking
  'backtracking': 'Backtracking',
  
  // Simulation
  'simulation': 'Simulation',
  'implementation': 'Simulation',
  
  // Prefix Sum
  'prefix sum': 'Prefix Sum',
  
  // Sliding Window
  'sliding window': 'Sliding Window',
  
  // Trie
  'trie': 'Trie',
  
  // Recursion
  'recursion': 'Recursion',
  
  // Geometry
  'geometry': 'Geometry',
  
  // Disjoint Set
  'disjoint set': 'Union Find',
  'union find': 'Union Find',
  'dsu': 'Union Find',
  
  // Seg Tree
  'segment tree': 'Segment Tree',
  
  // Binary Indexed Tree
  'binary indexed tree': 'Binary Indexed Tree',
  'fenwick': 'Binary Indexed Tree',
  
  // Divide and Conquer
  'divide and conquer': 'Divide and Conquer',
  
  // Topological Sort
  'topological sort': 'Topological Sort'
};

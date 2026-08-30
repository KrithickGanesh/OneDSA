import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Curated GFG problem catalog — top DSA problems from SDE Sheet, Striver's A2Z, Love Babbar
// GFG has no API, so we maintain a static catalog of popular practice problems
const GFG_CURATED_PROBLEMS: Array<{
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
}> = [
  // Array
  { id: 'subarray-with-given-sum-1587115621', title: 'Subarray with given sum', difficulty: 'Easy', tags: ['array', 'sliding-window'] },
  { id: 'missing-number-in-array1416', title: 'Missing number in array', difficulty: 'Easy', tags: ['array', 'math'] },
  { id: 'kadanes-algorithm-1587115620', title: "Kadane's Algorithm", difficulty: 'Medium', tags: ['array', 'dynamic-programming'] },
  { id: 'sort-an-array-of-0s-1s-and-2s4231', title: 'Sort an array of 0s, 1s and 2s', difficulty: 'Easy', tags: ['array', 'sorting'] },
  { id: 'equilibrium-point-1587115620', title: 'Equilibrium Point', difficulty: 'Easy', tags: ['array', 'math'] },
  { id: 'leaders-in-an-array-1587115620', title: 'Leaders in an array', difficulty: 'Easy', tags: ['array'] },
  { id: 'minimum-platforms-1587115620', title: 'Minimum Platforms', difficulty: 'Medium', tags: ['array', 'sorting', 'greedy'] },
  { id: 'inversion-of-array-1587115620', title: 'Inversion of array', difficulty: 'Medium', tags: ['array', 'divide-and-conquer'] },
  { id: 'stock-buy-and-sell2615', title: 'Stock buy and sell', difficulty: 'Easy', tags: ['array', 'greedy'] },
  { id: 'trapping-rain-water-1587115621', title: 'Trapping Rain Water', difficulty: 'Medium', tags: ['array', 'two-pointers', 'stack'] },
  { id: 'merge-two-sorted-arrays-1587115620', title: 'Merge Without Extra Space', difficulty: 'Hard', tags: ['array', 'sorting'] },
  { id: 'kth-smallest-element5635', title: 'Kth Smallest Element', difficulty: 'Medium', tags: ['array', 'sorting', 'heap'] },
  { id: 'spirally-traversing-a-matrix-1587115621', title: 'Spirally traversing a Matrix', difficulty: 'Medium', tags: ['array', 'matrix'] },
  { id: 'largest-subarray-with-0-sum', title: 'Largest subarray with 0 sum', difficulty: 'Medium', tags: ['array', 'hashing'] },
  { id: 'count-pairs-with-given-sum5022', title: 'Count pairs with given sum', difficulty: 'Easy', tags: ['array', 'hashing'] },

  // String
  { id: 'reverse-words-in-a-given-string5459', title: 'Reverse words in a given string', difficulty: 'Easy', tags: ['string'] },
  { id: 'permutations-of-a-given-string2041', title: 'Permutations of a given string', difficulty: 'Medium', tags: ['string', 'backtracking'] },
  { id: 'longest-palindrome-in-a-string3411', title: 'Longest Palindrome in a String', difficulty: 'Medium', tags: ['string', 'dynamic-programming'] },
  { id: 'implement-strstr', title: 'Implement strstr', difficulty: 'Easy', tags: ['string'] },
  { id: 'longest-common-subsequence-1587115620', title: 'Longest Common Subsequence', difficulty: 'Medium', tags: ['string', 'dynamic-programming'] },
  { id: 'anagram-1587115620', title: 'Anagram', difficulty: 'Easy', tags: ['string', 'hashing'] },
  { id: 'longest-distinct-characters-in-string5848', title: 'Longest Distinct Characters in String', difficulty: 'Medium', tags: ['string', 'sliding-window'] },
  { id: 'roman-number-to-integer3201', title: 'Roman Number to Integer', difficulty: 'Easy', tags: ['string', 'math'] },

  // Linked List
  { id: 'reverse-a-linked-list', title: 'Reverse a Linked List', difficulty: 'Easy', tags: ['linked-list'] },
  { id: 'detect-loop-in-linked-list', title: 'Detect Loop in Linked List', difficulty: 'Easy', tags: ['linked-list', 'two-pointers'] },
  { id: 'remove-loop-in-linked-list', title: 'Remove loop in Linked List', difficulty: 'Medium', tags: ['linked-list'] },
  { id: 'finding-middle-element-in-a-linked-list', title: 'Finding middle element in a linked list', difficulty: 'Easy', tags: ['linked-list'] },
  { id: 'nth-node-from-end-of-linked-list', title: 'Nth node from end of linked list', difficulty: 'Easy', tags: ['linked-list'] },
  { id: 'merge-two-sorted-linked-lists', title: 'Merge two sorted linked lists', difficulty: 'Easy', tags: ['linked-list', 'sorting'] },
  { id: 'pairwise-swap-elements-of-a-linked-list-by-swapping-data', title: 'Pairwise swap elements of a linked list', difficulty: 'Easy', tags: ['linked-list'] },
  { id: 'add-two-numbers-represented-by-linked-lists', title: 'Add two numbers represented by linked lists', difficulty: 'Medium', tags: ['linked-list', 'math'] },
  { id: 'intersection-point-in-y-shapped-linked-lists', title: 'Intersection Point in Y Shaped Linked Lists', difficulty: 'Medium', tags: ['linked-list', 'two-pointers'] },
  { id: 'flattening-a-linked-list', title: 'Flattening a Linked List', difficulty: 'Medium', tags: ['linked-list', 'sorting'] },

  // Stack & Queue
  { id: 'next-larger-element-1587115620', title: 'Next Greater Element', difficulty: 'Medium', tags: ['stack', 'array'] },
  { id: 'stock-span-problem-1587115621', title: 'Stock span problem', difficulty: 'Medium', tags: ['stack'] },
  { id: 'parenthesis-checker2744', title: 'Parenthesis Checker', difficulty: 'Easy', tags: ['stack', 'string'] },
  { id: 'the-celebrity-problem1702', title: 'The Celebrity Problem', difficulty: 'Medium', tags: ['stack', 'graph'] },
  { id: 'queue-using-two-stacks', title: 'Queue using two Stacks', difficulty: 'Easy', tags: ['stack', 'queue'] },
  { id: 'maximum-of-all-subarrays-of-size-k3101', title: 'Maximum of all subarrays of size k', difficulty: 'Medium', tags: ['queue', 'sliding-window'] },
  { id: 'implement-two-stacks-in-an-array', title: 'Implement two stacks in an array', difficulty: 'Easy', tags: ['stack', 'array'] },

  // Tree
  { id: 'height-of-binary-tree', title: 'Height of Binary Tree', difficulty: 'Easy', tags: ['tree', 'recursion'] },
  { id: 'level-order-traversal', title: 'Level order traversal', difficulty: 'Easy', tags: ['tree', 'bfs'] },
  { id: 'diameter-of-binary-tree', title: 'Diameter of Binary Tree', difficulty: 'Easy', tags: ['tree', 'recursion'] },
  { id: 'mirror-tree', title: 'Mirror Tree', difficulty: 'Easy', tags: ['tree'] },
  { id: 'check-for-bst', title: 'Check for BST', difficulty: 'Medium', tags: ['tree', 'bst'] },
  { id: 'binary-tree-to-dll', title: 'Binary Tree to DLL', difficulty: 'Hard', tags: ['tree', 'linked-list'] },
  { id: 'serialize-and-deserialize-a-binary-tree', title: 'Serialize and Deserialize a Binary Tree', difficulty: 'Medium', tags: ['tree'] },
  { id: 'lowest-common-ancestor-in-a-bst', title: 'Lowest Common Ancestor in a BST', difficulty: 'Easy', tags: ['tree', 'bst'] },
  { id: 'left-view-of-binary-tree', title: 'Left View of Binary Tree', difficulty: 'Easy', tags: ['tree', 'bfs'] },
  { id: 'bottom-view-of-binary-tree', title: 'Bottom View of Binary Tree', difficulty: 'Medium', tags: ['tree', 'bfs', 'hashing'] },
  { id: 'connect-nodes-at-same-level', title: 'Connect Nodes at Same Level', difficulty: 'Medium', tags: ['tree', 'bfs'] },
  { id: 'vertical-traversal-of-binary-tree', title: 'Vertical Traversal of Binary Tree', difficulty: 'Medium', tags: ['tree', 'hashing'] },

  // Graph
  { id: 'bfs-traversal-of-graph', title: 'BFS of graph', difficulty: 'Easy', tags: ['graph', 'bfs'] },
  { id: 'depth-first-traversal-for-a-graph', title: 'DFS of Graph', difficulty: 'Easy', tags: ['graph', 'dfs'] },
  { id: 'detect-cycle-in-an-undirected-graph', title: 'Detect cycle in an undirected graph', difficulty: 'Medium', tags: ['graph', 'dfs', 'bfs'] },
  { id: 'detect-cycle-in-a-directed-graph', title: 'Detect cycle in a directed graph', difficulty: 'Medium', tags: ['graph', 'dfs'] },
  { id: 'topological-sort', title: 'Topological sort', difficulty: 'Medium', tags: ['graph', 'dfs', 'topological-sort'] },
  { id: 'shortest-path-in-undirected-graph', title: 'Shortest path in Undirected Graph', difficulty: 'Medium', tags: ['graph', 'bfs'] },
  { id: 'implementing-dijkstra-set-1-adjacency-matrix', title: "Implementing Dijkstra", difficulty: 'Medium', tags: ['graph', 'greedy', 'shortest-path'] },
  { id: 'minimum-spanning-tree', title: 'Minimum Spanning Tree', difficulty: 'Medium', tags: ['graph', 'greedy'] },
  { id: 'strongly-connected-components-kosarajus-algo', title: 'Strongly Connected Components', difficulty: 'Hard', tags: ['graph', 'dfs'] },
  { id: 'number-of-islands', title: 'Number of Islands', difficulty: 'Medium', tags: ['graph', 'bfs', 'matrix'] },
  { id: 'alien-dictionary', title: 'Alien Dictionary', difficulty: 'Hard', tags: ['graph', 'topological-sort'] },

  // Dynamic Programming
  { id: 'longest-increasing-subsequence-1587115620', title: 'Longest Increasing Subsequence', difficulty: 'Medium', tags: ['dynamic-programming', 'array'] },
  { id: '0-1-knapsack-problem0945', title: '0 - 1 Knapsack Problem', difficulty: 'Medium', tags: ['dynamic-programming'] },
  { id: 'coin-change2448', title: 'Coin Change', difficulty: 'Medium', tags: ['dynamic-programming'] },
  { id: 'edit-distance3702', title: 'Edit Distance', difficulty: 'Medium', tags: ['dynamic-programming', 'string'] },
  { id: 'matrix-chain-multiplication0303', title: 'Matrix Chain Multiplication', difficulty: 'Hard', tags: ['dynamic-programming'] },
  { id: 'egg-dropping-puzzle-1587115620', title: 'Egg Dropping Puzzle', difficulty: 'Medium', tags: ['dynamic-programming'] },
  { id: 'longest-common-substring1452', title: 'Longest Common Substring', difficulty: 'Medium', tags: ['dynamic-programming', 'string'] },
  { id: 'maximum-sum-increasing-subsequence4749', title: 'Maximum sum increasing subsequence', difficulty: 'Medium', tags: ['dynamic-programming', 'array'] },
  { id: 'subset-sum-problem-1611555638', title: 'Subset Sum Problem', difficulty: 'Medium', tags: ['dynamic-programming'] },
  { id: 'minimum-number-of-jumps-1587115620', title: 'Minimum number of jumps', difficulty: 'Medium', tags: ['dynamic-programming', 'array', 'greedy'] },
  { id: 'word-break1352', title: 'Word Break', difficulty: 'Medium', tags: ['dynamic-programming', 'string'] },
  { id: 'ncr1019', title: 'nCr', difficulty: 'Medium', tags: ['dynamic-programming', 'math'] },

  // Greedy
  { id: 'activity-selection-1587115620', title: 'Activity Selection', difficulty: 'Easy', tags: ['greedy', 'sorting'] },
  { id: 'n-meetings-in-one-room-1587115620', title: 'N meetings in one room', difficulty: 'Easy', tags: ['greedy', 'sorting'] },
  { id: 'job-sequencing-problem-1587115620', title: 'Job Sequencing Problem', difficulty: 'Medium', tags: ['greedy', 'sorting'] },
  { id: 'fractional-knapsack-1587115620', title: 'Fractional Knapsack', difficulty: 'Medium', tags: ['greedy'] },
  { id: 'huffman-encoding3345', title: 'Huffman Encoding', difficulty: 'Medium', tags: ['greedy', 'tree', 'heap'] },

  // Binary Search
  { id: 'binary-search-1587115620', title: 'Binary Search', difficulty: 'Easy', tags: ['binary-search', 'array'] },
  { id: 'floor-in-a-sorted-array-1587115620', title: 'Floor in a Sorted Array', difficulty: 'Easy', tags: ['binary-search'] },
  { id: 'count-occurrences-of-a-number', title: 'Count Occurrences of a number', difficulty: 'Easy', tags: ['binary-search'] },
  { id: 'search-in-a-rotated-array4618', title: 'Search in a Rotated Array', difficulty: 'Medium', tags: ['binary-search', 'array'] },
  { id: 'k-th-element-of-two-sorted-array1317', title: 'K-th element of two sorted arrays', difficulty: 'Medium', tags: ['binary-search'] },
  { id: 'median-of-2-sorted-arrays-of-different-sizes', title: 'Median of 2 Sorted Arrays', difficulty: 'Hard', tags: ['binary-search', 'array'] },
  { id: 'allocate-minimum-number-of-pages0937', title: 'Allocate Minimum Pages', difficulty: 'Medium', tags: ['binary-search'] },

  // Hashing
  { id: 'longest-consecutive-subsequence2449', title: 'Longest Consecutive Subsequence', difficulty: 'Medium', tags: ['hashing', 'array'] },
  { id: 'array-subset-of-another-array2317', title: 'Array Subset of another array', difficulty: 'Easy', tags: ['hashing'] },
  { id: 'common-elements1132', title: 'Common Elements', difficulty: 'Easy', tags: ['hashing', 'array'] },

  // Recursion / Backtracking
  { id: 'rat-in-a-maze-problem', title: 'Rat in a Maze Problem', difficulty: 'Medium', tags: ['backtracking', 'recursion'] },
  { id: 'n-queen-problem0315', title: 'N-Queen Problem', difficulty: 'Hard', tags: ['backtracking', 'recursion'] },
  { id: 'solve-the-sudoku-1587115621', title: 'Solve the Sudoku', difficulty: 'Hard', tags: ['backtracking', 'recursion'] },
  { id: 'word-boggle4143', title: 'Word Boggle', difficulty: 'Medium', tags: ['backtracking', 'matrix'] },

  // Heap
  { id: 'k-largest-elements4206', title: 'K Largest Elements', difficulty: 'Medium', tags: ['heap', 'sorting'] },
  { id: 'merge-k-sorted-arrays', title: 'Merge k Sorted Arrays', difficulty: 'Medium', tags: ['heap'] },
  { id: 'find-median-in-a-stream-1587115620', title: 'Find median in a stream', difficulty: 'Hard', tags: ['heap'] },
  { id: 'rearrange-characters4649', title: 'Rearrange characters', difficulty: 'Medium', tags: ['heap', 'string', 'greedy'] },

  // Bit Manipulation
  { id: 'count-total-set-bits-1587115620', title: 'Count total set bits', difficulty: 'Medium', tags: ['bit-manipulation', 'math'] },
  { id: 'power-of-2-1587115620', title: 'Power of 2', difficulty: 'Easy', tags: ['bit-manipulation'] },
  { id: 'find-position-of-set-bit3706', title: 'Find position of set bit', difficulty: 'Easy', tags: ['bit-manipulation'] },

  // Trie
  { id: 'trie-insert-and-search0651', title: 'Trie (Insert and Search)', difficulty: 'Medium', tags: ['trie', 'string'] },
  { id: 'phone-directory4628', title: 'Phone directory', difficulty: 'Medium', tags: ['trie', 'string'] },

  // Segment Tree
  { id: 'range-minimum-query', title: 'Range Minimum Query', difficulty: 'Medium', tags: ['segment-tree', 'array'] },
];

export async function fetchGFGProblems(): Promise<Problem[]> {
  const problems: Problem[] = GFG_CURATED_PROBLEMS.map(c => {
    const { level, rating } = normalizeDifficulty('gfg', c.difficulty);
    return {
      id: `gfg-${c.id}`,
      platform: 'gfg',
      platformProblemId: c.id,
      title: c.title,
      url: `https://practice.geeksforgeeks.org/problems/${c.id}/1`,
      difficultyLevel: level,
      difficultyRating: rating,
      tags: normalizeTags(c.tags),
      rawTags: c.tags,
      isPremium: false,
    };
  });

  return problems;
}

export async function fetchGFGUserSolved(handle: string): Promise<UserSolvedProblem[]> {
  try {
    // GFG profile page: https://www.geeksforgeeks.org/user/{handle}/
    // We try to extract solved problem info from the profile page
    const profileUrl = `https://www.geeksforgeeks.org/user/${handle}/`;
    const response = await fetchWithTimeout(profileUrl, {
      headers: HEADERS,
    }, 15000);

    if (!response.ok) {
      console.error(`GFG profile fetch failed for ${handle}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const solvedProblems: UserSolvedProblem[] = [];
    const seenIds = new Set<string>();

    // Method 1: Extract problem links from the solved problems section
    // GFG profile pages typically contain links to solved problems
    // Pattern: /problems/problem-slug/1 or /problems/problem-slug
    const problemLinkRegex = /href="(?:https?:\/\/(?:practice\.)?geeksforgeeks\.org)?\/problems\/([a-z0-9-]+)(?:\/\d+)?"/gi;
    let match;
    while ((match = problemLinkRegex.exec(html)) !== null) {
      const slug = match[1];
      if (slug && slug.length >= 3 && !seenIds.has(slug) && !/^(all|easy|medium|hard|school|basic|practice)$/i.test(slug)) {
        seenIds.add(slug);
        solvedProblems.push({
          platform: 'gfg',
          platformProblemId: slug,
        });
      }
    }

    // Method 2: Try to match against our curated catalog
    // Some GFG profile pages embed problem titles; match them against our catalog
    for (const catalogProblem of GFG_CURATED_PROBLEMS) {
      if (!seenIds.has(catalogProblem.id)) {
        // Check if the problem title appears in the HTML (case-insensitive)
        const titleEscaped = catalogProblem.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const titleRegex = new RegExp(titleEscaped, 'i');
        if (titleRegex.test(html)) {
          seenIds.add(catalogProblem.id);
          solvedProblems.push({
            platform: 'gfg',
            platformProblemId: catalogProblem.id,
          });
        }
      }
    }

    return solvedProblems;
  } catch (error) {
    console.error(`GFG user solved sync error for ${handle}:`, error);
    return [];
  }
}

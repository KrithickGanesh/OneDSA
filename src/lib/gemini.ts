import { GoogleGenAI, Type, Schema } from '@google/genai';

export function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

export interface ParsedSearchFilter {
  platforms: string[];
  topics: string[];
  difficulty_level: string;
  difficulty_min: number | null;
  difficulty_max: number | null;
  limit: number | null;
  exclude_solved: boolean;
  sort_by: string;
}

const FILTER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    platforms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of platforms requested, e.g., 'codeforces', 'leetcode', 'codechef'"
    },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of requested topics or canonical tags like 'Array', 'Dynamic Programming', 'Math'"
    },
    difficulty_level: {
      type: Type.STRING,
      description: "General difficulty level requested: 'Easy', 'Medium', or 'Hard'"
    },
    difficulty_min: {
      type: Type.INTEGER,
      description: "Minimum difficulty rating if specified"
    },
    difficulty_max: {
      type: Type.INTEGER,
      description: "Maximum difficulty rating if specified"
    },
    limit: {
      type: Type.INTEGER,
      description: "Maximum number of problems to return"
    },
    exclude_solved: {
      type: Type.BOOLEAN,
      description: "Whether the user wants to exclude problems they have already solved"
    },
    sort_by: {
      type: Type.STRING,
      description: "Field to sort by, e.g., 'difficulty', 'date', 'popularity'"
    }
  },
  required: ["platforms", "topics", "difficulty_level", "exclude_solved", "sort_by"]
};

const SYSTEM_PROMPT = `You are an AI assistant for a competitive programming problem aggregator (OneDSA). 
Your task is to parse natural language search queries and extract structured filter parameters.
Map topics to standard tags like 'Array', 'Hash Table', 'Math', 'Dynamic Programming', 'Graph', 'String', 'Sorting', 'Greedy', 'Binary Search', 'Tree', 'Depth-First Search', 'Breadth-First Search', 'Two Pointers', 'Bit Manipulation', 'Stack', etc.
Map platforms to canonical IDs: 'codeforces', 'leetcode', 'codechef', 'hackerrank', 'gfg'.
Identify difficulty levels (Easy, Medium, Hard) or specific numerical rating ranges (e.g., Codeforces 1200-1500).
Identify intent to exclude solved problems (e.g., "new problems", "unsolved", "that I haven't done").
Identify limits (e.g., "give me 5 problems" -> limit: 5).`;

export async function parseSearchQuery(client: GoogleGenAI, query: string): Promise<ParsedSearchFilter> {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: FILTER_SCHEMA,
      temperature: 0.1
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to parse search query');
  }
  
  return JSON.parse(text) as ParsedSearchFilter;
}

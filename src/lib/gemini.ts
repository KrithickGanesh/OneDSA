import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedPromptResult {
  topic: string | null;
  difficulty: "Easy" | "Medium" | "Hard" | null;
  platforms: string[];
  unsolved: boolean;
  limit: number;
  similarTo: string | null;
}

export async function parsePrompt(prompt: string, customApiKey?: string): Promise<ParsedPromptResult> {
  const apiKey = customApiKey || process.env.SYSTEM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set SYSTEM_GEMINI_API_KEY in .env.local or provide a custom key in settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const systemPrompt = `
You are an AI parser for a DSA platform called OneDSA.

Convert the user's request into structured JSON filters.

Return ONLY valid JSON.

Schema:
{
  "topic": string | null,
  "difficulty": "Easy" | "Medium" | "Hard" | null,
  "platforms": string[],
  "unsolved": boolean,
  "limit": number,
  "similarTo": string | null
}

Rules:
- Map topics to standard DSA categories like "Tree", "Array", "Dynamic Programming", "Graph", "String", "Binary Search", "Hash Table", "Two Pointers", "Stack", "Queue", "Math", "Greedy", etc.
- Map platform names to lowercase strings: ["leetcode", "codeforces", "codechef", "hackerrank", "gfg"]. If no specific platform is mentioned, include ["leetcode", "codeforces", "codechef", "hackerrank", "gfg"].
- If the user asks for unsolved, new, or problems they haven't done, set unsolved to true.
- Default limit to 5 if not specified.
- If the user asks for problems similar to a specific problem (e.g. "Similar to Two Sum"), set similarTo to that problem title/slug.
`;

  const result = await model.generateContent([
    systemPrompt,
    prompt,
  ]);

  let text = result.response.text();
  
  // Clean markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(text) as ParsedPromptResult;
}

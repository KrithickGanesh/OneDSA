import dotenv from "dotenv";
import path from "path";

// Load .env.local for local testing
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { parsePrompt } from "./gemini";

async function test() {
  const result = await parsePrompt(
    "Give me 5 easy tree problems from LeetCode that I haven't solved."
  );

  console.log(result);
}

test();

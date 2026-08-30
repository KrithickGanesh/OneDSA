async function testOtherEndpoints() {
  const username = "Krithick1637";

  // Test alfa-leetcode-api / public proxies
  const apis = [
    `https://alfa-leetcode-api.onrender.com/${username}/solved`,
    `https://alfa-leetcode-api.onrender.com/${username}/acSubmission`,
    `https://leetcode-stats-api.herokuapp.com/${username}`
  ];

  for (const url of apis) {
    try {
      console.log(`Checking ${url}...`);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`${url} status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`${url} response:`, JSON.stringify(json).slice(0, 300));
      }
    } catch (e) {
      console.log(`${url} err: ${e.message}`);
    }
  }
}

testOtherEndpoints().catch(console.error);

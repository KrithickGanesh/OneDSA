async function testLC() {
  const username = "Krithick1637";
  
  const userQuery = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      recentAcSubmissionList(username: $username, limit: 1000) {
        title
        titleSlug
        timestamp
      }
    }
  `;
  const res2 = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query: userQuery, variables: { username } })
  });
  const data2 = await res2.json();
  console.log('User stats for Krithick1637:', JSON.stringify(data2.data?.matchedUser?.submitStats, null, 2));
  console.log('recentAcSubmissionList count:', data2.data?.recentAcSubmissionList?.length);
  if (data2.data?.recentAcSubmissionList?.length > 0) {
    console.log('Sample recent submissions:', data2.data.recentAcSubmissionList.slice(0, 5));
  }
}

testLC().catch(console.error);

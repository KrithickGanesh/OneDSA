async function testQueries() {
  const username = "Krithick1637";

  const queries = [
    {
      name: "userQuestionProgressV2",
      query: `
        query userQuestionProgressV2($userSlug: String!) {
          userProfileUserQuestionProgressV2(userSlug: $userSlug) {
            numAcceptedQuestions {
              difficulty
              count
            }
          }
        }
      `,
      variables: { userSlug: username }
    },
    {
      name: "userProfileQuestions",
      query: `
        query userProfileQuestions($username: String!) {
          matchedUser(username: $username) {
            userCalendar {
              streak
              totalActiveDays
              submissionCalendar
            }
          }
        }
      `,
      variables: { username }
    },
    {
      name: "recentSubmissionList",
      query: `
        query recentSubmissions($username: String!) {
          recentSubmissionList(username: $username) {
            title
            titleSlug
            statusDisplay
          }
        }
      `,
      variables: { username }
    }
  ];

  for (const q of queries) {
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ query: q.query, variables: q.variables })
      });
      const data = await res.json();
      console.log(`Query ${q.name}:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Query ${q.name} error:`, e.message);
    }
  }
}

testQueries().catch(console.error);

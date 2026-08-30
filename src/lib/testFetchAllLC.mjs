async function fetchPagedLC() {
  const query = `
    query problemsetQuestionList($skip: Int, $limit: Int) {
      problemsetQuestionList: questionList(
        categorySlug: ""
        limit: $limit
        skip: $skip
        filters: {}
      ) {
        total: totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          paidOnly: isPaidOnly
          topicTags {
            name
          }
        }
      }
    }
  `;

  let skip = 0;
  const limit = 100;
  let allQuestions = [];
  
  // Test first 5 pages (500 problems)
  for (let page = 0; page < 5; page++) {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query, variables: { skip, limit } })
    });
    const data = await res.json();
    const list = data.data?.problemsetQuestionList?.questions || [];
    allQuestions.push(...list);
    skip += limit;
    console.log(`Fetched page ${page + 1}: ${list.length} questions (total so far: ${allQuestions.length})`);
  }
}

fetchPagedLC().catch(console.error);

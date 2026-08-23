// Redirects the browser to GitHub's OAuth authorization page.
// Decap CMS calls GET /api/auth to start the login flow.
export default function handler(req, res) {
  const { GITHUB_CLIENT_ID } = process.env;
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send('GITHUB_CLIENT_ID environment variable is not set.');
  }
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'repo,user',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

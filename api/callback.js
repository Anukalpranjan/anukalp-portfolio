// Exchanges the GitHub OAuth code for an access token, then sends it back
// to the Decap CMS window via postMessage so the editor can authenticate.
export default async function handler(req, res) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing OAuth code.');
  }
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).send('GitHub OAuth environment variables are not set.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      return res.status(401).send(`GitHub OAuth error: ${data.error_description || data.error || 'unknown'}`);
    }

    // Send the token back to the CMS opener window and close this popup.
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><body><script>
      (function() {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' }).replace(/'/g, "\\'")}',
            e.origin
          );
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    <\/script></body></html>`);
  } catch (err) {
    res.status(500).send(`Token exchange failed: ${err.message}`);
  }
}

// Exchanges the GitHub OAuth code for an access token, then sends it back
// to the Decap CMS window via postMessage so the editor can authenticate.
export default async function handler(req, res) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  const { code, state } = req.query;

  // The one-time cookie set by /api/auth: read it, then clear it whatever happens next.
  const expectedState = /(?:^|;\s*)oauth_state=([0-9a-f]+)/.exec(req.headers.cookie || '')?.[1];
  res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0');

  if (!code) {
    return res.status(400).send('Missing OAuth code.');
  }
  if (!state || !expectedState || state !== expectedState) {
    return res.status(400).send('Login session expired or invalid. Close this window and start again from /admin.');
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

    // Send the token back to the CMS opener window and close this popup. Decap's handshake: we
    // announce ourselves, it echoes the message back, and only then do we hand over the token.
    // Both directions are limited to this site's own origin, so a page on any other origin that
    // opens /api/auth in a popup never receives the token.
    const message = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><body><script>
      (function() {
        var message = ${JSON.stringify(message).replace(/</g, '\\u003c')};
        function receiveMessage(e) {
          if (e.origin !== window.location.origin) return;
          window.opener.postMessage(message, e.origin);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', window.location.origin);
      })();
    <\/script></body></html>`);
  } catch (err) {
    res.status(500).send(`Token exchange failed: ${err.message}`);
  }
}

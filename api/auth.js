import { randomBytes } from 'crypto';

// Redirects the browser to GitHub's OAuth authorization page.
// Decap CMS calls GET /api/auth to start the login flow.
export default function handler(req, res) {
  const { GITHUB_CLIENT_ID } = process.env;
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send('GITHUB_CLIENT_ID environment variable is not set.');
  }

  // GitHub echoes `state` back to /api/callback, which checks it against this cookie so it only
  // accepts a code from a login this browser actually started.
  const state = randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    // The portfolio repo is public, so public_repo is enough for Decap to read and commit to it.
    // (`repo` would also hand the token access to every private repo on the account.)
    scope: 'public_repo',
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

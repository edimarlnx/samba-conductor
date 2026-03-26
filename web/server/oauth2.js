import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { OAuth2Server } from 'meteor/leaonline:oauth2-server';
import { authenticateUser } from '../app/samba/sambaAuth';

// --- Utility ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- OAuth2 Server Instance ---
// Using forked package (web/packages/leaonline-oauth2-server) with RFC 6749 fixes:
// - expires_in as integer seconds (not Date string)
// - scope as space-separated string (not array)
// - No user ID leak in authorization redirect
// - Correct refresh token handling and revocation
// - Proper error codes
const oauth2server = new OAuth2Server({
  serverOptions: {
    addAcceptedScopesHeader: true,
    addAuthorizedScopesHeader: true,
    allowBearerTokensInQueryString: false,
    allowEmptyState: false,
    authorizationCodeLifetime: 300,
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowExtendedTokenAttributes: false,
    requireClientAuthentication: true,
  },
  model: {
    accessTokensCollectionName: 'oauth_access_tokens',
    refreshTokensCollectionName: 'oauth_refresh_tokens',
    clientsCollectionName: 'oauth_clients',
    authCodesCollectionName: 'oauth_auth_codes',
  },
  routes: {
    accessTokenUrl: '/oauth/token',
    authorizeUrl: '/oauth/authorize',
    errorUrl: '/oauth/error',
    fallbackUrl: '/oauth/*',
  },
});

// Note: Fix 1 (expires_in), Fix 2 (client.id), scope format, error codes,
// refresh token handling, and user ID leak are all resolved in the forked package.
// No monkey-patching needed.

// --- Authorization Page (server-rendered HTML) ---
oauth2server.app.get('/oauth/authorize', function serveAuthorizePage(req, res) {
  const { client_id, redirect_uri, response_type, state, scope, error } =
    req.query;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize — Samba Conductor</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #1a0a14; color: #f5eff1; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #2d1520; border: 1px solid #4a2838; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
    h1 { font-size: 1.25rem; margin-bottom: .25rem; }
    .subtitle { font-size: .875rem; color: #c9a0b0; margin-bottom: 1.5rem; }
    label { display: block; font-size: .875rem; color: #c9a0b0; margin-bottom: .25rem; }
    input { width: 100%; border: 1px solid #4a2838; background: #3d1f2e; color: #f5eff1; border-radius: 8px; padding: .6rem .75rem; font-size: 1rem; margin-bottom: 1rem; outline: none; transition: border-color .15s; }
    input:focus { border-color: #c45b7c; box-shadow: 0 0 0 3px rgba(196,91,124,.2); }
    input::placeholder { color: #8a5068; }
    button { width: 100%; background: #c45b7c; color: #fff; border: none; border-radius: 8px; padding: .65rem; font-size: 1rem; cursor: pointer; font-weight: 500; }
    button:hover { background: #d4708f; }
    button:disabled { background: #6b3a50; cursor: not-allowed; }
    .alert { border-radius: 8px; padding: .5rem .75rem; font-size: .875rem; margin-bottom: 1rem; background: rgba(220,38,38,.15); color: #f87171; border: 1px solid rgba(220,38,38,.3); }
    .footer { margin-top: 1.5rem; text-align: center; font-size: .75rem; color: #6b3a50; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in to authorize</h1>
    <p class="subtitle">An application is requesting access to your account</p>
    ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ''}
    <label for="username">Username</label>
    <input type="text" id="username" placeholder="AD username" autocomplete="username" autofocus>
    <label for="password">Password</label>
    <input type="password" id="password" placeholder="Password" autocomplete="current-password">
    <div id="error-msg" class="alert" style="display:none"></div>
    <button id="submit-btn">Sign in & Authorize</button>
    <p class="footer">Samba Conductor — Active Directory</p>
  </div>
  <script>
    const CLIENT_ID = ${JSON.stringify(client_id || '')};
    const REDIRECT_URI = ${JSON.stringify(redirect_uri || '')};
    const RESPONSE_TYPE = ${JSON.stringify(response_type || '')};
    const STATE = ${JSON.stringify(state || '')};
    const SCOPE = ${JSON.stringify(scope || '')};

    const btn = document.getElementById('submit-btn');
    const errorEl = document.getElementById('error-msg');
    const card = document.querySelector('.card');

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      btn.disabled = false;
    }

    function submitAuthorization(token) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/oauth/authorize';
      const fields = { token, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: RESPONSE_TYPE, state: STATE, scope: SCOPE, allowed: 'true' };
      for (const [name, value] of Object.entries(fields)) {
        const el = document.createElement('input');
        el.type = 'hidden'; el.name = name; el.value = value;
        form.appendChild(el);
      }
      document.body.appendChild(form);
      form.submit();
    }

    // Session reuse — auto-authorize if already logged in
    (async () => {
      const storedToken = localStorage.getItem('Meteor.loginToken');
      if (storedToken) {
        card.style.opacity = '0.5';
        try {
          const res = await fetch('/oauth/check-token?token=' + encodeURIComponent(storedToken));
          const data = await res.json();
          if (data.valid) { submitAuthorization(storedToken); return; }
        } catch (e) {}
        card.style.opacity = '1';
      }
    })();

    btn.addEventListener('click', async () => {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      errorEl.style.display = 'none';
      if (!username || !password) { showError('Username and password are required.'); return; }
      btn.disabled = true;
      try {
        const res = await fetch('/oauth/meteor-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username, password }).toString()
        });
        const data = await res.json();
        if (!res.ok) { showError(data.error || 'Login failed.'); return; }
        submitAuthorization(data.token);
      } catch (err) { showError('Network error. Please try again.'); }
    });

    document.getElementById('password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

// --- Check Token Endpoint ---
oauth2server.app.get('/oauth/check-token', async function checkToken(req, res) {
  const { token } = req.query;
  const valid = !!(
    token &&
    (await Meteor.users.findOneAsync({
      'services.resume.loginTokens.hashedToken':
        Accounts._hashLoginToken(token),
    }))
  );
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ valid }));
});

// --- LDAP Login Endpoint ---
// Authenticates against Samba AD and returns a Meteor login token
oauth2server.app.post(
  '/oauth/meteor-login',
  async function meteorLogin(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Username and password are required.' }));
      return;
    }

    try {
      // Authenticate against Samba AD via LDAP bind
      const adUser = await authenticateUser({ username, password });

      if (adUser.expired) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Password expired. Change your password first.',
          }),
        );
        return;
      }

      // Find or create Meteor user
      let user = await Meteor.users.findOneAsync({ username });

      const memberOf = Array.isArray(adUser.memberOf)
        ? adUser.memberOf
        : adUser.memberOf
          ? [adUser.memberOf]
          : [];

      const profile = {
        displayName: adUser.displayName || username,
        givenName: adUser.givenName || '',
        surname: adUser.sn || '',
        email: adUser.mail || '',
        dn: adUser.dn || adUser.distinguishedName || '',
        memberOf,
        lastSyncedAt: new Date(),
      };

      if (user) {
        await Meteor.users.updateAsync(user._id, { $set: { profile } });
      } else {
        const userId = await Accounts.createUserAsync({ username, profile });
        user = await Meteor.users.findOneAsync(userId);
      }

      // Generate Meteor login token
      const stampedToken = Accounts._generateStampedLoginToken();
      Accounts._insertHashedLoginToken(
        user._id,
        Accounts._hashStampedToken(stampedToken),
      );

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ token: stampedToken.token }));
    } catch (error) {
      console.error('[OAuth2] Login failed:', error.message);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid credentials.' }));
    }
  }
);

// --- UserInfo Endpoint ---
// Registered on both oauth2server.app and as a WebApp handler for maximum compatibility.
// Validates Bearer token manually against oauth_access_tokens collection.
import { WebApp } from 'meteor/webapp';

// Use the package's existing collection via raw MongoDB driver
const { MongoInternals } = require('meteor/mongo');
const rawDb = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
const accessTokensRaw = rawDb.collection('oauth_access_tokens');

async function handleUserInfo(req, res) {
  // Extract Bearer token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing_token', error_description: 'Bearer token required' }));
    return;
  }

  // Look up token in DB (using raw MongoDB driver since the collection is owned by the package)
  const tokenDoc = await accessTokensRaw.findOne({ accessToken: token });
  if (!tokenDoc) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_token', error_description: 'Token not found or expired' }));
    return;
  }

  // Check expiry
  const expiresAt = new Date(tokenDoc.accessTokenExpiresAt);
  if (expiresAt < new Date()) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_token', error_description: 'Token expired' }));
    return;
  }

  // Get user
  const user = await Meteor.users.findOneAsync(tokenDoc.user?.id);
  if (!user) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'user_not_found' }));
    return;
  }

  const profile = user.profile || {};
  const email = profile.email || (user.emails?.[0]?.address || '');

  const groups = (profile.memberOf || []).map((dn) => {
    const match = dn.match(/^CN=([^,]+)/);
    return match ? match[1] : dn;
  });

  const response = {
    sub: user._id,
    id: user._id,
    login: user.username,
    email,
    email_verified: true,
    name: profile.displayName || user.username,
    given_name: profile.givenName || '',
    family_name: profile.surname || '',
    groups,
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
}

// Register on WebApp directly — this runs before Meteor's SPA catch-all
WebApp.connectHandlers.use('/oauth/userinfo', function userInfoHandler(req, res, next) {
  if (req.method !== 'GET') {
    next();
    return;
  }
  handleUserInfo(req, res).catch((err) => {
    console.error('[OAuth2] UserInfo error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_error' }));
  });
});

// --- Validate User ---
// Allow all authenticated AD users (realm filtering added later)
oauth2server.validateUser(function validateOAuthUser({ user }) {
  return !!user;
});

// Export for use by methods (client registration)
export { oauth2server };

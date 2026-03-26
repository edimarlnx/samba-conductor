import crypto from 'crypto';
import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {WebApp} from 'meteor/webapp';
import {OAuth2Server} from 'meteor/leaonline:oauth2-server';
import {authenticateUser} from '../app/samba/sambaAuth';

// --- Utility ---
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- Fix 1: expires_in ---
// The package sends expires_in as a Date string, but OAuth2 spec requires seconds (integer).
WebApp.connectHandlers.use('/oauth/token', function fixExpiresIn(req, res, next) {
    const originalEnd = res.end.bind(res);
    res.end = function patchedEnd(body) {
        if (body && typeof body === 'string') {
            try {
                const data = JSON.parse(body);
                if (data.expires_in && typeof data.expires_in === 'string') {
                    data.expires_in = Math.max(0, Math.floor((new Date(data.expires_in) - Date.now()) / 1000));
                    body = JSON.stringify(data);
                }
            } catch (e) { /* not JSON, pass through */
            }
        }
        return originalEnd(body);
    };
    next();
});

// --- OAuth2 Server Instance ---
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

// --- Fix 2: client.id ---
// The package returns clientId but @node-oauth/oauth2-server v5 requires client.id
const _getClient = oauth2server.model.getClient.bind(oauth2server.model);
oauth2server.model.getClient = async function patchedGetClient(clientId, secret) {
    const client = await _getClient(clientId, secret);
    if (!client) return false;
    return {...client, id: client.clientId};
};
oauth2server.oauth.options.model.getClient = oauth2server.model.getClient;

// --- Authorization Page (server-rendered HTML) ---
oauth2server.app.get('/oauth/authorize', function serveAuthorizePage(req, res) {
    const {client_id, redirect_uri, response_type, state, scope, error} = req.query;

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

    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(html);
});

// --- Check Token Endpoint ---
oauth2server.app.get('/oauth/check-token', async function checkToken(req, res) {
    const {token} = req.query;
    const valid = !!(token && await Meteor.users.findOneAsync({
        'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(token),
    }));
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({valid}));
});

// --- LDAP Login Endpoint ---
// Authenticates against Samba AD and returns a Meteor login token
oauth2server.app.post('/oauth/meteor-login', async function meteorLogin(req, res) {
    const {username, password} = req.body;

    if (!username || !password) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Username and password are required.'}));
        return;
    }

    try {
        // Authenticate against Samba AD via LDAP bind
        const adUser = await authenticateUser({username, password});

        if (adUser.expired) {
            res.writeHead(401, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Password expired. Change your password first.'}));
            return;
        }

        // Find or create Meteor user
        let user = await Meteor.users.findOneAsync({username});

        const memberOf = Array.isArray(adUser.memberOf)
            ? adUser.memberOf
            : adUser.memberOf ? [adUser.memberOf] : [];

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
            await Meteor.users.updateAsync(user._id, {$set: {profile}});
        } else {
            const userId = await Accounts.createUserAsync({username, profile});
            user = await Meteor.users.findOneAsync(userId);
        }

        // Generate Meteor login token
        const stampedToken = Accounts._generateStampedLoginToken();
        Accounts._insertHashedLoginToken(user._id, Accounts._hashStampedToken(stampedToken));

        res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
        res.end(JSON.stringify({token: stampedToken.token}));
    } catch (error) {
        console.error('[OAuth2] Login failed:', error.message);
        res.writeHead(401, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Invalid credentials.'}));
    }
});

// --- UserInfo Endpoint ---
// Returns user profile data based on granted scopes
oauth2server.authenticatedRoute().get('/oauth/userinfo', async function userInfo(req, res) {
    const user = await Meteor.users.findOneAsync(req.data.user.id);

    if (!user) {
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'User not found'}));
        return;
    }

    const profile = user.profile || {};
    const email = profile.email || (user.emails && user.emails[0] ? user.emails[0].address : '');

    // Build response based on scopes
    // For now, return all profile data (scope filtering can be added later)
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

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(response));
});

// --- Validate User ---
// Allow all authenticated AD users (realm filtering added later)
oauth2server.validateUser(function validateOAuthUser({user}) {
    return !!user;
});

// Export for use by methods (client registration)
export {oauth2server};

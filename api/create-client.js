const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function getAdminAuth() {
  if (!getApps().length) {
    const projectId=process.env.FIREBASE_PROJECT_ID;
    const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin environment variables are missing.');
    initializeApp({ credential:cert({ projectId, clientEmail, privateKey }) });
  }
  return getAuth();
}

function sendJson(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

module.exports = async function createClient(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error:'Method not allowed.' });
    return;
  }

  try {
    const authorization=request.headers.authorization || '';
    const match=authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) { sendJson(response, 401, { error:'Administrator authorization is required.' }); return; }

    const auth=getAdminAuth();
    const decodedToken=await auth.verifyIdToken(match[1]);
    const projectId=process.env.FIREBASE_PROJECT_ID;
    const administratorEmail=(process.env.FIREBASE_ADMIN_EMAIL || 'kybanichbek1488@gmail.com').toLowerCase();
    if ((decodedToken.email || '').toLowerCase() !== administratorEmail) {
      sendJson(response, 403, { error:'Only the configured administrator can create accounts.' });
      return;
    }

    const body=typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
    const username=String(body.username || '').trim().toLowerCase();
    const password=String(body.password || '');
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      sendJson(response, 400, { error:'The client login format is invalid.' });
      return;
    }
    if (password.length<12 || !/[a-z]/i.test(password) || !/\d/.test(password) || /^\d{8}$/.test(password)) {
      sendJson(response, 400, { error:'Use a password of at least 12 characters containing letters and numbers.' });
      return;
    }

    const clientDomain=(process.env.FIREBASE_CLIENT_EMAIL_DOMAIN || `${projectId}.firebaseapp.com`).toLowerCase();
    const email=`${username}@${clientDomain}`;
    const user=await auth.createUser({ email, password, emailVerified:true, displayName:username });
    sendJson(response, 201, { uid:user.uid, username, email:user.email });
  } catch (error) {
    console.error('Client account creation failed:', error);
    if (error?.code === 'auth/email-already-exists') {
      sendJson(response, 409, { error:'This client login already exists.' });
      return;
    }
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error:'The request body is invalid.' });
      return;
    }
    sendJson(response, 500, { error:'The server could not create the client account.' });
  }
};

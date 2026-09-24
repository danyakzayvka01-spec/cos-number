# Secure Firebase setup for COS Number Check

The browser configuration is in `firebase-config.js`. It is safe to publish. Never place a service-account key, administrator password, or client password in that file or in `app.js`.

The project uses Firebase Authentication and Cloud Firestore. Cloud Storage is not used: the browser compresses a private record image and saves it in the protected `cosRecords` document.

## 1. Enable Firebase services

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. Create **Cloud Firestore** in Production mode.
3. In Firestore > Rules, publish the contents of `firestore.rules`.

## 2. Create the administrator

In **Authentication > Users**, create this account manually:

- Email: `kybanichbek1488@gmail.com`
- Password: choose a unique administrator password of at least 16 characters.

Do not put this password in any project file. The site's **Sign in** button accepts the full administrator email.

## 3. Configure the protected Vercel API

Client accounts are created by `api/create-client.js`. This endpoint verifies the signed-in Firebase administrator before using the Firebase Admin SDK.

1. In Firebase Console, open **Project settings > Service accounts** and generate a new private key.
2. In the Vercel project, add these Environment Variables using values from the downloaded JSON file:

   - `FIREBASE_PROJECT_ID` = `uk-visa-c64c8`
   - `FIREBASE_CLIENT_EMAIL` = the JSON `client_email` value
   - `FIREBASE_PRIVATE_KEY` = the complete JSON `private_key` value
   - `FIREBASE_ADMIN_EMAIL` = `kybanichbek1488@gmail.com`
   - `FIREBASE_CLIENT_EMAIL_DOMAIN` = `uk-visa-c64c8.firebaseapp.com`

3. Never upload the service-account JSON file to Vercel or commit it to source control.
4. Deploy the complete folder. Vercel installs `firebase-admin` from `package.json` and exposes the endpoint at `/api/create-client`.
5. Add the deployed domain in **Authentication > Settings > Authorized domains**.

## 4. Create and assign a client

1. Open the deployed site and select **Sign in**.
2. Sign in as `kybanichbek1488@gmail.com` with the administrator password.
3. Select **+ Client account** and enter a short login, for example `client01`.
4. Generate a unique password of at least 12 characters containing letters and numbers. Do not use a date of birth, passport number, or COS number.
5. After account creation, the **Add COS record** dialog opens automatically with the client login filled in.
6. Enter the COS number, client name, and private record image, then save.
7. Give the login and password to the client through a secure channel.

Record details and images are intentionally not embedded in the deployable source files. Enter them through the authenticated administrator dialog after deployment.

## 5. Client sign-in

1. The client selects **Sign in** and enters the short login and password.
2. The internal Firebase email is formed automatically from the short login.
3. After authentication, Firestore permits access only to a `cosRecords` document whose `ownerEmail` matches that account.
4. Searching for another client's COS number returns only the public registration status.

## 6. Manage existing COS records

After administrator sign-in, select **COS records** to open the private record list. The administrator can change the COS number, client name, or assigned login. These changes are committed together so the private record, public status, and owner index remain consistent.

Deleting a COS record removes its private document, public status, and account link. It does not delete the Firebase Authentication login; remove an unused login separately from **Firebase Console > Authentication > Users** when appropriate.

## Data model and access

- `publicCosStatus/{cos}` contains only the COS number and public status. Anyone may read one document when they know its exact COS number.
- `cosRecords/{cos}` contains the name, owner email, and compressed private image. Only the administrator or the assigned verified account may read it.
- `ownerRecords/{ownerEmail}/records/{cos}` links an authenticated client to its record.

Firestore documents have a 1 MiB size limit. The browser makes several compression attempts and accepts an image only when its encoded size is suitable. Keep originals outside this application and establish a retention/deletion policy for sensitive documents.

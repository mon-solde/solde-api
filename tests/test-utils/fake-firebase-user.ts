import * as admin from 'firebase-admin';

/**
 * Creates a real user against the local Firebase Auth Emulator (never real
 * Firebase — see jestGlobalSetup.ts's FIREBASE_AUTH_EMULATOR_HOST guard) and
 * mints a real ID token for it, the same way FirebaseAuthGuard would decode
 * one coming from a genuine client. Firebase gives no way to sign in with an
 * email/password from server-side code, so the standard emulator pattern is
 * used instead: mint a custom token, then exchange it for an ID token via
 * the emulator's own identitytoolkit REST endpoint.
 * https://firebase.google.com/docs/emulator-suite/connect_auth
 */

export interface FakeFirebaseUserOptions {
  email?: string;
  emailVerified?: boolean;
}

export interface FakeFirebaseUser {
  uid: string;
  email: string;
  idToken: string;
}

let sequence = 0;
const createdUids: string[] = [];

export async function createTestFirebaseUser(
  options: FakeFirebaseUserOptions = {},
): Promise<FakeFirebaseUser> {
  sequence += 1;
  const email =
    options.email ?? `test-user-${Date.now()}-${sequence}@example.com`;
  const emailVerified = options.emailVerified ?? true;

  const userRecord = await admin.auth().createUser({ email, emailVerified });
  createdUids.push(userRecord.uid);

  const idToken = await mintIdToken(userRecord.uid);

  return { uid: userRecord.uid, email, idToken };
}

async function mintIdToken(uid: string): Promise<string> {
  const customToken = await admin.auth().createCustomToken(uid);
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const response = await fetch(
    `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to mint a test ID token from the Auth Emulator: ${
        response.status
      } ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { idToken: string };
  return body.idToken;
}

/**
 * Deletes every user created by createTestFirebaseUser() since the last
 * call — call this from afterEach() so tests never leak emulator accounts
 * into one another. Swallows "already deleted" errors: a test asserting our
 * own compensation logic (POST /v1/accounts rolling back the Firebase user
 * on an unexpected DB failure) will have already deleted its own user.
 */
export async function deleteAllTestFirebaseUsers(): Promise<void> {
  const uids = createdUids.splice(0);
  await Promise.all(
    uids.map((uid) =>
      admin
        .auth()
        .deleteUser(uid)
        .catch(() => undefined),
    ),
  );
}

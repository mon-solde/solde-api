// Firebase Auth Emulator helpers (REST, no firebase-admin credentials needed).
// The emulator is started by `npm run firebase:emulator` with project
// `demo-voit-test`, and the API must run against it too
// (`npm run start:dev`), otherwise it would reject these tokens.
const EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const PROJECT_ID = process.env.SEED_FIREBASE_PROJECT_ID ?? 'demo-voit-test';

export async function assertEmulatorIsUp(): Promise<void> {
  try {
    await fetch(`http://${EMULATOR_HOST}/`);
  } catch {
    throw new Error(
      `Firebase Auth Emulator unreachable on ${EMULATOR_HOST} — run "npm run firebase:emulator" first.`,
    );
  }
}

export async function clearEmulatorAccounts(): Promise<void> {
  const response = await fetch(
    `http://${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(`Could not clear emulator accounts: ${response.status}`);
  }
}

export type EmulatorUser = { uid: string; idToken: string };

export async function signUpEmulatorUser(
  email: string,
  password: string,
): Promise<EmulatorUser> {
  const response = await fetch(
    `http://${EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Emulator sign-up failed: ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { localId: string; idToken: string };
  return { uid: body.localId, idToken: body.idToken };
}

import '../../src/libs/utils/dotenv';

module.exports = async (): Promise<void> => {
  const dbName = process.env.DB_NAME || '';
  if (!dbName.includes('test')) {
    throw new Error(
      `Current database name is: "${dbName}". Make sure database includes a word "test" as prefix or suffix, for example: "test_db" or "db_test" to avoid writing into a main database.`,
    );
  }

  // Without this, FirebaseAdminService falls back to real credentials and
  // every admin.auth() call in the suite (createUser, verifyIdToken,
  // deleteUser...) would hit real Firebase instead of the local emulator —
  // the same class of risk the DB_NAME check above guards against.
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error(
      'FIREBASE_AUTH_EMULATOR_HOST is not set. Run `npm run firebase:emulator` before the e2e suite so tests never touch a real Firebase project.',
    );
  }
};

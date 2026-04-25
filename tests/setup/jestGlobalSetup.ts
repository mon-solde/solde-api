import '../../src/libs/utils/dotenv';

module.exports = async (): Promise<void> => {
  const dbName = process.env.DB_NAME || '';
  if (!dbName.includes('test')) {
    throw new Error(
      `Current database name is: "${dbName}". Make sure database includes a word "test" as prefix or suffix, for example: "test_db" or "db_test" to avoid writing into a main database.`,
    );
  }
};

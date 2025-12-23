export function createUserRepository(db) {
  return {
    async getByUsername(username, client) {
      const executor = client ?? db;
      const { rows } = await executor.query(
        `
        SELECT id, username, name, password_hash, role
        FROM users
        WHERE username = $1
        `,
        [username]
      );
      return rows[0] ?? null;
    },
  };
}
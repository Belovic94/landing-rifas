import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export function createAuthService({ userRepository }) {
  return {
    async login(username, password) {
      if (!username || !password) {
        return { ok: false, status: 400, error: "username y password son requeridos" };
      }

      const user = await userRepository.getByUsername(String(username));
      if (!user) {
        return { ok: false, status: 401, error: "Credenciales inválidas" };
      }

      const ok = await bcrypt.compare(String(password), user.password_hash);
      if (!ok) {
        return { ok: false, status: 401, error: "Credenciales inválidas" };
      }

      if (!process.env.JWT_SECRET) {
        return { ok: false, status: 500, error: "JWT_SECRET no configurado" };
      }

      const token = jwt.sign(
        { sub: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
      );

      return {
        ok: true,
        token,
        user: { name: user.name, role: user.role, username: user.username },
      };
    },
  };
}

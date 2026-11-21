// Pengganti AuthService dan auth.session untuk test route login.
export const isAuthConfigured = () => true;
export const setAuthSession = async () => {};
export class AuthService {
  async login(email, password) {
    if (password === "benar") return { userId: "u-" + email, email };
    throw new Error("INVALID_CREDENTIALS");
  }
}

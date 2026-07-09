import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { login: {} },
      // Login único, sem senha: se o login ainda não existe, a conta é criada.
      // O login funciona como a chave de acesso — deve ser tratado como segredo.
      async authorize(credentials) {
        const login = String(credentials?.login ?? '').trim().toLowerCase();
        if (login.length < 3 || login.length > 40 || !/^[a-z0-9._-]+$/.test(login)) return null;
        const rows = await sql`select id, login from users where login = ${login}`;
        if (rows[0]) return { id: rows[0].id as string, name: rows[0].login as string };
        const created = await sql`insert into users (login) values (${login}) returning id, login`;
        return { id: created[0].id as string, name: created[0].login as string };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});

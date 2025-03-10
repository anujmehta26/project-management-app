import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '../../../../lib/database';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Create user in our users table first
        await db.createUser({
          id: account.providerAccountId, // Use this instead of user.id
          email: user.email,
          name: user.name
        });
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Still allow sign in
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub; // This will be the providerAccountId
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.sub = account.providerAccountId; // Use providerAccountId consistently
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

export { handler as GET, handler as POST }; 
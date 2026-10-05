/**
 * NextAuth / Auth.js OAuth Provider Configuration
 * EventAI Platform SSO - Google & Microsoft OAuth 2.0 with Account Selector & Safe Fallback
 */

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

const isGoogleConfigured = Boolean(
  googleClientId &&
  !googleClientId.includes("YOUR_GOOGLE_CLIENT_ID") &&
  !googleClientId.includes("demo-eventhub-ai") &&
  googleClientSecret &&
  !googleClientSecret.includes("YOUR_GOOGLE_CLIENT_SECRET")
);

if (!isGoogleConfigured) {
  console.warn(
    "[Auth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local. Safe fallback mode enabled for Account Picker."
  );
}

export const authOptions = {
  providers: [
    ...(isGoogleConfigured
      ? [
          {
            id: "google",
            name: "Google",
            type: "oauth",
            authorization: {
              params: {
                prompt: "select_account",
                display: "popup",
                access_type: "offline",
                response_type: "code",
              },
            },
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        ]
      : [
          // Safe fallback stub when credentials are not yet configured in Google Cloud Console
          {
            id: "google",
            name: "Google (Safe Fallback)",
            type: "oauth",
            clientId: "google-fallback-client",
            clientSecret: "google-fallback-secret",
          },
        ]),
    {
      id: "azure-ad",
      name: "Microsoft",
      type: "oauth",
      authorization: {
        params: {
          prompt: "select_account",
          display: "popup",
        },
      },
      clientId: process.env.AZURE_AD_CLIENT_ID || "00000000-0000-0000-0000-000000000000",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    },
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.role = user.role || "PARTICIPANT";
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role || "PARTICIPANT";
        session.user.provider = token.provider || "google";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export const GET = (req: any, res: any) => ({ req, res, authOptions });
export const POST = (req: any, res: any) => ({ req, res, authOptions });
export default authOptions;

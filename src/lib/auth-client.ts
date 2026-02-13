import { createAuthClient } from "better-auth/react";

type ClientEnv = {
  NEXT_PUBLIC_BETTER_AUTH_URL?: string;
};

const { NEXT_PUBLIC_BETTER_AUTH_URL } = process.env as ClientEnv;

const resolveBaseUrl = () => {
  if (NEXT_PUBLIC_BETTER_AUTH_URL) {
    return NEXT_PUBLIC_BETTER_AUTH_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return "http://localhost:3000/api/auth";
};

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl(),
});

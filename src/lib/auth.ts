import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

const envPath = path.resolve(process.cwd(), ".env.local");
const dotenvResult = dotenv.config({ path: envPath });

const decodeEnvBuffer = (buffer: Buffer) => {
  // Handle common BOM/UTF-16 cases seen on Windows editors.
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.toString("utf16le", 2);
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.from(buffer);
      swapped.swap16();
      return swapped.toString("utf16le", 2);
    }
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.slice(3).toString("utf8");
  }
  return buffer.toString("utf8");
};

const fallbackParsed = (() => {
  if (dotenvResult.parsed && Object.keys(dotenvResult.parsed).length > 0) {
    return dotenvResult.parsed;
  }
  if (!fs.existsSync(envPath)) {
    return undefined;
  }
  try {
    const raw = fs.readFileSync(envPath);
    const parsed = dotenv.parse(decodeEnvBuffer(raw));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return parsed;
  } catch (error) {
    console.error("Better Auth dotenv fallback parse failed:", error);
    return undefined;
  }
})();

type AuthEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

const env = process.env as AuthEnv;

const requireEnv = (key: keyof AuthEnv) => {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
};

const githubEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);

if (process.env.NODE_ENV !== "production") {
  console.log("Better Auth dotenv path:", envPath);
  console.log("Better Auth dotenv exists:", fs.existsSync(envPath));
  console.log("Better Auth dotenv error:", dotenvResult.error?.message ?? null);
  console.log(
    "Better Auth dotenv parsed keys:",
    Object.keys(fallbackParsed ?? {}).filter((key) =>
      key.toLowerCase().includes("github")
    )
  );
  const githubKeys = Object.keys(process.env).filter((key) =>
    key.toLowerCase().includes("github")
  );
  console.log("Better Auth GitHub enabled:", githubEnabled);
  console.log("Better Auth GitHub env keys:", githubKeys);
  console.log(
    "Better Auth GitHub id length:",
    process.env.GITHUB_CLIENT_ID?.length ?? 0
  );
  console.log(
    "Better Auth GitHub secret length:",
    process.env.GITHUB_CLIENT_SECRET?.length ?? 0
  );
  console.log("Better Auth cwd:", process.cwd());
}

const socialProviders = {
  google: {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  },
  ...(githubEnabled
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

export const auth = betterAuth({
  database: {
    db,
    type: "postgres",
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders,
});

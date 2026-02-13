import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get("email")?.trim() ?? "";
  const email = rawEmail.toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const context = await auth.$context;
  const user = await context.internalAdapter.findUserByEmail(email);

  return NextResponse.json({ exists: Boolean(user) });
}

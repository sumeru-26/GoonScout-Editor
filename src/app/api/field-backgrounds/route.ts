import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "kysely";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type FieldBackgroundRow = {
  key: string;
  name: string;
  image_url: string;
};

const resolveAuthenticatedUserId = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  return session?.user?.id ?? null;
};

export async function GET() {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await sql<FieldBackgroundRow>`
      select key, name, image_url
      from public.field_backgrounds
      order by name asc
    `.execute(db);

    return NextResponse.json(
      {
        backgrounds: result.rows.map((entry) => ({
          key: entry.key,
          name: entry.name,
          imageUrl: entry.image_url,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    const pgCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (pgCode === "42P01") {
      return NextResponse.json({ backgrounds: [] }, { status: 200 });
    }

    console.error("/api/field-backgrounds GET failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to load field backgrounds.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

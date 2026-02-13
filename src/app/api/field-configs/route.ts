import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? "");
    const payload = body?.payload;

    if (!userId || !payload || !Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const created = await prisma.fieldConfig.create({
      data: {
        userId,
        payload,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error("/api/field-configs POST failed", error);
    const message =
      error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

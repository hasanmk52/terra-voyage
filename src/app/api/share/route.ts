import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shareGenerator } from "@/lib/share-generator";
import { z } from "zod";

const createShareSchema = z.object({
  tripId: z.string(),
  options: z
    .object({
      expiresInDays: z.number().optional().default(30),
      allowComments: z.boolean().optional().default(false),
      showContactInfo: z.boolean().optional().default(false),
      showBudget: z.boolean().optional().default(false),
      password: z.string().optional(),
    })
    .default({
      expiresInDays: 30,
      allowComments: false,
      showContactInfo: false,
      showBudget: false,
    }),
});

const revokeShareSchema = z.object({
  tripId: z.string(),
});

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Sharing has been disabled" },
    { status: 410 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: "Sharing has been disabled" },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Sharing has been disabled" },
    { status: 410 }
  );
}

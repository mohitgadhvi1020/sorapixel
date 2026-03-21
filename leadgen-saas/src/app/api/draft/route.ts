import { NextRequest, NextResponse } from "next/server";
import { generateEmailDraft, type CompanyBrain } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_brain, prospect } = body;

    if (!company_brain || !prospect) {
      return NextResponse.json(
        { error: "company_brain and prospect are required" },
        { status: 400 }
      );
    }

    const draft = await generateEmailDraft(
      company_brain as CompanyBrain,
      prospect
    );

    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Draft generation failed: ${e instanceof Error ? e.message : "unknown error"}`,
      },
      { status: 500 }
    );
  }
}

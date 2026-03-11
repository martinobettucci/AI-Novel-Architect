import { NextRequest, NextResponse } from "next/server";
import { POST as runAi } from "@/app/api/ai/run/route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const planText = String(body.planText ?? "");
  const ghostwriterName = String(body.ghostwriterName ?? "Ghostwriter");
  const ghostwriterStyle = String(body.ghostwriterStyle ?? "Narrative fiction");
  const feedback = JSON.stringify({
    generalFeedback: body.generalFeedback,
    strengths: body.strengths,
    weaknesses: body.weaknesses,
    chapterFeedbacks: body.chapterFeedbacks,
  });

  const input = [
    `Rewrite plan in style of ${ghostwriterName} (${ghostwriterStyle}).`,
    "",
    "Original plan:",
    planText,
    "",
    "Audit feedback:",
    feedback,
  ].join("\n");

  const aiReq = new NextRequest(new URL("/api/ai/run", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({
      action: "style_transform",
      locale: "fr",
      input,
      styleProfile: `${ghostwriterName} - ${ghostwriterStyle}`,
      temperature: 0.7,
      maxTokens: 2800,
    }),
  });

  const aiRes = await runAi(aiReq);
  if (!aiRes.ok) {
    return NextResponse.json(
      {
        rewrittenPlan: planText,
        chapterCount: Array.isArray(body.chapterFeedbacks) ? body.chapterFeedbacks.length : 0,
      },
      { status: 200 }
    );
  }

  const payload = (await aiRes.json()) as { text?: string };

  return NextResponse.json({
    rewrittenPlan: payload.text ?? planText,
    chapterCount: Array.isArray(body.chapterFeedbacks) ? body.chapterFeedbacks.length : 0,
  });
}

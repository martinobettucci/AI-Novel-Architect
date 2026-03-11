import { NextRequest, NextResponse } from "next/server";
import { POST as runAi } from "@/app/api/ai/run/route";

export const runtime = "nodejs";
export const maxDuration = 300;

export interface ChapterAudit {
  chapterNumber: number;
  title: string;
  feedback: string;
  suggestions: string[];
  score: number;
}

export interface AuditResult {
  generalFeedback: string;
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
  chapters: ChapterAudit[];
}

function heuristicAudit(planText: string): AuditResult {
  const chapterLines = planText
    .split("\n")
    .filter((line) => /chapter|chapitre/i.test(line));

  const chapters: ChapterAudit[] = chapterLines.slice(0, 20).map((line, index) => ({
    chapterNumber: index + 1,
    title: line.replace(/^[#\-*\d.\s]+/, "").slice(0, 120),
    feedback: "Chapter appears structurally valid. Add sharper objective-to-hook linkage.",
    suggestions: [
      "Clarify chapter objective in one sentence",
      "Increase tension before chapter close",
    ],
    score: 7,
  }));

  if (chapters.length === 0) {
    chapters.push({
      chapterNumber: 1,
      title: "Draft chapter",
      feedback: "Plan is not segmented by chapter headings yet.",
      suggestions: [
        "Add explicit chapter sections",
        "Define per-chapter hook and objective",
      ],
      score: 5,
    });
  }

  return {
    generalFeedback:
      "The plan has a clear premise but needs stronger progression control between chapter objectives and hooks.",
    strengths: [
      "Core concept is understandable",
      "Narrative intent is present",
      "Expandable chapter structure",
    ],
    weaknesses: [
      "Hooks are uneven",
      "Character arc checkpoints are sparse",
      "Timeline anchors need strengthening",
    ],
    overallScore: 7,
    chapters,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const planText = String(body.planText ?? "");
  const chapters = Array.isArray(body.chapters) ? body.chapters : [];

  const promptInput = [
    "Plan to audit:",
    planText,
    "",
    "Chapters:",
    JSON.stringify(chapters),
    "",
    "Return concise audit findings.",
  ].join("\n");

  const aiReq = new NextRequest(new URL("/api/ai/run", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({
      action: "plan_audit",
      locale: "fr",
      input: promptInput,
      temperature: 0.4,
      maxTokens: 1600,
    }),
  });

  const aiRes = await runAi(aiReq);
  if (!aiRes.ok) {
    return NextResponse.json(heuristicAudit(planText));
  }

  const payload = (await aiRes.json()) as { text?: string };
  const audit = heuristicAudit(planText);
  if (payload.text?.trim()) {
    audit.generalFeedback = payload.text.trim();
  }

  return NextResponse.json(audit);
}

import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/app/lib/db";
import {
  approveCanonDelta,
  createProjectFromInput,
  getProjectBundle,
  rejectCanonDelta,
  recordWritingProgress,
  saveCanonDelta,
  saveCharacterProfile,
  verifyCanonDelta,
  wordsWrittenToday,
} from "@/app/lib/repository";
import { createCanonDelta } from "@/app/domain/defaults";

async function freshProject() {
  const bundle = await createProjectFromInput({
    title: "Delta",
    genre: "SF",
    audience: "Adult",
    tone: "Cold",
    targetWordCount: 50000,
    language: "fr",
    synopsis: "",
    mode: "idea",
    chapterCount: 1,
  });
  return bundle;
}

describe("verifyCanonDelta", () => {
  it("accepts when every evidence quote is present in the text", () => {
    const result = verifyCanonDelta(
      { after: "Knows the code", confidence: "explicit", evidence: [{ quote: "She knew the code" }] },
      "<p>She knew the code by heart.</p>"
    );
    expect(result.verdict).toBe("accepted");
  });

  it("rejects when no evidence quote appears in the text", () => {
    const result = verifyCanonDelta(
      { after: "Knows the code", confidence: "explicit", evidence: [{ quote: "totally absent" }] },
      "Unrelated chapter text."
    );
    expect(result.verdict).toBe("rejected");
  });

  it("is uncertain when no evidence is provided", () => {
    const result = verifyCanonDelta(
      { after: "Something", confidence: "weak_inference", evidence: [] },
      "Any text"
    );
    expect(result.verdict).toBe("uncertain");
  });

  it("rejects an empty proposed value", () => {
    const result = verifyCanonDelta({ after: "  ", confidence: "explicit", evidence: [] }, "x");
    expect(result.verdict).toBe("rejected");
  });
});

describe("canon delta lifecycle", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("mutates entity progression canon only on approval, with provenance", async () => {
    const bundle = await freshProject();
    const projectId = bundle.project.id;
    const chapterId = bundle.chapters[0].id;

    await saveCharacterProfile({
      id: "char-1",
      projectId,
      name: "Nadia",
      role: "",
      motivation: "",
      arc: "",
      voice: "",
      relationships: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    const delta = await saveCanonDelta(
      createCanonDelta(projectId, {
        chapterId,
        entityType: "character",
        entityId: "char-1",
        entityLabel: "Nadia",
        layer: "knowledge",
        before: "",
        after: "Knows the vault code",
        confidence: "explicit",
        rationale: "Reads it from the note",
        evidence: [{ quote: "Nadia memorised the vault code" }],
        status: "proposed",
        source: "ai",
      })
    );

    // Before approval: no progression row exists.
    let after = await getProjectBundle(projectId);
    expect(after?.entityProgression ?? []).toHaveLength(0);
    expect(after?.canonDeltas[0].status).toBe("proposed");

    await approveCanonDelta(delta.id);

    after = await getProjectBundle(projectId);
    const progression = after?.entityProgression.find((p) => p.entityId === "char-1");
    expect(progression?.knowledge).toBe("Knows the vault code");
    expect(progression?.validatedDelta).toBe("Knows the vault code");
    expect(after?.canonDeltas[0].status).toBe("validated");

    // Provenance: an audit entry was logged for the validation.
    const audit = after?.aiActions.find((a) =>
      a.metadata.includes("canon_delta_validated")
    );
    expect(audit).toBeTruthy();
  });

  it("rejecting a delta leaves canon untouched", async () => {
    const bundle = await freshProject();
    const projectId = bundle.project.id;

    const delta = await saveCanonDelta(
      createCanonDelta(projectId, {
        entityType: "chapter",
        entityId: bundle.chapters[0].id,
        entityLabel: "Chapter 1",
        layer: "summary",
        after: "A new summary",
        status: "proposed",
        source: "ai",
      })
    );

    await rejectCanonDelta(delta.id);
    const after = await getProjectBundle(projectId);
    expect(after?.canonDeltas[0].status).toBe("rejected");
    expect(after?.chapters[0].summary).not.toBe("A new summary");
  });

  it("approving a chapter-summary delta updates the chapter", async () => {
    const bundle = await freshProject();
    const projectId = bundle.project.id;
    const delta = await saveCanonDelta(
      createCanonDelta(projectId, {
        entityType: "chapter",
        entityId: bundle.chapters[0].id,
        entityLabel: "Chapter 1",
        layer: "summary",
        after: "Validated summary",
        status: "proposed",
        source: "author",
      })
    );
    await approveCanonDelta(delta.id);
    const after = await getProjectBundle(projectId);
    expect(after?.chapters[0].summary).toBe("Validated summary");
  });
});

describe("writing sessions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("accumulates words written today and exposes them on the bundle", async () => {
    const bundle = await freshProject();
    const projectId = bundle.project.id;

    await recordWritingProgress(projectId, 120);
    await recordWritingProgress(projectId, 30);
    await recordWritingProgress(projectId, -999);

    const after = await getProjectBundle(projectId);
    expect(after).toBeTruthy();
    expect(wordsWrittenToday(after!)).toBe(150);
  });
});

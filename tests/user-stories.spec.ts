import { describe, expect, it } from "vitest";
import { getUserStory, USER_STORIES } from "@/app/domain/userStories";

describe("user story registry", () => {
  it("maps every planned story through US-66", () => {
    expect(USER_STORIES).toHaveLength(66);
    expect(USER_STORIES[0]?.id).toBe("US-01");
    expect(USER_STORIES.at(-1)?.id).toBe("US-66");
  });

  it("keeps every capability concrete and resolvable", () => {
    for (const story of USER_STORIES) {
      expect(story.capability).toMatch(/\./);
      expect(getUserStory(story.id)?.title).toBe(story.title);
    }
  });
});

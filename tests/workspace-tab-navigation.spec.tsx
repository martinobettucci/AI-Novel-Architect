import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WorkspaceTabNavigation from "@/app/components/workspace/WorkspaceTabNavigation";

const tabs = [
  { id: "plan" as const, label: "Plan", description: "Project framing" },
  { id: "drafting" as const, label: "Drafting", description: "Chapter studio" },
  { id: "settings" as const, label: "Settings", description: "Preferences" },
];

describe("workspace tab navigation", () => {
  it("renders both mobile and desktop nav containers", () => {
    render(
      <WorkspaceTabNavigation
        tabs={tabs}
        activeTab="plan"
        onTabChange={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Project framing")).toBeInTheDocument();
  });

  it("emits tab change when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(
      <WorkspaceTabNavigation
        tabs={tabs}
        activeTab="plan"
        onTabChange={onTabChange}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Drafting" })[0]);
    expect(onTabChange).toHaveBeenCalledWith("drafting");
  });
});

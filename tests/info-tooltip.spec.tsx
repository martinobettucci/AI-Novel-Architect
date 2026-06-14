import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InfoTooltip from "@/app/components/ui/InfoTooltip";

describe("info tooltip", () => {
  it("renders accessible trigger and tooltip content", () => {
    render(<InfoTooltip text="Helpful explanation" label="Scene title help" />);

    expect(screen.getByRole("button", { name: "Scene title help" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Helpful explanation");
  });
});

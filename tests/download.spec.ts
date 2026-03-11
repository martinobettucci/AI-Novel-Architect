import { describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadText } from "@/app/lib/download";

describe("download helpers", () => {
  it("creates object URL and clicks anchor", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadBlob("file.txt", new Blob(["abc"]));
    downloadText("file2.txt", "abc");

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

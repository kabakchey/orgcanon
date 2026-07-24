import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "../../../src/lib/export/download-text-file";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadTextFile", () => {
  it("creates an object URL, triggers a download via a temporary anchor, and revokes the URL", () => {
    // jsdom's Blob polyfill doesn't implement .text()/.arrayBuffer(), so the constructor is
    // stubbed here to capture its parts/options directly rather than reading them back off a
    // real Blob instance.
    const blobCalls: Array<{ parts: BlobPart[]; options?: BlobPropertyBag }> = [];
    class FakeBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        blobCalls.push({ parts, options });
      }
    }
    vi.stubGlobal("Blob", FakeBlob);

    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    let appended: HTMLAnchorElement | undefined;
    const realAppendChild = document.body.appendChild.bind(document.body);
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      appended = node as HTMLAnchorElement;
      return realAppendChild(node);
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("chain-of-command-carol-lee.mmd", "flowchart TD\n");

    expect(blobCalls).toEqual([{ parts: ["flowchart TD\n"], options: { type: "text/plain" } }]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0]![0]).toBeInstanceOf(FakeBlob);

    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appended?.download).toBe("chain-of-command-carol-lee.mmd");
    expect(appended?.href).toBe("blob:mock-url");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    vi.unstubAllGlobals();
  });
});

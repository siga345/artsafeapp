import { describe, expect, it } from "vitest";

import {
  assertValidAudioUpload,
  createPrivateDemoStorageKey,
  createPublicAssetStorageKey,
  getManagedPublicStorageKeyFromUrl,
  isPublicStorageKey,
  MAX_AUDIO_UPLOAD_BYTES
} from "./storage";
import { getStorageDisplayFilename } from "./storage-shared";

describe("storage helpers", () => {
  it("marks new public asset keys as public", () => {
    expect(isPublicStorageKey(createPublicAssetStorageKey("cover image.PNG"))).toBe(true);
  });

  it("does not expose private demo keys through the public route", () => {
    expect(isPublicStorageKey(createPrivateDemoStorageKey("take.mp3"))).toBe(false);
  });

  it("keeps legacy image keys public while blocking legacy audio keys", () => {
    expect(isPublicStorageKey("2026/03/19/avatar.png")).toBe(true);
    expect(isPublicStorageKey("2026/03/19/demo.mp3")).toBe(false);
  });

  it("strips the uuid prefix from display filenames", () => {
    expect(
      getStorageDisplayFilename("private/demos/2026/03/19/123e4567-e89b-12d3-a456-426614174000-my-song.wav")
    ).toBe("my-song.wav");
  });

  it("extracts managed public storage keys from local upload urls", () => {
    expect(getManagedPublicStorageKeyFromUrl("/api/uploads/public/2026/03/19/avatar.png")).toBe(
      "public/2026/03/19/avatar.png"
    );
  });

  it("ignores private and external image urls when resolving cleanup keys", () => {
    expect(getManagedPublicStorageKeyFromUrl("/api/uploads/private/demos/2026/03/19/take.mp3")).toBeNull();
    expect(getManagedPublicStorageKeyFromUrl("https://example.com/cover.png")).toBeNull();
  });

  it("rejects uploads over the reduced buffered limit", () => {
    expect(() =>
      assertValidAudioUpload({
        mimeType: "audio/mpeg",
        sizeBytes: MAX_AUDIO_UPLOAD_BYTES + 1
      })
    ).toThrow(/Audio file must be between 1 byte and/);
  });
});

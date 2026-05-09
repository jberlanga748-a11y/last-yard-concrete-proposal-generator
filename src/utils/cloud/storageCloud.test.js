import assert from "node:assert/strict";
import test from "node:test";

import { createLocalImageAsset, getImageAssetSource } from "./storageCloud.js";

test("createLocalImageAsset creates dataUrl and src for editor photo previews", async () => {
  const originalFileReader = globalThis.FileReader;

  globalThis.FileReader = class MockFileReader {
    readAsDataURL(file) {
      this.result = `data:${file.type || "image/jpeg"};base64,bG9jYWwtcHJldmlldw==`;
      queueMicrotask(() => this.onload?.());
    }
  };

  try {
    const asset = await createLocalImageAsset({
      name: "broom walkway.jpg",
      size: 1234,
      type: "image/jpeg",
    });

    assert.equal(asset.fileName, "broom walkway.jpg");
    assert.equal(asset.fileSize, 1234);
    assert.equal(asset.fileType, "image/jpeg");
    assert.equal(asset.localOnly, true);
    assert.equal(asset.cloudSynced, false);
    assert.match(asset.dataUrl, /^data:image\/jpeg;base64,/);
    assert.equal(asset.src, asset.dataUrl);
    assert.equal(getImageAssetSource(asset), asset.dataUrl);
  } finally {
    if (originalFileReader) {
      globalThis.FileReader = originalFileReader;
    } else {
      delete globalThis.FileReader;
    }
  }
});

test("getImageAssetSource prefers local dataUrl before placeholder metadata", () => {
  const image = {
    caption: "broom walkway",
    dataUrl: "data:image/png;base64,cHJldmlldw==",
    fileName: "broom walkway.png",
    label: "Upload reminder",
    uploadRequired: false,
  };

  assert.equal(getImageAssetSource(image), "data:image/png;base64,cHJldmlldw==");
});

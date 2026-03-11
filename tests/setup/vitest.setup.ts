import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

beforeEach(() => {
  globalThis.localStorage?.clear();
});

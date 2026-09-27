// node --test src/lib/ui-state.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyFor, groupOf, resolve, stripOutput, storageKey } from "./ui-state.ts";

test("tab labels share one key per language, platform and model", () => {
  assert.equal(keyFor("lang", "curl"), "curl");
  assert.equal(keyFor("lang", "Node"), "js");
  assert.equal(keyFor("lang", " Python "), "python");
  assert.equal(keyFor("platform", "iOS & iPadOS"), "ios");
  assert.equal(keyFor("platform", "iPhone & iPad"), "ios");
  assert.equal(keyFor("platform", "Web embed"), "web");
  assert.equal(keyFor("platform", "Mac"), "macos");
  assert.equal(keyFor("model", "Essence 2"), "essence-2");
  assert.equal(keyFor("lang", "Package.swift"), "package-swift");
});

test("a group's kind comes from its labels", () => {
  assert.equal(groupOf(["curl", "Python", "Node"]), "lang");
  assert.equal(groupOf(["Python", "CLI"]), "lang");
  assert.equal(groupOf(["iOS & iPadOS", "Android", "Mac", "Web"]), "platform");
  assert.equal(groupOf(["LiveKit", "Python"]), "platform");
  assert.equal(groupOf(["Expression 2", "Essence 2"]), "model");
});

test("a choice is read from the URL, then storage, then the default", () => {
  const allowed = ["ios", "android", "web"];
  assert.equal(resolve("platform", { url: "android", stored: "ios", fallback: "web" }, allowed), "android");
  assert.equal(resolve("platform", { url: null, stored: "ios", fallback: "web" }, allowed), "ios");
  assert.equal(resolve("platform", { url: "windows", stored: "nope", fallback: "web" }, allowed), "web");
  assert.equal(resolve("platform", {}, allowed), null);
  assert.equal(resolve("lang", { stored: "js" }), "js");
  assert.equal(storageKey("platform"), "bh.platform");
});

test("copy leaves out the lines that show output", () => {
  assert.equal(stripOutput('curl -s https://x\n# → {"valid":true}\n'), "curl -s https://x");
  assert.equal(stripOutput("print(1)\n# →300 frames\nprint(2)"), "print(1)\nprint(2)");
  assert.equal(stripOutput("// → frames\nlet a = 1"), "let a = 1");
  assert.equal(stripOutput("# a comment stays\nls"), "# a comment stays\nls");
});

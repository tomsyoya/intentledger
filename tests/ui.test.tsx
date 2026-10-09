import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "../src/App.tsx";

let dom: JSDOM;
let root: Root;
let intervalStarts = 0;
let savedBlob: Blob | undefined;
let downloadedName = "";
let clipboard = "";
const html = () => dom.window.document.body;
const text = () => html().textContent ?? "";
function button(label: string) {
  const found = [...html().querySelectorAll("button")].find(
    (element) =>
      element.textContent?.trim() === label ||
      element.getAttribute("aria-label") === label,
  );
  assert.ok(found, `Button not found: ${label}`);
  return found;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
beforeEach(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://example.github.io/intentledger/",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: {
      async writeText(value: string) {
        clipboard = value;
      },
    },
  });
  intervalStarts = 0;
  savedBlob = undefined;
  downloadedName = "";
  clipboard = "";
  mock.method(dom.window, "setInterval", () => { intervalStarts++; return 1; });
  mock.method(dom.window, "clearInterval", () => {});
  mock.method(URL, "createObjectURL", (blob: Blob) => {
    savedBlob = blob;
    return "blob:demo-record";
  });
  mock.method(URL, "revokeObjectURL", () => {});
  mock.method(
    dom.window.HTMLAnchorElement.prototype,
    "click",
    function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    },
  );
  root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => root.render(<App />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  mock.restoreAll();
  dom.window.close();
});

test("ui_dashboard_fixture_metrics_and_story_are_visible", () => {
  assert.match(text(), /Capture DeFi intent/);
  assert.match(text(), /No wallet connection required/);
  assert.equal(html().querySelectorAll(".metric-card").length, 5);
  assert.equal(html().querySelectorAll(".activity-table tbody tr").length, 4);
  assert.match(text(), /No real funds moved/);
});

test("ui_manual_entry_points_have_no_playback_controls_or_timers", async () => {
  assert.ok(!html().querySelector(".demo-player"), "Playback player must be absent");
  for (const element of html().querySelectorAll("button")) {
    assert.doesNotMatch(element.textContent ?? "", /Run Demo|Play Automated Demo|Pause|Resume|Replay/);
    assert.notEqual(element.getAttribute("aria-label"), "Restart");
    assert.notEqual(element.getAttribute("aria-label"), "Next step");
  }
  await click("View accounting ledger");
  assert.equal(html().querySelectorAll(".review-row").length, 2);
  await click("Capture the intent");
  assert.match(text(), /Observed Intent/);
  assert.equal(intervalStarts, 0);
});

test("ui_manual_bridge_exports_evidence_and_resolves_accounting", async () => {
  await click("Mayan action");
  await click("View wallet request");
  await click("Follow execution");
  await click("Generate semantic record");
  await click("Copy JSON");
  const copied = JSON.parse(clipboard);
  assert.equal(copied.action, "BRIDGE");
  assert.equal(copied.receivedAmount, "998.4");
  await click("Export JSON");
  assert.equal(downloadedName, "intentledger-mayan.json");
  assert.ok(savedBlob);
  const exported = JSON.parse(await savedBlob.text());
  assert.equal(exported.transactions.length, 2);
  assert.equal(exported.walletRequest.intentId, exported.intent.id);
  assert.equal(exported.evidence.length, 4);
  await click("Apply to accounting ledger");
  assert.equal(html().querySelectorAll(".grouped-row").length, 1);
  await click("Needs review0");
  assert.match(text(), /No unresolved exceptions/);
});

test("ui_additional_protocols_show_execution_and_positions", async () => {
  await click("Jupiter action");
  assert.match(text(), /0.50%/);
  await click("View wallet request");
  await click("Follow execution");
  assert.match(text(), /Actual result: 712.83 USDC/);
  await click("Generate semantic record");
  assert.match(text(), /Swapped 5 SOL for 712.83 USDC/);
  await click("Kamino action");
  await click("View wallet request");
  await click("Follow execution");
  assert.equal(html().querySelectorAll(".transaction-card").length, 2);
  await click("Generate semantic record");
  assert.match(text(), /RESULTING DEFI POSITION/);
  assert.match(text(), /985.22 kUSDC receipt units/);
  await click("Raydium action");
  await click("View wallet request");
  await click("Follow execution");
  assert.match(text(), /three movements belonging to one ADD_LIQUIDITY action/);
  await click("Generate semantic record");
  assert.match(text(), /500 USDC and 3.5 SOL/);
});

test("ui_manual_navigation_preserves_classification_and_scenario", async () => {
  await click("Explore captured actions");
  assert.match(text(), /Unclassified cross-chain activity/);
  await click("Capture the intent");
  await click("View wallet request");
  await click("Follow execution");
  await click("Generate semantic record");
  await click("Apply to accounting ledger");
  await click("IntentLedger overview");
  assert.equal(html().querySelectorAll(".metric-card")[4].querySelector("strong")?.textContent, "0");
  await click("Jupiter action");
  await click("View wallet request");
  assert.match(text(), /req-jupiter-001/);
  await click("Accounting ledger");
  assert.equal(html().querySelectorAll(".grouped-row").length, 1);
  assert.equal(html().querySelectorAll(".review-row").length, 0);
  await click("Inspect the semantic record");
  assert.match(text(), /Bridged 1,000 USDC/);
  assert.equal(intervalStarts, 0);
});

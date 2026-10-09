import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "../src/App.tsx";

let dom: JSDOM;
let root: Root;
let time = 0;
let intervalCallback: (() => void) | undefined;
let savedBlob: Blob | undefined;
let downloadedName = "";
let clipboard = "";
let scrollResets = 0;
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
async function advance(milliseconds: number) {
  for (let remaining = milliseconds; remaining > 0; remaining -= 100) {
    time += Math.min(remaining, 100);
    await act(async () => intervalCallback?.());
  }
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
  time = 0;
  intervalCallback = undefined;
  savedBlob = undefined;
  downloadedName = "";
  clipboard = "";
  scrollResets = 0;
  mock.method(dom.window, "scrollTo", () => { scrollResets++; });
  mock.method(performance, "now", () => time);
  mock.method(dom.window, "setInterval", (callback: () => void) => {
    intervalCallback = callback;
    return 1;
  });
  mock.method(dom.window, "clearInterval", () => {
    intervalCallback = undefined;
  });
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

test("ui_automated_demo_completes_in_52_seconds_and_replays_twice", async () => {
  for (let replay = 0; replay < 2; replay++) {
    await click(replay ? "Replay" : "Play Automated Demo");
    assert.match(text(), /Unclassified cross-chain activity/);
    assert.equal(html().querySelectorAll(".review-row").length, 2);
    await advance(6000);
    assert.ok(html().querySelector(".exception-banner.highlighted"));
    await advance(5000);
    assert.match(text(), /Observed Intent/);
    await advance(7000);
    assert.match(text(), /What the wallet received/);
    await advance(6000);
    assert.match(text(), /SOURCE TRANSACTION/);
    assert.match(text(), /DESTINATION TRANSACTION/);
    await advance(8000);
    assert.match(text(), /SEMANTIC RECORD GENERATED/);
    assert.match(text(), /received 998.4 USDC/);
    await advance(8000);
    assert.equal(html().querySelectorAll(".grouped-row").length, 1);
    assert.equal(html().querySelectorAll(".review-row").length, 0);
    await advance(12000);
    assert.ok(button("Replay"));
    assert.match(text(), /0 unresolved exceptions/);
  }
});

test("ui_pause_preserves_elapsed_time_next_step_and_restart", async () => {
  await click("Play Automated Demo");
  await advance(3000);
  await click("Pause");
  await advance(10000);
  assert.equal(html().querySelector(".exception-banner.highlighted"), null);
  await click("Resume");
  await advance(2900);
  assert.equal(html().querySelector(".exception-banner.highlighted"), null);
  await advance(100);
  assert.ok(html().querySelector(".exception-banner.highlighted"));
  await click("Pause");
  await click("Next step");
  assert.match(text(), /Observed Intent/);
  assert.ok(button("Resume"));
  await click("Restart");
  assert.match(text(), /Unclassified cross-chain activity/);
  assert.equal(html().querySelector(".grouped-row"), null);
  assert.ok(button("Play Automated Demo"));
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


test("ui_demo_starts_and_each_scene_scrolls_to_top", async () => {
  await click("Play Automated Demo");
  assert.ok(scrollResets >= 1);
  assert.ok(html().querySelector(".main-shell.presentation"));
  await advance(11000);
  assert.ok(scrollResets >= 3);
  await click("Jupiter action");
  assert.equal(html().querySelector(".main-shell.presentation"), null);
});

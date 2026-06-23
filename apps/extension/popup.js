// Reads the active tab + any selected text, then opens the app's /share route
// so capture flows through the same local-first store as the web/mobile app.
const META = document.getElementById("meta");
const APP = document.getElementById("appUrl");
const SAVE = document.getElementById("save");

chrome.storage.local.get(["appUrl"], (res) => {
  if (res.appUrl) APP.value = res.appUrl;
});

let tab;
let selection = "";

(async () => {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  META.textContent = tab?.title || tab?.url || "(no tab)";
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? "",
    });
    selection = result || "";
    if (selection) META.textContent = `“${selection.slice(0, 80)}”`;
  } catch {
    /* some pages block scripting */
  }
})();

SAVE.addEventListener("click", () => {
  const appUrl = APP.value.replace(/\/$/, "");
  chrome.storage.local.set({ appUrl });
  const params = new URLSearchParams({
    url: tab?.url ?? "",
    title: tab?.title ?? "",
    text: selection,
  });
  chrome.tabs.create({ url: `${appUrl}/share?${params.toString()}` });
  window.close();
});

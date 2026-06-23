// Right-click → "Save selection to Learn Anything".
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-learn-anything",
    title: "Save to Learn Anything",
    contexts: ["page", "selection", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl = "http://localhost:3000" } = await chrome.storage.local.get(["appUrl"]);
  const params = new URLSearchParams({
    url: info.linkUrl || info.pageUrl || tab?.url || "",
    title: tab?.title || "",
    text: info.selectionText || "",
  });
  chrome.tabs.create({ url: `${appUrl.replace(/\/$/, "")}/share?${params.toString()}` });
});

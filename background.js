chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "blockEmoticon",
        title: "이 이모티콘 차단하기",
        contexts: ["image"]
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "blockEmoticon" && info.srcUrl) {
        const url = info.srcUrl;
        let keyword = url;
        try {
            const parts = url.split('/');
            keyword = parts[parts.length - 1].split('.')[0];
        } catch (e) {}

        chrome.storage.local.get(['bannedKeywords', 'emoteMap'], (data) => {
            const keywords = data.bannedKeywords || [];
            const emoteMap = data.emoteMap || {};
            
            if (!keywords.includes(keyword)) {
                keywords.push(keyword);
                emoteMap[keyword] = url;
                chrome.storage.local.set({ bannedKeywords: keywords, emoteMap });
            }
        });
    }
});
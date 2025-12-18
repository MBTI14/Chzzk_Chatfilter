chrome.runtime.onInstalled.addListener(() => {
    // 1. 이모티콘 차단 메뉴 (치지직에서만 뜨게 설정)
    chrome.contextMenus.create({
        id: "blockEmoticon",
        title: "이 이모티콘 차단하기",
        contexts: ["image"],
        documentUrlPatterns: ["https://chzzk.naver.com/*"] // [핵심] 이 줄이 추가됨
    });

    // 2. 사용자 차단 메뉴 (치지직에서만 뜨게 설정)
    chrome.contextMenus.create({
        id: "blockUser",
        title: "이 사용자 차단하기",
        contexts: ["page", "selection", "link"],
        documentUrlPatterns: ["https://chzzk.naver.com/*"] // [핵심] 이 줄이 추가됨
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    // A. 이모티콘 차단 로직
    if (info.menuItemId === "blockEmoticon" && info.srcUrl) {
        const url = info.srcUrl;
        let keyword = url;
        try {
            const parts = url.split('/');
            keyword = parts[parts.length - 1].split('.')[0];
        } catch (e) {}

        addToBanList(keyword, url);
    }

    // B. 사용자 차단 로직
    if (info.menuItemId === "blockUser") {
        chrome.tabs.sendMessage(tab.id, { action: "BLOCK_LAST_CLICKED_USER" });
    }
});

// 공통 함수
function addToBanList(keyword, imageUrl = null) {
    chrome.storage.local.get(['bannedKeywords', 'emoteMap'], (data) => {
        const keywords = data.bannedKeywords || [];
        const emoteMap = data.emoteMap || {};
        
        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            if (imageUrl) emoteMap[keyword] = imageUrl;
            chrome.storage.local.set({ bannedKeywords: keywords, emoteMap });
        }
    });
}
chrome.runtime.onInstalled.addListener(() => {
    // 1. 이모티콘 차단 메뉴
    chrome.contextMenus.create({
        id: "blockEmoticon",
        title: "이 이모티콘 차단하기",
        contexts: ["image"]
    });
    // 2. 사용자 차단 메뉴 (새로 추가됨)
    chrome.contextMenus.create({
        id: "blockUser",
        title: "이 사용자 차단하기",
        contexts: ["page", "selection", "link"] // 텍스트나 빈 공간 클릭 시에도 뜨도록
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

        addToBanList(keyword, url); // 공통 함수 사용
    }

    // B. 사용자 차단 로직 (신호를 content.js로 보냄)
    if (info.menuItemId === "blockUser") {
        // content.js에 "방금 우클릭한 사람 차단해!"라고 명령
        chrome.tabs.sendMessage(tab.id, { action: "BLOCK_LAST_CLICKED_USER" });
    }
});

// 차단 목록 추가 공통 함수
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
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: "block-id",
        title: "이 아이디 차단하기",
        contexts: ["selection"] 
    });

    chrome.contextMenus.create({
        id: "block-emote",
        title: "이 이모티콘 차단하기",
        contexts: ["image"] 
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "block-id" && info.selectionText) {
        const username = info.selectionText.trim();
        if (username) addKeywordToStorage(username, null, true);

    } else if (info.menuItemId === "block-emote" && info.srcUrl) {
        const src = info.srcUrl;
        let keyword = src;
        try {
            const urlObj = new URL(src);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            keyword = filename.split('.')[0];
        } catch (err) {}
        
        if (!keyword) keyword = src;
        
        addKeywordToStorage(keyword, src, false);
    }
});

function addKeywordToStorage(keyword, imageUrl, isUser) {
    chrome.storage.local.get(['bannedKeywords', 'emoteMap', 'userMap'], (data) => {
        const keywords = data.bannedKeywords || [];
        const emoteMap = data.emoteMap || {};
        const userMap = data.userMap || {};

        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            if (imageUrl) emoteMap[keyword] = imageUrl;
            if (isUser) userMap[keyword] = true;

            chrome.storage.local.set({
                bannedKeywords: keywords,
                emoteMap: emoteMap,
                userMap: userMap
            });
        }
    });
}
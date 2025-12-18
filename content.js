(function() {
    'use strict';
    const SEL = {
        item: '[class*="live_chatting_list_item"], [class*="vod_chatting_item"]',
        text: '[class*="live_chatting_message_text"]',
        image: 'img',
        btn: 'button[class*="live_chatting_power_button"]',
        container: '[class*="live_chatting_content"], [class*="vod_chatting_list"], [class*="live_chatting_list_wrapper"]'
    };
    let currentKeywords = [], isEnabled = true, isReady = false;

    function initSettings() {
        chrome.storage.local.get(['isFilterEnabled', 'bannedKeywords'], (data) => {
            isEnabled = data.isFilterEnabled !== false;
            currentKeywords = data.bannedKeywords || [];
            if (!data.bannedKeywords) chrome.storage.local.set({ bannedKeywords: [] });
            isReady = true;
            reprocessAllChats();
        });
    }

    chrome.storage.onChanged.addListener((changes) => {
        let needReprocess = false;
        if (changes.isFilterEnabled) {
            isEnabled = changes.isFilterEnabled.newValue;
            needReprocess = true;
        }
        if (changes.bannedKeywords) {
            currentKeywords = changes.bannedKeywords.newValue || [];
            needReprocess = true;
        }
        if (needReprocess) reprocessAllChats();
    });

    function reprocessAllChats() {
        if (!isReady) return;
        document.querySelectorAll(SEL.item).forEach(node => {
            delete node.dataset.processed;
            node.style.display = '';
            filterChat(node);
        });
    }

    function filterChat(node) {
        if (!isReady || !isEnabled || node.dataset.processed) return;
        node.dataset.processed = 'true';
        if (node.nodeType === 1 && node.matches(SEL.item)) {
            let shouldBlock = false;
            const textNode = node.querySelector(SEL.text);
            if (textNode && currentKeywords.some(k => textNode.textContent.includes(k))) shouldBlock = true;
            if (!shouldBlock && currentKeywords.length > 0) {
                const images = node.querySelectorAll(SEL.image);
                for (let img of images) {
                    if (currentKeywords.some(k => (img.src || '').includes(k))) {
                        shouldBlock = true;
                        break;
                    }
                }
            }
            if (shouldBlock) node.style.display = 'none';
        }
    }

    function tryCollectPower(node) {
        if (node.matches && node.matches(SEL.btn)) node.click();
        else {
            const btn = node.querySelector(SEL.btn);
            if (btn) btn.click();
        }
    }

    const chatObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                filterChat(node);
                tryCollectPower(node);
            }
        }));
    });

    function startObserving() {
        const target = document.querySelector(SEL.container);
        if (target) {
            chatObserver.observe(target, { childList: true, subtree: true });
            initSettings();
        } else setTimeout(startObserving, 1000);
    }

    startObserving();
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            chatObserver.disconnect();
            startObserving();
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
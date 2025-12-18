(function() {
    'use strict';
    const SEL = {
        item: '[class*="live_chatting_list_item"], [class*="vod_chatting_item"]',
        text: '[class*="live_chatting_message_text"]',
        nickname: '[class*="name_text"]',
        image: 'img',
        btn: 'button[class*="live_chatting_power_button"]',
        container: '[class*="live_chatting_content"], [class*="vod_chatting_list"], [class*="live_chatting_list_wrapper"]'
    };
    
    let currentKeywords = [], isEnabled = true, isReady = false;
    let lastRightClickedNode = null;

    // 0. 우클릭 대상 추적
    document.addEventListener('contextmenu', (e) => {
        lastRightClickedNode = e.target.closest(SEL.item);
    }, true);

    // 0. Background 명령 수신 (알림창 삭제됨)
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "BLOCK_LAST_CLICKED_USER" && lastRightClickedNode) {
            const nameNode = lastRightClickedNode.querySelector(SEL.nickname);
            if (nameNode) {
                const username = nameNode.textContent.trim();
                if (username) {
                    addKeywordToStorage(username);
                    // 알림창(alert) 대신 콘솔에만 조용히 기록
                    console.log(`[치지직 필터] 사용자 '${username}' 차단됨`);
                }
            }
        }
    });

    function addKeywordToStorage(keyword) {
        chrome.storage.local.get(['bannedKeywords'], (data) => {
            const keywords = data.bannedKeywords || [];
            if (!keywords.includes(keyword)) {
                keywords.push(keyword);
                chrome.storage.local.set({ bannedKeywords: keywords });
            }
        });
    }

    // --- 초기화 및 필터 로직 ---

    function initSettings() {
        chrome.storage.local.get(['isFilterEnabled', 'bannedKeywords'], (data) => {
            isEnabled = data.isFilterEnabled !== false;
            
            // 기본 차단 키워드
            const defaultKeywords = ["클린봇이 부적절한 표현을 감지했습니다."];

            if (!data.bannedKeywords) {
                currentKeywords = defaultKeywords;
                chrome.storage.local.set({ bannedKeywords: defaultKeywords });
            } else {
                currentKeywords = data.bannedKeywords;
            }

            isReady = true;
            reprocessAllChats();
        });
    }

    chrome.storage.onChanged.addListener((changes) => {
        let needReprocess = false;
        if (changes.isFilterEnabled) { isEnabled = changes.isFilterEnabled.newValue; needReprocess = true; }
        if (changes.bannedKeywords) { currentKeywords = changes.bannedKeywords.newValue || []; needReprocess = true; }
        if (needReprocess) reprocessAllChats();
    });

    function reprocessAllChats() {
        if (!isReady) return;
        document.querySelectorAll(SEL.item).forEach(node => {
            delete node.dataset.processed;
            node.style.cssText = ''; 
            filterChat(node);
        });
    }

    function filterChat(node) {
        if (!isReady || !isEnabled || node.dataset.processed) return;
        node.dataset.processed = 'true';
        if (node.nodeType === 1 && node.matches(SEL.item)) {
            let shouldBlock = false;

            // 1. 텍스트 검사
            const textNode = node.querySelector(SEL.text);
            if (textNode && currentKeywords.some(k => textNode.textContent.includes(k))) shouldBlock = true;

            // 2. 닉네임 검사
            if (!shouldBlock) {
                const nameNode = node.querySelector(SEL.nickname);
                if (nameNode && currentKeywords.some(k => nameNode.textContent.includes(k))) shouldBlock = true;
            }

            // 3. 이미지 검사
            if (!shouldBlock && currentKeywords.length > 0) {
                const images = node.querySelectorAll(SEL.image);
                for (let img of images) {
                    if (currentKeywords.some(k => (img.src || '').includes(k))) {
                        shouldBlock = true;
                        break;
                    }
                }
            }
            
            if (shouldBlock) {
                node.style.cssText = `
                    display: none !important;
                    height: 0px !important;
                    min-height: 0px !important;
                    max-height: 0px !important;
                    margin: 0px !important;
                    padding: 0px !important;
                    border: none !important;
                    line-height: 0px !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                `;
            }
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
(function() {
    'use strict';
    const SEL = {
        item: '[class*="live_chatting_list_item"], [class*="vod_chatting_item"]',
        text: '[class*="live_chatting_message_text"]',
        nickname: '[class*="name_text"]', // 닉네임 클래스 (추가됨)
        image: 'img',
        btn: 'button[class*="live_chatting_power_button"]',
        container: '[class*="live_chatting_content"], [class*="vod_chatting_list"], [class*="live_chatting_list_wrapper"]'
    };
    
    let currentKeywords = [], isEnabled = true, isReady = false;
    let lastRightClickedNode = null; // 방금 우클릭한 채팅을 저장할 변수

    // 0. 우클릭 대상 추적 (새로 추가됨)
    document.addEventListener('contextmenu', (e) => {
        // 우클릭한 요소에서 가장 가까운 채팅 덩어리(item)를 찾아서 저장
        lastRightClickedNode = e.target.closest(SEL.item);
    }, true);

    // 0. Background에서 온 명령 받기 (새로 추가됨)
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "BLOCK_LAST_CLICKED_USER" && lastRightClickedNode) {
            // 저장해둔 채팅에서 닉네임 찾기
            const nameNode = lastRightClickedNode.querySelector(SEL.nickname);
            if (nameNode) {
                const username = nameNode.textContent.trim();
                if (username) {
                    addKeywordToStorage(username);
                    alert(`[차단 완료] 사용자 '${username}'의 채팅이 차단되었습니다.`);
                }
            } else {
                alert('사용자 이름을 찾을 수 없습니다.');
            }
        }
    });

    // 저장소에 키워드 추가하는 헬퍼 함수
    function addKeywordToStorage(keyword) {
        chrome.storage.local.get(['bannedKeywords'], (data) => {
            const keywords = data.bannedKeywords || [];
            if (!keywords.includes(keyword)) {
                keywords.push(keyword);
                chrome.storage.local.set({ bannedKeywords: keywords });
            }
        });
    }

    // --- 아래는 기존 로직 (필터링 부분만 업그레이드) ---

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

            // 2. [추가됨] 닉네임 검사 (작성자 차단)
            if (!shouldBlock) {
                const nameNode = node.querySelector(SEL.nickname);
                if (nameNode && currentKeywords.some(k => nameNode.textContent.includes(k))) shouldBlock = true;
            }

            // 3. 이미지(이모티콘) 검사
            if (!shouldBlock && currentKeywords.length > 0) {
                const images = node.querySelectorAll(SEL.image);
                for (let img of images) {
                    if (currentKeywords.some(k => (img.src || '').includes(k))) {
                        shouldBlock = true;
                        break;
                    }
                }
            }
            
            // 차단 실행 (완전 삭제 스타일)
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
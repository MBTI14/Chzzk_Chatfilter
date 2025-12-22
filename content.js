(function() {
    'use strict';
    const SEL = {
        item: '[class*="live_chatting_list_item"], [class*="vod_chatting_item"], [class*="live_chatting_message_chatting_message"]',
        guide: '[class*="live_chatting_guide_container"]',
        fixed: '[class*="live_chatting_fixed_wrapper"]',
        header: '[class*="live_chatting_header_"]',
        donation: '[class*="live_chatting_donation_message_container"]',
        ranking: '[class*="live_chatting_ranking_container"]',
        mission: '[class*="live_chatting_mission_message_wrapper"], [class*="live_chatting_fixed_mission_header"]',
        prediction: '[class*="live_chatting_prediction_"], [class*="live_chatting_vote_"], [class*="live_chatting_fixed_prediction_"]',
        text: '[class*="live_chatting_message_text"]',
        nickname: '[class*="name_text"]',
        image: 'img',
        btn: 'button[class*="live_chatting_power_button"]',
        badge: '[class*="badge_container"]',
        container: '[class*="live_chatting_content"], [class*="vod_chatting_list"], [class*="live_chatting_list_wrapper"]'
    };
    
    let currentKeywords = [], keywordRegex = null, isEnabled = true, hideHeader = false, hideFixedMsg = false, blockDonation = false, blockRanking = false, blockMission = false, blockLog = false, blockMethod = 'remove', isReady = false;

    document.addEventListener('contextmenu', (e) => {
        if (e.target.matches(SEL.nickname)) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(e.target);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, true);

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function updateRegex() {
        if (currentKeywords.length === 0) {
            keywordRegex = null;
        } else {
            try {
                const pattern = currentKeywords.map(escapeRegExp).join('|');
                keywordRegex = new RegExp(pattern);
            } catch (e) {
                keywordRegex = null;
            }
        }
    }

    function runInitialPatrol() {
        if (!isReady) return;
        manageVisibility(SEL.header, hideHeader);
        manageVisibility(SEL.ranking, blockRanking);
        if (isEnabled) {
            document.querySelectorAll(SEL.guide).forEach(node => {
                if (node.style.display !== 'none') removeElement(node);
            });
        }
    }

    function runDynamicPatrol() {
        if (!isReady) return;
        manageVisibility(SEL.fixed, hideFixedMsg);
        manageVisibility(SEL.mission, blockMission);
        manageVisibility(SEL.prediction, blockLog);
        manageVisibility(SEL.header, hideHeader);
        manageVisibility(SEL.ranking, blockRanking);
    }

    function manageVisibility(selector, shouldHide) {
        document.querySelectorAll(selector).forEach(node => {
            if (shouldHide) {
                if (node.style.display !== 'none') node.style.display = 'none';
            } else {
                if (node.style.display === 'none') node.style.display = '';
            }
        });
    }

    function initSettings() {
        chrome.storage.local.get(['isFilterEnabled', 'hideHeader', 'hideFixedMsg', 'blockDonation', 'blockRanking', 'blockMission', 'blockLog', 'bannedKeywords', 'blockMethod'], (data) => {
            isEnabled = data.isFilterEnabled !== false;
            hideHeader = data.hideHeader === true;
            hideFixedMsg = data.hideFixedMsg === true;
            blockDonation = data.blockDonation === true;
            blockRanking = data.blockRanking === true;
            blockMission = data.blockMission === true;
            blockLog = data.blockLog === true;
            blockMethod = data.blockMethod || 'remove';
            currentKeywords = data.bannedKeywords || [];
            updateRegex();

            if (!data.bannedKeywords) chrome.storage.local.set({ bannedKeywords: [] });
            isReady = true;
            runInitialPatrol();
            reprocessAllChats();
        });
    }

    chrome.storage.onChanged.addListener((changes) => {
        let needReprocess = false;
        if (changes.isFilterEnabled) { isEnabled = changes.isFilterEnabled.newValue; needReprocess = true; }
        if (changes.blockDonation) { blockDonation = changes.blockDonation.newValue; needReprocess = true; }
        if (changes.bannedKeywords) { 
            currentKeywords = changes.bannedKeywords.newValue || []; 
            updateRegex();
            needReprocess = true; 
        }
        if (changes.blockMethod) { blockMethod = changes.blockMethod.newValue; needReprocess = true; }
        if (changes.hideHeader) { hideHeader = changes.hideHeader.newValue; runInitialPatrol(); }
        if (changes.hideFixedMsg) { hideFixedMsg = changes.hideFixedMsg.newValue; runDynamicPatrol(); }
        if (changes.blockRanking) { blockRanking = changes.blockRanking.newValue; runInitialPatrol(); }
        if (changes.blockMission) { blockMission = changes.blockMission.newValue; runDynamicPatrol(); }
        if (changes.blockLog) { blockLog = changes.blockLog.newValue; runDynamicPatrol(); }
        if (needReprocess) reprocessAllChats();
    });

    function reprocessAllChats() {
        if (!isReady) return;
        document.querySelectorAll(`${SEL.item}, ${SEL.guide}, ${SEL.donation}`).forEach(node => {
            delete node.dataset.processed;
            node.style.cssText = ''; node.style.display = ''; node.style.opacity = ''; node.style.height = '';
            if(node.parentElement && node.parentElement._hiddenByExtension) {
                node.parentElement.style.cssText = '';
                delete node.parentElement._hiddenByExtension;
            }
            const textNode = node.querySelector(SEL.text);
            if (textNode && textNode.dataset.originalText) {
                textNode.textContent = textNode.dataset.originalText;
                textNode.style.color = ''; textNode.style.fontStyle = ''; textNode.style.display = '';
            }
            const tempBlockedMsg = node.querySelector('.blocked-temp');
            if (tempBlockedMsg) tempBlockedMsg.remove();
            node.querySelectorAll(SEL.image).forEach(img => img.style.display = '');
            filterChat(node);
        });
        runInitialPatrol();
        runDynamicPatrol();
    }

    function filterChat(node) {
        if (!isReady || node.dataset.processed) return;
        const isTarget = isEnabled || blockDonation || hideFixedMsg || blockRanking || blockMission || blockLog;
        if (!isTarget) return;
        node.dataset.processed = 'true';

        if (node.nodeType === 1 && node.matches(SEL.donation)) { 
            if (blockDonation) { removeElement(node); return; }
        }
        if (node.nodeType === 1 && node.matches(SEL.guide)) { if (isEnabled) removeElement(node); return; }

        if (node.nodeType === 1 && node.matches(SEL.item)) {
            if (blockDonation && node.querySelector(SEL.donation)) { removeElement(node); return; }
            if (hideFixedMsg && node.querySelector(SEL.fixed)) { removeElement(node); return; }
            if (blockRanking && node.querySelector(SEL.ranking)) { removeElement(node); return; }
            if (blockMission && node.querySelector(SEL.mission)) { removeElement(node); return; }
            if (blockLog && node.querySelector(SEL.prediction)) { removeElement(node); return; }

            if (!isEnabled) return; 

            let shouldBlock = false;
            const textNode = node.querySelector(SEL.text);
            const contentToCheck = textNode ? (textNode.dataset.originalText || textNode.textContent) : '';

            if (contentToCheck && keywordRegex && keywordRegex.test(contentToCheck)) shouldBlock = true;
            
            if (!shouldBlock) {
                const nameNode = node.querySelector(SEL.nickname);
                if (nameNode && keywordRegex && keywordRegex.test(nameNode.textContent)) shouldBlock = true;
            }
            
            if (!shouldBlock && currentKeywords.length > 0) {
                const images = node.querySelectorAll(SEL.image);
                for (let img of images) {
                    if (img.closest(SEL.badge)) continue;
                    if (keywordRegex && keywordRegex.test(img.src || '')) { shouldBlock = true; break; }
                }
            }
            
            if (shouldBlock) {
                if (blockMethod === 'remove') removeElement(node);
                else if (blockMethod === 'text-only') replaceElement(node, true);
                else replaceElement(node, false);
            }
        }
    }

    function removeElement(node) {
        applyHideStyle(node);
        const parent = node.parentElement;
        if (parent && !parent.matches(SEL.container)) {
            if (parent.childElementCount === 1 || parent.matches(SEL.item)) {
                applyHideStyle(parent);
                parent._hiddenByExtension = true;
            }
        }
    }

    function replaceElement(node, hideMode) {
        node.style.display = ''; node.style.opacity = '1'; node.style.height = 'auto';
        const textNode = node.querySelector(SEL.text);
        if (textNode) {
            if (!textNode.dataset.originalText) textNode.dataset.originalText = textNode.textContent;
            if (hideMode) textNode.style.display = 'none';
            else {
                textNode.textContent = '차단된 메시지입니다.';
                textNode.style.color = '#777'; textNode.style.fontStyle = 'italic'; textNode.style.display = '';
            }
        } else if (!hideMode) {
            const contentArea = node.querySelector('[class*="live_chatting_message_wrapper"]');
            if (contentArea && !contentArea.querySelector('.blocked-temp')) {
                const span = document.createElement('span');
                span.className = 'blocked-temp'; span.textContent = '차단된 메시지입니다.';
                span.style.color = '#777'; span.style.fontStyle = 'italic';
                contentArea.appendChild(span);
            }
        }
        node.querySelectorAll(SEL.image).forEach(img => { if (!img.closest(SEL.badge)) img.style.display = 'none'; });
    }

    function applyHideStyle(el) {
        if (el.style.display === 'none' && el.style.height === '0px') return;
        el.style.cssText = 'display:none !important; height:0px !important; min-height:0px !important; max-height:0px !important; margin:0px !important; padding:0px !important; border:none !important; opacity:0 !important; pointer-events:none !important;';
    }

    function tryCollectPower(node) {
        if (node.matches && node.matches(SEL.btn)) node.click();
        else { const btn = node.querySelector(SEL.btn); if (btn) btn.click(); }
    }

    const chatObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                filterChat(node);
                tryCollectPower(node);
                
                if (node.matches(SEL.fixed) && hideFixedMsg) removeElement(node);
                if (node.matches(SEL.mission) && blockMission) removeElement(node);
                if (node.matches(SEL.prediction) && blockLog) removeElement(node);
                
                if (node.matches(SEL.header) && hideHeader) node.style.display = 'none';
                if (node.matches(SEL.ranking) && blockRanking) node.style.display = 'none';
                if (node.matches(SEL.guide) && isEnabled) removeElement(node);
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
            lastUrl = location.href; chatObserver.disconnect(); startObserving();
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
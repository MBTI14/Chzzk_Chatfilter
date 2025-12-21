document.addEventListener('DOMContentLoaded', () => {
    const tabSettings = document.getElementById('btn-tab-settings');
    const tabList = document.getElementById('btn-tab-list');
    const viewSettings = document.getElementById('view-settings');
    const viewList = document.getElementById('view-list');
    const toggleChat = document.getElementById('toggle-chat-block');
    const toggleHeader = document.getElementById('toggle-header-block');
    const toggleFixed = document.getElementById('toggle-fixed-block');
    const toggleDonation = document.getElementById('toggle-donation-block');
    const toggleRanking = document.getElementById('toggle-ranking-block');
    const toggleMission = document.getElementById('toggle-mission-block');
    const toggleLog = document.getElementById('toggle-log-block');
    const radioButtons = document.querySelectorAll('input[name="blockMethod"]');
    const inputKeyword = document.getElementById('input-keyword');
    const btnAdd = document.getElementById('btn-add');
    const listContainer = document.getElementById('block-list-container');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-input');

    function switchTab(target) {
        const isSettings = target === 'settings';
        tabSettings.classList.toggle('active', isSettings);
        tabList.classList.toggle('active', !isSettings);
        viewSettings.classList.toggle('hidden', !isSettings);
        viewList.classList.toggle('hidden', isSettings);
    }

    tabSettings.addEventListener('click', () => switchTab('settings'));
    tabList.addEventListener('click', () => switchTab('list'));

    chrome.storage.local.get(['isFilterEnabled', 'hideHeader', 'hideFixedMsg', 'blockDonation', 'blockMethod', 'blockRanking', 'blockMission', 'blockLog'], (data) => {
        toggleChat.checked = data.isFilterEnabled !== false;
        toggleHeader.checked = data.hideHeader === true;
        toggleFixed.checked = data.hideFixedMsg === true;
        toggleDonation.checked = data.blockDonation === true;
        toggleRanking.checked = data.blockRanking === true;
        toggleMission.checked = data.blockMission === true;
        toggleLog.checked = data.blockLog === true;
        const savedMethod = data.blockMethod || 'remove';
        radioButtons.forEach(radio => radio.checked = (radio.value === savedMethod));
    });

    const saveConfig = (key, value) => chrome.storage.local.set({ [key]: value });
    toggleChat.addEventListener('change', () => saveConfig('isFilterEnabled', toggleChat.checked));
    toggleHeader.addEventListener('change', () => saveConfig('hideHeader', toggleHeader.checked));
    toggleFixed.addEventListener('change', () => saveConfig('hideFixedMsg', toggleFixed.checked));
    toggleDonation.addEventListener('change', () => saveConfig('blockDonation', toggleDonation.checked));
    toggleRanking.addEventListener('change', () => saveConfig('blockRanking', toggleRanking.checked));
    toggleMission.addEventListener('change', () => saveConfig('blockMission', toggleMission.checked));
    toggleLog.addEventListener('change', () => saveConfig('blockLog', toggleLog.checked));
    radioButtons.forEach(radio => radio.addEventListener('change', (e) => { if(e.target.checked) saveConfig('blockMethod', e.target.value); }));

    function renderList() {
        listContainer.innerHTML = '';
        chrome.storage.local.get(['bannedKeywords', 'emoteMap', 'userMap'], (data) => {
            const keywords = data.bannedKeywords || [];
            const emoteMap = data.emoteMap || {};
            const userMap = data.userMap || {};

            if (keywords.length === 0) {
                listContainer.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#555;"><div style="font-size:24px; margin-bottom:8px;">📭</div><div style="font-size:13px; color:#777;">차단 목록이 비어있습니다</div></div>`;
                return;
            }

            keywords.forEach(keyword => {
                const item = document.createElement('div');
                item.className = 'list-item';

                const leftDiv = document.createElement('div');
                leftDiv.className = 'list-item-left';

                if (emoteMap[keyword]) {
                    const img = document.createElement('img');
                    img.src = emoteMap[keyword];
                    img.style.height = '24px';
                    img.style.borderRadius = '4px';
                    leftDiv.appendChild(img);
                } else {
                    const textSpan = document.createElement('span');
                    textSpan.textContent = keyword;
                    textSpan.className = 'keyword-text';
                    leftDiv.appendChild(textSpan);
                    
                    if (userMap[keyword]) {
                        const idBadge = document.createElement('span');
                        idBadge.className = 'id-badge';
                        idBadge.textContent = 'ID';
                        leftDiv.appendChild(idBadge);
                    }
                }
                
                item.appendChild(leftDiv);

                const delBtn = document.createElement('span');
                delBtn.className = 'delete-btn';
                delBtn.textContent = '삭제';
                delBtn.onclick = () => removeKeyword(keyword);
                item.appendChild(delBtn);

                listContainer.appendChild(item);
            });
        });
    }

    btnAdd.addEventListener('click', () => {
        const val = inputKeyword.value.trim();
        if (!val) return;
        chrome.storage.local.get(['bannedKeywords'], (data) => {
            const keywords = data.bannedKeywords || [];
            if (!keywords.includes(val)) {
                keywords.push(val);
                chrome.storage.local.set({ bannedKeywords: keywords }, () => {
                    inputKeyword.value = '';
                    renderList();
                });
            }
        });
    });

    inputKeyword.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });

    function removeKeyword(target) {
        chrome.storage.local.get(['bannedKeywords', 'emoteMap', 'userMap'], (data) => {
            let keywords = data.bannedKeywords || [];
            let emoteMap = data.emoteMap || {};
            let userMap = data.userMap || {};
            
            const newKeywords = keywords.filter(k => k !== target);
            if (emoteMap[target]) delete emoteMap[target];
            if (userMap[target]) delete userMap[target];

            chrome.storage.local.set({ bannedKeywords: newKeywords, emoteMap: emoteMap, userMap: userMap }, renderList);
        });
    }

    btnExport.addEventListener('click', () => {
        chrome.storage.local.get(['bannedKeywords', 'emoteMap', 'userMap'], (data) => {
            const exportData = {
                bannedKeywords: data.bannedKeywords || [],
                emoteMap: data.emoteMap || {},
                userMap: data.userMap || {},
                exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chzzk-filter-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    btnImport.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData.bannedKeywords)) return alert('올바르지 않은 차단 목록 파일입니다.');
                chrome.storage.local.get(['bannedKeywords', 'emoteMap', 'userMap'], (currentData) => {
                    const mergedKeywords = Array.from(new Set([...(currentData.bannedKeywords || []), ...importedData.bannedKeywords]));
                    const mergedEmoteMap = { ...(currentData.emoteMap || {}), ...(importedData.emoteMap || {}) };
                    const mergedUserMap = { ...(currentData.userMap || {}), ...(importedData.userMap || {}) };
                    chrome.storage.local.set({ bannedKeywords: mergedKeywords, emoteMap: mergedEmoteMap, userMap: mergedUserMap }, () => {
                        alert(`불러오기 완료! (총 ${mergedKeywords.length}개)`);
                        renderList();
                        fileInput.value = '';
                    });
                });
            } catch (err) { alert('파일 읽기 오류 발생'); }
        };
        reader.readAsText(file);
    });

    renderList();
});

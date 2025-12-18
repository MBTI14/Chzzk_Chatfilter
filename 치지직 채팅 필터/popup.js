document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleFilter');
    const input = document.getElementById('keywordInput');
    const addBtn = document.getElementById('addBtn');
    const list = document.getElementById('keywordList');
  
    chrome.storage.local.get(['isFilterEnabled', 'bannedKeywords', 'emoteMap'], (data) => {
        toggle.checked = data.isFilterEnabled !== false;
        renderList(data.bannedKeywords || [], data.emoteMap || {});
    });
  
    toggle.addEventListener('change', () => chrome.storage.local.set({ isFilterEnabled: toggle.checked }));
  
    const handleAdd = () => {
        const keyword = input.value.trim();
        if (!keyword) return;
        chrome.storage.local.get(['bannedKeywords', 'emoteMap'], (data) => {
            const keywords = data.bannedKeywords || [];
            if (!keywords.includes(keyword)) {
                keywords.push(keyword);
                chrome.storage.local.set({ bannedKeywords: keywords }, () => {
                    renderList(keywords, data.emoteMap || {});
                    input.value = '';
                    input.focus();
                });
            }
        });
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });
  
    function removeKeyword(keyword) {
        chrome.storage.local.get(['bannedKeywords', 'emoteMap'], (data) => {
            const keywords = (data.bannedKeywords || []).filter(k => k !== keyword);
            const emoteMap = data.emoteMap || {};
            if (emoteMap[keyword]) delete emoteMap[keyword];
            chrome.storage.local.set({ bannedKeywords: keywords, emoteMap }, () => renderList(keywords, emoteMap));
        });
    }

    function renderList(keywords, emoteMap) {
        list.innerHTML = ''; 
        keywords.forEach(keyword => {
            const li = document.createElement('li');
            const contentDiv = document.createElement('div');
            contentDiv.className = 'keyword-content';

            if (emoteMap && emoteMap[keyword]) {
                const img = document.createElement('img');
                img.src = emoteMap[keyword];
                img.className = 'emote-preview';
                img.title = keyword;
                contentDiv.appendChild(img);
            } else {
                const span = document.createElement('span');
                span.textContent = keyword;
                span.className = 'text-preview';
                contentDiv.appendChild(span);
            }
            li.appendChild(contentDiv);

            const delBtn = document.createElement('span');
            delBtn.textContent = 'X';
            delBtn.className = 'delete-btn';
            delBtn.onclick = () => removeKeyword(keyword);
            li.appendChild(delBtn);
            list.appendChild(li);
        });
    }
});
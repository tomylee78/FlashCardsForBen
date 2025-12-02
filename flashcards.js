// flashcards.js
// 由 index.html 移植的主程式
// 已將原生的 SpeechSynthesis 替換為透過 Vercel Proxy 呼叫 Azure TTS API 的功能，以提高語音品質和發音準確度。

// === Azure TTS API 設定 ===
// 這是您部署在 Vercel 上的 Serverless Function 網址。
// 前端所有語音請求都將發送到此處，由 Vercel 進行安全轉發。
const VERCEL_TTS_ENDPOINT = 'https://tts-proxy-eight.vercel.app/api/speak'; 

// === 1. 單字 JSON 資料：改為從外部 cards.json 載入 ===
let cards = []; // 由 fetch('cards.json') 填入

// === 2. DOM 元素取得 ===
const cardContainer = document.getElementById('cardContainer');
const noDataAlert = document.getElementById('noDataAlert');
const cardCount = document.getElementById('cardCount');
const wordList = document.getElementById('wordList');
const wordListOffcanvasEl = document.getElementById('wordListOffcanvas');

const cardIndexBadge = document.getElementById('cardIndexBadge');
const wordEnTitle = document.getElementById('wordEnTitle');

const wordEnEl = document.getElementById('wordEn');
const sentenceEnEl = document.getElementById('sentenceEn');

const wordZhEl = document.getElementById('wordZh');
const wordZhPinyinEl = document.getElementById('wordZhPinyin');
const sentenceZhEl = document.getElementById('sentenceZh');
const sentenceZhPinyinEl = document.getElementById('sentenceZhPinyin');

const wordThEl = document.getElementById('wordTh');
const sentenceThEl = document.getElementById('sentenceTh');

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// 手機版導航按鈕
const prevBtnMobile = document.getElementById('prevBtnMobile');
const nextBtnMobile = document.getElementById('nextBtnMobile');

// 發音按鈕
const speakEnWordBtn = document.getElementById('speakEnWordBtn');
const speakEnSentenceBtn = document.getElementById('speakEnSentenceBtn');
const speakZhWordBtn = document.getElementById('speakZhWordBtn');
const speakZhSentenceBtn = document.getElementById('speakZhSentenceBtn');
const speakThWordBtn = document.getElementById('speakThWordBtn');
const speakThSentenceBtn = document.getElementById('speakThSentenceBtn');

// === 3. 狀態：目前顯示哪一張卡片 ===
let currentIndex = 0;

// === 4. 渲染單字卡內容 ===
function renderCard() {
    if (!cards.length) return;

    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= cards.length) currentIndex = cards.length - 1;

    const card = cards[currentIndex];

    cardIndexBadge.textContent = `#${currentIndex + 1} / ${cards.length}`;
    wordEnTitle.textContent = card.word;

    // 英文區
    wordEnEl.textContent = card.word || '';
    sentenceEnEl.textContent = card.examples?.en?.sentence || '';
    // 詞性顯示
    const enTypeEl = document.getElementById('wordEnType');
    if (enTypeEl) {
        enTypeEl.textContent = card.type || '';
    }

    // 中文區
    wordZhEl.textContent = card.zh || '';
    wordZhPinyinEl.textContent = card.zh_pinyin || '';
    sentenceZhEl.textContent = card.examples?.zh?.sentence || '';
    sentenceZhPinyinEl.textContent =
        card.examples?.zh?.sentence_pinyin || '';
    const zhTypeEl = document.getElementById('wordZhType');
    if (zhTypeEl) {
        zhTypeEl.textContent = card.type || '';
    }

    // 泰文區
    wordThEl.textContent = card.th || '';
    sentenceThEl.textContent = card.examples?.th?.sentence || '';
    const thTypeEl = document.getElementById('wordThType');
    if (thTypeEl) {
        thTypeEl.textContent = card.type || '';
    }

    // 更新清單樣式
    updateWordListActive();
}

// === 5. 建立清單項目（側邊清單） ===
function buildWordList() {
    wordList.innerHTML = '';
    cards.forEach((card, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
            'list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-3';
        btn.dataset.index = index;

        const leftSpan = document.createElement('span');
        leftSpan.textContent = card.word;

        const rightSmall = document.createElement('small');
        rightSmall.className = 'text-muted';
        rightSmall.textContent = `${card.zh} / ${card.th}`;

        btn.appendChild(leftSpan);
        btn.appendChild(rightSmall);

        btn.addEventListener('click', () => {
            currentIndex = index;
            renderCard();
        });

        wordList.appendChild(btn);
    });
    cardCount.textContent = cards.length.toString();
}

// 使用 Bootstrap 的淺色樣式來標記當前項目
function updateWordListActive() {
    const items = wordList.querySelectorAll('button.list-group-item');
    items.forEach((el, idx) => {
        el.classList.remove('list-group-item-light', 'fw-bold');
        if (idx === currentIndex) {
            el.classList.add('list-group-item-light', 'fw-bold');
        }
    });
}

// 讓側邊清單在開啟時，捲動到當前單字卡
function scrollActiveWordIntoView() {
    const items = wordList.querySelectorAll('button.list-group-item');
    if (!items.length) return;
    const target = items[currentIndex];
    if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Offcanvas 開啟後，讓當前項目自動捲到中間
if (wordListOffcanvasEl) {
    wordListOffcanvasEl.addEventListener('shown.bs.offcanvas', () => {
        scrollActiveWordIntoView();
    });
}

// === 6. 語音發音功能（已從 SpeechSynthesis 替換為 Vercel 雲端 API） ===
// 刪除所有原生的 speechSynthesis 邏輯

/**
 * 透過 Vercel Proxy 呼叫 Azure TTS API 進行語音合成與播放。
 * @param {string} text 要朗讀的文本。
 * @param {string} lang 語系 (例如 'en-US', 'zh-TW')，用於 Vercel 選擇語音。
 * @param {HTMLElement} [targetButton=null] 觸發發音的按鈕元素，用於播放期間禁用。
 */
async function speakAzure(text, lang, targetButton = null) {
    if (!text) {
        alert('目前沒有可朗讀的內容。');
        return;
    }
    
    // 播放前禁用按鈕，防止重複點擊，並在發生錯誤時提供視覺回饋
    if (targetButton) targetButton.disabled = true;

    try {
        const response = await fetch(VERCEL_TTS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ 
                text: text, 
                lang: lang // 將語系 (例如 'zh-TW') 傳遞給 Vercel Function
            }), 
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            // 處理非 200 的狀態碼，並嘗試獲取 Vercel 傳回的錯誤訊息
            const errorText = await response.text();
            throw new Error(`TTS API failed (${response.status}): ${errorText}`);
        }

        // 接收 Vercel 回傳的 MP3 檔案 (Blob)
        const audioBlob = await response.blob(); 
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.play();

        // 播放完畢或發生錯誤時，重新啟用按鈕並清理物件
        const cleanup = () => {
            if (targetButton) targetButton.disabled = false;
            URL.revokeObjectURL(audioUrl); // 釋放記憶體資源
        };
        
        audio.onended = cleanup;
        audio.onerror = cleanup;

    } catch (error) {
        console.error('語音服務失敗:', error);
        alert(`語音服務錯誤: ${error.message}. 請檢查 Vercel logs 或網路連線。`);
        if (targetButton) targetButton.disabled = false;
    }
}


// === 7. 導航邏輯（上一張 / 下一張） ===
function gotoPrev() {
    if (!cards.length) return;
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    renderCard();
}

function gotoNext() {
    if (!cards.length) return;
    currentIndex = (currentIndex + 1) % cards.length;
    renderCard();
}

/**
 * 跳轉到隨機選擇的一張單字卡
 */
function gotoRandom() {
    if (!cards.length) return;
    
    // 產生一個新的隨機索引
    const newIndex = Math.floor(Math.random() * cards.length);
    
    // 避免重複顯示當前的卡片，除非只有一張卡
    if (cards.length > 1 && newIndex === currentIndex) {
        // 如果隨機到當前索引，則重新呼叫一次，或簡單地移動到下一個索引
        currentIndex = (newIndex + 1) % cards.length;
    } else {
        currentIndex = newIndex;
    }
    
    renderCard();
}

// === 8. 發音按鈕（使用 speakAzure） ===
function bindEvents() {
    // 桌機版按鈕
    prevBtn.addEventListener('click', gotoPrev);
    nextBtn.addEventListener('click', gotoNext);

    // 手機版按鈕
    if (prevBtnMobile && nextBtnMobile) {
        prevBtnMobile.addEventListener('click', gotoPrev);
        nextBtnMobile.addEventListener('click', gotoNext);
    }

    // 🚨 新增：隨機按鈕綁定
    if (randomBtn) {
        randomBtn.addEventListener('click', gotoRandom);
    }    

    // 英文：單字 / 句子 (使用 'en-US' 語系)
    speakEnWordBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        // 傳遞按鈕元素 e.currentTarget 讓函式可以控制啟用/禁用
        speakAzure(card.word, 'en-US', e.currentTarget); 
    });

    speakEnSentenceBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        const textToSpeak = card.examples?.en?.sentence || card.word;
        speakAzure(textToSpeak, 'en-US', e.currentTarget);
    });

    // 中文：單字 / 句子 (使用 'zh-TW' 語系，推薦發音最自然的 Azure 台灣中文)
    speakZhWordBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.zh?.word || card.zh || '';
        speakAzure(textToSpeak, 'zh-TW', e.currentTarget); 
    });

    speakZhSentenceBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.zh?.sentence || card.zh || '';
        speakAzure(textToSpeak, 'zh-TW', e.currentTarget); 
    });

    // 泰文：單字 / 句子 (使用 'th-TH' 語系)
    speakThWordBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.th?.word || card.th || '';
        speakAzure(textToSpeak, 'th-TH', e.currentTarget);
    });

    speakThSentenceBtn.addEventListener('click', (e) => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.th?.sentence || card.th || '';
        speakAzure(textToSpeak, 'th-TH', e.currentTarget);
    });
}

// === 9. 初始化流程 ===
function init() {
    if (!cards.length) {
        cardContainer.style.display = 'none';
        noDataAlert.style.display = 'block';
        return;
    }
    buildWordList();
    cardContainer.style.display = 'block';
    noDataAlert.style.display = 'none';
    renderCard();
}

// 分流載入指定 json 檔案
async function loadCardsAndInitFromFile(jsonFile) {
    try {
        const res = await fetch(jsonFile, { cache: 'no-cache' });
        if (!res.ok) {
            throw new Error('載入 ' + jsonFile + ' 失敗：' + res.status);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            throw new Error(jsonFile + ' 格式應為陣列');
        }
        cards = data;
    } catch (err) {
        console.error(err);
        alert('載入單字卡資料失敗，請確認 ' + jsonFile + ' 是否存在且格式正確。');
        cardContainer.style.display = 'none';
        noDataAlert.style.display = 'block';
        return;
    }
    currentIndex = 0;
    init();
}

// 綁定事件後，載入資料並初始化
function bindEventsWithSplit() {
    bindEvents();
    const benListBtn = document.getElementById('benListBtn');
    const tomyListBtn = document.getElementById('tomyListBtn');
    function setActiveBtn(activeBtn) {
        if (benListBtn) benListBtn.classList.remove('active');
        if (tomyListBtn) tomyListBtn.classList.remove('active');
        if (activeBtn) activeBtn.classList.add('active');
    }
    if (benListBtn) {
        benListBtn.addEventListener('click', () => {
            setActiveBtn(benListBtn);
            loadCardsAndInitFromFile('cardsBen.json');
        });
    }
    if (tomyListBtn) {
        tomyListBtn.addEventListener('click', () => {
            setActiveBtn(tomyListBtn);
            loadCardsAndInitFromFile('cardsTomy.json');
        });
    }
    // 預設 Tomy List active
    setActiveBtn(tomyListBtn);
}

// 預設載入 Ben List
bindEventsWithSplit();
loadCardsAndInitFromFile('cardsTomy.json');
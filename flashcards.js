// flashcards.js
// 由 index.html 移植的主程式

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

// === 6. 語音發音功能（使用 SpeechSynthesis） ===
let voices = [];

function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getVoiceForLang(lang) {
    if (!voices || !voices.length) return null;
    const lowerLang = lang.toLowerCase();
    // 優先完全匹配，其次前綴匹配
    let voice =
        voices.find((v) => v.lang.toLowerCase() === lowerLang) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(lowerLang));
    return voice || null;
}

function speak(text, lang) {
    if (!('speechSynthesis' in window)) {
        alert('此瀏覽器不支援語音合成功能。');
        return;
    }
    if (!text) {
        alert('目前沒有可朗讀的內容。');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // 試著選擇適合語系的 voice
    const voice = getVoiceForLang(lang);
    if (voice) {
        utterance.voice = voice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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

// === 8. 發音按鈕 ===
function bindEvents() {
    // 桌機版按鈕
    prevBtn.addEventListener('click', gotoPrev);
    nextBtn.addEventListener('click', gotoNext);

    // 手機版按鈕
    if (prevBtnMobile && nextBtnMobile) {
        prevBtnMobile.addEventListener('click', gotoPrev);
        nextBtnMobile.addEventListener('click', gotoNext);
    }

    // 英文：單字 / 句子
    speakEnWordBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        speak(card.word, 'en-US');
    });

    speakEnSentenceBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        const textToSpeak = card.examples?.en?.sentence || card.word;
        speak(textToSpeak, 'en-US');
    });

    // 中文：單字 / 句子
    speakZhWordBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.zh?.word || card.zh || '';
        speak(textToSpeak, 'zh-CN');
    });

    speakZhSentenceBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.zh?.sentence || card.zh || '';
        speak(textToSpeak, 'zh-CN');
    });

    // 泰文：單字 / 句子
    speakThWordBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.th?.word || card.th || '';
        speak(textToSpeak, 'th-TH');
    });

    speakThSentenceBtn.addEventListener('click', () => {
        const card = cards[currentIndex];
        const textToSpeak =
            card.examples?.th?.sentence || card.th || '';
        speak(textToSpeak, 'th-TH');
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

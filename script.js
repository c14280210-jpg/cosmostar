const tg = window.Telegram.WebApp;
tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const USER_ID = urlParams.get('user_id') || '1';

console.log('👤 User ID:', USER_ID);

// ========== СТАН ==========
let state = {
    balance: 0,
    freeSpins: 5,
    pets: [],
    petBonus: 0,
    totalGames: 0,
    totalWin: 0,
    isSpinning: false
};

// ========== ЗАВАНТАЖЕННЯ ==========
function loadData() {
    const saved = localStorage.getItem(`cosmostars_${USER_ID}`);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state = { ...state, ...data };
        } catch(e) {}
    }
    updateUI();
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

function saveData() {
    localStorage.setItem(`cosmostars_${USER_ID}`, JSON.stringify(state));
}

// ========== ОНОВЛЕННЯ UI ==========
function updateUI() {
    document.getElementById('balance').textContent = state.balance;
    document.getElementById('free-spins').textContent = state.freeSpins;
    document.getElementById('free-count').textContent = `(${state.freeSpins})`;
    document.getElementById('stat-games').textContent = state.totalGames;
    document.getElementById('stat-win').textContent = state.totalWin + '⭐';
    document.getElementById('stat-pets').textContent = state.pets.length;
    document.getElementById('bonus-display').textContent = `🐾 Бонус: +${state.petBonus}%`;
    
    document.getElementById('p-balance').textContent = state.balance + '⭐';
    document.getElementById('p-spins').textContent = state.freeSpins;
    document.getElementById('p-bonus').textContent = '+' + state.petBonus + '%';
    document.getElementById('p-games').textContent = state.totalGames;
    document.getElementById('p-win').textContent = state.totalWin + '⭐';
    document.getElementById('p-pets').textContent = state.pets.length;
    document.getElementById('profile-id').textContent = `ID: ${USER_ID}`;
    
    renderPets();
    renderPromoCodes();
}

// ========== ПИТОМЦЫ ==========
const PETS = [
    { name: '🐹 Метеоритный Хомяк', price: 320, bonus: 12 },
    { name: '🌈 Кометный Единорог', price: 480, bonus: 18 },
    { name: '🐙 Космо-Осьминог', price: 640, bonus: 25 },
    { name: '🐉 Звездный Дракон', price: 800, bonus: 35 }
];

function renderPets() {
    const container = document.getElementById('pets-list');
    container.innerHTML = PETS.map(pet => {
        const owned = state.pets.includes(pet.name);
        return `
            <div class="pet-card">
                <div>
                    <div style="font-weight:600;">${pet.name}</div>
                    <div style="font-size:12px;opacity:0.7;">+${pet.bonus}% к выигрышам</div>
                </div>
                ${owned ? 
                    '<span class="owned">✅ Куплен</span>' :
                    `<button class="buy-btn" onclick="buyPet('${pet.name}', ${pet.price})">${pet.price}⭐</button>`
                }
            </div>
        `;
    }).join('');
}

function buyPet(name, price) {
    if (state.balance < price) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    state.balance -= price;
    state.pets.push(name);
    state.petBonus = Math.min(70, state.petBonus + PETS.find(p => p.name === name).bonus);
    saveData();
    updateUI();
    showResult('🎉', `Куплен ${name}!`, `+${PETS.find(p => p.name === name).bonus}%`);
}

// ========== ИГРЫ ==========
function playSlot(bet) {
    if (state.isSpinning) return;
    if (state.balance < bet && state.freeSpins <= 0) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    
    let isFree = false;
    if (state.freeSpins > 0 && bet <= 25) {
        state.freeSpins -= 1;
        isFree = true;
        saveData();
        updateUI();
    } else {
        state.balance -= bet;
        saveData();
        updateUI();
    }
    
    state.isSpinning = true;
    const reels = ['reel1', 'reel2', 'reel3'];
    const emojis = ['🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '💎', '🌟'];
    
    // Анимация
    reels.forEach(id => document.getElementById(id).classList.add('spinning'));
    let count = 0;
    const interval = setInterval(() => {
        reels.forEach(id => {
            document.getElementById(id).textContent = emojis[Math.floor(Math.random() * emojis.length)];
        });
        count++;
        if (count > 15) {
            clearInterval(interval);
            finishSlot(bet, isFree);
        }
    }, 80);
}

function finishSlot(bet, isFree) {
    const reels = ['reel1', 'reel2', 'reel3'];
    const emojis = ['🍒', '🍋', '🍊', '🍇', '🍉', '🍓', '💎', '🌟'];
    
    const slot = {
        25: { minWin: 0, maxWin: 3, chance: 0.05 },
        50: { minWin: 0, maxWin: 5, chance: 0.03 },
        100: { minWin: 0, maxWin: 10, chance: 0.01 }
    };
    
    let win = 0;
    if (Math.random() < slot[bet].chance) {
        win = Math.floor(Math.random() * (slot[bet].maxWin - slot[bet].minWin + 1)) + slot[bet].minWin;
        win = Math.floor(win * (1 + state.petBonus / 100));
    }
    
    // Финальные символы
    const finalEmojis = [
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)]
    ];
    reels.forEach((id, i) => {
        document.getElementById(id).textContent = finalEmojis[i];
        document.getElementById(id).classList.remove('spinning');
    });
    
    if (win > 0) {
        state.balance += win;
        state.totalWin += win;
    }
    state.totalGames += 1;
    state.isSpinning = false;
    
    saveData();
    updateUI();
    document.getElementById('slot-status').textContent = win > 0 ? '🎉 ПОБЕДА!' : '😢 ПРОИГРЫШ';
    showResult(win > 0 ? '🎉' : '😢', win > 0 ? 'ВЫИГРЫШ!' : 'ПРОИГРЫШ', win > 0 ? `+${win}⭐` : '0⭐');
}

// ========== КУБИК ==========
function playDice(bet) {
    if (state.isSpinning) return;
    if (state.balance < bet) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    
    state.balance -= bet;
    saveData();
    updateUI();
    
    state.isSpinning = true;
    const display = document.getElementById('dice-display');
    display.classList.add('rolling');
    
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const multipliers = {
        10: [0, 0, 0, 0, 1, 2],
        25: [0, 0, 0, 1, 2, 3],
        50: [0, 0, 1, 2, 3, 4]
    };
    
    let count = 0;
    const interval = setInterval(() => {
        display.textContent = diceEmojis[Math.floor(Math.random() * 6)];
        count++;
        if (count > 20) {
            clearInterval(interval);
            const value = Math.floor(Math.random() * 6);
            const multiplier = multipliers[bet][value];
            let win = Math.floor(bet * multiplier);
            win = Math.floor(win * (1 + state.petBonus / 100));
            
            if (win > 0) {
                state.balance += win;
                state.totalWin += win;
            }
            state.totalGames += 1;
            state.isSpinning = false;
            
            display.textContent = diceEmojis[value];
            display.classList.remove('rolling');
            document.getElementById('dice-result').textContent = 
                `Выпало: ${value + 1} | Множитель: x${multiplier}`;
            
            saveData();
            updateUI();
            showResult(win > 0 ? '🎉' : '😢', win > 0 ? 'ВЫИГРЫШ!' : 'ПРОИГРЫШ', win > 0 ? `+${win}⭐` : '0⭐');
        }
    }, 80);
}

// ========== КОЛЕСО ==========
function playWheel(bet) {
    if (state.isSpinning) return;
    if (state.balance < bet) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    
    state.balance -= bet;
    saveData();
    updateUI();
    
    state.isSpinning = true;
    const wheel = document.getElementById('wheel');
    const segments = [0, 0, 0, 0, 0, 1, 2, 3, 5, 10];
    
    // Случайный поворот
    const randomIndex = Math.floor(Math.random() * segments.length);
    const win = segments[randomIndex] * (1 + state.petBonus / 100);
    const rotation = 360 * 5 + (360 / segments.length) * randomIndex;
    
    wheel.style.transform = `rotate(${rotation}deg)`;
    
    setTimeout(() => {
        const finalWin = Math.floor(win);
        if (finalWin > 0) {
            state.balance += finalWin;
            state.totalWin += finalWin;
        }
        state.totalGames += 1;
        state.isSpinning = false;
        
        document.getElementById('wheel-result').textContent = 
            finalWin > 0 ? `🎉 Выпало: ${finalWin}⭐` : '😢 0⭐';
        
        saveData();
        updateUI();
        showResult(finalWin > 0 ? '🎉' : '😢', finalWin > 0 ? 'ВЫИГРЫШ!' : 'ПРОИГРЫШ', finalWin > 0 ? `+${finalWin}⭐` : '0⭐');
    }, 3500);
}

// ========== БЕСПЛАТНОЕ ВРАЩЕНИЕ ==========
function playFree() {
    if (state.freeSpins <= 0) {
        showResult('❌', 'Нет бесплатных вращений!', '');
        return;
    }
    playSlot(25);
}

// ========== ВЫВОД ==========
function withdraw() {
    if (state.balance < 1000) {
        showResult('❌', `Минимальный вывод: 1000⭐\nВаш баланс: ${state.balance}⭐`, '');
        return;
    }
    
    tg.sendData(JSON.stringify({
        action: 'withdraw',
        amount: state.balance
    }));
    
    showResult('💳', 'Запрос на вывод отправлен!', `${state.balance}⭐`);
    state.balance = 0;
    saveData();
    updateUI();
}

function deposit() {
    tg.sendData(JSON.stringify({
        action: 'deposit'
    }));
}

// ========== ПРОМОКОД ==========
function usePromo() {
    const input = document.getElementById('promo-input');
    const code = input.value.trim().toUpperCase();
    const resultDiv = document.getElementById('promo-result');
    
    if (!code) {
        resultDiv.innerHTML = '❌ Введите промокод';
        return;
    }
    
    // Промокоды (вы можете добавлять свои)
    const promoCodes = {
        'ENJOY': { reward: 5, type: 'free_spins' },
        'WELCOME': { reward: 10, type: 'stars' },
        'VIP2024': { reward: 20, type: 'stars' }
    };
    
    if (promoCodes[code]) {
        const promo = promoCodes[code];
        if (promo.type === 'free_spins') {
            state.freeSpins += promo.reward;
        } else {
            state.balance += promo.reward;
        }
        saveData();
        updateUI();
        resultDiv.innerHTML = `✅ Получено ${promo.reward} ${promo.type === 'free_spins' ? 'вращений' : '⭐'}`;
        input.value = '';
    } else {
        resultDiv.innerHTML = '❌ Промокод не найден';
    }
}

// ========== РЕНДЕР ПРОМОКОДОВ ==========
function renderPromoCodes() {
    const container = document.getElementById('promo-list');
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>ENJOY</span>
            <span style="color:#ffd700;">5 бесплатных вращений</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>WELCOME</span>
            <span style="color:#ffd700;">10⭐</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
            <span>VIP2024</span>
            <span style="color:#ffd700;">20⭐</span>
        </div>
    `;
}

// ========== РЕЗУЛЬТАТ ==========
function showResult(emoji, status, amount) {
    const box = document.getElementById('result-box');
    const content = document.getElementById('result-content');
    const isWin = status.includes('ВЫИГРЫШ');
    
    content.innerHTML = `
        <div style="font-size:48px;">${emoji}</div>
        <div class="${isWin ? 'win' : 'lose'}">${status}</div>
        ${amount ? `<div class="amount">${amount}</div>` : ''}
    `;
    
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 5000);
}

// ========== НАВИГАЦИЯ ==========
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + this.dataset.tab).classList.add('active');
    });
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('app').style.display = this.dataset.page === 'game' ? 'block' : 'none';
        document.getElementById('page-promo').style.display = this.dataset.page === 'promo' ? 'block' : 'none';
        document.getElementById('page-profile').style.display = this.dataset.page === 'profile' ? 'block' : 'none';
    });
});

// ========== ЗАПУСК ==========
loadData();

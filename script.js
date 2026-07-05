const tg = window.Telegram.WebApp;
tg.expand();

// Отримуємо ID користувача
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

// ========== КОНФІГ ==========
const SLOTS = {
    25: { name: 'Мини', minWin: 0, maxWin: 5, chance: 0.08 },
    50: { name: 'Стандарт', minWin: 0, maxWin: 10, chance: 0.05 },
    100: { name: 'Премиум', minWin: 0, maxWin: 25, chance: 0.02 }
};

const DICE = {
    10: { multipliers: [0, 0, 1, 2, 3, 5] },
    25: { multipliers: [0, 1, 1.5, 2, 3, 5] },
    50: { multipliers: [0, 1.5, 2, 3, 4, 5] }
};

const WHEEL = {
    10: { segments: [0, 0, 0, 1, 2, 3, 5, 10] },
    25: { segments: [0, 0, 1, 2, 3, 5, 10, 20] },
    50: { segments: [0, 1, 2, 3, 5, 10, 20, 50] }
};

const PETS = [
    { name: '🐹 Метеоритный Хомяк', price: 320, bonus: 12 },
    { name: '🌈 Кометный Единорог', price: 480, bonus: 18 },
    { name: '🐙 Космо-Осьминог', price: 640, bonus: 25 },
    { name: '🐉 Звездный Дракон', price: 800, bonus: 35 }
];

// ========== ЗАВАНТАЖЕННЯ ДАНИХ ==========
async function loadData() {
    try {
        // Симуляція завантаження з бота
        const saved = localStorage.getItem(`cosmostars_${USER_ID}`);
        if (saved) {
            const data = JSON.parse(saved);
            state = { ...state, ...data };
        }
        
        updateUI();
        document.getElementById('splash').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    } catch (e) {
        console.error('Load error:', e);
    }
}

// ========== ЗБЕРЕЖЕННЯ ==========
function saveData() {
    try {
        localStorage.setItem(`cosmostars_${USER_ID}`, JSON.stringify(state));
    } catch (e) {}
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
    
    // Профіль
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

// ========== РЕНДЕР ПИТОМЦІВ ==========
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

// ========== ПОКУПКА ПИТОМЦЯ ==========
function buyPet(name, price) {
    if (state.balance < price) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    
    // Создаем платеж через бота
    tg.sendData(JSON.stringify({
        action: 'buy_pet',
        pet: name,
        price: price
    }));
    
    // Имитация покупки (для демонстрации)
    state.balance -= price;
    state.pets.push(name);
    state.petBonus = Math.min(70, state.petBonus + PETS.find(p => p.name === name).bonus);
    saveData();
    updateUI();
    showResult('🎉', `Куплен ${name}!`, `+${PETS.find(p => p.name === name).bonus}%`);
}

// ========== ГРА ==========
function playGame(game, bet) {
    if (state.isSpinning) return;
    
    // Проверяем баланс
    if (state.balance < bet && state.freeSpins <= 0) {
        showResult('❌', 'Недостаточно звезд!', '');
        return;
    }
    
    // Используем бесплатное вращение если есть
    let isFree = false;
    if (state.freeSpins > 0 && game === 'slot' && bet <= 25) {
        state.freeSpins -= 1;
        isFree = true;
        saveData();
        updateUI();
    }
    
    // Создаем платеж через бота
    tg.sendData(JSON.stringify({
        action: 'play',
        game: game,
        bet: bet,
        isFree: isFree
    }));
    
    // Имитация игры (для демонстрации)
    state.isSpinning = true;
    
    setTimeout(() => {
        let win = 0;
        
        if (game === 'slot') {
            const slot = SLOTS[bet];
            if (Math.random() < slot.chance) {
                win = Math.floor(Math.random() * (slot.maxWin - slot.minWin + 1)) + slot.minWin;
                win = Math.floor(win * (1 + state.petBonus / 100));
            }
        } else if (game === 'dice') {
            const dice = DICE[bet];
            const value = Math.floor(Math.random() * 6);
            const multiplier = dice.multipliers[value];
            win = Math.floor(bet * multiplier * (1 + state.petBonus / 100));
        } else if (game === 'wheel') {
            const wheel = WHEEL[bet];
            win = wheel.segments[Math.floor(Math.random() * wheel.segments.length)];
            win = Math.floor(win * (1 + state.petBonus / 100));
        }
        
        state.balance += win;
        state.totalGames += 1;
        state.totalWin += win;
        state.isSpinning = false;
        
        saveData();
        updateUI();
        
        if (win > 0) {
            showResult('🎉', 'ВЫИГРЫШ!', `+${win}⭐`);
        } else {
            showResult('😢', 'ПРОИГРЫШ', `0⭐`);
        }
    }, 1500);
}

// ========== БЕСПЛАТНОЕ ВРАЩЕНИЕ ==========
function playFree() {
    if (state.freeSpins <= 0) {
        showResult('❌', 'Нет бесплатных вращений!', '');
        return;
    }
    playGame('slot', 25);
}

// ========== ВИВІД ==========
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

// ========== ПРОМОКОД ==========
function usePromo() {
    const input = document.getElementById('promo-input');
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        document.getElementById('promo-result').innerHTML = '❌ Введите промокод';
        return;
    }
    
    const promoCodes = {
        'ENJOY': { reward: 5, type: 'free_spins' },
        'WELCOME': { reward: 10, type: 'stars' }
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
        document.getElementById('promo-result').innerHTML = `✅ Получено ${promo.reward} ${promo.type === 'free_spins' ? 'вращений' : '⭐'}`;
        input.value = '';
    } else {
        document.getElementById('promo-result').innerHTML = '❌ Промокод не найден';
    }
}

// ========== РЕНДЕР ПРОМОКОДІВ ==========
function renderPromoCodes() {
    const container = document.getElementById('promo-list');
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>ENJOY</span>
            <span style="color:#ffd700;">5 бесплатных вращений</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
            <span>WELCOME</span>
            <span style="color:#ffd700;">10⭐</span>
        </div>
    `;
}

// ========== ПОКАЗ РЕЗУЛЬТАТУ ==========
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
    setTimeout(() => box.classList.remove('show'), 4000);
}

// ========== НАВІГАЦІЯ ==========
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

// ========== ОБРОБКА ПОВІДОМЛЕНЬ ВІД БОТА ==========
tg.onEvent('message', (msg) => {
    try {
        const data = JSON.parse(msg);
        if (data.action === 'payment_success') {
            showResult('✅', 'Платёж успешен!', '');
            loadData();
        }
    } catch(e) {}
});

// ========== ЗАПУСК ==========
loadData();

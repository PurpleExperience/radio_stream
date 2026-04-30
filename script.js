// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================

// Аудио и управление
let currentAudio = null;           // Текущий аудио объект
let currentStation = null;         // Текущая активная станция
let isPaused = false;             // Состояние паузы
let lastStation = null;           // Последняя играющая станция

// Визуальные эффекты
let particlesInterval = null;     // Интервал для создания частиц

// Эффект следа мыши
let lastMouseMoveTime = 0;        // Время последнего движения мыши
let mouseX = 0;                   // Координата X мыши
let mouseY = 0;                   // Координата Y мыши
let isDragging = false;           // Состояние перетаскивания
let trailTimeout = null;          // Таймаут для эффекта следа

// ==========================================
// СИСТЕМА ЧАСТИЦ
// ==========================================

/**
 * Создает новую частицу для анимации
 */
function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Случайная позиция по горизонтали
    particle.style.left = Math.random() * window.innerWidth + 'px';
    
    // Случайные параметры анимации
    particle.style.animationDelay = Math.random() * 2 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    
    // Добавляем частицу в контейнер
    document.getElementById('particles').appendChild(particle);
    
    // Активируем анимацию через небольшую задержку
    setTimeout(() => particle.classList.add('active'), 10);
    
    // Удаляем частицу после завершения анимации
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 8000);
}

/**
 * Управляет запуском и остановкой системы частиц
 * @param {boolean} playing - Включить или выключить частицы
 */
function toggleParticles(playing) {
    if (playing && !particlesInterval) {
        // Запускаем создание частиц каждые 500мс
        particlesInterval = setInterval(createParticle, 500);
    } else if (!playing && particlesInterval) {
        // Останавливаем создание новых частиц
        clearInterval(particlesInterval);
        particlesInterval = null;
        
        // Деактивируем существующие частицы
        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.classList.remove('active');
        });
    }
}

// ==========================================
// ЭФФЕКТ СЛЕДА МЫШИ
// ==========================================

/**
 * Обрабатывает движение мыши для создания эффекта следа
 * @param {Event} e - Событие движения мыши
 */
function handleMouseMove(e) {
    const now = Date.now();
    const timeDiff = now - lastMouseMoveTime;
    
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Если мышь движется быстро (интервал < 30мс)
    if (timeDiff < 30) {
        isDragging = true;
        
        // Находим элементы радиостанций под курсором
        const elements = document.elementsFromPoint(mouseX, mouseY);
        const radioStations = elements.filter(el => 
            el.classList && el.classList.contains('radio-station')
        );
        
        // Добавляем эффект следа к найденным станциям
        radioStations.forEach(station => {
            station.classList.add('trail');
            
            // Убираем эффект через 300мс
            setTimeout(() => {
                station.classList.remove('trail');
            }, 300);
        });
        
        // Сбрасываем таймаут перетаскивания
        if (trailTimeout) clearTimeout(trailTimeout);
        trailTimeout = setTimeout(() => {
            isDragging = false;
        }, 200);
    }
    
    lastMouseMoveTime = now;
}

/**
 * Инициализирует эффект следа мыши
 */
function initTrailEffect() {
    // Обработчик для мыши
    document.addEventListener('mousemove', handleMouseMove);
    
    // Обработчик для сенсорных устройств
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handleMouseMove(e.touches[0]);
        }
    }, { passive: true });
}

// ==========================================
// АНИМИРОВАННЫЙ ФОН
// ==========================================

/**
 * Управляет анимированным фоном
 * @param {boolean} playing - Включить или выключить анимацию
 */
function toggleAnimatedBackground(playing) {
    const animatedBg = document.getElementById('animatedBg');
    const pulseOverlay = document.getElementById('pulseOverlay');
    const playerControls = document.getElementById('playerControls');
    
    if (playing) {
        // Включаем анимации
        animatedBg.classList.add('playing');
        pulseOverlay.classList.add('playing');
        playerControls.classList.add('playing');
    } else {
        // Выключаем анимации
        animatedBg.classList.remove('playing');
        pulseOverlay.classList.remove('playing');
        playerControls.classList.remove('playing');
    }
}

// ==========================================
// ВОСПРОИЗВЕДЕНИЕ РАДИО
// ==========================================

/**
 * Воспроизводит выбранную радиостанцию
 * @param {HTMLElement} element - DOM элемент станции
 * @param {string} url - URL потока
 * @param {string} id - ID станции
 * @param {string} name - Название станции
 */
function playRadio(element, url, id, name) {
    // Сбрасываем состояние всех станций
    document.querySelectorAll('.radio-station').forEach(station => {
        station.classList.remove('playing', 'loading', 'error');
    });
    
    // Показываем индикатор загрузки для выбранной станции
    element.classList.add('loading');
    
    // Если кликнули на уже играющую станцию - переключаем паузу
    if (currentStation === element && currentAudio) {
        togglePause();
        return;
    }
    
    // Останавливаем текущее воспроизведение
    if (currentAudio) {
        currentAudio.pause();
        // Очищаем все обработчики событий
        currentAudio.oncanplay = null;
        currentAudio.onerror = null;
        currentAudio.onloadstart = null;
        
        // Убираем класс playing с предыдущей станции
        if (currentStation) {
            currentStation.classList.remove('playing', 'error');
        }
    }

    // Создаем новый аудио объект
    currentAudio = new Audio(url);
    currentStation = element;
    
    // Сохраняем информацию о станции для возможности возобновления
    lastStation = {
        element: element,
        url: url,
        id: id,
        name: name
    };
    
    // Сбрасываем состояние паузы
    isPaused = false;
    document.getElementById('pauseBtn').innerHTML = '<i>⏸</i>';
        
    // Устанавливаем громкость из слайдера
    const volume = document.getElementById('volumeSlider').value;
    currentAudio.volume = volume / 100;

    // Сохраняем ссылку для проверки актуальности
    const currentElement = element;

    // Обработчик успешной загрузки
    currentAudio.addEventListener('canplay', function() {
        // Проверяем, что это всё ещё актуальная станция
        if (currentStation === currentElement && currentAudio && currentAudio.src === url) {
            element.classList.remove('loading');
            element.classList.add('playing');
            
            // Активируем визуальные эффекты
            toggleAnimatedBackground(true);
            toggleParticles(true);
        }
    });

    // Обработчик ошибки
    currentAudio.addEventListener('error', function(e) {
        // Проверяем, что это всё ещё актуальная станция
        if (currentStation === currentElement && currentAudio && currentAudio.src === url) {
            element.classList.remove('loading');
            element.classList.add('error');
            
            // Деактивируем визуальные эффекты
            toggleAnimatedBackground(false);
            toggleParticles(false);
            
            console.error('Ошибка воспроизведения:', e);
        }
    });

    // Начинаем воспроизведение
    currentAudio.play().catch(error => {
        if (error.name !== 'AbortError') {
            // Проверяем актуальность и обрабатываем ошибку
            if (currentStation === currentElement && currentAudio && currentAudio.src === url) {
                element.classList.remove('loading');
                element.classList.add('error');
                toggleAnimatedBackground(false);
                toggleParticles(false);
                console.error('Ошибка воспроизведения:', error);
            }
        }
    });
}

/**
 * Останавливает воспроизведение радио
 */
function stopRadio() {
    if (currentAudio) {
        currentAudio.pause();
        // Очищаем обработчики
        currentAudio.oncanplay = null;
        currentAudio.onerror = null;
        currentAudio.onloadstart = null;
        currentAudio = null;
    }
    
    // Очищаем классы состояния у всех станций
    document.querySelectorAll('.radio-station').forEach(station => {
        station.classList.remove('playing', 'loading');
        // Оставляем класс error, если он был установлен
        if (!station.classList.contains('error')) {
            station.classList.remove('error');
        }
    });
    
    // Деактивируем визуальные эффекты
    toggleAnimatedBackground(false);
    toggleParticles(false);
    
    // Сбрасываем состояние
    isPaused = false;
    document.getElementById('pauseBtn').innerHTML = '<i>⏸</i>';
    currentStation = null;
}

/**
 * Переключает паузу/воспроизведение
 */
function togglePause() {
    if (!currentAudio) {
        if (lastStation) {
            // Если аудио не играет, но есть последняя станция - возобновляем её
            playRadio(lastStation.element, lastStation.url, lastStation.id, lastStation.name);
        }
        return;
    }

    const pauseBtn = document.getElementById('pauseBtn');
    
    if (isPaused) {
        // Возобновляем воспроизведение
        currentAudio.play();
        pauseBtn.innerHTML = '<i>⏸</i>';
        currentStation.classList.add('playing');
        
        // Активируем визуальные эффекты
        toggleAnimatedBackground(true);
        toggleParticles(true);
    } else {
        // Ставим на паузу
        currentAudio.pause();
        pauseBtn.innerHTML = '<i>▶️</i>';
        currentStation.classList.remove('playing');
        
        // Деактивируем визуальные эффекты
        toggleAnimatedBackground(false);
        toggleParticles(false);
    }
    
    isPaused = !isPaused;
}

// ==========================================
// ПОИСК СТАНЦИЙ
// ==========================================

/**
 * Выполняет поиск радиостанции по названию
 */
function searchStation() {
    const searchTerm = document.getElementById('stationSearch').value.toLowerCase().trim();
    const stations = document.querySelectorAll('.radio-station-container');
    const resultsContainer = document.getElementById('searchResults');
    let foundStations = [];

    // Очищаем предыдущие результаты
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';

    // Сбрасываем подсветку для всех станций
    stations.forEach(station => {
        station.style.boxShadow = 'none';
    });

    if (!searchTerm) return;

    // Ищем совпадения
    stations.forEach(station => {
        const stationName = station.querySelector('.station-name').textContent;
        const lowerName = stationName.toLowerCase();
        
        if (lowerName.includes(searchTerm)) {
            foundStations.push({
                name: stationName,
                element: station
            });
            
            // Подсвечиваем найденную станцию
            station.style.boxShadow = '0 0 15px #4CAF50';
        }
    });

    // Показываем результаты в выпадающем списке
    if (foundStations.length > 0) {
        resultsContainer.style.display = 'block';
        
        foundStations.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = item.name;
            
            // При клике на результат
            resultItem.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Очищаем поле ввода и скрываем результаты
                document.getElementById('stationSearch').value = '';
                resultsContainer.style.display = 'none';
                
                // Закрываем клавиатуру на мобильных устройствах
                document.getElementById('stationSearch').blur();
                
                // Небольшая задержка для мобильных устройств
                setTimeout(() => {
                    // Прокручиваем к элементу
                    item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Подсвечиваем элемент
                    item.element.style.boxShadow = '0 0 15px #FF5722';
                    setTimeout(() => {
                        item.element.style.boxShadow = '0 0 15px #4CAF50';
                    }, 1000);
                }, 100); // Небольшая задержка для корректной работы на мобильных
            });
            
            resultsContainer.appendChild(resultItem);
        });
    } else {
        resultsContainer.style.display = 'none';
    }
}

// Добавляем обработчик событий с задержкой
let searchTimeout;
document.getElementById('stationSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchStation, 200);
});

// Скрываем результаты при клике вне области
document.addEventListener('click', (e) => {
    if (!e.target.closest('#stationSearch') && !e.target.closest('#searchResults')) {
        document.getElementById('searchResults').style.display = 'none';
    }
});

// ==========================================
// МОДАЛЬНОЕ ОКНО ПОДДЕРЖКИ
// ==========================================

/**
 * Показывает модальное окно поддержки автора
 */
function showSupportModal() {
    document.getElementById('supportModal').style.display = 'flex';
    resetPaymentView();
}

/**
 * Закрывает модальное окно поддержки
 */
function closeSupportModal() {
    document.getElementById('supportModal').style.display = 'none';
}

/**
 * Сбрасывает вид платежного окна к начальному состоянию
 */
function resetPaymentView() {
    document.getElementById('paymentTitle').textContent = 'Поддержать';
    document.getElementById('paymentMethods').style.display = 'flex';
    document.getElementById('paymentDetails').style.display = 'none';
}

/**
 * Возвращает к выбору способов оплаты
 */
function backToMethods() {
    resetPaymentView();
}

/**
 * Копирует текст в буфер обмена
 * @param {string} text - Текст для копирования
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Скопировано в буфер обмена: ' + text);
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
}


/**
 * Показывает детали оплаты через ЮMoney
 */
function payWithYooMoney() {
    const paymentDetails = document.getElementById('paymentDetails');
    const paymentTitle = document.getElementById('paymentTitle');
    const paymentContent = document.getElementById('paymentContent');
    
    paymentTitle.textContent = '💳 Поддержка через ЮMoney';
    paymentContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 1.2rem; margin-bottom: 15px;">
                💰 Кошелек: <strong>410015930796268</strong>
                <button class="copy-button" onclick="copyToClipboard('410015930796268')">Копировать</button>
            </div>
            <div style="margin: 20px 0;">
                <a href="https://yoomoney.ru/transfer/quickpay?to=410015930796268&sum=150&comment=Поддержка автора" 
                   target="_blank" 
                   style="background: #ffdd2d; color: #000; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    🚀 Поддержать через ЮMoney
                </a>
            </div>
            <div style="margin: 20px 0; padding: 15px; background: rgba(30, 30, 30, 0.8); border-radius: 10px; border: 1px solid #333; font-size: 0.9rem;">
                <strong>Или переведите вручную:</strong><br>
                1. Зайдите на yoomoney.ru<br>
                2. Выберите "Переводы" → "На кошелек"<br>
                3. Кошелек получателя: 410015930796268<br>
                4. Укажите любую сумму для поддержки
            </div>
        </div>
    `;
    
    document.getElementById('paymentMethods').style.display = 'none';
    paymentDetails.style.display = 'block';
}

// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ==========================================

/**
 * Инициализирует все обработчики событий при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Радио-плеер готов к работе!');
    
    // Инициализируем эффект следа мыши
    initTrailEffect();
    
    // Обработчик управления громкостью
    document.getElementById('volumeSlider').addEventListener('input', function() {
        const volume = this.value;
        
        if (currentAudio) {
            currentAudio.volume = volume / 100;
        }
    });
    
	// Обработчик поиска по Enter
	document.getElementById('stationSearch').addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			// Если есть результаты - выбираем первый
			const firstResult = document.querySelector('.search-result-item');
			if (firstResult) {
				firstResult.click(); // Автоматически выбираем первый результат
			} else {
				searchStation(); // Иначе выполняем обычный поиск
			}
			e.preventDefault(); // Предотвращаем возможное нежелательное поведение формы
		}
	});
    
    // Обработчики модального окна поддержки
    document.getElementById('closeModal').addEventListener('click', closeSupportModal);
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('supportModal')) {
            closeSupportModal();
        }
    });
});

/**
 * Очистка ресурсов при закрытии страницы
 */
window.addEventListener('beforeunload', function() {
    // Останавливаем систему частиц
    toggleParticles(false);
    
    // Удаляем обработчики событий
    document.removeEventListener('mousemove', handleMouseMove);
});

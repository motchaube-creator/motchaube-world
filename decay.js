// decay.js
// Жизнь Квадратов (Время и Гниение)
// Тексты на полках медленно мутируют, выветриваются и зарастают мхом, пока пользователь не смотрит.

(function() {
    "use strict";

    // Скорость распада: раз в 20 секунд (для демо-наглядности)
    var DECAY_INTERVAL = 20000; 
    
    // Архаичные споры для заражения (мох времени)
    var spores = ["тлен", "пустота", "ветер", "прах", "сон", "эхо", "тишина", "·", "≈", "туман", "забвение"];

    function applyDecay(text, hexObj) {
      if (!text || text.length < 2) return text;
      var r = Math.random();
      var words = text.split(" ");
      if (words.length < 2) return text;

      if (r < 0.3) {
        // Выцветание: случайное слово заменяется зияющей пустотой (пробелами)
        var idx = Math.floor(Math.random() * words.length);
        words[idx] = Array(words[idx].length + 1).join(" ");
        return words.join(" ");
      } else if (r < 0.6) {
        // Пыль / Пепел: случайные буквы превращаются в точки
        var chars = text.split("");
        var dustCount = Math.max(1, Math.floor(chars.length * 0.1));
        for (var i = 0; i < dustCount; i++) {
           var cIdx = Math.floor(Math.random() * chars.length);
           if (chars[cIdx] !== " ") chars[cIdx] = "·";
        }
        return chars.join("");
      } else if (r < 0.8) {
        // Зарастание мхом: чужое архаичное слово врастает в синтаксис
        var idx = Math.floor(Math.random() * words.length);
        var spore = spores[Math.floor(Math.random() * spores.length)];
        words.splice(idx, 0, spore);
        return words.join(" ");
      } else {
         // Эрозия стихий: повторное применение мутации квадрата (если есть стихия)
         if (window.MUTATION && hexObj) {
            return window.MUTATION.apply(text, hexObj);
         }
         return text;
      }
    }

    function rot(silent) {
      if (!window.BINDINGS || window.BINDINGS.length === 0) return;
      
      // Ищем гексаграммы, где есть хоть один сохраненный текст на полке
      var active = window.BINDINGS.filter(function(b) {
        return b.lines && b.lines.some(function(l) { return l && l.trim().length > 0; });
      });
      
      if (active.length === 0) return;

      // Выбираем случайный квадрат для старения
      var targetHex = active[Math.floor(Math.random() * active.length)];
      
      // Ищем заполненные полки внутри этого квадрата
      var filledIndexes = [];
      targetHex.lines.forEach(function(l, i) {
         if (l && l.trim().length > 0) filledIndexes.push(i);
      });
      
      if (filledIndexes.length === 0) return;
      
      // Выбираем жертву (строку)
      var targetLineIdx = filledIndexes[Math.floor(Math.random() * filledIndexes.length)];
      var oldText = targetHex.lines[targetLineIdx];
      
      // Ищем данные о квадрате для стихийной мутации
      var hObj = window.H ? window.H.find(function(item) { return item.id === targetHex.id; }) : null;
      
      // Применяем распад
      var newText = applyDecay(oldText, hObj);
      
      if (oldText !== newText) {
        targetHex.lines[targetLineIdx] = newText;
        if (window.STORE) window.STORE.save(window.BINDINGS);
        
        // Визуальный отклик (призрак распада на главной доске)
        if (!silent) {
            var hexEl = document.getElementById("hex-" + targetHex.id);
            if (hexEl) {
               hexEl.style.transition = "filter 3s ease, transform 3s ease, opacity 3s ease";
               hexEl.style.filter = "sepia(0.8) hue-rotate(-30deg) blur(1px)";
               hexEl.style.opacity = "0.6";
               hexEl.style.transform = "scale(0.98)";
               
               setTimeout(function() {
                  hexEl.style.filter = "";
                  hexEl.style.opacity = "";
                  hexEl.style.transform = "";
               }, 3500);
            }
        }
      }
    }

    // Компенсация пропущенного времени при загрузке страницы
    function catchUpTime() {
        var lastVisit = localStorage.getItem("dao_last_visit");
        var now = Date.now();
        if (lastVisit) {
            var diffMs = now - parseInt(lastVisit, 10);
            var ticks = Math.floor(diffMs / DECAY_INTERVAL);
            // Ограничиваем максимальное количество тиков старения, чтобы тексты не стерлись полностью за год отсутствия (макс 30 тиков за раз)
            ticks = Math.min(ticks, 30);
            for(var i = 0; i < ticks; i++) {
                rot(true); // Без визуальных эффектов (silent)
            }
        }
        localStorage.setItem("dao_last_visit", now);
    }

    document.addEventListener("DOMContentLoaded", function() {
        // Дожидаемся загрузки BINDINGS
        setTimeout(function() {
            catchUpTime();
            // Начинаем бесконечный цикл гниения
            setInterval(rot, DECAY_INTERVAL);
            // Обновляем таймер присутствия
            setInterval(function() { 
                localStorage.setItem("dao_last_visit", Date.now()); 
            }, 10000);
        }, 1000);
    });
    
    window.DECAY = { rot: rot, apply: applyDecay };

})();

// diyu.js
// Суд Диюй: Интерактивное взаимодействие с сохраненными текстами на полках гексаграмм.

(function() {
    "use strict";

    var menu = document.createElement("div");
    menu.id = "diyuMenu";
    menu.style.position = "absolute";
    menu.style.display = "none";
    menu.style.backgroundColor = "var(--paper)";
    menu.style.border = "1px solid var(--seal)";
    menu.style.padding = "8px 0";
    menu.style.boxShadow = "2px 4px 12px rgba(0,0,0,0.15)";
    menu.style.zIndex = "1000";
    menu.style.fontFamily = "var(--font-ui)";
    menu.style.fontSize = "13px";
    menu.style.textTransform = "uppercase";
    menu.style.letterSpacing = "0.1em";

    // Стили кнопок меню
    var btnStyle = "display: block; width: 100%; text-align: left; padding: 6px 16px; background: transparent; border: none; cursor: pointer; color: var(--ink);";
    
    var currentTarget = null;

    function buildMenu() {
        menu.innerHTML = `
            <div style="padding: 0 16px 8px; font-weight: bold; color: var(--accent); font-size: 11px; border-bottom: 1px dashed var(--seal); margin-bottom: 4px;">Суд Диюй</div>
            <button style="${btnStyle}" id="diyuKarma">Зеркало Кармы (Отразить)</button>
            <button style="${btnStyle}" id="diyuSoup">Суп Мэн По (Забвение)</button>
            <button style="${btnStyle}" id="diyuSamsara">Колесо Сансары (Перерождение)</button>
        `;
        document.body.appendChild(menu);

        menu.addEventListener("mouseover", function(e) {
            if (e.target.tagName === "BUTTON") e.target.style.color = "var(--accent)";
        });
        menu.addEventListener("mouseout", function(e) {
            if (e.target.tagName === "BUTTON") e.target.style.color = "var(--ink)";
        });

        document.getElementById("diyuKarma").addEventListener("click", function() { executeDiyu("karma"); });
        document.getElementById("diyuSoup").addEventListener("click", function() { executeDiyu("soup"); });
        document.getElementById("diyuSamsara").addEventListener("click", function() { executeDiyu("samsara"); });

        // Закрытие меню при клике вне его
        document.addEventListener("click", function(e) {
            if (!menu.contains(e.target) && !e.target.classList.contains("diyu-target")) {
                menu.style.display = "none";
            }
        });
    }

    function executeDiyu(action) {
        if (!currentTarget) return;
        menu.style.display = "none";

        var hexId = currentTarget.hex;
        var lineIdx = currentTarget.line;
        var itemIdx = currentTarget.idx;
        var domEl = currentTarget.el;

        if (!window.BINDINGS) return;
        
        var hexData = window.BINDINGS.find(function(b) { return b.id === hexId; });
        if (!hexData || !hexData.lines || !hexData.lines[lineIdx]) return;
        
        // В новой версии BINDINGS.lines может быть массивом объектов или строк. У нас там строки?
        // Wait, app.js line 258: var mine = (b.lines[i] || []).map(...) if it's an array, or just a string if old version.
        // Let's rely on window.STORE logic. Actually STORE saves flat strings. 
        // Wait, app.js lines 259 says `mine` is `[ { body: b.lines[i] } ]`. So lines is array of strings.
        var text = hexData.lines[lineIdx];

        if (action === "karma") {
            // Зеркало Кармы: текст переворачивается задом наперед
            text = text.split("").reverse().join("");
            hexData.lines[lineIdx] = text;
        } else if (action === "soup") {
            // Суп Мэн По: слова забываются (заменяются пробелами), остается только пунктуация
            var words = text.split(" ");
            words = words.map(function(w) { return Math.random() > 0.4 ? Array(w.length + 1).join(" ") : w; });
            text = words.join(" ");
            hexData.lines[lineIdx] = text;
        } else if (action === "samsara") {
            // Колесо Сансары: текст удаляется отсюда и падает на случайную полку случайной гексаграммы
            hexData.lines[lineIdx] = "";
            var randomHexId = Math.floor(Math.random() * 64) + 1;
            var randomLineIdx = Math.floor(Math.random() * 6);
            var targetHexData = window.BINDINGS.find(function(b) { return b.id === randomHexId; });
            if (!targetHexData) {
                targetHexData = { id: randomHexId, lines: [] };
                window.BINDINGS.push(targetHexData);
            }
            if (!targetHexData.lines) targetHexData.lines = [];
            
            // Если там уже есть текст, сливаем их
            if (targetHexData.lines[randomLineIdx]) {
                targetHexData.lines[randomLineIdx] = targetHexData.lines[randomLineIdx] + " / " + text;
            } else {
                targetHexData.lines[randomLineIdx] = text;
            }
            text = ""; // текущая полка опустела
        }

        window.STORE.save(window.BINDINGS);

        // Визуальное обновление текущего DOM
        if (action === "samsara") {
            domEl.style.opacity = "0";
            domEl.style.transform = "translateY(20px)";
            setTimeout(function() { domEl.innerHTML = "тишина"; domEl.style.opacity = "0.5"; domEl.style.transform = ""; }, 500);
        } else {
            domEl.style.filter = "invert(1) hue-rotate(180deg)";
            setTimeout(function() {
                domEl.innerHTML = text;
                domEl.style.filter = "";
            }, 800);
        }
    }

    window.showDiyuMenu = function(hexId, lineIdx, itemIdx, el) {
        currentTarget = { hex: hexId, line: lineIdx, idx: itemIdx, el: el };
        
        var rect = el.getBoundingClientRect();
        menu.style.left = rect.left + "px";
        menu.style.top = (rect.bottom + window.scrollY + 5) + "px";
        menu.style.display = "block";
    };

    document.addEventListener("DOMContentLoaded", buildMenu);

})();

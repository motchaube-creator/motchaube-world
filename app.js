/* app.js — левитирующие квадраты. Данные: data/hexagrams.js (window.TRIGRAMS, window.HEXAGRAMS)
   Метрики (объём/свежесть/дыхание/разнообразие) считаются детерминированно из id —
   чтобы позже подставить реальные: количество текстов, свежесть, активность за 7 дней. */

(function () {
  "use strict";

  var T = window.TRIGRAMS;
  var H = window.HEXAGRAMS;

  /* триграмма → 3 черты снизу вверх: 1 = ян (сплошная), 0 = инь (прерывистая) */
  var BITS = {
    qian: [1, 1, 1], kun: [0, 0, 0], zhen: [1, 0, 0], kan: [0, 1, 0],
    li: [1, 0, 1], gen: [0, 0, 1], xun: [0, 1, 1], dui: [1, 1, 0]
  };

  /* демо-тексты: заглавия цикла I–V из канала @EcritsF (см. corpus-ecritsf.md) */
  var DEMO = {
    2:  { 1: "空堂 / ПУСТОЙ ЗАЛ — «堂 пуст столь, что эхо себе»" },
    20: { 2: "九州 / ДЕВЯТЬ — «взойти повыше, чтобы увидеть всё»" },
    36: { 4: "晤言 / ПОСЛЕДНЕЕ СЛОВО — «日暮 солнце село на нет»" },
    38: { 2: "ПТИЦА / ЗВЕРЬ — «птица была online, зверь last seen»" },
    46: { 1: "九州 / ДЕВЯТЬ — «登高: чтобы увидеть всё»" },
    52: { 5: "空堂 — «сижу, и эхо себе»" },
    56: { 1: "永路 / LONG ROAD — «дорога долго доро го go»" }
  };

  var sky = document.getElementById("sky");
  var panel = document.getElementById("panel");
  var panelBody = document.getElementById("panelBody");
  var sectorsBox = document.getElementById("sectors");
  var searchInput = document.getElementById("search");
  var onlyMine = document.getElementById("onlyMine");
  var flatToggle = document.getElementById("flat");
  var hint = document.getElementById("hint");

  var state = { sector: null, onlyMine: false, q: "" };
  var tiles = [];
  var currentId = null;

  /* ---------- метрики ---------- */

  function hash(n) {
    var x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function metrics(h) {
    var a = hash(h.id), b = hash(h.id * 3.7), c = hash(h.id * 7.13);
    var m = {
      volume: 0.18 + a * 0.82,
      fresh: 0.15 + b * 0.85,
      activity: 0.1 + c * 0.9,
      entropy: 0.2 + hash(h.id * 11.7) * 0.8,
      texts: 0
    };
    if (h.mine) { m.volume = Math.min(1, m.volume + 0.25); m.fresh = Math.min(1, m.fresh + 0.2); }

    /* живые данные: опубликованные тексты перебивают демо-метрики */
    if (window.STORE) {
      var list = window.STORE.inSquare(h.id);
      m.texts = list.length;
      if (list.length) {
        m.volume = Math.min(1, 0.3 + list.length * 0.12);
        m.activity = Math.min(1, 0.35 + list.length * 0.1);
        var f = window.STORE.freshness(h.id);
        if (f !== null) m.fresh = f;
      }
    }
    return m;
  }

  /* индекс 0 = нижняя черта (1-я), 5 = верхняя (6-я) */
  function linesOf(h) {
    var low = BITS[h.l] || BITS.qian;
    var up = BITS[h.u] || BITS.qian;
    return low.concat(up);
  }

  /* ---------- форма, перемены и соседи по канону ---------- */

  var BY_ID = {};
  var BY_CODE = {};
  H.forEach(function (h) {
    BY_ID[h.id] = h;
    BY_CODE[linesOf(h).join("")] = h.id;
  });

  function codeOf(h) { return linesOf(h).join(""); }
  function idOfCode(code) { return BY_CODE[code] || null; }

  /* смена одной черты 動爻 */
  function flip(code, i) {
    var a = code.split("");
    a[i] = a[i] === "1" ? "0" : "1";
    return a.join("");
  }
  /* инверсия 錯卦 — все черты наоборот */
  function inverse(code) {
    return code.split("").map(function (c) { return c === "1" ? "0" : "1"; }).join("");
  }
  /* переворот 綜卦 — обратный порядок черт */
  function reverse(code) { return code.split("").reverse().join(""); }

  /* живая гексаграмма: полка с текстами становится ян */
  function liveCode(h) {
    var counts = window.STORE ? window.STORE.countByLine(h.id) : [0, 0, 0, 0, 0, 0];
    var base = codeOf(h).split("");
    counts.forEach(function (n, i) { if (n > 0) base[i] = "1"; });
    return base.join("");
  }

  /* какие черты сдвинулись от книжного канона */
  function movedLines(h) {
    var base = codeOf(h), live = liveCode(h), out = [];
    for (var i = 0; i < 6; i++) if (base.charAt(i) !== live.charAt(i)) out.push(i);
    return out;
  }

  /* куда квадрат может уйти: 6 смененных черт, инверсия, переворот */
  function neighbours(h) {
    var code = codeOf(h), out = [];
    for (var i = 0; i < 6; i++) {
      var id = idOfCode(flip(code, i));
      if (id) out.push({ kind: "動爻", line: i, id: id });
    }
    var inv = idOfCode(inverse(code));
    if (inv) out.push({ kind: "錯卦", line: null, id: inv });
    var rev = idOfCode(reverse(code));
    if (rev) out.push({ kind: "綜卦", line: null, id: rev });
    return out;
  }

  /* ---------- отрисовка свода ---------- */

  function buildTiles() {
    var frag = document.createDocumentFragment();

    H.forEach(function (h) {
      var t = T[h.u] || T.qian;
      var m = metrics(h);
      var el = document.createElement("button");
      el.type = "button";
      el.className = "tile" + (h.mine ? " mine" : "");
      el.dataset.id = h.id;
      el.style.setProperty("--tile-color", t.palette);
      el.style.setProperty("--dur", (6 + hash(h.id) * 9).toFixed(2) + "s");
      el.style.setProperty("--delay", (-hash(h.id * 2.3) * 6).toFixed(2) + "s");
      el.style.setProperty("--range", (5 + m.activity * 13).toFixed(1) + "px");
      el.style.setProperty("--glow", (0.08 + m.volume * 0.3).toFixed(2));
      el.style.opacity = (0.55 + m.volume * 0.45).toFixed(2);
      el.setAttribute("aria-label", h.zh + " · " + h.ru + " — " + h.theme);
      el.title = h.zh + " · " + h.ru + " — " + h.theme;

      var bars = linesOf(h).slice().reverse().map(function (bit) {
        return '<span class="bar ' + (bit ? "yang" : "yin") + '"><i></i><i></i></span>';
      }).join("");

      /* на плитке — только иероглиф и черты: имя и тема живут в панели и в подсказке браузера */
      el.innerHTML =
        '<span class="num">' + h.id + '</span>' +
        '<span class="glyph">' + bars + '</span>' +
        '<span class="zh">' + h.zh + '</span>';

      el.addEventListener("click", function () { openPanel(h); });
      frag.appendChild(el);
      tiles.push({ el: el, h: h, bars: el.querySelectorAll(".bar") });
    });

    sky.appendChild(frag);
    updateTiles();
  }

  /* пересчёт метрик, живых черт и сдвига от канона — без перестройки свода */
  function updateTiles() {
    var movedSquares = 0;

    tiles.forEach(function (t) {
      var m = metrics(t.h);
      var base = codeOf(t.h);
      var live = liveCode(t.h);
      var moved = movedLines(t.h);

      t.el.dataset.count = m.texts || 0;
      t.el.classList.toggle("has-text", (m.texts || 0) > 0);
      t.el.classList.toggle("moved", moved.length > 0);
      if (moved.length) movedSquares++;

      t.el.style.opacity = (0.55 + m.volume * 0.45).toFixed(2);
      t.el.style.setProperty("--glow", (0.08 + m.volume * 0.3).toFixed(2));
      t.el.style.setProperty("--range", (5 + m.activity * 13).toFixed(1) + "px");

      if (!t.bars) t.bars = t.el.querySelectorAll(".bar");
      Array.prototype.forEach.call(t.bars, function (bar, d) {
        /* черты нарисованы сверху вниз: первая полоса = 6-я (верхняя) черта */
        var i = 5 - d;
        bar.classList.toggle("yang", live.charAt(i) === "1");
        bar.classList.toggle("yin", live.charAt(i) === "0");
        bar.classList.toggle("lived", base.charAt(i) !== live.charAt(i));
      });
    });

    state.moved = movedSquares;
  }

  /* ---------- фильтры ---------- */

  function match(t) {
    var h = t.h;
    if (state.sector && h.u !== state.sector && h.l !== state.sector) return false;
    if (state.onlyMine && !h.mine) return false;
    if (state.q) {
      var q = state.q.toLowerCase();
      var hay = [h.id, h.zh, h.py, h.ru, h.theme, (T[h.u] || {}).ru, (T[h.l] || {}).ru, h.lines.join(" ")]
        .join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function applyFilters() {
    var shown = 0;
    tiles.forEach(function (t) {
      var ok = match(t);
      t.el.classList.toggle("dimmed", !ok);
      if (ok) shown++;
    });
    hint.textContent = shown + " / 64";
    Array.prototype.forEach.call(sectorsBox.children, function (b) {
      if (b.dataset.key) b.setAttribute("aria-pressed", String(b.dataset.key === state.sector));
    });
  }

  /* ---------- панель квадрата ---------- */

  function pct(v) { return Math.round(v * 100) + "%"; }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function openPanel(h) {
    var t = T[h.u], low = T[h.l], m = metrics(h);
    var demo = {}; // Legacy repeated excerpts are no longer presented as assigned poems.
    var binding = (window.BINDINGS || []).find(function (b) { return b.id === h.id; });
    var bindingHTML = '';
    if (binding && binding.status === 'provisional') {
      var moshovVars = ["мошов", "Мо Шо", "mot chauve слово брита", "Мò Шóу", "мастер Мо", "отшельник Мошов", "записи Мо Шо"];
      var randomMoshov = moshovVars[Math.floor(Math.random() * moshovVars.length)];
      bindingHTML += '<section class="binding"><h3 style="font-family:\'Kelly Slab\', \'JetBrains Mono\', monospace; text-transform: uppercase; letter-spacing: 2px; font-size: 20px; font-weight: normal; margin-bottom: 12px; color: var(--seal);">' + randomMoshov + '</h3><blockquote class="author-poem">' +
        escapeText(binding.body || '') + '</blockquote>' +
        '<a class="muted" target="_blank" rel="noopener noreferrer" href="' +
        escapeText(binding.sourceUrl) + '">оригинал</a></section>';
    }

    var shelves = h.lines.map(function (title, i) {
      var mine = window.STORE ? window.STORE.at(h.id, i) : [];
      var demoText = demo[i];
      var body = "";

      if (mine.length) {
        body += '<div class="texts">' + mine.map(function (t, tIdx) {
          return '<span class="item diyu-target" style="cursor:pointer;" data-hex="' + h.id + '" data-line="' + i + '" data-idx="' + tIdx + '" title="Суд Диюй: кармическое воздействие">' + escapeText(t.body) + '</span>';
        }).join("") + '</div>';
      }
      if (demoText) {
        body += '<br><span class="title" style="color:var(--accent)">' + demoText + '</span>';
      }
      if (!mine.length && !demoText) {
        body += '<br><span class="empty">тишина</span>';
      }
      body += '<button type="button" class="add" data-hex="' + h.id + '" data-line="' + i +
        '">＋ текст на эту полку</button>';

      return '<div class="shelf' + (mine.length || demoText ? " filled" : "") + '">' +
        '<span class="idx">' + (i + 1) + '</span>' +
        '<span><span class="title">' + title + '</span>' + body + '</span></div>';
    }).join("");

    /* форма: книжная 卦 и живая 卦 после шевеления черт */
    var base = codeOf(h), live = liveCode(h), moved = movedLines(h);
    var liveId = idOfCode(live);
    var liveHex = liveId ? BY_ID[liveId] : null;

    var forms = '<div class="forms"><span>' + h.zh + ' ' + h.ru + '</span>' +
      (moved.length
        ? '<br><span>→ ' + (liveHex ? liveHex.zh + ' ' + liveHex.ru : "—") + '</span>'
        : '') +
      '</div>';

    var paths = '<div class="paths"><div class="chips">' +
      neighbours(h).map(function (n) {
        var nh = BY_ID[n.id];
        return '<button type="button" class="chip path" data-id="' + n.id + '">' +
          '<em>' + n.kind + (n.line === null ? "" : " " + (n.line + 1)) + '</em>' + nh.zh + '</button>';
      }).join("") + '</div></div>';

    panelBody.innerHTML =
      '<h2>' + h.zh + '</h2>' +
      '<div class="py">' + h.py + ' · ' + h.id + '</div>' +
      '<div class="ru-name">' + h.ru + '</div>' +
      '<div class="themes">' + h.theme + '</div>' +
      '<div class="trigrams">' + t.zh + ' ' + t.ru + ' · ' + low.zh + ' ' + low.ru + '</div>' +
      forms + bindingHTML +
      '<div class="shelves">' + shelves + '</div>' +
      paths;

    panel.hidden = false;

    Array.prototype.forEach.call(panelBody.querySelectorAll(".add"), function (b) {
      b.addEventListener("click", function () {
        if (window.PUBLISH) PUBLISH.open(Number(b.dataset.hex), Number(b.dataset.line));
      });
    });

    Array.prototype.forEach.call(panelBody.querySelectorAll(".diyu-target"), function (b) {
      b.addEventListener("click", function () {
        if (window.showDiyuMenu) {
            window.showDiyuMenu(Number(b.dataset.hex), Number(b.dataset.line), Number(b.dataset.idx), b);
        }
      });
    });

    /* пути перемены: переход в соседний квадрат */
    Array.prototype.forEach.call(panelBody.querySelectorAll(".path"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id);
        var nh = BY_ID[id];
        if (!nh) return;
        openPanel(nh);
        var tile = tiles.filter(function (t) { return t.h.id === id; })[0];
        if (tile && tile.el.scrollIntoView) {
          try { tile.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { }
        }
      });
    });
    currentId = h.id;
  }

  function closePanel() { panel.hidden = true; }

  /* ---------- фильтр по триграммам (КОМПАС ИЗ ДВУХ СТИХИЙ) ---------- */
  
  var selectedTrigrams = []; // Хранит до 2 выбранных стихий

  function buildSectors() {
    Object.keys(T).forEach(function (key) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.key = key;
      b.textContent = T[key].zh + " " + T[key].ru;
      b.title = T[key].el;
      
      b.addEventListener("click", function () {
        if (window.SOUNDS && window.SOUNDS.playBowl) window.SOUNDS.playBowl();
        
        var idx = selectedTrigrams.indexOf(key);
        if (idx > -1) {
          selectedTrigrams.splice(idx, 1); // отмена выбора
          b.style.color = "";
          b.style.textShadow = "";
          b.style.transform = "";
        } else {
          selectedTrigrams.push(key);
          b.style.color = "#ff4c3b"; // Киноварное свечение
          b.style.textShadow = "0 0 10px rgba(255, 76, 59, 0.6)";
          b.style.transform = "scale(1.15)";
        }
        
        if (selectedTrigrams.length === 2) {
          // Нашли две стихии! Верхняя и Нижняя
          var upper = selectedTrigrams[0];
          var lower = selectedTrigrams[1];
          
          var foundHex = H.find(function(h) { return h.u === upper && h.l === lower; });
          if (!foundHex) foundHex = H.find(function(h) { return h.u === lower && h.l === upper; }); // Fallback
          
          setTimeout(function() {
            if (foundHex) {
              openPanel(foundHex);
              var tile = tiles.find(function (t) { return t.h.id === foundHex.id; });
              if (tile && tile.el.scrollIntoView) {
                try { tile.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { }
              }
            }
            
            // Сброс компаса
            selectedTrigrams = [];
            Array.from(sectorsBox.querySelectorAll("button")).forEach(function(btn) {
              btn.style.color = "";
              btn.style.textShadow = "";
              btn.style.transform = "";
            });
          }, 800); // Задержка 800 мс перед прыжком
        }
      });
      sectorsBox.appendChild(b);
    });
  }

  /* ---------- старт ---------- */

  function init() {
    if (!T || !H) { console.error("Не загружен data/hexagrams.js"); return; }
    if (H.length !== 64) console.warn("Ожидалось 64 гексаграммы, получено " + H.length);

    buildSectors();
    buildTiles();
    applyFilters();

    if (searchInput) searchInput.addEventListener("input", function () { state.q = this.value.trim(); applyFilters(); });
    if (onlyMine) onlyMine.addEventListener("change", function () { state.onlyMine = this.checked; applyFilters(); });
    if (flatToggle) flatToggle.addEventListener("change", function () {
      document.body.classList.toggle("flat", this.checked);
    });
    document.getElementById("panelClose").addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

    var windBtn = document.getElementById("windBtn");
    if (windBtn) {
      windBtn.addEventListener("click", async function () {
        var question = prompt("Оракул Ицзин слушает... Какой вопрос тяготит ваш дух?");
        if (!question || !question.trim()) return;

        var btnText = windBtn.innerText;
        windBtn.innerText = "ВЕТРА ВЗИРАЮТ НА ПУСТОТУ...";
        windBtn.disabled = true;

        try {
            var randomIndex = Math.floor(Math.random() * H.length);
            var randomHex = H[randomIndex];
            var hexText = randomHex.zh + " " + randomHex.ru + "\n" + randomHex.theme;
            
            // Используем чисто аналоговый алгоритм (Марков + УЛИПО), никакой нейросети
            var o = { seed: Math.random(), volume: 60, fresh: 60, breath: 30, void_level: 10, corpus: hexText };
            var res = window.POEM_BOT.generate(question, o);
            var prophecy = res.text;
            
            // Ищем свободную полку в этой гексаграмме среди пользовательских текстов
            var myTexts = window.STORE ? window.STORE.inSquare(randomHex.id) : [];
            var targetLineIdx = -1;
            for (var i = 0; i < 6; i++) {
                var occupied = myTexts.some(function(t) { return t.lineIndex === i; });
                if (!occupied) {
                    targetLineIdx = i;
                    break;
                }
            }
            if (targetLineIdx === -1) targetLineIdx = Math.floor(Math.random() * 6); // Если всё занято, пишем поверх
            
            var fullText = "ВОПРОС: " + question + "\nОТВЕТ: " + prophecy;

            // Сохраняем через официальное API хранилища
            if (window.STORE) {
                window.STORE.add({
                    body: fullText,
                    hexagramId: randomHex.id,
                    lineIndex: targetLineIdx,
                    concepts: []
                });
            }

            openPanel(randomHex);
            
            var tile = tiles.filter(function (t) { return t.h.id === randomHex.id; })[0];
            if (tile && tile.el.scrollIntoView) {
              try { tile.el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { }
            }
        } catch (e) {
            alert("Ошибка оракула: " + e.message);
        } finally {
            windBtn.innerText = btnText;
            windBtn.disabled = false;
        }
      });
    }

    /* 3D tilt effect for the squares grid */
    window.addEventListener("mousemove", function(e) {
      if (document.body.classList.contains("flat")) {
        sky.style.removeProperty("--tilt-y");
        sky.style.removeProperty("--tilt-x");
        return;
      }
      var w = window.innerWidth, h = window.innerHeight;
      var tiltY = (0.5 - e.clientX / w) * 12; // rotateY
      var tiltX = (e.clientY / h - 0.5) * 12; // rotateX
      sky.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
      sky.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
    }, { passive: true });

    /* тема: бумага днём, 墨夜 ночью */
    var nightBtn = document.getElementById("nightBtn");
    var NIGHT_KEY = "poems-world:night";
    function applyNight(on) {
      document.body.classList.toggle("night", on);
      if (nightBtn) nightBtn.setAttribute("aria-pressed", String(on));
    }
    var savedNight = false;
    try { savedNight = window.localStorage.getItem(NIGHT_KEY) === "1"; } catch (e) { }
    applyNight(savedNight);
    if (nightBtn) {
      nightBtn.addEventListener("click", function () {
        var on = !document.body.classList.contains("night");
        applyNight(on);
        try { window.localStorage.setItem(NIGHT_KEY, on ? "1" : "0"); } catch (e) { }
      });
    }

    /* публикация и импорт: пересчитать метки, метрики, подсказку и открытую панель */
    document.addEventListener("poems:changed", function () {
      updateTiles();
      applyFilters();
      if (!panel.hidden && currentId !== null) {
        var h = H.filter(function (x) { return x.id === currentId; })[0];
        if (h) openPanel(h);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  /* доступ для тестов, импорта и внешних модулей */
  window.FORMS = {
    code: codeOf,
    idOfCode: idOfCode,
    flip: flip,
    inverse: inverse,
    reverse: reverse,
    liveCode: liveCode,
    movedLines: movedLines,
    neighbours: neighbours,
    metrics: metrics,
    byId: BY_ID
  };

  // FAQ Modal logic
  document.addEventListener("DOMContentLoaded", function() {
    var faqBtn = document.getElementById("faqBtn");
    var faqClose = document.getElementById("faqClose");
    var faqModal = document.getElementById("faqModal");
    if (faqBtn && faqClose && faqModal) {
      faqBtn.addEventListener("click", function() { faqModal.hidden = false; });
      faqClose.addEventListener("click", function() { faqModal.hidden = true; });
      faqModal.addEventListener("click", function(e) { if(e.target === faqModal) faqModal.hidden = true; });
    }
  });

  // Простой параллакс для фона (свиток)
  window.addEventListener("scroll", function () {
    var scroll = window.pageYOffset || document.documentElement.scrollTop;
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, scroll / maxScroll));
  }, { passive: true });

})();

/* import.js — импорт корпуса в свод: файл экспорта Telegram (result.json)
   или готовый сид-корпус data/corpus.json. */

(function () {
  "use strict";

  var IMPORT = window.IMPORT, SPLIT = window.SPLIT, STORE = window.STORE;
  var H = window.HEXAGRAMS;
  var byId = {};
  H.forEach(function (h) { byId[h.id] = h; });

  var modal, fileInput, keepForwarded, summary, preview, plan = null;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function empty() {
    return '<p class="muted">Выбери <code>result.json</code> из экспорта Telegram (Desktop → Export chat history → JSON) ' +
      'или нажми «Загрузить сид-корпус».</p>';
  }

  function renderPlan(p) {
    var hexRows = p.topHex.slice(0, 12).map(function (r) {
      var h = byId[r.hex];
      return '<span class="chip concept">№' + h.id + ' ' + h.zh + ' ' + h.ru + ' — ' + r.texts + '</span>';
    }).join("");

    var concepts = p.topConcepts.slice(0, 16).map(function (c) {
      return '<span class="chip">' + esc(c.name) + ' <i>×' + c.hits + '</i></span>';
    }).join("");

    var sample = p.records.slice(0, 6).map(function (r) {
      var h = byId[r.hexagramId];
      return '<div class="ent-line"><span class="idx">№' + h.id + '</span><span>' +
        esc(r.body).slice(0, 220) + '<br><small>полка ' + (r.lineIndex + 1) + ' · ' +
        (r.concepts.join(", ") || "образы не опознаны") + ' · ' + r.source + '</small></span></div>';
    }).join("");

    summary.innerHTML =
      '<div class="ent-block"><h4>Итог разбора</h4>' +
      '<p class="muted">текстов: <b>' + p.stats.texts + '</b> · квадратов задействовано: <b>' + p.stats.squares +
      '</b> · концептов: <b>' + p.stats.concepts + '</b> · без опознанных образов (уйдут в №64): <b>' + p.stats.noIdea + '</b></p>' +
      '<div class="chips">' + hexRows + '</div></div>' +
      (concepts ? '<div class="ent-block"><h4>Сильные концепты</h4><div class="chips">' + concepts + '</div></div>' : '') +
      '<div class="ent-block"><h4>Как это ляжет (первые 6)</h4>' + sample + '</div>';
  }

  function analyzeFile(json, name) {
    var parsed = IMPORT.parseExport(json, { keepForwarded: keepForwarded.checked });
    plan = IMPORT.plan(parsed.items, SPLIT);
    plan.meta = { source: name, skipped: parsed.skipped };
    renderPlan(plan);
    var sk = parsed.skipped;
    var skipLine = "пропущено: пустых " + sk.empty + ", коротких " + sk.short +
      ", репостов " + sk.forwarded + ", служебных " + sk.service + ", слишком длинных " + sk.long;
    summary.insertAdjacentHTML("afterbegin", '<p class="muted">' + skipLine + '</p>');
  }

  function readFile(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        analyzeFile(JSON.parse(String(fr.result)), file.name);
      } catch (e) {
        summary.innerHTML = '<p class="muted">Не удалось прочитать файл: ' + esc(e.message) + '</p>';
        plan = null;
      }
    };
    fr.readAsText(file);
  }

  function loadSeed() {
    fetch("data/corpus.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("нет файла data/corpus.json — сначала запусти node scripts/import-result.js");
        return r.json();
      })
      .then(function (data) {
        var texts = Array.isArray(data) ? data : (data.texts || []);
        plan = {
          records: texts, topHex: [], topConcepts: [],
          stats: { texts: texts.length, squares: 0, concepts: 0, noIdea: 0 }
        };
        plan.topHex = IMPORT.plan(texts.map(function (t) {
          return { body: t.body, cycle: null, heading: false, ts: Date.parse(t.createdAt) || 0 };
        }), SPLIT).topHex;
        plan.topConcepts = IMPORT.plan(texts.map(function (t) {
          return { body: t.body, cycle: null, heading: false, ts: 0 };
        }), SPLIT).topConcepts;
        plan.stats.squares = plan.topHex.length;
        plan.stats.concepts = plan.topConcepts.length;
        renderPlan(plan);
        summary.insertAdjacentHTML("afterbegin",
          '<p class="muted">сид-корпус: ' + texts.length + ' текстов из data/corpus.json</p>');
      })
      .catch(function (e) {
        summary.innerHTML = '<p class="muted">' + esc(e.message) + '</p>';
      });
  }

  function apply() {
    if (!plan || !plan.records.length) { summary.insertAdjacentHTML("beforeend", '<p class="muted">Сначала разбери файл.</p>'); return; }
    var added = STORE.addMany(plan.records);
    summary.insertAdjacentHTML("afterbegin",
      '<p class="muted">в свод добавлено текстов: <b>' + added.length + '</b></p>');
  }

  function clearAll() {
    if (!window.confirm("Очистить свод: удалить все опубликованные тексты?")) return;
    STORE.clear();
    summary.insertAdjacentHTML("afterbegin", '<p class="muted">свод очищен</p>');
  }

  function open() {
    modal.hidden = false;
    summary.innerHTML = empty();
    plan = null;
  }

  function close() { modal.hidden = true; }

  function init() {
    modal = el("importModal");
    if (!modal) return;
    fileInput = el("importFile");
    keepForwarded = el("importForwarded");
    summary = el("importSummary");
    preview = el("importPreview");

    var importButton = el("importBtn");
    if (importButton) importButton.addEventListener("click", open);
    el("importClose").addEventListener("click", close);
    el("importSeed").addEventListener("click", loadSeed);
    el("importApply").addEventListener("click", apply);
    el("importClear").addEventListener("click", clearAll);
    fileInput.addEventListener("change", function () {
      if (this.files && this.files[0]) readFile(this.files[0]);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.IMPORT_UI = { open: open, close: close };
})();

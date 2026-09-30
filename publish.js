/* publish.js — публикация текста в квадрат и на полку + расщепление на сущности. */

(function () {
  "use strict";

  var H = window.HEXAGRAMS, SPLIT = window.SPLIT, STORE = window.STORE;
  var modal, txt, hexSel, lineSel, splitBox, suggestBox;
  var byId = {};

  H.forEach(function (h) { byId[h.id] = h; });

  function el(id) { return document.getElementById(id); }

  function buildHexOptions() {
    hexSel.innerHTML = H.map(function (h) {
      return '<option value="' + h.id + '">№' + h.id + ' ' + h.zh + ' ' + h.ru + ' — ' + h.theme + '</option>';
    }).join("");
  }

  function buildLineOptions() {
    var h = byId[Number(hexSel.value)] || H[0];
    lineSel.innerHTML = h.lines.map(function (t, i) {
      return '<option value="' + i + '">полка ' + (i + 1) + ' — ' + t + '</option>';
    }).join("");
  }

  function renderSuggest(res) {
    var h = byId[res.suggest];
    suggestBox.innerHTML = "подсказка: <b>№" + h.id + " " + h.zh + " " + h.ru + "</b> — " + res.why +
      ' <button type="button" id="applySuggest" class="chip">взять этот квадрат</button>';
    el("applySuggest").addEventListener("click", function () {
      hexSel.value = String(h.id);
      buildLineOptions();
    });
  }

  function renderSplit(res) {
    var lines = res.lines.map(function (l, i) {
      return '<div class="ent-line"><span class="idx">' + (i + 1) + '</span><span>' + l.text +
        '<br><small>' + l.syllables + ' слогов · ' + l.temperament + ' · ' + l.role +
        ' · стихия ' + l.element + '</small></span></div>';
    }).join("");

    var concepts = res.concepts.map(function (c) {
      var h = byId[c.hex];
      return '<span class="chip concept">' + c.name + ' → №' + h.id + ' ' + h.zh + ' ×' + c.hits + '</span>';
    }).join("");

    var words = res.words.slice(0, 28).map(function (w) {
      var tip = w.kin.length ? "родня: " + w.kin.join(", ") : "без родни";
      return '<span class="chip' + (w.rare ? " rare" : "") + '" title="' + tip + '">' + w.w +
        ' <i>' + w.syllables + '</i> <em>' + w.element + '</em></span>';
    }).join("");

    splitBox.innerHTML =
      '<div class="ent-block"><h4 style="font-family:\'Kelly Slab\', monospace; letter-spacing:1px; text-transform:uppercase;">Строки → Потоки (Ци)</h4>' + lines + '</div>' +
      (concepts ? '<div class="ent-block"><h4 style="font-family:\'Kelly Slab\', monospace; letter-spacing:1px; text-transform:uppercase;">Концепты → Семена перемен</h4><div class="chips">' + concepts + '</div></div>' : '') +
      '<div class="ent-block"><h4 style="font-family:\'Kelly Slab\', monospace; letter-spacing:1px; text-transform:uppercase;">Слова → Тьма вещей (' + res.words.length + ')</h4><div class="chips">' + words + '</div></div>' +
      '<p class="muted">' + res.stats.lines + ' строк · ' + res.stats.words + ' слов · ' +
      res.stats.unique + ' уникальных · ' + res.stats.syllables + ' слогов' +
      (res.stats.rarest ? ' · редчайшее: «' + res.stats.rarest.w + '»' : '') + '</p>';
  }

  function analyzeNow() {
    var res = SPLIT.analyze(txt.value);
    renderSplit(res);
    renderSuggest(res);
    return res;
  }

  function open(hexId, lineIndex) {
    var h = byId[Number(hexId)] || H[0];
    hexSel.value = String(h.id);
    buildLineOptions();
    if (lineIndex !== null && lineIndex !== undefined) lineSel.value = String(lineIndex);
    txt.value = "";
    suggestBox.innerHTML = "";
    splitBox.innerHTML = '';
    modal.hidden = false;
    txt.focus();
  }

  function close() { modal.hidden = true; }

  function init() {
    modal = el("publish");
    if (!modal) return;
    txt = el("poemText");
    hexSel = el("poemHex");
    lineSel = el("poemLine");
    splitBox = el("splitResult");
    suggestBox = el("suggestBox");

    buildHexOptions();
    buildLineOptions();

    hexSel.addEventListener("change", buildLineOptions);
    var writeButton = el("writeBtn");
    if (writeButton) writeButton.addEventListener("click", function () { open(byId[64].id, 0); });
    el("publishClose").addEventListener("click", close);
    el("splitBtn").addEventListener("click", analyzeNow);

    el("publishSave").addEventListener("click", function () {
      if (!txt.value.trim()) { window.alert("Сначала вставь текст."); return; }
      
      var hexId = Number(hexSel.value);
      var lineIdx = Number(lineSel.value);
      
      // Искажаем текст согласно черте гексаграммы
      var finalizedText = window.MUTATION ? window.MUTATION.apply(txt.value, hexId, lineIdx) : txt.value;
      
      // Считаем метрики уже по искаженному тексту (если нужно, можно по оригинальному, но по искаженному честнее)
      var res = SPLIT.analyze(finalizedText);
      
      STORE.add({
        body: finalizedText,
        hexagramId: hexId,
        lineIndex: lineIdx,
        concepts: res.concepts.map(function (c) { return c.name; })
      });
      if (window.SOUNDS && window.SOUNDS.playBowl) window.SOUNDS.playBowl();
      close();
    });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.PUBLISH = { open: open, close: close };
})();

/* sandbox.js — «писать тушью»: локальная песочница, только слова автора. */

(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function () {
    var modal = el("sandboxModal");
    if (!modal) return;

    var opener = null;
    var params = ["volume", "fresh", "breath", "void"];
    var variantSeed = 1;
    var H = window.HEXAGRAMS;

    function open() { opener = document.activeElement; modal.hidden = false; el("botInput").focus(); }
    function close() { modal.hidden = true; if (opener && opener.focus) opener.focus(); }

    el("sandboxBtn").addEventListener("click", open);
    el("sandboxClose").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    // Построение красивого селекта гексаграмм (как в publish.js)
    function buildHexOptions() {
      el("botHex").innerHTML = H.map(function (h) {
        return '<option value="' + h.id + '">№' + h.id + ' ' + h.zh + ' ' + h.ru + ' — ' + h.theme + '</option>';
      }).join("");
    }
    
    // Динамические названия полок (черт)
    function buildLineOptions() {
      var hexId = Number(el("botHex").value) || 1;
      var h = H.find(function(item) { return item.id === hexId; }) || H[0];
      el("botShelf").innerHTML = h.lines.map(function (t, i) {
        return '<option value="' + i + '">полка ' + (i + 1) + ' — ' + t + '</option>';
      }).join("");
    }

    buildHexOptions();
    el("botHex").addEventListener("change", buildLineOptions);
    buildLineOptions();

    params.forEach(function (k) {
      el("bot-" + k).addEventListener("input", function () {
        el("bot-" + k + "-value").textContent = this.value + "%";
      });
    });

    async function generate() {
      try {
        var o = { seed: variantSeed };
        params.forEach(function (k) { o[k] = el("bot-" + k).value; });
        var hexId = Number(el("botHex").value);
        var bind = (window.BINDINGS || []).find(function (b) { return b.id === hexId; });
        o.corpus = bind && bind.body ? bind.body : "";

        var res = window.POEM_BOT.generate(el("botInput").value, o);
        el("botOutput").value = res.text;
        el("botStatus").textContent = res.stats.actualLines + " строк · из фраз " +
          res.stats.fromFragments + " · из цепи " + res.stats.fromChain +
          (res.stats.fromHex ? " · из 卦 " + res.stats.fromHex : "") +
          " · рифмованных " + res.stats.rhymed + ". " + res.note;
      } catch (e) { 
        el("botStatus").textContent = e.message; 
        el("botInput").style.borderColor = "var(--seal)";
        setTimeout(function() { el("botInput").style.borderColor = ""; }, 1500);
      }
    }

    el("botGenerate").addEventListener("click", generate);
    el("botVariant").addEventListener("click", function () {
      variantSeed = variantSeed % 99991 + 1;
      generate();
    });
    el("botInput").addEventListener("input", function () { variantSeed = 1; });

    el("botChaosBtn").addEventListener("click", function () {
      // Полный рандом (Сон бабочки)
      variantSeed = Math.floor(Math.random() * 99999);
      
      // Если поле пустое — генерируем словарь в стиле Михаила Ерёмина
      if (!el("botInput").value.trim()) {
        var ereminVocab = "Проекция немоты. Сочленение излома и пустоты. Синтаксис вещества, облеченный в ледяную форму. Акватория мерцаний. Иероглиф предела, ускользающий за ось координат. Метафора очертаний стирает присутствие. Структура безгласности рождает плотность. Кристалл времени преломляет оптику невыразимого. Смещение геометрии в сторону распада. Сгусток первоматерии без глаголов. Лишь существительные созерцают пространство.";
        el("botInput").value = ereminVocab;
      }
      
      // Случайные значения ползунков
      params.forEach(function (k) {
        var randomVal = Math.floor(Math.random() * 100);
        el("bot-" + k).value = randomVal;
        el("bot-" + k + "-value").textContent = randomVal + "%";
      });
      
      // Случайная гексаграмма из доступных
      if (H && H.length > 0) {
        var randomHex = H[Math.floor(Math.random() * H.length)].id;
        el("botHex").value = randomHex;
        buildLineOptions();
      }
      
      generate();
      
      // Визуальный эффект
      el("sandboxModal").style.filter = "hue-rotate(" + (Math.random() * 360) + "deg)";
      setTimeout(function() { el("sandboxModal").style.filter = ""; }, 500);
      if (window.SOUNDS && window.SOUNDS.playBowl) window.SOUNDS.playBowl();
    });

    el("botCanvasBtn").addEventListener("click", function () {
      var text = el("botOutput").value;
      if (!text.trim()) { el("botStatus").textContent = "Сначала нужно собрать текст."; return; }
      
      var lines = text.split('\n');
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      
      // Настраиваем холст
      canvas.width = 900;
      canvas.height = Math.max(1200, lines.length * 60 + 400);
      
      // Фон (рисовая бумага)
      ctx.fillStyle = "#efe7d6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Имитация текстуры бумаги (легкий шум)
      for (var i = 0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)";
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
      }
      
      // Настройки туши
      ctx.fillStyle = "#241f1c";
      ctx.font = "42px 'Kelly Slab', 'Noto Serif SC', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Отрисовка текста (построчно, как мазки кисти)
      var startY = 200;
      for (var j = 0; j < lines.length; j++) {
        var lineText = lines[j];
        if (lineText.trim() === "") {
          startY += 40; // Пробел между строфами
          continue;
        }
        ctx.fillText(lineText, canvas.width / 2, startY);
        startY += 65;
      }
      
      // Печать (киноварь) внизу справа
      var sealX = canvas.width - 200;
      var sealY = startY + 100;
      ctx.fillStyle = "#a83a2c"; // var(--seal)
      ctx.fillRect(sealX, sealY, 80, 80);
      ctx.strokeStyle = "#efe7d6";
      ctx.lineWidth = 2;
      ctx.strokeRect(sealX + 5, sealY + 5, 70, 70);
      ctx.fillStyle = "#efe7d6";
      ctx.font = "36px 'Noto Serif SC', serif";
      ctx.fillText("道", sealX + 40, sealY + 44);
      
      // Скачивание
      var url = canvas.toDataURL("image/png");
      var a = document.createElement("a");
      a.href = url;
      a.download = "scroll_" + Date.now() + ".png";
      a.click();
      
      el("botStatus").textContent = "Свиток нарисован и сохранён!";
    });

    // Новая функция копирования (вместо скачивания, которое мы переделаем в копировать)
    el("botDownload").addEventListener("click", function () {
      var text = el("botOutput").value;
      if (!text.trim()) { el("botStatus").textContent = "Нечего копировать."; return; }
      navigator.clipboard.writeText(text).then(function() {
        el("botStatus").textContent = "Скопировано в буфер обмена!";
      });
    });

    el("botSave").addEventListener("click", function () {
      var text = el("botOutput").value;
      if (!text.trim()) { el("botStatus").textContent = "Нечего сохранять."; return; }
      
      var hexId = Number(el("botHex").value);
      var lineIdx = Number(el("botShelf").value);
      
      // Искажаем сгенерированный текст согласно законам черты перед сохранением
      var finalizedText = window.MUTATION ? window.MUTATION.apply(text, hexId, lineIdx) : text;
      
      // Выделяем концепты (сущности) через SPLIT
      var concepts = [];
      if (window.SPLIT) {
        concepts = window.SPLIT.analyze(finalizedText).concepts.map(function (c) { return c.name; });
      }

      window.STORE.add({
        body: finalizedText,
        hexagramId: hexId,
        lineIndex: lineIdx,
        concepts: concepts
      });
      if (window.SOUNDS && window.SOUNDS.playBowl) window.SOUNDS.playBowl();
      el("botStatus").textContent = "Сохранено на полку " + (lineIdx + 1) + ". Текст алхимически преображен.";
      // Очистка
      el("botOutput").value = "";
    });
  });
})();

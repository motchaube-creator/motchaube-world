/* import-core.js — ядро импорта экспорта Telegram (result.json).
   Изоморфный модуль: работает в браузере и в node (scripts/import-result.js).
   Задача: сообщения → тексты → квадрат (гексаграмма) + полка + концепты. */

(function (root) {
  "use strict";

  /* достаём текст сообщения: строка либо массив сущностей (entities) */
  function textOf(msg) {
    var t = msg && msg.text;
    if (typeof t === "string") return t;
    if (Array.isArray(t)) {
      return t.map(function (part) {
        return typeof part === "string" ? part : (part && part.text) || "";
      }).join("");
    }
    return "";
  }

  /* номер текста в нумерованном цикле (I., II., III. …) либо null */
  function cycleIndex(text) {
    var first = String(text).split(/\r?\n/)[0].trim();
    var m = first.match(/^(I{1,3}V?|IV|V|VI{0,3}|IX|X)[.)]\s*/);
    return m ? m[1] : null;
  }

  function isHeading(text) {
    var first = String(text).split(/\r?\n/)[0].trim();
    return /[一-龥]/.test(first) && first.length <= 24;
  }

  /**
   * Разбор экспорта.
   * @param {object} json — содержимое result.json
   * @param {object} [opts] — { keepForwarded: false, minLength: 12, maxLength: 4000 }
   * @returns {{items: Array, skipped: object}}
   */
  function parseExport(json, opts) {
    var o = opts || {};
    var keepForwarded = !!o.keepForwarded;
    var minLength = o.minLength === undefined ? 12 : o.minLength;
    var maxLength = o.maxLength === undefined ? 4000 : o.maxLength;

    var messages = (json && json.messages) || [];
    var items = [];
    var skipped = { service: 0, empty: 0, forwarded: 0, short: 0, long: 0 };

    messages.forEach(function (m) {
      if (!m || m.type !== "message") { skipped.service++; return; }
      if (m.forwarded_from || m.forward_from || m.forward_from_chat || m.saved_from) {
        skipped.forwarded++;
        if (!keepForwarded) return;
      }

      var text = textOf(m).trim();
      if (!text) { skipped.empty++; return; }
      if (text.length < minLength) { skipped.short++; return; }
      if (text.length > maxLength) { skipped.long++; return; }

      items.push({
        id: m.id,
        date: m.date || null,
        ts: m.date_unixtime ? Number(m.date_unixtime) * 1000 : (m.date ? Date.parse(m.date) : null),
        body: text,
        cycle: cycleIndex(text),
        heading: isHeading(text)
      });
    });

    items.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    return { items: items, skipped: skipped };
  }

  /**
   * Расстановка по квадратам и полкам.
   * Полка (стадия) — предварительная: короткое → 1 (замысел), среднее → 2 (вышел к людям),
   * длинное → 3 (трудись и шлифуй). Автор уточняет вручную.
   */
  function plan(items, SPLIT) {
    var records = [];
    var byHex = {};
    var conceptHits = {};
    var noIdea = 0;

    items.forEach(function (it) {
      var res = SPLIT.analyze(it.body);
      var lines = res.lines.length;
      var lineIndex = lines <= 3 ? 0 : (lines <= 8 ? 1 : 2);
      if (res.suggest === 64) noIdea++;

      var rec = {
        body: it.body,
        hexagramId: res.suggest,
        lineIndex: lineIndex,
        concepts: res.concepts.map(function (c) { return c.name; }),
        createdAt: it.ts ? new Date(it.ts).toISOString() : new Date().toISOString(),
        source: it.cycle ? "цикл " + it.cycle : (it.heading ? "титул" : "канал")
      };

      records.push(rec);
      byHex[rec.hexagramId] = (byHex[rec.hexagramId] || 0) + 1;
      rec.concepts.forEach(function (n) { conceptHits[n] = (conceptHits[n] || 0) + 1; });
    });

    var topConcepts = Object.keys(conceptHits)
      .map(function (n) { return { name: n, hits: conceptHits[n] }; })
      .sort(function (a, b) { return b.hits - a.hits; });

    var topHex = Object.keys(byHex)
      .map(function (k) { return { hex: Number(k), texts: byHex[k] }; })
      .sort(function (a, b) { return b.texts - a.texts; });

    return {
      records: records, byHex: byHex, topHex: topHex, topConcepts: topConcepts,
      stats: {
        texts: records.length,
        squares: Object.keys(byHex).length,
        noIdea: noIdea,
        concepts: topConcepts.length
      }
    };
  }

  root.IMPORT = { parseExport: parseExport, plan: plan, textOf: textOf, cycleIndex: cycleIndex };
})(typeof window !== "undefined" ? window : globalThis);

/* store.js — тексты, опубликованные в квадраты. Пока localStorage (+ память как запас),
   позже заменяется на серверное API без изменения вызовов. */

(function (root) {
  "use strict";

  var KEY = "poems-world:v1";
  var mem = null;

  function read() {
    if (mem) return mem;
    try {
      mem = JSON.parse(localStorage.getItem(KEY)) || { texts: [] };
    } catch (e) {
      mem = { texts: [] };
    }
    if (!Array.isArray(mem.texts)) mem.texts = [];
    return mem;
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(read())); } catch (e) { /* file:// или приватный режим */ }
    if (root.document && root.document.dispatchEvent) {
      var ev;
      try { ev = new CustomEvent("poems:changed"); }
      catch (e) { ev = { type: "poems:changed" }; }
      root.document.dispatchEvent(ev);
    }
  }

  function uid() {
    return "t" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  root.STORE = {
    all: function () { return read().texts.slice(); },

    add: function (t) {
      var d = read();
      var rec = {
        id: uid(),
        body: String(t.body || "").trim(),
        hexagramId: Number(t.hexagramId),
        lineIndex: Math.max(0, Math.min(5, Number(t.lineIndex) || 0)),
        secondaryHexagramId: t.secondaryHexagramId ? Number(t.secondaryHexagramId) : null,
        concepts: t.concepts || [],
        createdAt: new Date().toISOString()
      };
      d.texts.push(rec);
      write();
      return rec;
    },

    /* массовая вставка (импорт корпуса): одна запись в localStorage, одно событие */
    addMany: function (list) {
      var d = read();
      var added = [];
      (list || []).forEach(function (t) {
        if (!t || !t.body) return;
        var rec = {
          id: uid(),
          body: String(t.body).trim(),
          hexagramId: Number(t.hexagramId) || 64,
          lineIndex: Math.max(0, Math.min(5, Number(t.lineIndex) || 0)),
          secondaryHexagramId: t.secondaryHexagramId ? Number(t.secondaryHexagramId) : null,
          concepts: t.concepts || [],
          source: t.source || "импорт",
          createdAt: t.createdAt || new Date().toISOString()
        };
        d.texts.push(rec);
        added.push(rec);
      });
      write();
      return added;
    },

    inSquare: function (hexId) {
      return read().texts.filter(function (t) { return t.hexagramId === Number(hexId); });
    },

    at: function (hexId, lineIndex) {
      return read().texts.filter(function (t) {
        return t.hexagramId === Number(hexId) && t.lineIndex === Number(lineIndex);
      });
    },

    /* заполненность 6 полок: [0..5] — сколько текстов на каждой */
    countByLine: function (hexId) {
      var a = [0, 0, 0, 0, 0, 0];
      read().texts.forEach(function (t) {
        if (t.hexagramId === Number(hexId) && t.lineIndex >= 0 && t.lineIndex < 6) a[t.lineIndex]++;
      });
      return a;
    },

    /* свежесть квадрата: 0 — старое, 1 — писали только что */
    freshness: function (hexId) {
      var list = root.STORE.inSquare(hexId);
      if (!list.length) return null;
      var last = list.reduce(function (max, t) {
        var ts = Date.parse(t.createdAt) || 0;
        return ts > max ? ts : max;
      }, 0);
      var days = (Date.now() - last) / 86400000;
      return Math.max(0, 1 - days / 30);
    },

    remove: function (id) {
      var d = read();
      d.texts = d.texts.filter(function (t) { return t.id !== id; });
      write();
    },

    clear: function () { mem = { texts: [] }; write(); }
  };
})(typeof window !== "undefined" ? window : globalThis);

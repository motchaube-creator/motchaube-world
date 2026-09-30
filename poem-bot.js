/* poem-bot.js — «писать тушью»: локальный сборщик строк из слов автора.
   Цепь Маркова 1-го порядка + нарезка фраз + рифма по хвосту слова.
   Референсы: github.com/marcusGH/generating-poems-with-markov-chains,
   github.com/williamBartos/markoviRhyme (обратная цепь для рифмы),
   github.com/dhowe/ritajs (computational writing, «100% ai-free»).
   Без сети, без нейросетей, без чужих строк: грамматика не выдумывается,
   меняется только соседство слов автора. */

(function (root) {
  "use strict";

  function bounded(v, fb, min, max) {
    var n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fb;
  }

  function random(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function words(text) {
    return String(text).match(/[\p{L}\p{M}\p{N}]+(?:['’−-][\p{L}\p{M}\p{N}]+)*/gu) || [];
  }

  /* хвост слова для рифмы: две последние буквы (ь/ъ отбрасываем) */
  function suffix(word) {
    var w = String(word).toLowerCase().replace(/[ъь]+$/g, "");
    return w.length >= 4 ? w.slice(-2) : (w.length >= 2 ? w : "");
  }

  function generate(input, options) {
    var text = String(input || "");
    if (text.length > 30000) throw new Error("Максимум 30 000 знаков.");
    var corpus = String((options && options.corpus) || "");
    var tokens = words(text);
    if (!tokens.length) throw new Error("Добавь слова: стих, мысль или просто слова.");

    var o = options || {};
    var p = {
      volume: bounded(o.volume, 32, 0, 100),
      fresh: bounded(o.fresh, 48, 0, 100),
      breath: bounded(o.breath, 45, 0, 100),
      void_level: bounded(o.void, 30, 0, 100), // новый параметр
      seed: bounded(o.seed, 1, 0, 2147483647)
    };
    var rand = random(p.seed);
    var lineLen = Math.max(2, 2 + Math.round(p.breath * 10 / 100));
    var wanted = 1 + Math.round(p.volume * 15 / 100);

    // Вшиваем архаичный словарь (Даль и ветхие тексты)
    var ARCHAIC_CORPUS = `
      Воззри на небеса, где сонм светил сияет. Днесь твердь небесная глаголет. 
      Очи взирают в сумрак, алкая благодати. Сень чертога укрывает. 
      Всуе вопиять в пучину, поелику тлен и прах суть удел наш. 
      Персты указуют на стезю, а десница держит бремя. 
      Внемли гласу, что звучит из хляби. 
      Отнюдь не суета правит юдолью сей, но предвечный рок. 
      Зело скорбит душа, взирая на ланиты и вежды спящих. 
      Искони велено нести свой крест сквозь тернии. 
      Уста сомкнуты, чело бледно, длань опустилась. 
      Присно и во веки веков пребудет пустота. 
      Горнило страстей сжигает плоть, оставляя лишь дух. 
      Отрок вопрошает старца, но тот хранит безмолвие.
    `;
    
    // Подмешиваем архаику к тексту пользователя, чтобы цепи Маркова выучили эти связи
    var blendedText = text + " " + ARCHAIC_CORPUS;

    var sources = [{ text: blendedText, hex: false }].concat(corpus ? [{ text: corpus, hex: true }] : []);

    var caseFor = new Map();
    var chains = sources.map(function (s) {
      var chain = new Map();
      var starters = new Set();
      s.text.split(/[\r\n]+|[.!?;:…]+/u).map(function (t) { return t.trim(); }).filter(function (t) { return words(t).length > 0; })
        .forEach(function (ph) {
          var ws = words(ph);
          if (!ws.length) return;
          starters.add(ws[0].toLowerCase());
          for (var i = 0; i < ws.length; i++) {
            var low = ws[i].toLowerCase();
            if (!caseFor.has(low)) caseFor.set(low, ws[i]);
            if (i + 1 < ws.length) {
              var next = ws[i + 1].toLowerCase();
              if (!chain.has(low)) chain.set(low, []);
              chain.get(low).push(next);
            }
          }
        });
      return { chain: chain, starters: starters };
    });
    var chainUser = chains[0].chain, startUser = chains[0].starters;
    var chainHex = corpus ? chains[1].chain : null;
    var startHex = corpus ? chains[1].starters : null;
    var hexShare = corpus ? 0.3 : 0; // Фиксированная доля гексаграммы

    var fragments = [];
    var seenFrag = new Set();
    sources.forEach(function (s, si) {
      var parts = s.text.split(/[\r\n]+|[.!?;:…]+/u).map(function (t) { return t.trim(); }).filter(function (t) { return words(t).length > 0; });
      parts.forEach(function (ph) {
        var ws = words(ph);
        var L = Math.min(lineLen, ws.length);
        for (var s2 = 0; s2 + L <= ws.length; s2++) {
          var t = ws.slice(s2, s2 + L).join(" ");
          var k = t.toLowerCase();
          if (seenFrag.has(k)) continue;
          seenFrag.add(k);
          fragments.push({ text: t, end: ws[s2 + L - 1].toLowerCase(), hex: si === 1, phrase: si });
        }
      });
    });

    function pickStart(isHex) {
      var st = isHex ? startHex : startUser;
      if (!st || !st.size) return null;
      var arr = Array.from(st);
      return arr[Math.floor(rand() * arr.length)];
    }

    function chainLine(isHex) {
      var primary = isHex ? chainHex : chainUser;
      var start = pickStart(isHex);
      if (!start || !primary.has(start)) return null;
      var line = [start], cur = start, switched = false;
      for (var i = 1; i < lineLen; i++) {
        var nexts = primary.get(cur);
        if (!nexts || !nexts.length) break;
        cur = nexts[Math.floor(rand() * nexts.length)];
        line.push(cur);
      }
      if (line.length < lineLen && !isHex && hexShare > 0) {
        var s2 = pickStart(true);
        if (s2 && chainHex && chainHex.has(s2)) {
          line.push(s2); cur = s2; switched = true;
          while (line.length < lineLen) {
            var nx = chainHex.get(cur);
            if (!nx || !nx.length) break;
            cur = nx[Math.floor(rand() * nx.length)];
            line.push(cur);
          }
        }
      }
      return { ws: line, hex: isHex || switched, mixed: switched };
    }

    function fragLine(isHex) {
      var pool = hexShare > 0 || isHex ? fragments.filter(function (f) { return f.hex === isHex; }) : fragments.filter(function (f) { return !f.hex; });
      if (!pool.length) pool = fragments;
      if (!pool.length) return null;
      var f = pool[Math.floor(rand() * pool.length)];
      return { ws: words(f.text).map(function (w) { return w.toLowerCase(); }), hex: f.hex, chain: false };
    }

    // --- АВАНГАРДНЫЕ МЕХАНИКИ (Пилюля 8 Бессмертных) ---

    // 1. УЛИПО (Сдвиг смыслов N+1) + Архаизация
    var userWordsArr = Array.from(new Set(words(text).map(function(w) { return w.toLowerCase(); }))).sort();
    var archaicWords = words(ARCHAIC_CORPUS).map(function(w) { return w.toLowerCase(); });
    
    var shiftMap = new Map();
    for (var i = 0; i < userWordsArr.length; i++) {
       // С вероятностью 25% заменяем слово на случайное архаичное слово из словаря Даля
       if (rand() < 0.25) {
           shiftMap.set(userWordsArr[i], archaicWords[Math.floor(rand() * archaicWords.length)]);
       } else {
           shiftMap.set(userWordsArr[i], userWordsArr[(i + 1) % userWordsArr.length]);
       }
    }

    // 2. Метод шляпы Тцары (Дадаизм)
    function dadaLine(isHex) {
      var pool = isHex && corpus ? Array.from(chainHex ? chainHex.keys() : []) : userWordsArr;
      if (!pool || !pool.length) pool = userWordsArr;
      var line = [];
      for (var i = 0; i < lineLen; i++) {
        line.push(pool[Math.floor(rand() * pool.length)]);
      }
      return { ws: line, hex: isHex, chain: false, dada: true };
    }

    // 3. Изысканный труп (Сюрреализм)
    function corpseLine() {
       var uFrag = fragLine(false);
       var hFrag = fragLine(true);
       if (!uFrag) uFrag = dadaLine(false);
       if (!hFrag) hFrag = dadaLine(true);
       var splitPt = Math.ceil(lineLen / 2);
       var half1 = uFrag.ws.slice(0, splitPt);
       var half2 = hFrag.ws.slice(0, lineLen - splitPt);
       return { ws: half1.concat(half2), hex: true, chain: false, corpse: true };
    }

    function tryLine(useChain, isHex) {
      var r = rand();
      if (r < 0.20 && corpus) return corpseLine(); // 20% Изысканный труп
      if (r < 0.35) return dadaLine(isHex);        // 15% Шляпа Дадаиста
      if (useChain) { var c = chainLine(isHex); if (c) return c; }
      return fragLine(isHex);
    }

    // Извлечение гласных для внутренней рифмы (ассонанса)
    function getVowels(word) {
      var match = String(word).toLowerCase().match(/[аеёиоуыэюя]/g);
      return match ? match.join("") : "";
    }

    var usedLines = new Set();
    var usedWords = new Set();
    var lastSuffix = null;
    var lastVowels = null;
    var outLines = [];
    var fromChain = 0, fromFrag = 0, fromHex = 0, rhymed = 0;
    var guard = 0;

    while (outLines.length < wanted && guard++ < 400) {
      var takeHex = hexShare > 0 && rand() < hexShare;
      var useChain = chainUser.size > 1 && rand() < p.fresh / 100;

      var best = null;
      for (var tries = 0; tries < 3; tries++) {
        var cand = tryLine(useChain, takeHex);
        if (!cand || !cand.ws.length) continue;
        
        var lineText = cand.ws.map(function (w) { return caseFor.get(w) || w; }).join(" ");
        var key = lineText.toLowerCase();
        if (usedLines.has(key)) continue;
        
        var end = cand.ws[cand.ws.length - 1];
        var sfx = suffix(end);
        var endVowels = getVowels(end);
        
        var rhymeHit = !!(lastSuffix && sfx && sfx === lastSuffix);
        var assoHit = !!(lastVowels && endVowels && endVowels.length >= 2 && lastVowels.endsWith(endVowels.slice(-2))); 
        var novelty = cand.ws.filter(function (w) { return !usedWords.has(w); }).length / cand.ws.length;
        
        var score = rand() * (p.fresh / 100) * 2 + novelty + (rhymeHit ? 2.0 : 0) + (assoHit ? 1.5 : 0);
        if (cand.corpse) score += 1.0; // поощряем изысканный труп
        
        if (!best || score > best.score) {
          best = { text: lineText, key: key, ws: cand.ws, chain: cand.chain, hex: cand.hex, rhymeHit: rhymeHit || assoHit, score: score, endVowels: endVowels };
        }
      }
      if (!best) break;

      usedLines.add(best.key);
      best.ws.forEach(function (w) { usedWords.add(w); });
      if (best.chain) fromChain += 1; else fromFrag += 1;
      if (best.hex) fromHex += 1;
      if (best.rhymeHit) rhymed += 1;
      
      lastSuffix = suffix(best.ws[best.ws.length - 1]) || null;
      lastVowels = best.endVowels || null;

      // Применяем Великую Пустоту и УЛИПО сдвиг
      var voidRatio = p.void_level / 100;
      var finalLineText = best.ws.map(function(w) {
        var origWord = w;
        
        // 4. Применяем сдвиг УЛИПО (с вероятностью 15% заменяем слово на соседнее по алфавиту)
        if (rand() < 0.15 && shiftMap.has(w)) {
           origWord = shiftMap.get(w);
        }
        
        origWord = caseFor.get(origWord) || origWord;
        
        // Великая Пустота
        if (voidRatio > 0 && rand() < voidRatio * 0.8) {
          return Array(origWord.length + 1).join(" ");
        }
        return origWord;
      }).join(" ");
      
      finalLineText = finalLineText.replace(/ {4,}/g, "   ");

      // 5. Лексии Барта (Постструктурализм)
      if (rand() > 0.7) {
         var parts = finalLineText.split(" ");
         if (parts.length > 2) {
            var cut = Math.floor(rand() * (parts.length - 1)) + 1;
            parts.splice(cut, 0, (rand() > 0.5 ? "/" : "//"));
            finalLineText = parts.join(" ");
            if (rand() > 0.8) {
               finalLineText = "[ " + finalLineText + " ]";
            }
         }
      }

      // Генеративный клей (Органичный Симбиоз)
      var gluePhrases = (window.CAUGHT_PHRASES && window.CAUGHT_PHRASES.length > 0) ? window.CAUGHT_PHRASES : [];
      if (gluePhrases.length > 0 && rand() > 0.8) {
        var daoPhrase = gluePhrases[Math.floor(rand() * gluePhrases.length)];
        var conjunctions = [
          " словно ", " — и ", " рождает ", " таит в себе ", ", а ", 
          " перетекает в ", " как ", " растворяясь в ", " отражает "
        ];
        var conj = conjunctions[Math.floor(rand() * conjunctions.length)];
        
        if (rand() > 0.5) {
          finalLineText = finalLineText + conj + daoPhrase.toLowerCase().replace(/[.!?;:…]+$/, '');
        } else {
          finalLineText = daoPhrase.replace(/[.!?;:…]+$/, '') + conj + finalLineText.toLowerCase();
        }
      }

      outLines.push({ text: finalLineText, chain: best.chain, hex: best.hex, rhyme: best.rhymeHit });
    }

    var stanzaEvery = Math.max(2, 2 + Math.round(p.breath * 4 / 100));
    var out = [];

    outLines.forEach(function (l, i) {
      if (i && i % stanzaEvery === 0) out.push("");
      out.push(l.text);
    });

    return {
    text: out.join("\n"),
    lines: outLines.map(function (l) { return { text: l.text }; }),
    params: p,
    stats: {
      requestedLines: wanted,
      actualLines: outLines.length,
      fromChain: fromChain,
      fromFragments: fromFrag,
      fromHex: fromHex,
      rhymed: rhymed
    },
    note: outLines.length < wanted
      ? "Слов мало: строк вышло меньше настроенного."
      : (fromHex ? "В строках есть слова стиха гексаграммы. Можно править." : "Собрано только из твоих слов. Можно править.")
  };
}

root.POEM_BOT = { generate: generate, words: words, suffix: suffix };
})(typeof window !== "undefined" ? window : globalThis);
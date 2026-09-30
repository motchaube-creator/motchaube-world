/* entities.js — расщепление стиха на сущности: строки, слова, концепты.
   Без зависимостей: работает и в браузере, и в node (через eval в smoke-тесте). */

(function (root) {
  "use strict";

  var STOP = ("и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между").split(" ");

  var VOWELS = /[аеёиоуыэюяaeiouy]/gi;
  var SONOR = /[лмнрйв]/gi;
  var HUSH = /[жшщчсзц]/gi;
  var HARD = /[пбтдкг]/gi;

  /* слово → [номер квадрата-гексаграммы, имя концепта] */
  var CONCEPTS = {
    дорога: [56, "Путь"], путь: [56, "Путь"], поезд: [56, "Путь"], вечность: [56, "Путь"],
    пусто: [52, "Пустой зал"], пустой: [52, "Пустой зал"], зал: [52, "Пустой зал"],
    тишина: [52, "Тишина"], эхо: [2, "Эхо"],
    солнце: [36, "Закат"], закат: [36, "Закат"], сумерки: [36, "Сумерки"],
    тьма: [36, "Тьма"], ночь: [36, "Ночь"],
    свет: [30, "Свет"], огонь: [30, "Огонь"], лампа: [30, "Свет"],
    вода: [29, "Вода"], море: [29, "Вода"], река: [29, "Вода"], дождь: [29, "Дождь"],
    дно: [29, "Бездна"], экран: [29, "Цифровая тьма"], сеть: [29, "Цифровая тьма"],
    онлайн: [29, "Цифровая тьма"], курсор: [29, "Цифровая тьма"], loading: [29, "Цифровая тьма"],
    гора: [52, "Гора"], камень: [52, "Камень"], холм: [52, "Гора"], пауза: [52, "Пауза"],
    взойти: [46, "Подъём"], выше: [46, "Подъём"], высота: [46, "Подъём"], ступени: [46, "Подъём"],
    увидеть: [20, "Созерцание"], взгляд: [20, "Созерцание"], земли: [2, "Земля"],
    гром: [51, "Гром"], встряска: [51, "Встряска"], страх: [51, "Страх"],
    ветер: [57, "Ветер"], слово: [57, "Слово"], шёпот: [57, "Шёпот"], дыхание: [57, "Дыхание"],
    дом: [37, "Дом"], дома: [37, "Дом"], домой: [37, "Дом"], дому: [37, "Дом"],
    семья: [37, "Семья"], мать: [2, "Мать"], отец: [1, "Отец"],
    родина: [2, "Родина"], тело: [2, "Тело"],
    встреча: [44, "Встреча"], разлука: [38, "Разлука"], расставание: [38, "Разлука"],
    расстояние: [38, "Расстояние"], птица: [53, "Птица"], зверь: [38, "Зверь"],
    любовь: [31, "Притяжение"], притяжение: [31, "Притяжение"], отклик: [31, "Отклик"],
    ожидание: [5, "Ожидание"], ждать: [5, "Ожидание"], доверие: [61, "Доверие"],
    возврат: [24, "Возврат"], возвращение: [24, "Возврат"], память: [24, "Память"],
    начало: [1, "Начало"], конец: [64, "Ещё не конец"], черновик: [64, "Черновик"],
    перемена: [49, "Перемена"], время: [32, "Время"], постоянство: [32, "Постоянство"],
    колодец: [48, "Колодец"], глубина: [48, "Глубина"],
    война: [7, "Войско"], бой: [7, "Войско"], спор: [6, "Спор"], суд: [6, "Тяжба"],
    тигр: [10, "Тигр"], дракон: [1, "Дракон"], гусь: [53, "Гуси"],
    дым: [18, "Порча"], туман: [4, "Мэн"], сон: [4, "Мэн"],
    мера: [60, "Мера"], скромность: [15, "Скромность"], смирение: [15, "Смирение"],
    изобилие: [55, "Изобилие"], полнота: [55, "Полнота"], накопление: [26, "Накопление"],
    молчание: [12, "Молчание"], разрыв: [12, "Разрыв"], застой: [12, "Застой"],

    /* падежи и числа частых образов */
    зала: [52, "Пустой зал"], зале: [52, "Пустой зал"], залы: [52, "Пустой зал"],
    ночи: [36, "Ночь"], ночью: [36, "Ночь"],
    воды: [29, "Вода"], водой: [29, "Вода"], дождя: [29, "Дождь"], дожди: [29, "Дождь"],
    горы: [52, "Гора"], горой: [52, "Гора"],
    земля: [2, "Земля"], землю: [2, "Земля"],
    света: [30, "Свет"], слова: [57, "Слово"], словом: [57, "Слово"],
    песни: [58, "Песня"], голоса: [58, "Голос"], тишины: [52, "Тишина"],
    меры: [60, "Мера"], паузы: [52, "Пауза"], времени: [32, "Время"],
    памяти: [24, "Память"], любви: [31, "Притяжение"], разлуки: [38, "Разлука"],
    встречи: [44, "Встреча"], доверия: [61, "Доверие"], колодца: [48, "Колодец"],
    глубины: [48, "Глубина"], перемены: [49, "Перемена"],
    путём: [56, "Путь"], путях: [56, "Путь"]
  };

  function count(re, s) { var m = s.match(re); return m ? m.length : 0; }

  function syllables(word) { return Math.max(1, count(VOWELS, word)); }

  function element(word) {
    var so = count(SONOR, word), hu = count(HUSH, word), ha = count(HARD, word);
    var max = Math.max(so, hu, ha);
    if (max === 0) return "небо";
    if (max === so) return "вода";
    if (max === hu) return "ветер";
    return "камень";
  }

  function rhymeKey(word) {
    var w = String(word).toLowerCase().replace(/[^а-яёa-z]/g, "");
    return w.length >= 3 ? w.slice(-2) : "";
  }

  function tokens(text) {
    return String(text).toLowerCase().split(/[^а-яёa-z0-9]+/i).filter(function (t) { return t.length > 0; });
  }

  function conceptOf(tok) {
    if (CONCEPTS[tok]) return { key: tok, hit: CONCEPTS[tok] };
    /* совпадение по началу слова — только для ключей от 5 букв,
       чтобы «вышел» не превращался в «выше» */
    for (var i = Math.min(tok.length, 9); i >= 5; i--) {
      var stem = tok.slice(0, i);
      if (CONCEPTS[stem]) return { key: stem, hit: CONCEPTS[stem] };
    }
    return null;
  }

  /* ---------- главный разбор ---------- */

  function analyze(text) {
    var raw = String(text || "").split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });

    var total = raw.length;
    var lines = raw.map(function (l, i) {
      var s = syllables(l);
      var role = i === 0 ? "первопроходец" : (i === total - 1 ? "тень" : "спутник");
      var temp = s < 6 ? "короткая стопа" : (s <= 10 ? "ровная поступь" : "длинный размах");
      var lastWord = tokens(l).slice(-1)[0] || "";
      return {
        text: l, syllables: s, role: role, temperament: temp,
        element: element(l), rhyme: rhymeKey(lastWord)
      };
    });

    var freq = {};
    tokens(text).forEach(function (t) { freq[t] = (freq[t] || 0) + 1; });

    var words = Object.keys(freq).filter(function (w) {
      return w.length >= 3 && STOP.indexOf(w) === -1;
    }).map(function (w) {
      return {
        w: w, hits: freq[w], syllables: syllables(w), element: element(w),
        rare: w.length >= 9 || (freq[w] === 1 && w.length >= 6),
        rhyme: rhymeKey(w), kin: []
      };
    }).sort(function (a, b) {
      return (b.rare - a.rare) || (b.hits - a.hits) || (b.w.length - a.w.length);
    });

    /* рифменная родня: слова с общим окончанием становятся роднёй */
    var byRhyme = {};
    words.forEach(function (e) {
      if (!e.rhyme) return;
      (byRhyme[e.rhyme] = byRhyme[e.rhyme] || []).push(e);
    });
    Object.keys(byRhyme).forEach(function (k) {
      var g = byRhyme[k];
      if (g.length < 2) return;
      g.forEach(function (e) {
        e.kin = g.filter(function (x) { return x !== e; })
                 .map(function (x) { return x.w; });
      });
    });

    /* концепты и авто-подсказка квадрата */
    var acc = {};
    Object.keys(freq).forEach(function (tok) {
      var c = conceptOf(tok);
      if (!c) return;
      var hex = c.hit[0], name = c.hit[1];
      if (!acc[hex]) acc[hex] = { hex: hex, name: name, hits: 0, words: [], order: Object.keys(acc).length };
      acc[hex].hits += freq[tok];
      if (acc[hex].words.indexOf(tok) === -1) acc[hex].words.push(tok);
    });
    var concepts = Object.keys(acc).map(function (k) { return acc[k]; })
      .sort(function (a, b) {
        /* сильнее по числу попаданий; при равенстве — кто встретился в тексте раньше */
        return (b.hits - a.hits) || (a.order - b.order);
      });

    var suggest = 64;
    var why = "образы не опознаны — черновик (未济, «ещё не конец»)";
    if (concepts.length) {
      suggest = concepts[0].hex;
      why = "сильнее всего: " + concepts[0].name + " (" + concepts[0].words.join(", ") + ")";
    }

    var rare = words.filter(function (w) { return w.rare; });

    return {
      lines: lines, words: words, concepts: concepts, suggest: suggest, why: why,
      stats: {
        lines: lines.length,
        words: tokens(text).length,
        unique: words.length,
        syllables: lines.reduce(function (a, l) { return a + l.syllables; }, 0),
        rarest: rare[0] || null,
        kinless: words.filter(function (w) { return w.kin.length > 0; }).length
      }
    };
  }

  root.SPLIT = { analyze: analyze, syllables: syllables, element: element, CONCEPTS: CONCEPTS };

})(typeof window !== "undefined" ? window : globalThis);
(function () {
  "use strict";

  // Алхимическое преобразование текста в зависимости от черты (0-5)
  // 0 - начальная (сокрытая), 1 - вторая (равновесие), 2 - третья (переход/кризис),
  // 3 - четвертая (сомнение), 4 - пятая (апогей), 5 - шестая (угасание)
  
  function mutate(text, hexagramId, lineIndex) {
    if (!text || typeof text !== 'string') return text;
    
    var lines = text.split('\n');
    var result = [];

    lines.forEach(function(line) {
      var s = line.trim();
      if (!s) {
        result.push(s);
        return;
      }
      
      switch (lineIndex) {
        case 0: // 1-я черта: Сокрытость (тишина)
          s = s.toLowerCase().replace(/!/g, '.').replace(/[А-ЯЁ]/g, function(L) { return L.toLowerCase(); });
          break;
          
        case 1: // 2-я черта: Равновесие (баланс)
          // Оставляем как есть, но может добавим симметрию, если строка короткая
          if (s.length < 20 && !s.includes('—')) {
            s = s + " — " + s.split('').reverse().join('');
          }
          break;
          
        case 2: // 3-я черта: Переход / Кризис (рваный ритм)
          var words = s.split(' ');
          if (words.length > 3) {
            var cut = Math.floor(words.length / 2);
            words.splice(cut, 0, '—\n');
            s = words.join(' ');
          }
          s = s.replace(/\./g, '..!');
          break;
          
        case 3: // 4-я черта: Сомнение / Прыжок (неуверенность)
          var parts = s.split(' ');
          for (var i = 1; i < parts.length; i += 2) {
            parts[i] = parts[i] + '...';
          }
          s = parts.join(' ');
          break;
          
        case 4: // 5-я черта: Апогей / Правящая (сила)
          s = s.toUpperCase().replace(/\./g, '!');
          break;
          
        case 5: // 6-я черта: Угасание / Переразвитие (растворение)
          s = s.split('').join(' ').replace(/  /g, '   ');
          break;
          
        default:
          break; // Неизвестная черта - ничего не делаем
      }
      
      result.push(s);
    });

    var finalString = result.join('\n');
    
    // Влияние стихий (Алхимия 2.0)
    if (window.HEXAGRAMS) {
      var hex = window.HEXAGRAMS.find(function(h) { return h.id === hexagramId; });
      if (hex) {
        var u = hex.u, l = hex.l;
        // Огонь (li): выжигает некоторые буквы, превращая их в пепел (точки)
        if (u === 'li' || l === 'li') {
          var arr = finalString.split('');
          for (var i = 0; i < arr.length; i++) {
            if (arr[i] !== '\n' && arr[i] !== ' ' && Math.random() > 0.92) arr[i] = '•';
          }
          finalString = arr.join('');
        }
        // Вода (kan): сглаживает углы, точки превращаются в волны
        if (u === 'kan' || l === 'kan') {
          finalString = finalString.replace(/\./g, '~');
        }
        // Ветер (xun): разносит слова, добавляет случайные отступы
        if (u === 'xun' || l === 'xun') {
          finalString = finalString.replace(/ /g, function() { return Math.random() > 0.7 ? "   " : " "; });
        }
      }
    }

    return finalString;
  }

  window.MUTATION = {
    apply: mutate
  };
})();

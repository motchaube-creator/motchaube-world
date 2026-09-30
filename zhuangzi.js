(function () {
  "use strict";

  // Птица Пэн, Рыба Кунь, Бабочка, Богомол, Черепаха, Цикада, Сороконожка, Горлица, Водяной буйвол
  var animals = ['🦅', '🐋', '🦋', '🦗', '🐢', '🪲', '🐛', '🕊️', '🐃'];
  
  // 8 Бессмертных Пьяниц (Даосская поэзия, стиль легкого цигуна и Великой Пустоты)
  var phrases = [
    "тень птицы на пустом снегу",
    "одна луна в тысяче рек",
    "безмолвие осеннего неба",
    "прозрачный след на воде",
    "вкус непролитого вина",
    "глубина безымянного",
    "лишь эхо в пустом ущелье",
    "облачный странник",
    "туман над нефритовой горой",
    "пустая чаша",
    "ветер в соснах",
    "холодный пепел",
    "забытый иероглиф",
    "безбрежное небытие",
    "пылинка в солнечном луче",
    "бесследный путь",
    "опавший лист",
    "одинокое облако",
    "отсутствие формы",
    "дыхание пустоты",
    "простор без границ",
    "безмятежность",
    "сон бабочки",
    "истинное ничто",
    "отблеск на лезвии меча",
    "горсть весенней пыли",
    "чистое зеркало вод",
    "неподвижный колокол",
    "ветер пьёт пустоту",
    "ци течёт без усилия",
    "забыв себя, танцую с тенью",
    "хмельной бессмертный ловит луну",
    "вдох равен выдоху небес",
    "опираюсь на ветер",
    "шаг в небытие",
    "пустая лодка скользит по волнам",
    "небосвод в чаше вина",
    "тысяча ли одним вздохом",
    "сон бабочки на дне кувшина",
    "мягкость воды точит камень",
    "созерцаю покой в движении",
    "недеяние вершит всё",
    "отпускаю мысли в облака",
    "пьющий туман не знает жажды"
  ];

  function generatePhrase() {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  function isAnyWindowOpen() {
    var s = document.getElementById("sandboxModal");
    var p = document.getElementById("panel");
    return (s && !s.hidden) || (p && !p.hidden);
  }

  var style = document.createElement("style");
  style.textContent = `
    .zhuangzi-animal {
      position: fixed;
      font-size: 26px;
      cursor: pointer;
      user-select: none;
      z-index: 9999;
      opacity: 0.35;
      filter: grayscale(1) contrast(5) brightness(0); /* Полностью черные, как тушь */
    }
    
    /* Обычные летающие животные */
    .zhuangzi-fly {
      animation: floatAnimal linear infinite;
    }
    @keyframes floatAnimal {
      0% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(40px, -60px) rotate(15deg); }
      50% { transform: translate(10px, -120px) rotate(0deg); }
      75% { transform: translate(-30px, -60px) rotate(-15deg); }
      100% { transform: translate(0, 0) rotate(0deg); }
    }
    
    /* Идут горизонтально (бык, гусеница) */
    .zhuangzi-walk {
      animation: walkAnimal linear infinite;
    }
    @keyframes walkAnimal {
      0% { transform: translateX(0); }
      100% { transform: translateX(120vw); }
    }
    
    /* След для идущих горизонтально */
    .zhuangzi-trail {
      position: fixed;
      font-size: 10px;
      color: rgba(var(--ink-rgb, 50,50,50), 0.2);
      pointer-events: none;
      z-index: 9998;
      animation: fadeTrail 4s forwards;
    }
    @keyframes fadeTrail {
      0% { opacity: 0.4; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.5); }
    }
  `;
  document.head.appendChild(style);

  function spawnAnimal() {
    var el = document.createElement("div");
    el.className = "zhuangzi-animal";
    
    var animal = animals[Math.floor(Math.random() * animals.length)];
    el.textContent = animal;
    
    var isWalker = (animal === '🐃' || animal === '🐛' || animal === '🐢');
    el.classList.add(isWalker ? "zhuangzi-walk" : "zhuangzi-fly");
    
    // Гигантские размеры для Кита и Быка
    if (animal === '🐋' || animal === '🐃') {
      el.style.fontSize = "54px";
      el.style.opacity = "0.2";
    }
    
    // Случайная позиция
    if (isWalker) {
      el.style.left = "-10vw";
      el.style.top = (Math.random() * 80 + 10) + "vh";
    } else {
      el.style.left = (Math.random() * 90 + 5) + "vw";
      el.style.top = (Math.random() * 90 + 5) + "vh";
    }
    
    el.style.animationDelay = "-" + (Math.random() * 40) + "s";
    el.style.animationDuration = (40 + Math.random() * 40) + "s"; // Очень медленные
    
    // Оставляем след для ходячих
    if (isWalker) {
      setInterval(function() {
        if (!el.parentNode || el.style.opacity === "0") return;
        var rect = el.getBoundingClientRect();
        if (rect.left < 0 || rect.left > window.innerWidth) return;
        
        var trail = document.createElement("div");
        trail.className = "zhuangzi-trail";
        trail.textContent = "•";
        trail.style.left = (rect.left + rect.width / 2) + "px";
        trail.style.top = (rect.top + rect.height) + "px";
        document.body.appendChild(trail);
        setTimeout(function() { if (trail.parentNode) trail.remove(); }, 4000);
      }, 1000);
    }
    
    el.addEventListener("click", function (e) {
      if (!isAnyWindowOpen()) return; // Кликабельны только при открытых окнах
      
      if (window.SOUNDS && window.SOUNDS.playDrop) window.SOUNDS.playDrop();
      
      var phrase = generatePhrase();
      var botInput = document.getElementById("botInput");
      var poemText = document.getElementById("poemText");
      var targetInput = null;
      
      if (botInput && !document.getElementById("sandboxModal").hidden) {
        targetInput = botInput;
      } else if (poemText && !document.getElementById("publish").hidden) {
        targetInput = poemText;
      }
      
      if (targetInput) {
        var phraseSuffix = (function(str) {
          var w = str.trim().toLowerCase().replace(/[ъь.?!,;:]+$/g, "");
          return w.length >= 2 ? w.slice(-2) : w;
        })(phrase);

        var text = targetInput.value.trim();
        if (!text) {
          targetInput.value = phrase;
        } else {
          var lines = text.split('\n');
          var inserted = false;
          
          // 1. Поиск рифмы (по последним 2 буквам)
          for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            if (l.length > 0) {
              var lSuffix = l.toLowerCase().replace(/[ъь.?!,;:]+$/g, "");
              lSuffix = lSuffix.length >= 2 ? lSuffix.slice(-2) : lSuffix;
              if (lSuffix === phraseSuffix) {
                // Нашли рифму! Вставляем сразу после этой строки
                lines.splice(i + 1, 0, phrase);
                inserted = true;
                break;
              }
            }
          }
          
          // 2. Если рифмы нет, ритмично вплетаем в середину (если строк много)
          if (!inserted) {
            if (lines.length > 2 && Math.random() > 0.4) {
              var pos = 1 + Math.floor(Math.random() * (lines.length - 1));
              lines.splice(pos, 0, phrase);
            } else {
              // Иначе добавляем в конец с отступом
              lines.push("");
              lines.push(phrase);
            }
          }
          targetInput.value = lines.join('\n');
        }
        targetInput.dispatchEvent(new Event("input"));
        
        // Сохраняем фразу глобально для бота (как "клей")
        window.CAUGHT_PHRASES = window.CAUGHT_PHRASES || [];
        window.CAUGHT_PHRASES.push(phrase);
      }
      
      // Визуальный фидбек: вылетающее слово
      var feedback = document.createElement("div");
      feedback.textContent = phrase;
      feedback.style.position = "fixed";
      feedback.style.left = e.clientX + "px";
      feedback.style.top = (e.clientY - 20) + "px";
      feedback.style.fontSize = "22px";
      feedback.style.fontFamily = "'Kelly Slab', 'JetBrains Mono', monospace";
      feedback.style.textTransform = "uppercase";
      feedback.style.color = "var(--seal, #8e2f22)";
      feedback.style.pointerEvents = "none";
      feedback.style.zIndex = "10000";
      feedback.style.transition = "all 1.5s ease-out";
      feedback.style.opacity = "1";
      feedback.style.textShadow = "0 2px 10px rgba(0,0,0,0.1)";
      document.body.appendChild(feedback);
      
      requestAnimationFrame(function() {
        feedback.style.transform = "translate(" + (Math.random() * 40 - 20) + "px, -80px)";
        feedback.style.opacity = "0";
      });
      
      setTimeout(function () { feedback.remove(); }, 1500);
    });

    document.body.appendChild(el);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Делаем появление существ реже (меньше штук)
    for (var i = 0; i < 4; i++) {
      spawnAnimal();
    }
  });

})();

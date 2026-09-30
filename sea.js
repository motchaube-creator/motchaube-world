/* sea.js — простой 3D-фон: тушь и 石青 (азурит) волнами в перспективе.
   Рисует сетку волн горизонт→берег: линии сходятся к горизонту, к берегу расходятся и толстеют.
   Уважает prefers-reduced-motion и переключатель «без левитации» (body.flat) — тогда один статичный кадр. */

(function () {
  "use strict";

  var AZURE = [63, 109, 140];    /* 石青 */
  var CELADON = [95, 143, 128];  /* 青碧 */

  var cv = null, ctx = null, raf = null, t = 0, dpr = 1, running = false;
  var mouseX = -1000, mouseY = -1000, targetMouseX = -1000, targetMouseY = -1000;

  function reduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paused() {
    return reduced() || document.body.classList.contains("flat");
  }

  function resize() {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth || window.innerWidth;
    var h = cv.clientHeight || Math.round(window.innerHeight * 0.46);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }

  function scrollY() {
    return window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
  }

  function frame() {
    if (!cv || !ctx) return;
    var w = cv.width / dpr, h = cv.height / dpr;
    var scroll = scrollY();

    /* параллакс: слой моря уезжает медленнее контента, но двигается вместе с прокруткой */
    var par = Math.min(scroll * 0.18, 260);
    var tilt = Math.sin(scroll * 0.0012) * 0.012;          /* лёгкий крен, как будто смотришь под углом */

    // Вертикальное путешествие по длинному свитку (фон)
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, scroll / maxScroll)); // 0 to 1
    
    // Сдвигаем фон: от 0% (небо) до 100% (волны)
    document.body.style.backgroundPositionY = (p * 100) + "%";
    
    var overlay = document.getElementById("timeOverlay");
    if (overlay) {
      overlay.style.background = 'transparent';
      overlay.style.mixBlendMode = 'normal';
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2 - par * 0.32);
    ctx.rotate(tilt);
    ctx.translate(-w / 2, -h / 2);

    var rows = 15, cols = 44;
    var horizon = h * 0.16 + par * 0.08;
    var phase = t + scroll * 0.0022;                      /* прокрутка подкручивает зыбь */

    for (var j = 0; j < rows; j++) {
      var p = j / (rows - 1);                                  /* 0 — горизонт, 1 — берег */
      var depth = Math.pow(p, 1.7);
      var y = horizon + depth * (h - horizon) * 0.94;
      var scale = 0.1 + Math.pow(p, 1.45) * 1.7;               /* ближе — крупнее волна */
      var alpha = 0.05 + p * 0.3;
      var span = w * (0.5 + p * 0.95);                         /* ширина: к берегу шире */
      var left = (w - span) / 2;
      /* дальние ряды сдвигаются от прокрутки сильнее — эффект глубины */
      var drift = Math.sin(scroll * 0.0016 + j * 0.4) * 26 * (1.15 - p);

      ctx.beginPath();
      for (var i = 0; i <= cols; i++) {
        var x = left + (i / cols) * span + drift;
        var swell = Math.sin(i * 0.34 * scale + phase * (0.55 + p) + j * 0.85) * 7.5 * scale
                  + Math.sin(i * 0.1 + phase * 0.3 + j * 1.6) * 4.5 * scale;
        var yy = y + swell;
        
        // Взаимодействие с мышью (круговые расхождения на воде)
        if (mouseX > -1000) {
          var dx = x - mouseX;
          var dy = yy - mouseY + (par * 0.32); // Компенсация параллакса
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            var force = Math.pow((180 - dist) / 180, 1.5);
            swell -= Math.cos(dist * 0.08 - t * 4) * 20 * force * scale;
          }
        }
        
        yy = y + swell;
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      
      // Чтобы море было объемным, заливаем пространство под линией волны
      ctx.lineTo(w + 100, h + 100);
      ctx.lineTo(-100, h + 100);
      ctx.closePath();

      var c = p > 0.62 ? CELADON : AZURE;
      // Полупрозрачная заливка (объем)
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 0.6).toFixed(3) + ")";
      ctx.fill();
      
      // Яркий гребень волны (линия)
      ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (alpha * 1.2).toFixed(3) + ")";
      ctx.lineWidth = Math.max(1, scale * 2.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  function tick() {
    t += 0.016;
    if (targetMouseX > -1000) {
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;
    }
    frame();
    raf = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    if (paused()) { frame(); return; }
    running = true;
    tick();
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = null;
  }

  function refresh() {
    stop();
    resize();
    start();
  }

  function init() {
    cv = document.getElementById("sea");
    if (!cv || !cv.getContext) return;
    ctx = cv.getContext("2d");
    resize();
    start();

    window.addEventListener("resize", refresh);
    window.addEventListener("mousemove", function(e) {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (mouseX === -1000) { mouseX = targetMouseX; mouseY = targetMouseY; }
    }, { passive: true });

    /* прокрутка: пока слой анимируется, кадры и так идут; при паузе — перерисовываем на скролле */
    var queued = false;
    window.addEventListener("scroll", function () {
      if (!paused()) return;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; frame(); });
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else refresh();
    });
    var flat = document.getElementById("flat");
    if (flat) flat.addEventListener("change", refresh);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.SEA = { refresh: refresh };
})();
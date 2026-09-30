(function() {
  "use strict";
  
  var ctx = null;
  function initAudio() {
    if (!ctx) {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) ctx = new AudioContext();
    }
  }

  // Глубокий звук поющей чаши (при работе с компасом и сохранении в свод)
  function playBowl() {
    if (!ctx) initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    
    // Базовая частота 216Hz или 432Hz (природные гармоники)
    var freq = Math.random() > 0.5 ? 216 : 432;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq - 4, ctx.currentTime + 3);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 4.5);
  }

  // Звук падающей капли воды (при клике на летающее существо)
  function playDrop() {
    if (!ctx) initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    
    osc.frequency.setValueAtTime(500 + Math.random() * 200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 300, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  // Нужно разрешить аудио по первому клику на странице
  document.addEventListener("click", function() {
    if (!ctx) initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }, { once: true });

  window.SOUNDS = {
    playBowl: playBowl,
    playDrop: playDrop
  };
})();

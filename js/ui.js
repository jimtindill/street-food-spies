/* ===========================================================================
   UI — tiny view toolkit used by the engine.
   DOM builder, Web Audio sound effects (synthesised, no files = fully offline),
   haptics, typewriter, toast, celebration sparks, camera capture.
   Exposes window.SFS.UI
   =========================================================================== */
(function () {
  window.SFS = window.SFS || {};

  /* ---------- DOM builder: el('div', {class:'x'}, child, child...) ---------- */
  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k === "dataset") { for (var d in v) node.dataset[d] = v[d]; }
        else if (k.slice(0, 2) === "on" && typeof v === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== null && v !== undefined && v !== false) {
          node.setAttribute(k, v);
        }
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) { c.forEach(function (x) { if (x) node.appendChild(typeof x === "string" ? document.createTextNode(x) : x); }); }
      else node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  /* ---------- Mount a screen into #app with a fresh fade ---------- */
  function mount(node) {
    var app = document.getElementById("app");
    app.innerHTML = "";
    var wrap = el("div", { class: "screen" });
    wrap.appendChild(node);
    app.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  /* ---------- Sound (Web Audio, lazy, unlocked on first gesture) ---------- */
  var actx = null;
  var muted = false;
  function ensureAudio() {
    if (muted) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  function tone(freq, dur, type, when, gain) {
    var ax = ensureAudio(); if (!ax) return;
    var t0 = ax.currentTime + (when || 0);
    var osc = ax.createOscillator();
    var g = ax.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(ax.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  var sound = {
    click: function () { tone(420, 0.06, "square", 0, 0.08); },
    type:  function () { tone(900, 0.02, "square", 0, 0.04); },
    success: function () { tone(523, 0.12, "triangle"); tone(659, 0.12, "triangle", 0.10); tone(784, 0.2, "triangle", 0.20); },
    fail:  function () { tone(200, 0.18, "sawtooth", 0, 0.12); tone(150, 0.22, "sawtooth", 0.08, 0.12); },
    reveal:function () { tone(392,0.15,"triangle"); tone(523,0.15,"triangle",0.12); tone(659,0.15,"triangle",0.24); tone(880,0.4,"triangle",0.36); },
    win:   function () { [523,587,659,784,880,1047].forEach(function(f,i){ tone(f,0.28,"triangle",i*0.12,0.16); }); },
    stamp: function () { tone(120,0.08,"square",0,0.25); },
  };
  function setMuted(m) { muted = m; }

  /* ---------- Haptics (Android; iOS Safari ignores, that's fine) ---------- */
  function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

  /* ---------- Typewriter effect; returns a Promise ---------- */
  function typewriter(node, text, speed) {
    return new Promise(function (resolve) {
      node.textContent = "";
      var cur = el("span", { class: "cursor" }, "▋");
      node.appendChild(cur);
      var i = 0;
      var step = speed || 14;
      var timer = setInterval(function () {
        if (i >= text.length) {
          clearInterval(timer);
          cur.remove();
          resolve();
          return;
        }
        var ch = text.charAt(i++);
        cur.insertAdjacentText("beforebegin", ch);
        if (ch !== "\n" && ch !== " " && i % 2 === 0) sound.type();
      }, step);
      // tap to skip
      node.addEventListener("click", function skip() {
        clearInterval(timer);
        node.textContent = text;
        resolve();
      }, { once: true });
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, ms || 2200);
  }

  /* ---------- Celebration sparks ---------- */
  function celebrate() {
    var emojis = ["✨", "🎉", "⭐", "🌟", "🎊"];
    for (var i = 0; i < 16; i++) {
      (function (i) {
        var s = el("span", { class: "spark" }, emojis[i % emojis.length]);
        s.style.left = (10 + Math.random() * 80) + "vw";
        s.style.top = (40 + Math.random() * 30) + "vh";
        s.style.animationDelay = (Math.random() * 0.3) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1300);
      })(i);
    }
  }

  /* ---------- Camera capture -> downscaled dataURL ----------
     Uses a hidden <input type=file accept=image/* capture> which opens the
     camera on phones (and the file picker on desktop). Image is downscaled so
     IndexedDB stays small. Resolves dataUrl or null if cancelled. */
  function capturePhoto() {
    return new Promise(function (resolve) {
      var input = el("input", { type: "file", accept: "image/*", capture: "environment", class: "cam-input" });
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        input.remove();
        if (!file) { resolve(null); return; }
        var reader = new FileReader();
        reader.onload = function () { downscale(reader.result, 1000, 0.8).then(resolve).catch(function(){ resolve(reader.result); }); };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  function downscale(dataUrl, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = el("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        try { resolve(canvas.toDataURL("image/jpeg", quality || 0.8)); }
        catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  window.SFS.UI = {
    el: el,
    mount: mount,
    sound: sound,
    setMuted: setMuted,
    vibrate: vibrate,
    typewriter: typewriter,
    toast: toast,
    celebrate: celebrate,
    capturePhoto: capturePhoto,
  };
})();

/* ===========================================================================
   ENGINE — game state machine + all screen rendering.
   Reads content from SFS.CONTENT, uses SFS.UI / SFS.Store / SFS.Geo.
   =========================================================================== */
(function () {
  window.SFS = window.SFS || {};
  var C, UI, el, Store, Geo;
  var state, steps;

  // transient per-navigation UI state (reset on every render())
  var hintLevel = 0, kidActive = false, decoderShift = 0;
  var lastPhotos = {}; // taskKey -> dataUrl (so a just-taken photo shows instantly)

  /* ----------------------------- INIT ----------------------------- */
  function init() {
    C = window.SFS.CONTENT; UI = window.SFS.UI; el = UI.el;
    Store = window.SFS.Store; Geo = window.SFS.Geo;
    state = Store.load();
    steps = buildSteps();

    // HUD + drawer wiring
    document.getElementById("hud-menu").addEventListener("click", openDrawer);
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("drawer-reset").addEventListener("click", confirmReset);
    document.getElementById("drawer-skip").addEventListener("click", function () { closeDrawer(); skipStep(); });
    document.getElementById("drawer-map").addEventListener("click", openMapsForCurrent);
    document.getElementById("drawer").addEventListener("click", function (e) {
      if (e.target.id === "drawer") closeDrawer();
    });

    render();
  }

  function buildSteps() {
    var s = [{ kind: "intro" }];
    C.stops.forEach(function (stop, i) {
      s.push({ kind: "briefing", stop: i });
      s.push({ kind: "puzzle", stop: i, role: "location" });
      s.push({ kind: "reveal", stop: i, role: "location" });
      s.push({ kind: "travel", stop: i });
      s.push({ kind: "arrive", stop: i });
      s.push({ kind: "field", stop: i });
      s.push({ kind: "puzzle", stop: i, role: "key" });
      s.push({ kind: "reveal", stop: i, role: "key" });
      if (stop.cliffhanger) s.push({ kind: "cliffhanger", stop: i });
    });
    s.push({ kind: "finale" });
    s.push({ kind: "dossier" });
    return s;
  }

  /* ----------------------------- NAV ----------------------------- */
  function cur() { return steps[Math.min(state.stepIndex, steps.length - 1)]; }
  function curStop() { var st = cur(); return st.stop != null ? C.stops[st.stop] : null; }

  function next() {
    if (state.stepIndex < steps.length - 1) state.stepIndex++;
    persist();
    render();
  }
  function skipStep() {
    var st = cur();
    if (st.kind === "puzzle") state.assists++;
    next();
  }
  function persist() { Store.save(state); }

  function render() {
    hintLevel = 0; kidActive = false; decoderShift = 0;
    var st = cur();
    document.getElementById("hud").classList.toggle("hidden", st.kind === "intro");
    updateHUD();
    switch (st.kind) {
      case "intro": return renderIntro();
      case "briefing": return renderBriefing(C.stops[st.stop]);
      case "puzzle": return renderPuzzle(C.stops[st.stop], st.role);
      case "reveal": return renderReveal(C.stops[st.stop], st.role);
      case "travel": return renderTravel(C.stops[st.stop]);
      case "arrive": return renderArrive(C.stops[st.stop]);
      case "field": return renderField(C.stops[st.stop]);
      case "cliffhanger": return renderCliffhanger(C.stops[st.stop]);
      case "finale": return renderFinale();
      case "dossier": return renderDossier();
    }
  }

  /* ----------------------------- HUD ----------------------------- */
  function tasteEmoji(taste) {
    for (var i = 0; i < C.stops.length; i++) if (C.stops[i].keyTaste === taste) return C.stops[i].keyEmoji;
    return "🔑";
  }
  function updateHUD() {
    document.getElementById("hud-rank-name").textContent = C.ranks[Math.min(state.keys.length, C.ranks.length - 1)];
    document.getElementById("hud-points").textContent = state.points;
    var box = document.getElementById("hud-keys");
    box.innerHTML = "";
    C.stops.forEach(function (stop) {
      var on = state.keys.indexOf(stop.keyTaste) !== -1;
      box.appendChild(el("div", { class: "hud-key" + (on ? " on" : "") }, on ? stop.keyEmoji : "?"));
    });
  }

  /* ----------------------------- DRAWER ----------------------------- */
  function openDrawer() {
    UI.sound.click();
    var meta = document.getElementById("drawer-meta");
    meta.textContent = "Mission " + missionLabel() + " • " + state.points + " pts • saved automatically";
    document.getElementById("drawer-map").classList.toggle("hidden", !curStop());
    document.getElementById("drawer").classList.remove("hidden");
  }
  function closeDrawer() { document.getElementById("drawer").classList.add("hidden"); }
  function confirmReset() {
    if (!confirm("Abort the mission and wipe all progress and photos? This can't be undone.")) return;
    Store.resetAll(function () {
      state = Store.load();
      closeDrawer();
      render();
      UI.toast("Mission wiped. Fresh start, Agent.");
    });
  }
  function openMapsForCurrent() {
    var stop = curStop(); if (!stop) return;
    window.open(Geo.mapsUrl(stop.coords, stop.realName), "_blank");
  }

  function missionLabel() {
    var st = cur();
    if (st.stop == null) return "—";
    return (st.stop + 1) + "/" + C.stops.length;
  }

  /* ----------------------------- SCREENS ----------------------------- */

  function stopHeader(stop, label) {
    return el("div", null,
      el("div", { class: "eyebrow" }, "MISSION " + missionLabel() + " — " + stop.codename),
      el("h1", { class: "title" }, label)
    );
  }

  function bigBtn(label, onClick, cls) {
    return el("button", { class: "btn " + (cls || ""), onClick: function () { UI.sound.click(); UI.vibrate(8); onClick(); } }, label);
  }

  /* ---------- Intro / recruitment ---------- */
  function renderIntro() {
    var t = el("div", { class: "transmission" });
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "TOP SECRET"),
      el("div", { class: "splash-logo" }, C.agency.name),
      el("div", { class: "splash-sub" }, C.agency.full),
      el("div", { class: "spacer" }),
      t
    );
    var afterBox = el("div");
    var screen = el("div", null, card, afterBox);
    UI.mount(screen);

    UI.typewriter(t, C.intro.transmission, 12).then(function () {
      var team = el("input", { class: "input", placeholder: C.intro.teamPlaceholder, value: state.names.team || "" });
      var agents = el("textarea", { class: "input", rows: "3", placeholder: C.intro.agentPlaceholder, style: "resize:none;font-family:var(--sans);text-align:left;letter-spacing:normal;" });
      agents.value = (state.names.agents || []).join("\n");
      var form = el("div", { class: "card" },
        el("div", { class: "field" }, el("label", null, C.intro.teamPrompt), team),
        el("div", { class: "field" }, el("label", null, C.intro.agentPrompt), agents),
        bigBtn(C.intro.cta, function () {
          state.names.team = team.value.trim() || "The Agents";
          state.names.agents = agents.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
          if (!state.names.agents.length) state.names.agents = ["Agent 1"];
          state.started = true;
          UI.sound.reveal(); UI.vibrate([10, 40, 10]);
          next();
        })
      );
      afterBox.appendChild(form);
      var fc = afterBox.querySelector(".card");
      if (fc && fc.scrollIntoView) fc.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---------- Briefing ---------- */
  function renderBriefing(stop) {
    var t = el("div", { class: "transmission" });
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "BRIEFING"),
      stopHeader(stop, stop.codename),
      el("div", { class: "spacer" }),
      t
    );
    var btnBox = el("div");
    UI.mount(el("div", null, card, btnBox));
    UI.typewriter(t, "Agent " + firstAgent() + " —\n\n" + stop.briefing, 10).then(function () {
      btnBox.appendChild(bigBtn("Decode the drop location ▸", next));
    });
  }
  function firstAgent() { return (state.names.agents && state.names.agents[0]) || "Agent"; }

  /* ---------- Puzzle (location or key) ---------- */
  function renderPuzzle(stop, role) {
    var base = role === "location" ? stop.locationPuzzle : stop.keyPuzzle;
    var p = (kidActive && base.kidMode) ? base.kidMode : base;
    var title = role === "location" ? "DECODE THE DROP" : "CRACK THE FLAVOUR LOCK";

    var body = el("div");
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, role === "location" ? "ENCRYPTED" : "FINAL LOCK"),
      stopHeader(stop, title),
      el("p", { class: "lede" }, p.prompt),
      body
    );

    // Puzzle-type-specific body
    if (p.type === "cipher") body.appendChild(renderCipher(p, role));
    else if (p.type === "anagram" || p.type === "code") body.appendChild(renderTextInput(p, role));
    else if (p.type === "multipleChoice") body.appendChild(renderChoices(p, role));
    else if (p.type === "pictureMatch") body.appendChild(renderPictureMatch(p, role));

    // Hints
    var hintBox = el("div", { class: "hints" });
    var hintBtn = bigBtn("Need a hint, Agent?", function () { showNextHint(p, hintBox, hintBtn, role); }, "btn-secondary");
    card.appendChild(hintBtn);
    card.appendChild(hintBox);

    // Kid mode toggle
    if (base.kidMode) {
      var kidLabel = kidActive ? "↩︎ Back to Agent mode" : "👦 Junior Agent mode (easier)";
      card.appendChild(el("button", { class: "kid-toggle", onClick: function () { UI.sound.click(); kidActive = !kidActive; renderPuzzle(stop, role); } }, kidLabel));
    }

    UI.mount(card);
  }

  function solvePuzzle(role, assisted) {
    if (assisted) state.assists++;
    state.points += assisted ? 5 : 25;
    UI.sound.success(); UI.vibrate([10, 30, 10]);
    persist(); updateHUD();
    setTimeout(next, 450);
  }
  function failPuzzle(node) {
    UI.sound.fail(); UI.vibrate([40, 30, 40]);
    UI.toast("Not quite, Agent. Try again.");
    if (node) { node.classList.add("wrong"); setTimeout(function () { node.classList.remove("wrong"); }, 450); }
  }

  function norm(s) { return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  function renderTextInput(p, role) {
    var input = el("input", { class: "input", placeholder: p.scrambled ? "Unscramble: " + p.scrambled : "Type your answer", autocomplete: "off", autocapitalize: "characters" });
    var wrap = el("div", null,
      p.scrambled ? el("div", { class: "decoder-out" }, p.scrambled) : null,
      el("div", { class: "field" }, input),
      bigBtn("Submit ▸", function () {
        if (norm(input.value) === norm(p.answer)) solvePuzzle(role, false);
        else failPuzzle(input);
      })
    );
    return wrap;
  }

  function renderCipher(p, role) {
    var out = el("div", { class: "decoder-out" }, p.ciphertext);
    var shiftSpan = el("span", { class: "shiftnum" }, "0");
    var slider = el("input", { type: "range", min: "0", max: "25", value: "0" });
    slider.addEventListener("input", function () {
      decoderShift = parseInt(slider.value, 10);
      shiftSpan.textContent = decoderShift;
      out.textContent = caesar(p.ciphertext, -decoderShift);
      UI.sound.type();
    });
    var decoder = el("div", { class: "decoder" },
      el("div", { class: "muted small mono" }, "DECODER RING — ciphertext: " + p.ciphertext),
      out,
      el("div", { class: "muted small" }, "shift back by ", shiftSpan),
      slider
    );
    var input = el("input", { class: "input", placeholder: "Type the decoded word", autocomplete: "off", autocapitalize: "characters" });
    return el("div", null,
      decoder,
      el("div", { class: "field" }, el("label", null, "Decoded location"), input),
      bigBtn("Submit ▸", function () {
        if (norm(input.value) === norm(p.answer)) solvePuzzle(role, false);
        else failPuzzle(input);
      })
    );
  }
  function caesar(text, shift) {
    return text.replace(/[A-Za-z]/g, function (ch) {
      var base = ch <= "Z" ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base + (shift % 26) + 26) % 26) + base);
    });
  }

  function renderChoices(p, role) {
    var box = el("div", { class: "choices" });
    p.choices.forEach(function (ch) {
      var btn = el("button", { class: "choice" },
        el("span", { class: "pick" }),
        el("span", null, ch.label)
      );
      btn.addEventListener("click", function () {
        UI.sound.click();
        if (ch.id === p.answer) { btn.classList.add("correct"); solvePuzzle(role, false); }
        else { btn.classList.add("wrong"); failPuzzle(); setTimeout(function () { btn.classList.remove("wrong"); }, 450); }
      });
      box.appendChild(btn);
    });
    return box;
  }

  function renderPictureMatch(p, role) {
    var grid = el("div", { class: "emoji-grid" });
    p.tiles.forEach(function (emo) {
      var tile = el("button", { class: "emoji-tile" }, emo);
      tile.addEventListener("click", function () {
        UI.sound.click();
        if (emo === p.answer) { tile.classList.add("correct"); solvePuzzle(role, kidActive); }
        else { tile.classList.add("wrong"); failPuzzle(); setTimeout(function () { tile.classList.remove("wrong"); }, 450); }
      });
      grid.appendChild(tile);
    });
    return grid;
  }

  function showNextHint(p, hintBox, hintBtn, role) {
    UI.sound.click();
    var hints = p.hints || [];
    if (hintLevel < hints.length) {
      hintBox.appendChild(el("div", { class: "hint" }, "🔎 " + hints[hintLevel]));
      hintLevel++;
    }
    if (hintLevel >= hints.length) {
      hintBtn.textContent = "Reveal the answer";
      hintBtn.onclick = function () { UI.sound.click(); solvePuzzle(role, true); };
    }
  }

  /* ---------- Reveal (location map OR flavour key) ---------- */
  function renderReveal(stop, role) {
    if (role === "location") return renderLocationReveal(stop);
    return renderKeyReveal(stop);
  }

  function renderLocationReveal(stop) {
    var r = stop.locationReveal;
    var card = el("div", { class: "card center" },
      el("div", { class: "dossier-tab" }, "DECRYPTED"),
      el("div", { class: "eyebrow" }, "TARGET ACQUIRED"),
      el("h1", { class: "title" }, r.title),
      el("p", { class: "lede" }, r.text),
      dossierMap(stop.realName),
      el("div", { class: "btn-row" },
        el("a", { class: "btn btn-secondary", href: Geo.mapsUrl(stop.coords, stop.realName), target: "_blank", rel: "noopener", style: "text-decoration:none;display:block;" }, "🗺️ Open in Maps"),
        el("button", { class: "btn", onClick: function () { UI.sound.click(); next(); } }, "We're heading there ▸")
      )
    );
    UI.sound.reveal();
    UI.mount(card);
  }

  function dossierMap(label) {
    var svg =
      '<svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="400" height="230" fill="#0c0f14"/>' +
      '<g stroke="#1f2a36" stroke-width="6" fill="none">' +
      '<path d="M-10 60 H410"/><path d="M-10 150 H410"/><path d="M80 -10 V240"/><path d="M210 -10 V240"/><path d="M320 -10 V240"/>' +
      '</g>' +
      '<path d="M-10 200 C 80 160, 140 230, 220 190 S 360 150, 410 185" stroke="#1c3a52" stroke-width="12" fill="none" opacity="0.8"/>' +
      '<g stroke="#13202b" stroke-width="2" fill="none" opacity="0.6">' +
      '<path d="M0 30 H400"/><path d="M0 110 H400"/><path d="M0 190 H400"/><path d="M140 0 V230"/><path d="M270 0 V230"/></g>' +
      '<g transform="translate(200,108)">' +
      '<circle r="34" fill="#e8b04b" opacity="0.18"><animate attributeName="r" values="20;40;20" dur="2.2s" repeatCount="indefinite"/></circle>' +
      '<path d="M0 6 C -16 -14, -16 -30, 0 -30 C 16 -30, 16 -14, 0 6 Z" fill="#e5484d"/>' +
      '<circle cx="0" cy="-20" r="6" fill="#0c0f14"/>' +
      '</g></svg>';
    return el("div", { class: "map-card" },
      el("div", { html: svg }),
      el("div", { class: "pin-label" }, "📍 " + label)
    );
  }

  function renderKeyReveal(stop) {
    // Award once (idempotent on refresh / re-entry)
    if (state.keys.indexOf(stop.keyTaste) === -1) {
      state.keys.push(stop.keyTaste);
      state.points += 100;
      persist();
    }
    updateHUD();
    var r = stop.keyReveal;
    var newRank = C.ranks[Math.min(state.keys.length, C.ranks.length - 1)];
    var card = el("div", { class: "card key-reveal" },
      el("div", { class: "stamp" }, "RECOVERED"),
      el("div", { class: "key-badge" }, stop.keyEmoji),
      el("div", { class: "eyebrow" }, "FLAVOUR KEY " + state.keys.length + " / " + C.stops.length),
      el("h1", { class: "title" }, r.title),
      el("p", { class: "lede" }, r.text),
      el("div", { class: "rankup" }, "▲ RANK UP: " + newRank),
      bigBtn(stop.cliffhanger ? "Follow the trail ▸" : "Confront Baron Bland ▸", next)
    );
    UI.sound.reveal(); UI.vibrate([10, 40, 10, 40, 10]); UI.celebrate();
    UI.mount(card);
  }

  /* ---------- Travel missions ---------- */
  function renderTravel(stop) {
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "IN TRANSIT" ),
      stopHeader(stop, "Travel undercover"),
      el("p", { class: "muted" }, "Make your way to " + stop.realName + ". Complete these en-route missions for bonus intel.")
    );
    var list = el("div");
    card.appendChild(list);
    renderTaskItems(stop, stop.travelMissions, "travel", list, function () {
      // continue is always available on travel
    });
    card.appendChild(bigBtn("We've arrived at the area ▸", next));
    UI.mount(card);
  }

  /* ---------- Arrive (GPS / manual) ---------- */
  function renderArrive(stop) {
    var statusEl = el("div", { class: "dist" }, "Tap scan when you're at " + stop.realName + ".");
    var card = el("div", { class: "card center" },
      el("div", { class: "dossier-tab" }, "INFILTRATE"),
      stopHeader(stop, "Confirm you're on site"),
      el("div", { class: "radar" }),
      statusEl,
      bigBtn("📡 Scan for arrival", function () {
        statusEl.textContent = "Scanning for GPS signal…";
        Geo.checkArrival(stop.coords, stop.unlockRadiusMeters).then(function (res) {
          if (res.arrived) {
            statusEl.textContent = "✅ On site! (" + res.distance + "m)";
            UI.sound.success(); UI.vibrate([10, 40, 10]);
            setTimeout(next, 600);
          } else {
            statusEl.textContent = "📍 ~" + res.distance + "m away (±" + res.accuracy + "m). Keep going, or confirm manually.";
            UI.toast("Not in range yet, Agent.");
          }
        }).catch(function (err) {
          statusEl.textContent = "⚠️ " + err.message + " Use manual confirm below.";
        });
      }),
      el("button", { class: "btn btn-ghost", onClick: function () { UI.sound.click(); next(); } }, "We're here — confirm manually ▸")
    );
    UI.mount(card);
  }

  /* ---------- Field ops ---------- */
  function renderField(stop) {
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "FIELD OPS"),
      stopHeader(stop, "Field operations"),
      el("p", { class: "muted" }, "Complete all field tasks to recover the Flavour Key.")
    );
    var list = el("div");
    card.appendChild(list);
    var continueBtn = bigBtn("Recover the Flavour Key ▸", next);
    renderTaskItems(stop, stop.fieldTasks, "field", list, function () {
      var allDone = stop.fieldTasks.every(function (t, idx) { return state.done[taskKey(stop, "field", idx)]; });
      continueBtn.disabled = !allDone;
    });
    // initial disabled state
    var allDone = stop.fieldTasks.every(function (t, idx) { return state.done[taskKey(stop, "field", idx)]; });
    continueBtn.disabled = !allDone;
    card.appendChild(continueBtn);
    UI.mount(card);
  }

  function taskKey(stop, group, idx) { return stop.id + ":" + group + ":" + idx; }

  function markDone(key, pts) {
    if (!state.done[key]) {
      state.done[key] = true;
      state.points += (pts || 15);
      persist(); updateHUD();
    }
  }

  // Renders a list of tasks (travel or field). onChange called after each completion.
  function renderTaskItems(stop, tasks, group, container, onChange) {
    tasks.forEach(function (task, idx) {
      var key = taskKey(stop, group, idx);
      var done = !!state.done[key];
      var row = el("div", { class: "task" });
      var check = el("div", { class: "check" + (done ? " done" : "") }, done ? "✓" : "");
      var ico = { photo: "📷", contact: "🗣️", findDish: "🍽️", taste: "👅", multipleChoice: "❓" }[task.type] || "•";
      var body = el("div", { class: "task-body" },
        el("div", { class: "task-title" }, (task.title || "Task")),
        el("div", { class: "task-sub" }, task.prompt)
      );
      row.appendChild(el("div", { class: "task-ico" }, ico));
      row.appendChild(body);
      row.appendChild(check);
      container.appendChild(row);

      var action = el("div");
      container.appendChild(action);

      function complete(pts) {
        markDone(key, pts);
        check.classList.add("done"); check.textContent = "✓";
        UI.sound.success(); UI.vibrate(12);
        onChange();
      }

      if (done) {
        if (lastPhotos[key]) action.appendChild(el("div", { class: "photo-shot" }, el("img", { src: lastPhotos[key] })));
        return; // already complete; no action needed
      }

      if (task.type === "photo") {
        action.appendChild(el("button", { class: "btn btn-secondary", onClick: function () {
          UI.sound.click();
          UI.capturePhoto().then(function (dataUrl) {
            if (!dataUrl) return;
            lastPhotos[key] = dataUrl;
            state.photoCount++;
            Store.savePhoto(dataUrl, { stopId: stop.id, label: task.title });
            action.innerHTML = "";
            action.appendChild(el("div", { class: "photo-shot" }, el("img", { src: dataUrl })));
            complete(15);
          });
        } }, "📸 Capture"));
      } else if (task.type === "contact" || task.type === "findDish") {
        action.appendChild(el("button", { class: "btn btn-secondary", onClick: function () { UI.sound.click(); action.innerHTML = ""; complete(15); } }, task.confirm || "Done ✓"));
      } else if (task.type === "taste") {
        var val = el("div", { class: "taste-val" }, "5");
        var slider = el("input", { type: "range", min: "0", max: "10", value: "5" });
        slider.addEventListener("input", function () { val.textContent = slider.value; });
        action.appendChild(el("div", { class: "taste-row" },
          el("div", { class: "muted small" }, (task.scaleLabel || "Rating") + " (0–10)"),
          val, slider,
          el("button", { class: "btn btn-secondary", onClick: function () {
            UI.sound.click();
            state.tasteLogs[key] = parseInt(slider.value, 10);
            action.innerHTML = "";
            action.appendChild(el("div", { class: "muted small" }, "Logged: " + state.tasteLogs[key] + "/10"));
            complete(15);
          } }, "Log it ✓")
        ));
      } else if (task.type === "multipleChoice") {
        var box = el("div", { class: "choices" });
        task.choices.forEach(function (ch) {
          var b = el("button", { class: "choice" }, el("span", { class: "pick" }), el("span", null, ch.label));
          b.addEventListener("click", function () {
            UI.sound.click();
            if (ch.id === task.answer) { b.classList.add("correct"); setTimeout(function () { action.innerHTML = ""; complete(15); }, 350); }
            else { b.classList.add("wrong"); failPuzzle(); setTimeout(function () { b.classList.remove("wrong"); }, 450); }
          });
          box.appendChild(b);
        });
        action.appendChild(box);
      }
    });
  }

  /* ---------- Cliffhanger ---------- */
  function renderCliffhanger(stop) {
    var t = el("div", { class: "transmission" });
    var card = el("div", { class: "card" }, el("div", { class: "dossier-tab" }, "INTERCEPT"), t);
    var btnBox = el("div");
    UI.mount(el("div", null, card, btnBox));
    UI.typewriter(t, stop.cliffhanger, 12).then(function () {
      btnBox.appendChild(bigBtn("Next briefing ▸", next));
    });
  }

  /* ---------- Finale ---------- */
  function renderFinale() {
    var f = C.finale;
    var forged = state.finished;
    if (!forged) {
      var keysRow = el("div", { class: "hud-keys", style: "margin:18px 0;font-size:30px;gap:14px;" });
      C.stops.forEach(function (stop) { keysRow.appendChild(el("div", null, stop.keyEmoji)); });
      var card = el("div", { class: "card center" },
        el("div", { class: "dossier-tab" }, "FINALE"),
        el("h1", { class: "title" }, f.title),
        el("p", { class: "lede" }, f.intro),
        keysRow,
        bigBtn("✨ " + f.cta, function () {
          state.finished = true; persist();
          UI.sound.win(); UI.vibrate([10, 40, 10, 40, 30]); UI.celebrate();
          setTimeout(function () { UI.celebrate(); }, 400);
          renderFinale();
        })
      );
      UI.mount(card);
    } else {
      var card2 = el("div", { class: "card center" },
        el("div", { class: "stamp" }, "CASE CLOSED"),
        el("div", { class: "key-badge" }, "🏆"),
        el("h1", { class: "title" }, f.victoryTitle),
        el("p", { class: "lede" }, f.victoryText),
        bigBtn("See your mission dossier ▸", next)
      );
      UI.sound.reveal(); UI.celebrate();
      UI.mount(card2);
    }
  }

  /* ---------- Dossier (end album + awards) ---------- */
  function renderDossier() {
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "MISSION DOSSIER"),
      el("h1", { class: "title" }, "Case file: " + (state.names.team || "The Agents")),
      el("p", { class: "muted" }, "Rank achieved: " + C.ranks[C.ranks.length - 1] + " • " + state.points + " points • " + state.keys.length + " Flavour Keys"),
      el("div", { class: "eyebrow", style: "margin-top:14px;" }, "AWARDS CEREMONY")
    );

    // Awards: assign each award to an agent (round-robin, deterministic)
    var agents = state.names.agents && state.names.agents.length ? state.names.agents : ["The Team"];
    C.awards.slice(0, Math.max(agents.length, 3)).forEach(function (a, i) {
      card.appendChild(el("div", { class: "award" },
        el("div", { class: "medal" }, a.medal),
        el("div", null, el("div", null, el("b", null, agents[i % agents.length]), " — " + a.title), el("div", { class: "muted small" }, a.note))
      ));
    });

    var albumWrap = el("div", null, el("div", { class: "eyebrow", style: "margin-top:18px;" }, "SURVEILLANCE PHOTOS"), el("div", { class: "muted small" }, "Loading evidence…"));
    card.appendChild(albumWrap);

    card.appendChild(bigBtn("📸 Screenshot this page to keep it!", function () { UI.toast("Take a screenshot to save your dossier 🎉"); }, "btn-secondary"));
    card.appendChild(el("button", { class: "btn btn-ghost", onClick: function () { confirmReset(); } }, "Play again (new mission)"));

    UI.mount(card);
    UI.sound.win();

    Store.getAllPhotos().then(function (photos) {
      albumWrap.innerHTML = "";
      albumWrap.appendChild(el("div", { class: "eyebrow" }, "SURVEILLANCE PHOTOS (" + photos.length + ")"));
      if (!photos.length) { albumWrap.appendChild(el("div", { class: "muted small" }, "No photos captured this mission.")); return; }
      var grid = el("div", { class: "album" });
      photos.forEach(function (p) { grid.appendChild(el("div", { class: "ph" }, el("img", { src: p.dataUrl }))); });
      albumWrap.appendChild(grid);
    });
  }

  /* ----------------------------- BOOT ----------------------------- */
  window.SFS.Engine = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ===========================================================================
   ENGINE — game state machine + all screen rendering.
   Reads content from SFS.CONTENT, uses SFS.UI / SFS.Store / SFS.Geo.
   =========================================================================== */
(function () {
  window.SFS = window.SFS || {};
  var C, UI, el, Store, Geo;
  var state, steps;

  // transient per-navigation UI state (reset on every render())
  var decoderShift = 0;
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
    decoderShift = 0;
    var st = cur();
    applyTheme(st);
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
  function applyTheme(st) {
    if (st.stop != null) document.body.dataset.theme = C.stops[st.stop].theme || C.stops[st.stop].id;
    else if (st.kind === "finale") document.body.dataset.theme = "finale";
    else if (st.kind === "dossier") document.body.dataset.theme = "complete";
    else document.body.dataset.theme = "intro";
  }

  function missionPhase(st) {
    if (st.kind === "briefing") return 0;
    if ((st.kind === "puzzle" || st.kind === "reveal") && st.role === "location") return 1;
    if (st.kind === "travel" || st.kind === "arrive") return 2;
    if (st.kind === "field") return 3;
    return 4;
  }

  function updateMissionProgress() {
    var st = cur();
    var nav = document.getElementById("hud-progress");
    var visible = st.stop != null;
    nav.classList.toggle("hidden", !visible);
    nav.innerHTML = "";
    if (!visible) return;
    var phase = missionPhase(st);
    ["Brief", "Decode", "Travel", "Field", "Key"].forEach(function (label, i) {
      nav.appendChild(el("div", { class: "mission-stage" + (i < phase ? " done" : "") + (i === phase ? " current" : "") },
        el("span", { class: "stage-dot" }, i < phase ? "✓" : String(i + 1)),
        el("span", { class: "stage-label" }, label)
      ));
    });
  }

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
    updateMissionProgress();
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

  function characterPanel(src, alt, label, cls) {
    return el("figure", { class: "character-panel " + (cls || "") },
      el("img", { src: src, alt: alt, decoding: "async" }),
      el("figcaption", null, label)
    );
  }

  /* ---------- Intro / recruitment ---------- */
  function renderIntro() {
    var t = el("div", { class: "transmission" });
    var card = el("div", { class: "card" },
      el("div", { class: "dossier-tab" }, "TOP SECRET"),
      characterPanel("images/characters/baron-bland.jpg", "Baron Bland holding a covered silver serving dish", "THREAT DOSSIER // BARON BLAND", "villain opening-villain"),
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
      characterPanel("images/characters/control.jpg", "Control, the M.U.N.C.H. mission handler", "SECURE CHANNEL // CONTROL", "compact control"),
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
    var p = base;
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
    var clue = p.clue || p.scrambled;
    var input = el("input", { class: "input", placeholder: p.scrambled ? "Unscramble: " + p.scrambled : "Type the place name", autocomplete: "off", autocapitalize: "characters" });
    var wrap = el("div", null,
      clue ? el("div", { class: "decoder-out puzzle-clue" }, clue) : null,
      el("div", { class: "field" }, input),
      bigBtn("Submit ▸", function () {
        if (norm(input.value) === norm(p.answer)) solvePuzzle(role, false);
        else failPuzzle(input);
      })
    );
    return wrap;
  }

  function renderCipher(p, role) {
    var startShift = p.startShift != null ? p.startShift : 0;
    var maxShift = p.maxShift != null ? p.maxShift : 25;
    decoderShift = startShift;
    var out = el("div", { class: "decoder-out" }, caesar(p.ciphertext, -startShift));
    var shiftSpan = el("span", { class: "shiftnum" }, String(startShift));
    var slider = el("input", { type: "range", min: "0", max: String(maxShift), step: "1", value: String(startShift), "aria-label": "Decoder shift" });
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
      slider,
      el("div", { class: "decoder-scale" }, el("span", null, "0"), el("span", null, maxShift + " — START"))
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
        if (emo === p.answer) { tile.classList.add("correct"); solvePuzzle(role, false); }
        else { tile.classList.add("wrong"); failPuzzle(); setTimeout(function () { tile.classList.remove("wrong"); }, 450); }
      });
      grid.appendChild(tile);
    });
    return grid;
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
      locationVisual(stop),
      el("div", { class: "btn-row" },
        el("a", { class: "btn btn-secondary", href: Geo.mapsUrl(stop.coords, stop.realName), target: "_blank", rel: "noopener", style: "text-decoration:none;display:block;" }, "🗺️ Open in Maps"),
        el("button", { class: "btn", onClick: function () { UI.sound.click(); next(); } }, "We're heading there ▸")
      )
    );
    UI.sound.reveal();
    UI.mount(card);
  }

  function locationVisual(stop, cls) {
    return el("figure", { class: "location-visual " + (cls || "") },
      el("img", { src: stop.image, alt: "Illustrated view of " + stop.realName, decoding: "async" }),
      el("figcaption", null,
        el("span", { class: "location-pin" }, "⌖"),
        el("span", null, el("b", null, stop.realName), el("small", null, stop.area))
      )
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
      el("div", { class: "key-badge" }, el("img", { src: stop.keyImage, alt: stop.keyName, decoding: "async" })),
      el("div", { class: "key-nameplate" }, stop.keyName),
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
      el("p", { class: "muted" }, "Make your way to " + stop.realName + ". Complete these en-route missions for bonus intel."),
      locationVisual(stop, "compact")
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
        characterPanel("images/characters/baron-bland.jpg", "Baron Bland holding a covered silver serving dish", "PRIMARY TARGET // BARON BLAND", "villain"),
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

  /* ---------- Mission debrief (story recap + evidence album) ---------- */
  function renderDossier() {
    var photoStat = el("strong", null, String(state.photoCount || 0));
    var card = el("div", { class: "card debrief" },
      el("div", { class: "dossier-tab" }, "MISSION DEBRIEF"),
      el("div", { class: "debrief-heading" },
        el("div", { class: "eyebrow" }, "CONTROL // FINAL TRANSMISSION"),
        el("div", { class: "debrief-seal" }, "✓"),
        el("h1", { class: "title" }, "London's flavour is restored"),
        el("p", { class: "lede" }, "Outstanding work, " + (state.names.team || "Agents") + ". Broadway, Camden and Chinatown are back in full flavour. Baron Bland is defeated and the Golden Recipe is secure.")
      ),
      el("div", { class: "debrief-stats" },
        el("div", null, el("strong", null, String(state.points)), el("span", null, "Points")),
        el("div", null, el("strong", null, state.keys.length + "/" + C.stops.length), el("span", null, "Keys")),
        el("div", null, photoStat, el("span", null, "Evidence"))
      ),
      el("div", { class: "section-label" }, "THE RECOVERED RECIPE")
    );

    var keys = el("div", { class: "debrief-keys" });
    C.stops.forEach(function (stop) {
      keys.appendChild(el("article", { class: "debrief-key " + stop.theme },
        el("img", { src: stop.keyImage, alt: stop.keyName, decoding: "async" }),
        el("div", null,
          el("small", null, stop.realName),
          el("strong", null, stop.keyTaste),
          el("span", null, "Key recovered")
        )
      ));
    });
    card.appendChild(keys);

    var albumWrap = el("section", { class: "evidence-section" },
      el("div", { class: "section-label" }, "FIELD EVIDENCE"),
      el("div", { class: "muted small" }, "Loading mission photographs…")
    );
    card.appendChild(albumWrap);

    card.appendChild(bigBtn("📸 Save this mission debrief", function () { UI.toast("Take a screenshot to save your debrief 🎉"); }, "btn-secondary"));
    card.appendChild(el("button", { class: "btn btn-ghost", onClick: function () { confirmReset(); } }, "Begin a new mission"));

    UI.mount(card);
    UI.sound.win();

    Store.getAllPhotos().then(function (photos) {
      photoStat.textContent = String(photos.length);
      albumWrap.innerHTML = "";
      albumWrap.appendChild(el("div", { class: "section-label" }, "FIELD EVIDENCE // " + photos.length + " FILES"));
      if (!photos.length) { albumWrap.appendChild(el("div", { class: "empty-evidence" }, "No photographs were captured during this mission.")); return; }
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

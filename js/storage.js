/* ===========================================================================
   STORAGE — progress (localStorage) + photos (IndexedDB).
   Exposes window.SFS.Store
   =========================================================================== */
(function () {
  window.SFS = window.SFS || {};
  var LS_KEY = "sfs_state_v1";
  var DB_NAME = "sfs_photos_v1";
  var STORE = "photos";

  function defaultState() {
    return {
      started: false,
      finished: false,
      stepIndex: 0,            // index into the engine's flat step list
      points: 0,
      keys: [],                // taste strings recovered, e.g. ["SALT"]
      names: { team: "", agents: [] },
      done: {},                // arbitrary per-step completion flags (taskKey -> true)
      tasteLogs: {},           // taskKey -> number
      assists: 0,              // how many times the answer was revealed/kid-mode-helped
      photoCount: 0,
      updatedAt: Date.now(),
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      // merge over defaults so new fields never break old saves
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.warn("State load failed, starting fresh:", e);
      return defaultState();
    }
  }

  function save(state) {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("State save failed:", e);
    }
  }

  function resetAll(cb) {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    clearPhotos(function () { if (cb) cb(); });
  }

  /* ---------------- IndexedDB photos ---------------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window)) { reject(new Error("no-indexeddb")); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // dataUrl: base64 string. meta: { stopId, label }
  function savePhoto(dataUrl, meta) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).add({ dataUrl: dataUrl, meta: meta || {}, ts: Date.now() });
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function (e) {
      // Fallback: if IndexedDB unavailable, we silently skip persistence of the image.
      console.warn("savePhoto failed:", e);
      return false;
    });
  }

  function getAllPhotos() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return []; });
  }

  function clearPhotos(cb) {
    openDB().then(function (db) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = function () { if (cb) cb(); };
      tx.onerror = function () { if (cb) cb(); };
    }).catch(function () { if (cb) cb(); });
  }

  window.SFS.Store = {
    defaultState: defaultState,
    load: load,
    save: save,
    resetAll: resetAll,
    savePhoto: savePhoto,
    getAllPhotos: getAllPhotos,
    clearPhotos: clearPhotos,
  };
})();

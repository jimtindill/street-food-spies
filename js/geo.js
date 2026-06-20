/* ===========================================================================
   GEO — offline-capable arrival detection.
   Raw GPS needs no network. We compare the device position to the venue
   coordinates with the haversine formula. Always paired with a manual override
   in the UI, because markets are covered/indoor and GPS can be flaky.
   Exposes window.SFS.Geo
   =========================================================================== */
(function () {
  window.SFS = window.SFS || {};

  function toRad(d) { return (d * Math.PI) / 180; }

  // Distance in metres between two lat/lng points.
  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371000; // earth radius (m)
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Resolves { lat, lng, accuracy } or rejects with a friendly reason.
  function getPosition(opts) {
    return new Promise(function (resolve, reject) {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation isn't available on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        function (err) {
          var msg = "Couldn't get a GPS fix.";
          if (err && err.code === 1) msg = "Location permission was denied.";
          else if (err && err.code === 3) msg = "GPS timed out — signal may be weak indoors.";
          reject(new Error(msg));
        },
        Object.assign({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }, opts || {})
      );
    });
  }

  // Returns { arrived:bool, distance:m, accuracy:m }
  function checkArrival(target, radiusMeters) {
    return getPosition().then(function (p) {
      var dist = haversine(p.lat, p.lng, target.lat, target.lng);
      return {
        arrived: dist <= (radiusMeters || 200),
        distance: Math.round(dist),
        accuracy: Math.round(p.accuracy || 0),
      };
    });
  }

  // Build a maps deep-link that hands off to the phone's native Maps app.
  function mapsUrl(coords, label) {
    var q = encodeURIComponent((label ? label + " " : "") + coords.lat + "," + coords.lng);
    // geo: works on Android; Apple/Google fall back gracefully on the web.
    return "https://www.google.com/maps/search/?api=1&query=" + coords.lat + "," + coords.lng;
  }

  window.SFS.Geo = {
    haversine: haversine,
    getPosition: getPosition,
    checkArrival: checkArrival,
    mapsUrl: mapsUrl,
  };
})();

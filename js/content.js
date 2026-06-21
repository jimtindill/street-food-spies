/* ===========================================================================
   CONTENT — edit this file freely to change the adventure.
   The engine reads everything from window.SFS.CONTENT.
   Nothing here is logic; it's all story/clues/puzzles/data.

   Text tip: write prose normally. Use a blank line (\n\n) ONLY where you want a
   paragraph break — don't add line breaks mid-sentence; the screen wraps for you.

   PUZZLE TYPES:
     - "cipher"        Caesar-shifted text + in-app Decoder Ring.
                       { prompt, ciphertext, shift, answer, hints[] }
     - "anagram"       Unscramble letters. { prompt, scrambled, answer, hints[] }
     - "code"          Type an exact word/number. { prompt, clue?, answer, hints[] }
     - "multipleChoice"{ prompt, choices:[{id,label}], answer:id, hints[] }
     - "pictureMatch"  Tap the right emoji. { prompt, tiles:[emoji...], answer:emoji, hints[] }

   FIELD / TRAVEL TASK TYPES:
     - "photo"          capture a picture (saved to the end-of-day dossier)
     - "contact"        a do-it-now mission, self-confirmed with a button
     - "findDish"       the dish to hunt down & order, self-confirmed
     - "taste"          rate a flavour on a 0–10 slider
     - "multipleChoice" a quick quiz (same shape as the puzzle type)
   =========================================================================== */

window.SFS = window.SFS || {};

window.SFS.CONTENT = {
  agency: {
    name: "M.U.N.C.H.",
    full: "Ministry of Undercover Nibbles, Cuisine & Hospitality",
    handler: "Control",
    villain: "Baron Bland",
    syndicate: "The Bland Syndicate",
    macguffin: "the Golden Recipe",
  },

  ranks: ["Rookie", "Field Agent", "Special Agent", "Master Spy"],

  intro: {
    transmission:
      "INCOMING TRANSMISSION // M.U.N.C.H. HQ\n\n" +
      "Agent — London is in danger. The Bland Syndicate, led by the villainous Baron Bland, is draining every market in the city of its FLAVOUR. If we fail, all food turns grey.\n\n" +
      "Three Flavour Keys are hidden across London. Recover all three, assemble the Golden Recipe, and stop the Baron before lunchtime is lost forever.\n\n" +
      "This message will self-destruct. Good luck. — Control",
    teamPrompt: "Name your squad",
    teamPlaceholder: "e.g. The Hungry Hawks",
    agentPrompt: "Who's on the team? (one per line)",
    agentPlaceholder: "Mum\nDad\nLeo",
    cta: "Accept the mission",
  },

  // Tip: verify coordinates close to the date.
  stops: [
    /* ----------------------------- STOP 1 ----------------------------- */
    {
      id: "broadway",
      codename: "OPERATION SUNRISE",
      realName: "Broadway Market",
      area: "Hackney, East London",
      coords: { lat: 51.5378, lng: -0.0617 },
      image: "images/locations/broadway-market.jpg",
      theme: "salt",
      unlockRadiusMeters: 220,
      keyName: "The Salt Key",
      keyImage: "images/keys/salt-key.jpg",
      keyEmoji: "🧂",
      keyTaste: "SALT",

      briefing:
        "Control here. Your first drop is in the EAST of the city — by the water, where some of the best artisan food stalls in London gather. The location is encrypted below. Decode it and get moving, Agent.",

      locationPuzzle: {
        type: "cipher",
        prompt: "Intercepted drop coordinates. The Syndicate rotated every letter by the same amount. Turn the Decoder Ring down from 12 until the message becomes a real word.",
        ciphertext: "EURDGZDB",
        shift: 3,
        startShift: 12,
        maxShift: 12,
        answer: "BROADWAY",
        hints: [
          "Move down one number at a time and say each result aloud. Stop when it looks like a real word.",
          "The answer is also a kind of wide street where shows can be performed.",
          "E→B, U→R, R→O … it spells B-R-O-A-D-W-A-Y.",
        ],
      },
      locationReveal: {
        title: "BROADWAY MARKET",
        text: "Hackney, right beside the Regent's Canal. Pack your appetite — and your cover story. Head there now.",
      },

      travelMissions: [
        { type: "photo", title: "Recon photo", prompt: "On the way, snap something RED. First evidence for HQ." },
        { type: "multipleChoice", title: "HQ quiz", prompt: "Briefing quiz, Agent: which waterway runs right alongside your target market?",
          choices: [ { id: "regents", label: "🛶 The Regent's Canal" }, { id: "thames", label: "🌊 The River Thames" }, { id: "sea", label: "🏖️ The seaside" } ],
          answer: "regents",
          hints: ["Control mentioned it in your briefing.", "It's the canal — the Regent's Canal."] },
      ],

      fieldTasks: [
        { type: "findDish", title: "Acquire the asset", prompt: "Codename 'SALT LICK': hunt down the SALTIEST snack you can find — proper chips, olives, salted nuts, cured meats or a cheese stall all count. Order one to share.", confirm: "Asset acquired!" },
        { type: "photo", title: "Surveillance", prompt: "Photograph the most delicious-looking baked treat you can find." },
        { type: "taste", title: "Taste verification", prompt: "On the SALT-O-METER, how salty is your asset? Slide to log it.", scaleLabel: "Saltiness" },
      ],

      keyPuzzle: {
        type: "multipleChoice",
        prompt: "Baron Bland's first lock responds to one taste from London's East End delis. Which?",
        choices: [
          { id: "salt", label: "🧂 Salty" },
          { id: "sweet", label: "🍬 Sweet" },
          { id: "sour", label: "🍋 Sour" },
        ],
        answer: "salt",
        hints: ["Think pickles, salt-beef, brine…", "It's the one you sprinkle from a shaker."],
      },
      keyReveal: {
        title: "THE SALT KEY RECOVERED",
        text: "One down. The first Flavour Key is yours — the Baron just lost his grip on the East.",
      },
      cliffhanger:
        "A grease-stained note flutters from a stall: a lock… a canal… a place where punks and pop-stars eat the world's food under one roof. The trail leads NORTH.",
    },

    /* ----------------------------- STOP 2 ----------------------------- */
    {
      id: "camden",
      codename: "OPERATION LOCK",
      realName: "Camden Market",
      area: "Camden, North London",
      coords: { lat: 51.5415, lng: -0.1466 },
      image: "images/locations/camden-market.jpg",
      theme: "spice",
      unlockRadiusMeters: 250,
      keyName: "The Spice Key",
      keyImage: "images/keys/spice-key.jpg",
      keyEmoji: "🌶️",
      keyTaste: "SPICE",

      briefing:
        "Key one secured, Agent. Intel points NORTH — to a market built around a famous lock on the canal, where food from every nation on earth is cooked side by side. Decode the destination.",

      locationPuzzle: {
        type: "code",
        prompt: "Control sent a picture code. A camera's short spy name is CAM. A fox's home is a DEN. Join the two code-pieces to name the next market.",
        clue: "📷  CAM   +   🦊  DEN",
        answer: "CAMDEN",
        hints: [
          "Say the two chunks aloud: CAM … DEN.",
          "Push them together with no space: CAM + DEN.",
          "The answer is C-A-M-D-E-N.",
        ],
      },
      locationReveal: {
        title: "CAMDEN MARKET",
        text: "North London, on the Regent's Canal at Camden Lock. Open daily. Hundreds of global food stalls — perfect cover. Get there.",
      },

      travelMissions: [
        { type: "contact", title: "Transit intel", prompt: "On the journey, agree one fact about the Tube or train line you're riding (a teammate can check the map).", confirm: "Logged ✓" },
        { type: "photo", title: "Cover shot", prompt: "Strike your best secret-agent pose by a Tube roundel and capture it." },
      ],

      fieldTasks: [
        { type: "photo", title: "Surveillance", prompt: "Recon the MOST COLOURFUL food stall in the market and photograph it." },
        { type: "findDish", title: "Acquire the asset", prompt: "Codename 'GLOBAL HEAT': order a dish from a country none of you have visited. Bonus points if it's spicy.", confirm: "Asset acquired!" },
        { type: "taste", title: "Taste verification", prompt: "Rate the asset on the SPICE-O-METER. How much heat?", scaleLabel: "Spiciness" },
      ],

      keyPuzzle: {
        type: "multipleChoice",
        prompt: "Baron Bland fears one taste above all in Camden's global kitchens. Which taste defeats him here?",
        choices: [
          { id: "spice", label: "🌶️ Spicy" },
          { id: "plain", label: "🥛 Plain" },
          { id: "bland", label: "🍚 Bland" },
        ],
        answer: "spice",
        hints: ["The Baron HATES anything with a kick.", "Think chilli, curry, hot sauce 🌶️."],
      },
      keyReveal: {
        title: "THE SPICE KEY RECOVERED",
        text: "Two of three. The Baron is sweating now. One key remains — and it's guarded in the heart of the city.",
      },
      cliffhanger:
        "An encoded dumpling wrapper points to the CENTRE of the city: a great gate, stone lions, red lanterns overhead, and the savoury secret of a thousand steaming baskets.",
    },

    /* ----------------------------- STOP 3 (FINALE) ----------------------------- */
    {
      id: "chinatown",
      codename: "OPERATION GOLDEN DRAGON",
      realName: "Chinatown",
      area: "Soho, Central London",
      coords: { lat: 51.5117, lng: -0.1310 },
      image: "images/locations/chinatown.jpg",
      theme: "umami",
      unlockRadiusMeters: 200,
      keyName: "The Umami Key",
      keyImage: "images/keys/umami-key.jpg",
      keyEmoji: "🍜",
      keyTaste: "UMAMI",

      briefing:
        "Two keys down, Agent. The final key lies in the CENTRE of the city — behind a great gate guarded by stone lions, beneath a sky of red lanterns. This is Baron Bland's last stand. Decode the way in.",

      locationPuzzle: {
        type: "anagram",
        prompt: "Lanterns swing in the wind, scrambling the sign. Put the letters back in order.",
        scrambled: "WON CHAINT",
        answer: "CHINATOWN",
        hints: [
          "Nine letters. A famous district near Leicester Square.",
          "Red lanterns, dim sum, a big ornamental gate.",
          "WON-CHAINT rearranges to C-H-I-N-A-T-O-W-N.",
        ],
      },
      locationReveal: {
        title: "CHINATOWN",
        text: "Soho, around Gerrard Street — Northern line to Leicester Square. Open daily, late. Walk under the paifang gate. This is where it ends.",
      },

      travelMissions: [
        { type: "contact", title: "Zodiac intel", prompt: "Spy quiz on the way: between the team, name as many of the 12 Chinese zodiac animals as you can.", confirm: "Logged ✓" },
        { type: "photo", title: "Gate recon", prompt: "As you reach Chinatown, grab a team selfie under the paifang gate or the red lanterns." },
      ],

      fieldTasks: [
        { type: "findDish", title: "Acquire the asset", prompt: "Codename 'THE STEAMED SECRET': order something steamed in a bamboo basket (dim sum / bao).", confirm: "Asset acquired!" },
        { type: "multipleChoice", title: "Decode the safehouse sign", prompt: "A red sign hangs over the safehouse: 福. What does this lucky character mean?",
          choices: [ { id: "luck", label: "🧧 Good luck / fortune" }, { id: "door", label: "🚪 Door" }, { id: "fish", label: "🐟 Fish" } ],
          answer: "luck",
          hints: ["You'll see it everywhere at Lunar New Year.", "It means fortune & good luck 🧧."] },
        { type: "taste", title: "Taste verification", prompt: "Rate the deep, savoury UMAMI of your dumpling. How rich is it?", scaleLabel: "Savouriness" },
      ],

      keyPuzzle: {
        type: "multipleChoice",
        prompt: "Dumplings, soy sauce and rich broth all share one deep, savoury 'fifth taste'. Name it to break the final lock.",
        choices: [
          { id: "umami", label: "🍜 Umami (savoury)" },
          { id: "bitter", label: "☕ Bitter" },
          { id: "sour", label: "🍋 Sour" },
        ],
        answer: "umami",
        hints: ["It's the famous 'fifth taste' beyond sweet/salt/sour/bitter.", "Soy sauce and broth are full of it: U-M-A-M-I."],
      },
      keyReveal: {
        title: "THE UMAMI KEY RECOVERED",
        text: "All three keys are yours: SALT, SPICE and UMAMI. Baron Bland is cornered…",
      },
      cliffhanger: null,
    },
  ],

  finale: {
    title: "ASSEMBLE THE GOLDEN RECIPE",
    intro:
      "Three keys. Three tastes. Combine them now to complete the Golden Recipe and restore flavour to London. Tap to forge it, Agent.",
    cta: "Forge the Golden Recipe",
    victoryTitle: "BARON BLAND DEFEATED",
    victoryText:
      "The Golden Recipe blazes to life — SALT, SPICE and UMAMI in perfect balance. Across London, grey food bursts back into colour. The Bland Syndicate is finished. You are now a MASTER SPY of M.U.N.C.H. The city eats well tonight.",
  },
};

/* ===========================================================================
   CONTENT — edit this file freely to change the adventure.
   The engine reads everything from window.SFS.CONTENT.
   Nothing here is logic; it's all story/clues/puzzles/data.

   PUZZLE TYPES you can use:
     - "cipher"        Caesar-shifted text. Players can use the in-app Decoder Ring.
                       { prompt, ciphertext, shift, answer, hints[] }
     - "anagram"       Unscramble letters. { prompt, scrambled, answer, hints[] }
     - "code"          Type an exact word/number. { prompt, answer, hints[] }
     - "multipleChoice"{ prompt, choices:[{id,label}], answer:id, hints[] }
     - "pictureMatch"  Tap the right emoji. { prompt, tiles:[emoji...], answer:emoji, hints[] }
   Any puzzle may add `kidMode:{ ...another puzzle of any type... }` for the 8-yo.

   FIELD TASK TYPES:
     - "photo"   capture a picture (saved to the end-of-day dossier)
     - "contact" ask a real vendor something (self-confirmed)
     - "findDish"the dish to hunt down & order (self-confirmed)
     - "taste"   rate/guess a flavour (slider, self-scored)
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

  // Rank ladder — index = number of Flavour Keys recovered (0..3)
  ranks: ["Rookie", "Field Agent", "Special Agent", "Master Spy"],

  // Recruitment splash + name entry
  intro: {
    transmission:
      "INCOMING TRANSMISSION // M.U.N.C.H. HQ\n\nAgent — London is in danger.\n" +
      "The Bland Syndicate, led by the villainous Baron Bland, is draining every\n" +
      "market in the city of its FLAVOUR. If we fail, all food turns grey.\n\n" +
      "Three Flavour Keys are hidden across London. Recover all three, assemble\n" +
      "the Golden Recipe, and stop the Baron before lunchtime is lost forever.\n\n" +
      "This message will self-destruct. Good luck. — Control",
    teamPrompt: "Name your squad",
    teamPlaceholder: "e.g. The Hungry Hawks",
    agentPrompt: "Who's on the team? (one per line)",
    agentPlaceholder: "Mum\nDad\nLeo (age 8)",
    cta: "Accept the mission",
  },

  // Tip: verify coordinates & opening hours close to the date.
  stops: [
    /* ----------------------------- STOP 1 ----------------------------- */
    {
      id: "broadway",
      codename: "OPERATION SUNRISE",
      realName: "Broadway Market",
      area: "Hackney, East London",
      coords: { lat: 51.5378, lng: -0.0617 },
      unlockRadiusMeters: 220,
      keyName: "The Salt Key",
      keyEmoji: "🧂",
      keyTaste: "SALT",

      briefing:
        "Control here. Your first drop is in the EAST, by the water, where artisan\n" +
        "stalls bloom every Saturday at dawn. The location is encrypted below —\n" +
        "decode it and get moving, Agent.",

      locationPuzzle: {
        type: "cipher",
        prompt: "Intercepted drop coordinates. The Syndicate shifted every letter forward by 3. Roll it back.",
        ciphertext: "EURDGZDB",
        shift: 3,                // each plaintext letter was shifted +3 to make ciphertext
        answer: "BROADWAY",
        hints: [
          "It's the name of a street type — and a famous Hackney market.",
          "Use the Decoder Ring below. Try shifting back by 3.",
          "E→B, U→R, R→O … it spells B-R-O-A-D-W-A-Y.",
        ],
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which place sells food by the canal on Saturdays?",
          tiles: ["🍞", "🎢", "🏰", "🛶", "⚽", "🦖"],
          answer: "🛶",
          hints: ["Think about water and boats 🛶.", "It's the little canal boat!"],
        },
      },
      locationReveal: {
        title: "BROADWAY MARKET",
        text: "Hackney, by the Regent's Canal. Saturdays only, ~8am–5pm. Pack your appetite — and your cover story. Head there now.",
      },

      travelMissions: [
        { type: "photo", title: "Recon photo", prompt: "On the way, snap something RED. Evidence for HQ." },
        { type: "contact", title: "Local intel", prompt: "Ask a stallholder what time they started setting up this morning." },
      ],

      fieldTasks: [
        { type: "findDish", title: "Acquire the asset", prompt: "Codename 'GOLDEN MELT': find a stall serving melted or grilled cheese and order one to share.", confirm: "Asset acquired!" },
        { type: "photo", title: "Surveillance", prompt: "Photograph the most delicious-looking baked thing you can find." },
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
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which one is SALTY?",
          tiles: ["🍭", "🧂", "🍋"],
          answer: "🧂",
          hints: ["It's the white shaker!"],
        },
      },
      keyReveal: {
        title: "THE SALT KEY RECOVERED",
        text: "One down. The first Flavour Key is yours — the Baron just lost his grip on the East.",
      },
      cliffhanger:
        "A grease-stained note flutters from the stall: a lock… a canal… a place where punks and pop-stars eat the world's food under one roof. The trail leads NORTH.",
    },

    /* ----------------------------- STOP 2 ----------------------------- */
    {
      id: "camden",
      codename: "OPERATION LOCK",
      realName: "Camden Market",
      area: "Camden, North London",
      coords: { lat: 51.5415, lng: -0.1466 },
      unlockRadiusMeters: 250,
      keyName: "The Spice Key",
      keyEmoji: "🌶️",
      keyTaste: "SPICE",

      briefing:
        "Key one secured, Agent. Intel points NORTH — to a market built around a\n" +
        "famous lock on the canal, where food from every nation in the world is\n" +
        "cooked side by side. Decode the destination.",

      locationPuzzle: {
        type: "anagram",
        prompt: "Unscramble the intercepted codeword to find the next market.",
        scrambled: "MAD CNE",
        answer: "CAMDEN",
        hints: [
          "Six letters. It's a place in North London.",
          "Famous for a canal lock, punk music, and horse stables.",
          "M-A-D-C-N-E rearranges to C-A-M-D-E-N.",
        ],
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which place has a canal LOCK and music?",
          tiles: ["🔒🎸", "🏖️", "⛷️", "🐧", "🎡", "🚜"],
          answer: "🔒🎸",
          hints: ["Look for the padlock and guitar 🔒🎸."],
        },
      },
      locationReveal: {
        title: "CAMDEN MARKET",
        text: "North London, on the Regent's Canal at Camden Lock. Open daily. Hundreds of global food stalls — perfect cover. Get there.",
      },

      travelMissions: [
        { type: "contact", title: "Transit intel", prompt: "On the journey, find out one fact about the Tube line you're riding (ask a teammate to look at the map)." },
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
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which food is SPICY and hot?",
          tiles: ["🥛", "🌶️", "🍚"],
          answer: "🌶️",
          hints: ["The red chilli pepper!"],
        },
      },
      keyReveal: {
        title: "THE SPICE KEY RECOVERED",
        text: "Two of three. The Baron is sweating now. One key remains — and it's guarded in the heart of the city.",
      },
      cliffhanger:
        "An encoded dumpling wrapper points CENTRAL: a great gate, stone lions, red lanterns overhead, and the savoury secret of a thousand steaming baskets.",
    },

    /* ----------------------------- STOP 3 (FINALE) ----------------------------- */
    {
      id: "chinatown",
      codename: "OPERATION GOLDEN DRAGON",
      realName: "Chinatown",
      area: "Soho, Central London",
      coords: { lat: 51.5117, lng: -0.1310 },
      unlockRadiusMeters: 200,
      keyName: "The Umami Key",
      keyEmoji: "🍜",
      keyTaste: "UMAMI",

      briefing:
        "Two keys down, Agent. The final key lies in the CENTRE of the city, behind\n" +
        "a great gate guarded by stone lions, beneath a sky of red lanterns. This is\n" +
        "Baron Bland's last stand. Decode the way in.",

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
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which place has red lanterns and dumplings?",
          tiles: ["🏮", "🗼", "🏟️", "🎠", "🛝", "🎪"],
          answer: "🏮",
          hints: ["Find the red paper lantern 🏮."],
        },
      },
      locationReveal: {
        title: "CHINATOWN",
        text: "Soho, around Gerrard Street — Northern line to Leicester Square. Open daily, late. Walk under the paifang gate. This is where it ends.",
      },

      travelMissions: [
        { type: "contact", title: "Zodiac intel", prompt: "Find out which animal year it is on the Chinese zodiac (look for posters, or ask)." },
        { type: "photo", title: "Gate recon", prompt: "Team selfie under the paifang gate or the red lanterns." },
      ],

      fieldTasks: [
        { type: "findDish", title: "Acquire the asset", prompt: "Codename 'THE STEAMED SECRET': order something steamed in a bamboo basket (dim sum / bao).", confirm: "Asset acquired!" },
        { type: "multipleChoice", title: "Decode the safehouse sign", prompt: "A red sign hangs over the safehouse: 福. What does this lucky character mean?",
          choices: [ { id:"luck", label:"🧧 Good luck / fortune" }, { id:"door", label:"🚪 Door" }, { id:"fish", label:"🐟 Fish" } ],
          answer: "luck",
          hints: ["You'll see it everywhere at Lunar New Year.", "It means fortune & good luck 🧧."],
        },
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
        kidMode: {
          type: "pictureMatch",
          prompt: "Junior Agent! Which bowl is full of savoury, slurpy noodle soup?",
          tiles: ["🍜", "🍋", "☕"],
          answer: "🍜",
          hints: ["The steaming noodle bowl!"],
        },
      },
      keyReveal: {
        title: "THE UMAMI KEY RECOVERED",
        text: "All three keys are yours: SALT, SPICE and UMAMI. Baron Bland is cornered…",
      },
      cliffhanger: null, // last stop -> finale
    },
  ],

  finale: {
    title: "ASSEMBLE THE GOLDEN RECIPE",
    intro:
      "Three keys. Three tastes. Combine them now to complete the Golden Recipe and\n" +
      "restore flavour to London. Tap the keys to forge it, Agent.",
    cta: "Forge the Golden Recipe",
    victoryTitle: "BARON BLAND DEFEATED",
    victoryText:
      "The Golden Recipe blazes to life — SALT, SPICE and UMAMI in perfect balance.\n" +
      "Across London, grey food bursts back into colour. The Bland Syndicate is\n" +
      "finished. You are now a MASTER SPY of M.U.N.C.H. The city eats well tonight.",
  },

  // Cheesy awards handed out at the end (assigned to entered agent names)
  awards: [
    { medal: "🥇", title: "Master Decoder", note: "cracked the trickiest cipher" },
    { medal: "📸", title: "Eagle Eye", note: "best surveillance photos" },
    { medal: "🌶️", title: "Bravest Bite", note: "took on the spiciest asset" },
    { medal: "🍽️", title: "MVP Eater", note: "never left a plate behind" },
    { medal: "🕵️", title: "Smoothest Operator", note: "kept their cover all day" },
  ],
};

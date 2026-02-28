(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    unityFill: document.getElementById("unity-fill"),
    levelLabel: document.getElementById("level-label"),
    taskLabel: document.getElementById("task-label"),
    dialogue: document.getElementById("dialogue"),
    dialogueName: document.getElementById("dialogue-name"),
    dialogueText: document.getElementById("dialogue-text"),
    dialogueNext: document.getElementById("dialogue-next"),
    choice: document.getElementById("choice"),
    choiceTitle: document.getElementById("choice-title"),
    choiceText: document.getElementById("choice-text"),
    choiceYes: document.getElementById("choice-yes"),
    choiceNo: document.getElementById("choice-no"),
    overlay: document.getElementById("overlay"),
    musicToggle: document.getElementById("music-toggle")
  };

  const TILE = 32;
  const WORLD_W = 88;
  const WORLD_H = 56;

  const keys = new Set();

  const game = {
    scene: "title",
    quest: "intro",
    unity: 4,
    level: 0,
    busy: false,
    dialogueQueue: [],
    dialogueDone: null,
    choiceDone: null,
    growthStage: 0,
    flashTimer: 0,
    fireworks: [],
    minigameCleanup: null,
    camera: { x: 0, y: 0 },
    audio: null,
    musicOn: true,
    musicClock: null,
    musicStep: 0,
    worldReturn: { x: 16 * TILE, y: 18 * TILE }
  };

  const player = {
    x: 16 * TILE,
    y: 18 * TILE,
    w: 22,
    h: 22,
    speed: 170,
    avatar: "builder",
    dir: "down"
  };

  const zones = {
    townHall: { x: 10, y: 7, w: 8, h: 6 },
    mayorHouse: { x: 24, y: 6, w: 6, h: 5 },
    truckSpot: { x: 20, y: 14, w: 5, h: 4 },
    park: { x: 6, y: 25, w: 24, h: 16 },
    shed: { x: 9, y: 31, w: 4, h: 4 },
    farm: { x: 44, y: 25, w: 30, h: 20 },
    river: { x: 41, y: 31, w: 6, h: 12 },
    barn: { x: 58, y: 29, w: 7, h: 6 },
    school: { x: 54, y: 7, w: 12, h: 8 },
    arcade: { x: 70, y: 10, w: 8, h: 6 }
  };
  const MAYOR_HOUSE_DOOR = {
    x: (zones.mayorHouse.x + Math.floor(zones.mayorHouse.w / 2)) * TILE,
    y: (zones.mayorHouse.y + zones.mayorHouse.h) * TILE + 8
  };
  const mayorRoom = {
    x: 180,
    y: 85,
    w: 600,
    h: 360,
    doorX: 180 + 300,
    doorY: 85 + 338,
    mayorX: 180 + 302,
    mayorY: 85 + 182
  };
  const SCHOOL_DOOR = {
    x: (zones.school.x + Math.floor(zones.school.w / 2)) * TILE,
    y: (zones.school.y + zones.school.h) * TILE + 8
  };
  const ARCADE_DOOR = {
    x: (zones.arcade.x + Math.floor(zones.arcade.w / 2)) * TILE,
    y: (zones.arcade.y + zones.arcade.h) * TILE + 8
  };
  const schoolRoom = {
    x: 140,
    y: 78,
    w: 680,
    h: 388,
    doorX: 140 + 340,
    doorY: 78 + 368
  };
  const arcadeRoom = {
    x: 160,
    y: 96,
    w: 640,
    h: 340,
    doorX: 160 + 320,
    doorY: 96 + 320,
    kidX: 160 + 492,
    kidY: 96 + 170
  };

  const npcs = [
    { id: "foreman", name: "Foreman", x: 13 * TILE, y: 14 * TILE, sprite: "worker" },
    { id: "driver", name: "Mixer Driver", x: 22 * TILE, y: 18 * TILE, sprite: "worker" },
    { id: "mayor", name: "Mayor", x: 27 * TILE, y: 8.5 * TILE, sprite: "mayor" },
    { id: "cleaner", name: "Head Cleaner", x: 16 * TILE, y: 27 * TILE, sprite: "cleaner" },
    { id: "kid", name: "Crying Kid", x: 20 * TILE, y: 34 * TILE, sprite: "kid" },
    { id: "farmer", name: "Head Farmer", x: 52 * TILE, y: 31 * TILE, sprite: "farmer" },
    { id: "worker", name: "Dam Worker", x: 44 * TILE, y: 36 * TILE, sprite: "worker" },
    { id: "principal", name: "Principal", x: 58 * TILE, y: 16 * TILE, sprite: "principal" },
    { id: "arcadeKid", name: "Arcade Kid", x: 74 * TILE, y: 12 * TILE, sprite: "kid" },
    { id: "granny", name: "Granny", x: 11 * TILE, y: 36 * TILE, sprite: "granny" }
  ];

  const spriteCache = {};

  function makeSprite(palette, rows) {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const cctx = c.getContext("2d");
    for (let y = 0; y < rows.length; y += 1) {
      const row = rows[y];
      for (let x = 0; x < row.length; x += 1) {
        const ch = row[x];
        if (ch === ".") continue;
        cctx.fillStyle = palette[ch] || "#000";
        cctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function getSprite(name) {
    if (spriteCache[name]) return spriteCache[name];

    const commonPalette = {
      a: "#111827",
      b: "#f9d8a7",
      c: "#4ade80",
      d: "#60a5fa",
      e: "#ef4444",
      f: "#fbbf24",
      g: "#a78bfa",
      h: "#94a3b8",
      i: "#27272a",
      j: "#f8fafc",
      k: "#22d3ee",
      l: "#86efac"
    };

    const designs = {
      builder: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....dddddd.....",
        "...dddddddd....",
        "...dddbbdddd...",
        "...dddccdddd...",
        "....ddccdd.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      student: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....gggggg.....",
        "...gggggggg....",
        "...gggbbbggg...",
        "...gggfffggg...",
        "....ggffgg.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      artist: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....eeeeee.....",
        "...eeeeeeee....",
        "...eeebbbeee...",
        "...eeeccccee...",
        "....eeccce.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      engineer: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....kkkkkk.....",
        "...kkkkkkkk....",
        "...kkkbbbkkk...",
        "...kkkhhhkkk...",
        "....kkhhkk.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      worker: [
        ".....ffff......",
        "....fffffff....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....dddddd.....",
        "...dddddddd....",
        "...dddbbdddd...",
        "...dddiiiddd...",
        "....ddiiid.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      mayor: [
        ".....ffff......",
        "....fjjjjf.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....iiiiii.....",
        "...iiiiiiii....",
        "...iiibbbiii...",
        "...iiidddiii...",
        "....iidddii....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      cleaner: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....llllll.....",
        "...llllllll....",
        "...lllb bbll...".replace(" ", ""),
        "...lllccclll...",
        "....llcccl.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      kid: [
        "......aa.......",
        ".....abba......",
        ".....abba......",
        "......aa.......",
        ".....gggg......",
        "....gggggg.....",
        "....ggbbgg.....",
        "....ggccgg.....",
        ".....gggg......",
        ".....aa.a......",
        "....a....a.....",
        "....a....a.....",
        "...aa....aa....",
        "...aa....aa....",
        "................",
        "................"
      ],
      farmer: [
        ".....ffff......",
        "....fbbbbf.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....cccccc.....",
        "...cccccccc....",
        "...cccbbcccc...",
        "...ccclllccc...",
        "....cccllc.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      principal: [
        ".....aaaa......",
        "....abbbba.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....iiiiii.....",
        "...iiiiiiii....",
        "...iiibbbiii...",
        "...iiigggiii...",
        "....iigggi.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      granny: [
        ".....hhhh......",
        "....hbbbbh.....",
        "....abbbba.....",
        "....abbbba.....",
        ".....aaaa......",
        "....gggggg.....",
        "...gggggggg....",
        "...gggbbbggg...",
        "...ggghhhggg...",
        "....gghhhg.....",
        "....aa..aa.....",
        "...a......a....",
        "...a......a....",
        "..aa......aa...",
        "..aa......aa...",
        "................"
      ],
      truck: [
        "................",
        "................",
        "...dddddddd.....",
        "..dddddddddd....",
        ".dddcccccccdd...",
        ".ddccccccccdd...",
        ".ddccccccccdd...",
        ".ddiiiiiiiiid...",
        ".dddddddddddd...",
        ".ddd......ddd...",
        ".dd.aa..aa.dd...",
        ".dd.aa..aa.dd...",
        ".ddd......ddd...",
        "..dddddddddd....",
        "...dddddddd.....",
        "................"
      ],
      house: [
        ".......ee.......",
        "......eeee......",
        ".....eeeeee.....",
        "....eeeeeeee....",
        "...eeeeeeeeee...",
        "..eeeeeeeeeeee..",
        "..dddddffddddd..",
        "..dddddffddddd..",
        "..dddddddddddd..",
        "..dddbbbbbdddd..",
        "..dddbjbbjdddd..",
        "..dddbbbbbdddd..",
        "..ddddiiiiiddd..",
        "..ddddiiiiiddd..",
        "................",
        "................"
      ],
      tree: [
        ".......cc.......",
        ".....cccccc.....",
        "....cccccccc....",
        "...cccccccccc...",
        "...cccccccccc...",
        "....cccccccc....",
        ".....cccccc.....",
        ".......hh.......",
        ".......hh.......",
        ".......hh.......",
        "......hhhh......",
        "................",
        "................",
        "................",
        "................",
        "................"
      ]
    };

    const rows = designs[name] || designs.builder;
    const sprite = makeSprite(commonPalette, rows);
    spriteCache[name] = sprite;
    return sprite;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function playerRect(x = player.x, y = player.y) {
    return { x: x - player.w / 2, y: y - player.h / 2, w: player.w, h: player.h };
  }

  function zoneRect(zone) {
    return { x: zone.x * TILE, y: zone.y * TILE, w: zone.w * TILE, h: zone.h * TILE };
  }

  function blockedRects() {
    const r = [
      zoneRect(zones.townHall),
      zoneRect(zones.mayorHouse),
      zoneRect(zones.shed),
      zoneRect(zones.barn),
      zoneRect(zones.school),
      zoneRect(zones.arcade),
      zoneRect({ x: zones.river.x, y: zones.river.y, w: 3, h: zones.river.h })
    ];

    if (game.level < 2) {
      r.push(zoneRect({ x: zones.farm.x - 1, y: zones.farm.y - 1, w: zones.farm.w + 2, h: zones.farm.h + 2 }));
    }

    if (game.level < 3) {
      r.push(zoneRect({ x: zones.school.x - 1, y: zones.school.y - 1, w: zones.school.w + 2, h: zones.school.h + 2 }));
      r.push(zoneRect({ x: zones.arcade.x - 1, y: zones.arcade.y - 1, w: zones.arcade.w + 2, h: zones.arcade.h + 2 }));
    }

    return r;
  }

  function canMoveTo(x, y) {
    if (game.scene === "mayor_house") {
      const rect = playerRect(x, y);
      const roomRect = { x: mayorRoom.x + 10, y: mayorRoom.y + 10, w: mayorRoom.w - 20, h: mayorRoom.h - 20 };
      const tableRect = { x: mayorRoom.x + 220, y: mayorRoom.y + 52, w: 160, h: 42 };
      const withinRoom =
        rect.x >= roomRect.x &&
        rect.y >= roomRect.y &&
        rect.x + rect.w <= roomRect.x + roomRect.w &&
        rect.y + rect.h <= roomRect.y + roomRect.h;
      if (!withinRoom) return false;
      if (rectsOverlap(rect, tableRect)) return false;
      return true;
    }
    if (game.scene === "school_interior") {
      const rect = playerRect(x, y);
      const roomRect = { x: schoolRoom.x + 10, y: schoolRoom.y + 10, w: schoolRoom.w - 20, h: schoolRoom.h - 20 };
      const deskRect = { x: schoolRoom.x + 220, y: schoolRoom.y + 110, w: 260, h: 64 };
      const withinRoom =
        rect.x >= roomRect.x &&
        rect.y >= roomRect.y &&
        rect.x + rect.w <= roomRect.x + roomRect.w &&
        rect.y + rect.h <= roomRect.y + roomRect.h;
      if (!withinRoom) return false;
      if (rectsOverlap(rect, deskRect)) return false;
      return true;
    }
    if (game.scene === "arcade_interior") {
      const rect = playerRect(x, y);
      const roomRect = { x: arcadeRoom.x + 10, y: arcadeRoom.y + 10, w: arcadeRoom.w - 20, h: arcadeRoom.h - 20 };
      const machineA = { x: arcadeRoom.x + 70, y: arcadeRoom.y + 58, w: 64, h: 120 };
      const machineB = { x: arcadeRoom.x + 196, y: arcadeRoom.y + 58, w: 64, h: 120 };
      const machineC = { x: arcadeRoom.x + 322, y: arcadeRoom.y + 58, w: 64, h: 120 };
      const machineD = { x: arcadeRoom.x + 448, y: arcadeRoom.y + 58, w: 64, h: 120 };
      const withinRoom =
        rect.x >= roomRect.x &&
        rect.y >= roomRect.y &&
        rect.x + rect.w <= roomRect.x + roomRect.w &&
        rect.y + rect.h <= roomRect.y + roomRect.h;
      if (!withinRoom) return false;
      if (rectsOverlap(rect, machineA) || rectsOverlap(rect, machineB) || rectsOverlap(rect, machineC) || rectsOverlap(rect, machineD)) {
        return false;
      }
      return true;
    }

    const rect = playerRect(x, y);
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > WORLD_W * TILE || rect.y + rect.h > WORLD_H * TILE) {
      return false;
    }
    const blocked = blockedRects();
    for (const b of blocked) {
      if (rectsOverlap(rect, b)) return false;
    }
    return true;
  }

  function setObjective(levelLabel, taskLabel) {
    ui.levelLabel.textContent = levelLabel;
    ui.taskLabel.textContent = taskLabel;
  }

  function setUnity(value) {
    game.unity = Math.max(0, Math.min(100, value));
    ui.unityFill.style.width = `${game.unity}%`;
    const stage = Math.floor(game.unity / 25);
    if (stage > game.growthStage) {
      game.growthStage = stage;
      game.flashTimer = 0.9;
    }
  }

  function addUnity(delta) {
    setUnity(game.unity + delta);
  }

  function showDialogue(lines, onDone) {
    game.busy = true;
    game.dialogueQueue = lines.slice();
    game.dialogueDone = onDone || null;
    ui.dialogue.classList.remove("hidden");
    advanceDialogue();
  }

  function advanceDialogue() {
    if (!game.dialogueQueue.length) {
      ui.dialogue.classList.add("hidden");
      game.busy = false;
      if (game.dialogueDone) {
        const cb = game.dialogueDone;
        game.dialogueDone = null;
        cb();
      }
      return;
    }
    const line = game.dialogueQueue.shift();
    ui.dialogueName.textContent = line.name;
    ui.dialogueText.textContent = line.text;
  }

  ui.dialogueNext.addEventListener("click", advanceDialogue);

  function showChoice(title, text, onChoice) {
    game.busy = true;
    game.choiceDone = onChoice;
    ui.choiceTitle.textContent = title;
    ui.choiceText.textContent = text;
    ui.choice.classList.remove("hidden");
  }

  ui.choiceYes.addEventListener("click", () => {
    ui.choice.classList.add("hidden");
    game.busy = false;
    if (game.choiceDone) game.choiceDone(true);
  });

  ui.choiceNo.addEventListener("click", () => {
    ui.choice.classList.add("hidden");
    game.busy = false;
    if (game.choiceDone) game.choiceDone(false);
  });

  function clearOverlay() {
    ui.overlay.classList.add("hidden");
    ui.overlay.innerHTML = "";
    game.minigameCleanup = null;
    game.busy = false;
  }

  function openOverlay(html) {
    game.busy = true;
    ui.overlay.innerHTML = html;
    ui.overlay.classList.remove("hidden");
  }

  function objectiveTarget() {
    const lookup = {
      l1_talk_foreman: { x: 13 * TILE, y: 14 * TILE },
      l1_fix_truck: { x: 22 * TILE, y: 18 * TILE },
      l1_talk_foreman2: { x: 13 * TILE, y: 14 * TILE },
      l1_find_mayor: { x: MAYOR_HOUSE_DOOR.x, y: MAYOR_HOUSE_DOOR.y },
      l1_race: { x: 27 * TILE, y: 8 * TILE },
      l2_talk_cleaner: { x: 16 * TILE, y: 27 * TILE },
      l2_find_key: { x: 20 * TILE, y: 34 * TILE },
      l2_memory: { x: 20 * TILE, y: 34 * TILE },
      l2_collect_trash: { x: 16 * TILE, y: 27 * TILE },
      l3_talk_farmer: { x: 52 * TILE, y: 31 * TILE },
      l3_help_worker: { x: 44 * TILE, y: 36 * TILE },
      l3_dam: { x: 44 * TILE, y: 36 * TILE },
      l3_barn_order: { x: 60 * TILE, y: 31 * TILE },
      l4_talk_principal: { x: 58 * TILE, y: 16 * TILE },
      l4_talk_kid: { x: ARCADE_DOOR.x, y: ARCADE_DOOR.y },
      l4_trivia: { x: ARCADE_DOOR.x, y: ARCADE_DOOR.y }
    };
    return lookup[game.quest] || null;
  }

  function startOpening() {
    game.scene = "opening";
    setObjective("Opening Cutscene", "Watch the story unfold.");
    showDialogue(
      [
        { name: "Narrator", text: "Once, this town was full of life..." },
        { name: "Narrator", text: "But somewhere along the way, people stopped working together." },
        { name: "Narrator", text: "You arrive at the town square to reconnect the community, bit by bit." }
      ],
      () => {
        game.scene = "select";
        showAvatarSelection();
      }
    );
  }

  function startTitle() {
    game.scene = "title";
    setObjective("Title Screen", "Click to begin.");
  }

  function showAvatarSelection() {
    openOverlay(`
      <div class="overlay-center">
        <h2>Choose Your Avatar</h2>
        <p>Cosmetic choice. All avatars play the same.</p>
        <div class="overlay-list" id="avatar-list">
          <button data-avatar="builder"><canvas class="avatar-face" data-avatar-face="builder" width="24" height="24"></canvas><canvas class="job-icon" data-job-icon="builder" width="24" height="24"></canvas><span>Builder</span></button>
          <button data-avatar="student"><canvas class="avatar-face" data-avatar-face="student" width="24" height="24"></canvas><canvas class="job-icon" data-job-icon="student" width="24" height="24"></canvas><span>Student</span></button>
          <button data-avatar="artist"><canvas class="avatar-face" data-avatar-face="artist" width="24" height="24"></canvas><canvas class="job-icon" data-job-icon="artist" width="24" height="24"></canvas><span>Artist</span></button>
          <button data-avatar="engineer"><canvas class="avatar-face" data-avatar-face="engineer" width="24" height="24"></canvas><canvas class="job-icon" data-job-icon="engineer" width="24" height="24"></canvas><span>Engineer</span></button>
        </div>
      </div>
    `);

    function drawJobIcon(canvas, role) {
      const c = canvas.getContext("2d");
      c.clearRect(0, 0, 24, 24);
      c.fillStyle = "#0f172a";
      c.fillRect(0, 0, 24, 24);
      c.fillStyle = "#dbeafe";
      c.fillRect(1, 1, 22, 22);
      c.fillStyle = "#1f2937";
      c.fillRect(2, 2, 20, 20);

      if (role === "builder") {
        c.fillStyle = "#f59e0b";
        c.fillRect(5, 14, 14, 4);
        c.fillRect(12, 6, 3, 8);
      } else if (role === "student") {
        c.fillStyle = "#60a5fa";
        c.fillRect(5, 6, 14, 12);
        c.fillStyle = "#e2e8f0";
        c.fillRect(7, 8, 10, 1);
        c.fillRect(7, 11, 10, 1);
        c.fillRect(7, 14, 7, 1);
      } else if (role === "artist") {
        c.fillStyle = "#fbbf24";
        c.fillRect(5, 8, 14, 10);
        c.fillStyle = "#ef4444";
        c.fillRect(7, 10, 2, 2);
        c.fillStyle = "#22c55e";
        c.fillRect(10, 12, 2, 2);
        c.fillStyle = "#3b82f6";
        c.fillRect(13, 9, 2, 2);
        c.fillStyle = "#a78bfa";
        c.fillRect(16, 13, 2, 2);
      } else if (role === "engineer") {
        c.fillStyle = "#94a3b8";
        c.fillRect(6, 9, 12, 6);
        c.fillRect(9, 6, 6, 12);
        c.fillStyle = "#0f172a";
        c.fillRect(10, 10, 4, 4);
      }
    }

    document.querySelectorAll("canvas[data-avatar-face]").forEach((face) => {
      const avatar = face.dataset.avatarFace;
      const fctx = face.getContext("2d");
      const sp = getSprite(avatar);
      fctx.drawImage(sp, 0, 0, 24, 24);
    });
    document.querySelectorAll("canvas[data-job-icon]").forEach((icon) => {
      drawJobIcon(icon, icon.dataset.jobIcon);
    });

    document.querySelectorAll("#avatar-list button").forEach((btn) => {
      btn.addEventListener("click", () => {
        player.avatar = btn.dataset.avatar;
        clearOverlay();
        game.scene = "world";
        game.level = 1;
        game.quest = "l1_talk_foreman";
        setObjective("Level 1: Town Hall", "Talk to the Foreman near the town hall.");
        showDialogue([
          { name: "System", text: "Level 1 unlocked: Rebuild the town hall and get the mayor on time." }
        ]);
      });
    });
  }

  function updateMusicButton() {
    if (!ui.musicToggle) return;
    ui.musicToggle.textContent = `Music: ${game.musicOn ? "On" : "Off"}`;
  }

  function ensureAudioContext() {
    if (game.audio) return game.audio;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    game.audio = new Ctx();
    return game.audio;
  }

  function playChipNote(freq, duration = 0.14, type = "square", gain = 0.05) {
    const audio = ensureAudioContext();
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.001, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(gain, audio.currentTime + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration + 0.015);
  }

  function startMusic() {
    const audio = ensureAudioContext();
    if (!audio || game.musicClock) return;
    const lead = [392, 440, 523.25, 440, 392, 329.63, 392, 523.25, 659.25, 523.25, 440, 392];
    const bass = [130.81, 130.81, 174.61, 174.61, 146.83, 146.83, 196, 196, 174.61, 174.61, 130.81, 130.81];
    game.musicClock = setInterval(() => {
      if (!game.musicOn) return;
      if (audio.state === "suspended") audio.resume();
      const i = game.musicStep % lead.length;
      playChipNote(lead[i], 0.15, "square", 0.045);
      if (i % 2 === 0) playChipNote(bass[i], 0.18, "triangle", 0.032);
      game.musicStep += 1;
    }, 170);
  }

  function stopMusic() {
    if (game.musicClock) {
      clearInterval(game.musicClock);
      game.musicClock = null;
    }
  }

  function toggleMusic() {
    game.musicOn = !game.musicOn;
    updateMusicButton();
    if (game.musicOn) {
      startMusic();
      const audio = ensureAudioContext();
      if (audio && audio.state === "suspended") audio.resume();
    } else {
      stopMusic();
    }
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function nearMayorHouseDoor() {
    return distance(player.x, player.y, MAYOR_HOUSE_DOOR.x, MAYOR_HOUSE_DOOR.y) < 58;
  }
  function nearSchoolDoor() {
    return distance(player.x, player.y, SCHOOL_DOOR.x, SCHOOL_DOOR.y) < 58;
  }
  function nearArcadeDoor() {
    return distance(player.x, player.y, ARCADE_DOOR.x, ARCADE_DOOR.y) < 58;
  }

  function enterMayorHouse() {
    game.worldReturn = { x: player.x, y: player.y };
    game.scene = "mayor_house";
    player.x = mayorRoom.doorX;
    player.y = mayorRoom.doorY - 12;
    setObjective("Level 1: Mayor House", "Find and wake the mayor inside.");
  }

  function exitMayorHouse() {
    game.scene = "world";
    player.x = game.worldReturn.x;
    player.y = game.worldReturn.y;
    setObjective("Level 1: Town Hall", game.quest === "l1_find_mayor" ? "Enter the mayor house and wake the mayor." : "Win the mayor dash mini-game.");
  }
  function enterSchool() {
    game.worldReturn = { x: player.x, y: player.y };
    game.scene = "school_interior";
    player.x = schoolRoom.doorX;
    player.y = schoolRoom.doorY - 12;
  }
  function exitSchool() {
    game.scene = "world";
    player.x = game.worldReturn.x;
    player.y = game.worldReturn.y;
  }
  function enterArcade() {
    game.worldReturn = { x: player.x, y: player.y };
    game.scene = "arcade_interior";
    player.x = arcadeRoom.doorX;
    player.y = arcadeRoom.doorY - 12;
    setObjective("Level 4: Education", game.quest === "l4_talk_kid" ? "Find the Arcade Kid inside." : "Beat the learning challenge.");
  }
  function exitArcade() {
    game.scene = "world";
    player.x = game.worldReturn.x;
    player.y = game.worldReturn.y;
    if (game.quest === "l4_talk_kid" || game.quest === "l4_trivia") {
      setObjective("Level 4: Education", "Go to the arcade door and challenge the kids.");
    }
  }

  function interact() {
    if (game.busy) return;

    if (game.scene === "mayor_house") {
      const nearMayor = distance(player.x, player.y, mayorRoom.mayorX, mayorRoom.mayorY) < 56;
      const nearExit = distance(player.x, player.y, mayorRoom.doorX, mayorRoom.doorY) < 56;

      if (nearMayor && game.quest === "l1_find_mayor") {
        showDialogue(
          [
            { name: "Mayor", text: "My alarm clock broke and I overslept!" },
            { name: "Mayor", text: "Help me get to town hall quickly. You now have extra time." }
          ],
          () => {
            game.quest = "l1_race";
            exitMayorHouse();
            setObjective("Level 1: Town Hall", "Win the mayor dash mini-game.");
            startRaceMinigame(() => {
              addUnity(22);
              showDialogue(
                [
                  { name: "Narrator", text: "The mayor cuts the ribbon. The crowd cheers." },
                  { name: "Narrator", text: "Unity rises as people begin working together again." }
                ],
                () => {
                  game.level = 2;
                  game.quest = "l2_talk_cleaner";
                  setObjective("Level 2: Town Park", "Go to the park and talk to the Head Cleaner.");
                }
              );
            });
          }
        );
        return;
      }

      if (nearExit) {
        exitMayorHouse();
      }
      return;
    }
    if (game.scene === "school_interior") {
      const nearExit = distance(player.x, player.y, schoolRoom.doorX, schoolRoom.doorY) < 56;
      if (nearExit) exitSchool();
      return;
    }
    if (game.scene === "arcade_interior") {
      const nearKid = distance(player.x, player.y, arcadeRoom.kidX, arcadeRoom.kidY) < 56;
      const nearExit = distance(player.x, player.y, arcadeRoom.doorX, arcadeRoom.doorY) < 56;
      if (nearKid && game.quest === "l4_talk_kid") {
        showDialogue(
          [
            { name: "Arcade Kid", text: "We already know everything. School is boring." },
            { name: "You", text: "There is always more to learn. Challenge me." }
          ],
          () => {
            game.quest = "l4_trivia";
            setObjective("Level 4: Education", "Beat the trivia + speed math challenge.");
            startTriviaMinigame(() => {
              addUnity(28);
              showDialogue(
                [
                  { name: "Arcade Kid", text: "Okay... you got me. There is more to learn." },
                  { name: "Narrator", text: "Students stream back to school. The town reaches full unity." }
                ],
                () => {
                  game.quest = "finale";
                  setObjective("Finale", "Celebrate the connected community.");
                  startFinalCutscene();
                }
              );
            });
          }
        );
        return;
      }
      if (nearExit) exitArcade();
      return;
    }

    if (game.scene !== "world") return;

    if (game.quest === "l1_find_mayor" && nearMayorHouseDoor()) {
      enterMayorHouse();
      return;
    }
    if (game.level >= 4 && nearSchoolDoor()) {
      enterSchool();
      return;
    }
    if ((game.quest === "l4_talk_kid" || game.quest === "l4_trivia") && nearArcadeDoor()) {
      enterArcade();
      return;
    }

    const nearNpc = findNearbyNpc();
    if (!nearNpc) return;

    handleNpcInteraction(nearNpc);
  }

  function findNearbyNpc() {
    const maxDist = 46;
    let best = null;
    let bestD = Infinity;
    for (const npc of visibleNpcs()) {
      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < maxDist && d < bestD) {
        best = npc;
        bestD = d;
      }
    }
    return best;
  }

  function visibleNpcs() {
    return npcs.filter((npc) => {
      if (npc.id === "driver") return ["l1_fix_truck"].includes(game.quest);
      if (npc.id === "mayor") return false;
      if (npc.id === "kid") return ["l2_find_key", "l2_memory"].includes(game.quest);
      if (npc.id === "worker") return ["l3_help_worker", "l3_dam"].includes(game.quest);
      if (npc.id === "arcadeKid") return false;
      if (npc.id === "foreman") return ["l1_talk_foreman", "l1_talk_foreman2"].includes(game.quest);
      if (npc.id === "cleaner") return ["l2_talk_cleaner", "l2_collect_trash"].includes(game.quest);
      if (npc.id === "farmer") return ["l3_talk_farmer", "l3_barn_order"].includes(game.quest);
      if (npc.id === "principal") return ["l4_talk_principal"].includes(game.quest);
      if (npc.id === "granny") return game.level >= 2;
      return true;
    });
  }

  function handleNpcInteraction(npc) {
    if (npc.id === "granny") {
      showDialogue([{ name: "Granny", text: "Nice day today, isn't it? This park is feeling alive again." }]);
      return;
    }

    switch (game.quest) {
      case "l1_talk_foreman":
        if (npc.id === "foreman") {
          showDialogue(
            [
              { name: "Foreman", text: "Town hall is crumbling and our concrete mixer truck is down." },
              { name: "Foreman", text: "Find the mixer driver and fix the wiring so we can rebuild." }
            ],
            () => {
              game.quest = "l1_fix_truck";
              setObjective("Level 1: Town Hall", "Find the mixer truck and repair it.");
            }
          );
        }
        break;

      case "l1_fix_truck":
        if (npc.id === "driver") {
          showDialogue(
            [{ name: "Mixer Driver", text: "Engine wiring is fried. Can you reconnect the circuits?" }],
            () => startWireMinigame(() => {
              game.quest = "l1_talk_foreman2";
              setObjective("Level 1: Town Hall", "Return to the Foreman.");
              showDialogue([{ name: "Mixer Driver", text: "You fixed it! I can deliver concrete now." }]);
            })
          );
        }
        break;

      case "l1_talk_foreman2":
        if (npc.id === "foreman") {
          showDialogue(
            [
              { name: "Foreman", text: "Town hall is rebuilt and ready for the ribbon cutting." },
              { name: "Foreman", text: "The mayor is missing. Check the mayor's house now!" }
            ],
            () => {
              game.quest = "l1_find_mayor";
              setObjective("Level 1: Town Hall", "Go to the Mayor House door and enter.");
            }
          );
        }
        break;

      case "l2_talk_cleaner":
        if (npc.id === "cleaner") {
          showDialogue(
            [
              { name: "Head Cleaner", text: "The park is covered in trash." },
              { name: "Head Cleaner", text: "Get a trash bag and shovel from the equipment shed." }
            ],
            () => {
              game.quest = "l2_find_key";
              setObjective("Level 2: Town Park", "The shed is locked. Find someone with the key.");
            }
          );
        }
        break;

      case "l2_find_key":
        if (npc.id === "kid") {
          showChoice("Help the Kid?", "The kid dropped ice cream and wants a new cone. Help?", (yes) => {
            if (!yes) {
              showDialogue([{ name: "Kid", text: "Please? I just need one cone..." }]);
              return;
            }
            showDialogue([{ name: "System", text: "Mini-game: Recreate the flavor stack." }], () => {
              game.quest = "l2_memory";
              setObjective("Level 2: Town Park", "Complete the ice cream memory mini-game.");
              startMemoryMinigame(() => {
                showDialogue(
                  [
                    { name: "Kid", text: "Wow! That is exactly what I wanted." },
                    { name: "Kid", text: "I found this key... you can have it!" }
                  ],
                  () => {
                    game.quest = "l2_collect_trash";
                    setObjective("Level 2: Town Park", "Collect 20 pieces of trash.");
                    startTrashMinigame(() => {
                      addUnity(22);
                      showDialogue(
                        [
                          { name: "Head Cleaner", text: "Great work. The park is sparkling again." },
                          { name: "Narrator", text: "Kids return to play and families gather in the park." }
                        ],
                        () => {
                          game.level = 3;
                          game.quest = "l3_talk_farmer";
                          setObjective("Level 3: Farmland", "Talk to the Head Farmer at the barn.");
                        }
                      );
                    });
                  }
                );
              });
            });
          });
        }
        break;

      case "l3_talk_farmer":
        if (npc.id === "farmer") {
          showDialogue(
            [
              { name: "Head Farmer", text: "Flooded river destroyed our fields." },
              { name: "Head Farmer", text: "Fix the overflow so we can supply the bakery." }
            ],
            () => {
              game.quest = "l3_help_worker";
              setObjective("Level 3: Farmland", "Talk to the dam worker by the river.");
            }
          );
        }
        break;

      case "l3_help_worker":
        if (npc.id === "worker") {
          showChoice("Help Build Dam?", "Our dam design leaks. Want to reconfigure the gates?", (yes) => {
            if (!yes) {
              showDialogue([{ name: "Dam Worker", text: "We cannot hold the flood without your help." }]);
              return;
            }
            game.quest = "l3_dam";
            setObjective("Level 3: Farmland", "Seal leaks in the dam control puzzle.");
            startDamMinigame(() => {
              showDialogue(
                [{ name: "Narrator", text: "The river calms down and the fields begin drying." }],
                () => {
                  game.quest = "l3_barn_order";
                  setObjective("Level 3: Farmland", "Process the bakery order inside the barn.");
                  startOrderMinigame(() => {
                    addUnity(24);
                    showDialogue(
                      [
                        { name: "Head Farmer", text: "Bakery ingredients are ready. You saved opening day!" },
                        { name: "Narrator", text: "The bakery opens to a line of happy customers." }
                      ],
                      () => {
                        game.level = 4;
                        game.quest = "l4_talk_principal";
                        setObjective("Level 4: Education", "Talk to the principal outside the school.");
                      }
                    );
                  });
                }
              );
            });
          });
        }
        break;

      case "l4_talk_principal":
        if (npc.id === "principal") {
          showDialogue(
            [
              { name: "Principal", text: "The school is empty. Students only stay at the arcade." },
              { name: "Principal", text: "Please show them learning can still be exciting." }
            ],
            () => {
              game.quest = "l4_talk_kid";
              setObjective("Level 4: Education", "Go to the arcade and find the kids.");
            }
          );
        }
        break;

      default:
        break;
    }
  }

  function startWireMinigame(onWin) {
    openOverlay(`
      <div class="overlay-center">
        <h2>Mini-game: Wire Color Match</h2>
        <p>Click a left socket color, then click the matching color on the right side to connect it.</p>
        <canvas id="wire-canvas" width="740" height="320" style="margin-top:10px;border:2px solid #6dd9ff;background:#0c1522;max-width:100%;"></canvas>
        <div id="wire-stat" class="stat"></div>
      </div>
    `);

    const wCanvas = document.getElementById("wire-canvas");
    const wctx = wCanvas.getContext("2d");
    const statEl = document.getElementById("wire-stat");
    const palette = [
      { name: "Red", color: "#ef4444" },
      { name: "Blue", color: "#3b82f6" },
      { name: "Green", color: "#22c55e" },
      { name: "Yellow", color: "#facc15" }
    ];
    const rightOrder = palette.slice().sort(() => Math.random() - 0.5);
    const leftNodes = palette.map((p, i) => ({ ...p, x: 120, y: 65 + i * 62 }));
    const rightNodes = rightOrder.map((p, i) => ({ ...p, x: 620, y: 65 + i * 62 }));
    const lines = [];
    let selected = null;
    let wrong = 0;

    function redraw() {
      wctx.fillStyle = "#0f172a";
      wctx.fillRect(0, 0, 740, 320);
      wctx.fillStyle = "#1e293b";
      wctx.fillRect(36, 28, 160, 264);
      wctx.fillRect(544, 28, 160, 264);

      for (const line of lines) {
        wctx.strokeStyle = line.color;
        wctx.lineWidth = 4;
        wctx.beginPath();
        wctx.moveTo(line.ax, line.ay);
        wctx.lineTo(line.bx, line.by);
        wctx.stroke();
      }

      for (const n of leftNodes) {
        wctx.fillStyle = n.color;
        wctx.beginPath();
        wctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = "#e2e8f0";
        wctx.font = "11px 'Press Start 2P'";
        wctx.fillText(n.name, n.x + 25, n.y + 4);
      }
      for (const n of rightNodes) {
        wctx.fillStyle = n.color;
        wctx.beginPath();
        wctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = "#e2e8f0";
        wctx.font = "11px 'Press Start 2P'";
        wctx.fillText(n.name, n.x - 95, n.y + 4);
      }

      if (selected) {
        wctx.strokeStyle = "#f8fafc";
        wctx.lineWidth = 2;
        wctx.strokeRect(selected.x - 20, selected.y - 20, 40, 40);
      }

      statEl.textContent = `Connected ${lines.length}/4 | Mistakes ${wrong}`;
    }

    function nearestNode(nodes, x, y) {
      for (const n of nodes) {
        if (Math.hypot(x - n.x, y - n.y) < 18) return n;
      }
      return null;
    }

    wCanvas.addEventListener("click", (e) => {
      const r = wCanvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * wCanvas.width;
      const y = ((e.clientY - r.top) / r.height) * wCanvas.height;

      const left = nearestNode(leftNodes, x, y);
      if (left) {
        if (!lines.find((l) => l.name === left.name)) selected = left;
        redraw();
        return;
      }

      const right = nearestNode(rightNodes, x, y);
      if (!right || !selected) return;
      if (lines.find((l) => l.name === selected.name)) return;

      if (right.name === selected.name) {
        lines.push({ name: selected.name, color: selected.color, ax: selected.x, ay: selected.y, bx: right.x, by: right.y });
        selected = null;
        redraw();
        if (lines.length === 4) {
          clearOverlay();
          onWin();
        }
      } else {
        wrong += 1;
        selected = null;
        redraw();
      }
    });

    redraw();
  }

  function startRaceMinigame(onWin) {
    openOverlay(`
      <div class="overlay-center">
        <h2>Mini-game: Mayor Dash</h2>
        <p>Drive to town hall. Dodge traffic, hit boosts, grab stars, and survive heavy streets.</p>
        <canvas id="race-canvas" width="760" height="360" style="margin-top:10px;border:2px solid #6dd9ff;background:#0d1320;max-width:100%;"></canvas>
        <div id="race-stats" class="stat"></div>
      </div>
    `);

    const raceCanvas = document.getElementById("race-canvas");
    const rctx = raceCanvas.getContext("2d");
    const statEl = document.getElementById("race-stats");
    const laneCenters = [205, 380, 555];
    let lane = 1;
    let laneX = laneCenters[1];
    let distance = 0;
    let hits = 0;
    let stars = 0;
    let timeLeft = 58;
    let spawnTimer = 0;
    let starTimer = 0;
    let boost = 0;
    let laneSwitchCooldown = 0;
    const cars = [];
    const boosts = [];
    const starPickups = [];
    const sparks = [];
    let roadScroll = 0;
    let running = true;
    let last = performance.now();

    function spawnTraffic() {
      const laneIndex = Math.floor(Math.random() * 3);
      cars.push({
        lane: laneIndex,
        y: -52,
        speed: 190 + Math.random() * 180,
        color: ["#ef4444", "#f59e0b", "#60a5fa", "#a78bfa"][Math.floor(Math.random() * 4)],
        kind: Math.random() > 0.82 ? "truck" : "car"
      });
    }
    function spawnBoost() {
      boosts.push({ lane: Math.floor(Math.random() * 3), y: -32 });
    }
    function spawnStar() {
      starPickups.push({ lane: Math.floor(Math.random() * 3), y: -26 });
    }
    function drawCar(cx, cy, color, kind = "car") {
      const w = kind === "truck" ? 56 : 44;
      const h = kind === "truck" ? 44 : 36;
      rctx.fillStyle = color;
      rctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      rctx.fillStyle = "#0f172a";
      rctx.fillRect(cx - w / 2 + 6, cy - h / 2 + 8, w - 12, h / 2 - 6);
      rctx.fillStyle = "#f8fafc";
      rctx.fillRect(cx - w / 2 + 6, cy + h / 2 - 7, 10, 6);
      rctx.fillRect(cx + w / 2 - 16, cy + h / 2 - 7, 10, 6);
    }
    function tick(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      laneSwitchCooldown -= dt;
      if (laneSwitchCooldown <= 0) {
        if ((keys.has("ArrowLeft") || keys.has("a")) && lane > 0) {
          lane -= 1;
          laneSwitchCooldown = 0.12;
        } else if ((keys.has("ArrowRight") || keys.has("d")) && lane < 2) {
          lane += 1;
          laneSwitchCooldown = 0.12;
        }
      }
      laneX += (laneCenters[lane] - laneX) * Math.min(1, dt * 10);

      spawnTimer += dt;
      starTimer += dt;
      if (spawnTimer > 0.5) {
        spawnTimer = 0;
        if (Math.random() > 0.28) spawnTraffic();
        if (Math.random() > 0.84) spawnBoost();
      }
      if (starTimer > 1.6) {
        starTimer = 0;
        if (Math.random() > 0.45) spawnStar();
      }

      const baseSpeed = 210;
      if (boost > 0) boost -= dt;
      const travel = baseSpeed + (boost > 0 ? 180 : 0);
      distance += dt * travel * 0.05;
      timeLeft -= dt;
      roadScroll += dt * (boost > 0 ? 440 : 320);

      for (const c of cars) c.y += c.speed * dt;
      for (const b of boosts) b.y += 255 * dt;
      for (const s of starPickups) s.y += 235 * dt;

      const px = laneX;
      const py = 294;

      for (const c of cars) {
        const hitBox = c.kind === "truck" ? 38 : 30;
        if (Math.abs(c.y - py) < hitBox && c.lane === lane) {
          hits += 1;
          c.y = 460;
          distance = Math.max(0, distance - 8);
          for (let i = 0; i < 12; i += 1) {
            sparks.push({
              x: px,
              y: py - 4,
              vx: -90 + Math.random() * 180,
              vy: -140 + Math.random() * 120,
              life: 0.55
            });
          }
        }
      }
      for (const b of boosts) {
        if (Math.abs(b.y - py) < 24 && b.lane === lane) {
          boost = 2.15;
          b.y = 420;
        }
      }
      for (const s of starPickups) {
        if (Math.abs(s.y - py) < 26 && s.lane === lane) {
          stars += 1;
          distance += 2.8;
          s.y = 420;
        }
      }

      for (const p of sparks) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 210 * dt;
        p.life -= dt;
      }

      for (let i = cars.length - 1; i >= 0; i -= 1) if (cars[i].y > 380) cars.splice(i, 1);
      for (let i = boosts.length - 1; i >= 0; i -= 1) if (boosts[i].y > 390) boosts.splice(i, 1);
      for (let i = starPickups.length - 1; i >= 0; i -= 1) if (starPickups[i].y > 390) starPickups.splice(i, 1);
      for (let i = sparks.length - 1; i >= 0; i -= 1) if (sparks[i].life <= 0) sparks.splice(i, 1);

      rctx.fillStyle = "#111827";
      rctx.fillRect(0, 0, 760, 360);
      for (let i = 0; i < 3; i += 1) {
        const laneX = laneCenters[i] - 70;
        rctx.fillStyle = "#1f2937";
        rctx.fillRect(laneX, 0, 140, 360);
      }
      rctx.fillStyle = "#0f1725";
      rctx.fillRect(0, 0, 120, 360);
      rctx.fillRect(640, 0, 120, 360);
      rctx.strokeStyle = "#a8b5c8";
      rctx.setLineDash([16, 16]);
      rctx.beginPath();
      rctx.moveTo(295, (roadScroll % 32) - 32);
      rctx.lineTo(295, 360);
      rctx.moveTo(465, (roadScroll % 32) - 32);
      rctx.lineTo(465, 360);
      rctx.stroke();
      rctx.setLineDash([]);

      for (const b of boosts) {
        const x = laneCenters[b.lane];
        rctx.fillStyle = "#22d3ee";
        rctx.fillRect(x - 18, b.y - 16, 36, 26);
      }
      for (const s of starPickups) {
        const x = laneCenters[s.lane];
        rctx.fillStyle = "#fde047";
        rctx.beginPath();
        rctx.arc(x, s.y, 11, 0, Math.PI * 2);
        rctx.fill();
      }
      for (const c of cars) {
        drawCar(laneCenters[c.lane], c.y, c.color, c.kind);
      }
      drawCar(px, py, boost > 0 ? "#34d399" : "#facc15", "car");
      for (const p of sparks) {
        rctx.globalAlpha = Math.max(0, p.life * 2);
        rctx.fillStyle = "#fca5a5";
        rctx.fillRect(p.x, p.y, 3, 3);
      }
      rctx.globalAlpha = 1;
      rctx.fillStyle = "rgba(0,0,0,0.45)";
      rctx.fillRect(12, 12, 240, 48);
      rctx.fillStyle = "#d7f4ff";
      rctx.font = "12px 'Press Start 2P'";
      rctx.fillText("MAYOR DASH", 22, 34);
      rctx.fillStyle = "#7ee7ff";
      rctx.fillRect(22, 42, 200, 10);
      rctx.fillStyle = "#facc15";
      rctx.fillRect(22, 42, Math.min(200, (distance / 220) * 200), 10);

      statEl.textContent = `Time ${Math.ceil(timeLeft)}s | Distance ${Math.floor(distance)}/220 | Stars ${stars} | Hits ${hits} ${
        boost > 0 ? "| BOOST!" : ""
      }`;

      if (distance >= 220) {
        cleanup();
        onWin();
        return;
      }
      if (timeLeft <= 0 || hits >= 12) {
        cleanup();
        showDialogue([{ name: "Mayor", text: "Traffic got us. Try one more run!" }], () => startRaceMinigame(onWin));
        return;
      }
      requestAnimationFrame(tick);
    }
    function cleanup() {
      running = false;
      clearOverlay();
    }

    game.minigameCleanup = cleanup;
    requestAnimationFrame(tick);
  }

  function startMemoryMinigame(onWin) {
    const flavors = ["Vanilla", "Strawberry", "Chocolate", "Mint", "Mango", "Blueberry"];
    const sequence = Array.from({ length: 5 }, () => flavors[Math.floor(Math.random() * flavors.length)]);
    let input = [];
    let showing = true;
    let timer = 4;

    openOverlay(`
      <div class="overlay-center">
        <h2>Mini-game: Ice Cream Memory</h2>
        <p id="memory-info">Memorize this stack: <strong>${sequence.join(" -> ")}</strong></p>
        <div id="memory-buttons" class="overlay-list"></div>
      </div>
    `);

    const info = document.getElementById("memory-info");
    const buttonsWrap = document.getElementById("memory-buttons");

    const interval = setInterval(() => {
      timer -= 1;
      if (timer <= 0 && showing) {
        showing = false;
        info.textContent = "Now build the same 5-scoop stack in order.";
        renderButtons();
      } else if (showing) {
        info.innerHTML = `Memorize this stack (${timer}s): <strong>${sequence.join(" -> ")}</strong>`;
      }
    }, 1000);

    function renderButtons() {
      buttonsWrap.innerHTML = flavors.map((f) => `<button data-flavor="${f}">${f}</button>`).join("");
      document.querySelectorAll("#memory-buttons button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const picked = btn.dataset.flavor;
          input.push(picked);
          info.textContent = `Your stack: ${input.join(" -> ")}`;

          const index = input.length - 1;
          if (input[index] !== sequence[index]) {
            cleanup();
            showDialogue([{ name: "System", text: "Wrong order. Try the ice cream challenge again." }], () => startMemoryMinigame(onWin));
            return;
          }

          if (input.length === sequence.length) {
            cleanup();
            onWin();
          }
        });
      });
    }

    function cleanup() {
      clearInterval(interval);
      clearOverlay();
    }

    game.minigameCleanup = cleanup;
  }

  function startTrashMinigame(onWin) {
    openOverlay(`
      <div class="overlay-center">
        <h2>Mini-game: Park Cleanup Rush</h2>
        <p>Vacuum trash waves, chain combos, avoid mud, and collect golden recyclables for big boosts.</p>
        <canvas id="trash-canvas" width="760" height="380" style="margin-top:10px;border:2px solid #7ac89d;background:#1a3a26;max-width:100%;"></canvas>
        <div id="trash-stats" class="stat"></div>
      </div>
    `);

    const tCanvas = document.getElementById("trash-canvas");
    const tctx = tCanvas.getContext("2d");
    const statEl = document.getElementById("trash-stats");
    const playerBot = { x: 380, y: 300, r: 13 };
    const trash = [];
    const mud = [];
    const particles = [];
    let spawnTimer = 0;
    for (let i = 0; i < 40; i += 1) {
      trash.push({ x: 40 + Math.random() * 680, y: 30 + Math.random() * 300, rare: Math.random() > 0.88 });
    }
    for (let i = 0; i < 10; i += 1) {
      mud.push({ x: 70 + Math.random() * 640, y: 50 + Math.random() * 280, r: 18 + Math.random() * 16 });
    }
    let score = 0;
    let collected = 0;
    let combo = 0;
    let comboTimer = 0;
    let timeLeft = 72;
    let running = true;
    let last = performance.now();

    function tick(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      spawnTimer += dt;
      if (spawnTimer > 2.2 && trash.length < 55) {
        spawnTimer = 0;
        for (let i = 0; i < 3; i += 1) {
          trash.push({ x: 35 + Math.random() * 690, y: 30 + Math.random() * 305, rare: Math.random() > 0.86 });
        }
      }

      let speed = 175;
      for (const p of mud) {
        if (Math.hypot(playerBot.x - p.x, playerBot.y - p.y) < p.r + playerBot.r) speed = 100;
      }
      if (keys.has("ArrowLeft") || keys.has("a")) playerBot.x -= speed * dt;
      if (keys.has("ArrowRight") || keys.has("d")) playerBot.x += speed * dt;
      if (keys.has("ArrowUp") || keys.has("w")) playerBot.y -= speed * dt;
      if (keys.has("ArrowDown") || keys.has("s")) playerBot.y += speed * dt;
      playerBot.x = Math.max(20, Math.min(740, playerBot.x));
      playerBot.y = Math.max(20, Math.min(360, playerBot.y));

      for (let i = trash.length - 1; i >= 0; i -= 1) {
        const p = trash[i];
        if (Math.hypot(playerBot.x - p.x, playerBot.y - p.y) < 22) {
          combo = Math.min(8, combo + 1);
          comboTimer = 1.8;
          collected += 1;
          score += p.rare ? 5 + combo : 2 + Math.floor(combo / 2);
          for (let j = 0; j < 7; j += 1) {
            particles.push({
              x: p.x,
              y: p.y,
              vx: -70 + Math.random() * 140,
              vy: -110 + Math.random() * 120,
              life: 0.65,
              c: p.rare ? "#fde047" : "#fca5a5"
            });
          }
          trash.splice(i, 1);
        }
      }
      if (comboTimer > 0) comboTimer -= dt;
      else combo = 0;
      for (const m of particles) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.vy += 180 * dt;
        m.life -= dt;
      }
      for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
      timeLeft -= dt;

      tctx.fillStyle = "#2f7b4f";
      tctx.fillRect(0, 0, 760, 380);
      tctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let y = 0; y < 380; y += 16) tctx.fillRect(0, y, 760, 1);
      for (const p of mud) {
        tctx.fillStyle = "#5a4b34";
        tctx.beginPath();
        tctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        tctx.fill();
      }
      for (const p of trash) {
        tctx.fillStyle = p.rare ? "#fde047" : "#fca5a5";
        tctx.fillRect(p.x - 6, p.y - 6, 12, 12);
      }
      for (const m of particles) {
        tctx.globalAlpha = Math.max(0, m.life * 1.5);
        tctx.fillStyle = m.c;
        tctx.fillRect(m.x, m.y, 3, 3);
      }
      tctx.globalAlpha = 1;
      tctx.fillStyle = "#22d3ee";
      tctx.fillRect(playerBot.x - 10, playerBot.y - 12, 20, 24);
      tctx.fillStyle = "#0f172a";
      tctx.fillRect(playerBot.x - 6, playerBot.y - 9, 12, 7);
      tctx.fillStyle = "rgba(0,0,0,0.45)";
      tctx.fillRect(12, 12, 258, 50);
      tctx.fillStyle = "#c8f7d6";
      tctx.font = "12px 'Press Start 2P'";
      tctx.fillText("CLEANUP RUSH", 22, 34);
      tctx.fillStyle = "#60d394";
      tctx.fillRect(22, 43, 220, 10);
      tctx.fillStyle = "#fde047";
      tctx.fillRect(22, 43, Math.min(220, (score / 70) * 220), 10);
      statEl.textContent = `Score ${score}/70 | Collected ${collected} | Trash Live ${trash.length} | Time ${Math.ceil(
        timeLeft
      )}s | Combo x${combo}`;

      if (score >= 70 || collected >= 48) {
        cleanup();
        onWin();
        return;
      }
      if (timeLeft <= 0) {
        cleanup();
        showDialogue([{ name: "System", text: "Park still has litter. Try the cleanup rush again." }], () => startTrashMinigame(onWin));
        return;
      }
      requestAnimationFrame(tick);
    }

    function cleanup() {
      running = false;
      clearOverlay();
    }

    game.minigameCleanup = cleanup;
    requestAnimationFrame(tick);
  }

  function startDamMinigame(onWin) {
    openOverlay(`
      <div class="overlay-center">
        <h2>Mini-game: Flood Control</h2>
        <p>Clear rule: red blocks are active leaks. Click red leaks as they appear to reduce pressure and prevent dam failure.</p>
        <canvas id="dam-canvas" width="760" height="320" style="margin-top:10px;border:2px solid #6dd9ff;background:#102236;max-width:100%;"></canvas>
        <div id="dam-stats" class="stat"></div>
      </div>
    `);

    const dCanvas = document.getElementById("dam-canvas");
    const dctx = dCanvas.getContext("2d");
    const statEl = document.getElementById("dam-stats");
    const cells = Array.from({ length: 18 }, () => ({ state: "safe", timer: 0 }));
    let fixed = 0;
    let pressure = 18;
    let timeLeft = 46;
    let running = true;
    let last = performance.now();
    let spawnCooldown = 0;

    function activateLeak() {
      const candidates = cells.filter((c) => c.state === "safe");
      if (!candidates.length) return;
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      c.state = "leak";
      c.timer = 4 + Math.random() * 2;
    }

    dCanvas.addEventListener("click", (e) => {
      if (!running) return;
      const rect = dCanvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * dCanvas.width;
      const py = ((e.clientY - rect.top) / rect.height) * dCanvas.height;
      const col = Math.floor((px - 70) / 52);
      const row = Math.floor((py - 56) / 78);
      if (col < 0 || col > 5 || row < 0 || row > 2) return;
      const idx = row * 6 + col;
      const c = cells[idx];
      if (c.state === "leak") {
        c.state = "fixed";
        c.timer = 2;
        fixed += 1;
        pressure = Math.max(0, pressure - 2.4);
      }
    });

    function tick(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      timeLeft -= dt;
      spawnCooldown -= dt;
      pressure += dt * 1.35;
      if (spawnCooldown <= 0) {
        spawnCooldown = 1.08;
        activateLeak();
        if (Math.random() > 0.72) activateLeak();
      }
      for (const c of cells) {
        if (c.state === "leak") {
          pressure += dt * 0.8;
        }
        if (c.state === "leak" || c.state === "fixed") {
          c.timer -= dt;
          if (c.timer <= 0) c.state = "safe";
        }
      }

      dctx.fillStyle = "#1c3552";
      dctx.fillRect(0, 0, 760, 320);
      dctx.fillStyle = "#2d79cc";
      dctx.fillRect(0, 0, 50, 320);
      dctx.fillRect(710, 0, 50, 320);
      for (let i = 0; i < cells.length; i += 1) {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const x = 70 + col * 52;
        const y = 56 + row * 78;
        dctx.fillStyle = cells[i].state === "leak" ? "#ef4444" : cells[i].state === "fixed" ? "#6dff9c" : "#4b5563";
        dctx.fillRect(x, y, 44, 64);
        dctx.fillStyle = "#111827";
        dctx.fillRect(x + 8, y + 10, 28, 10);
      }
      dctx.fillStyle = "rgba(0,0,0,0.5)";
      dctx.fillRect(12, 12, 286, 52);
      dctx.fillStyle = "#d5f0ff";
      dctx.font = "12px 'Press Start 2P'";
      dctx.fillText("DAM PRESSURE", 22, 34);
      dctx.fillStyle = "#1f2937";
      dctx.fillRect(22, 43, 250, 10);
      dctx.fillStyle = pressure > 75 ? "#ef4444" : pressure > 50 ? "#f59e0b" : "#6dff9c";
      dctx.fillRect(22, 43, Math.min(250, (pressure / 100) * 250), 10);
      statEl.textContent = `Fixed ${fixed}/24 | Active Leaks ${cells.filter((c) => c.state === "leak").length} | Pressure ${Math.floor(
        pressure
      )}% | Time ${Math.ceil(timeLeft)}s`;

      if (fixed >= 24) {
        cleanup();
        onWin();
        return;
      }
      if (timeLeft <= 0 || pressure >= 100) {
        cleanup();
        showDialogue([{ name: "Dam Worker", text: "Too many leaks. Let's try that flood control again." }], () => startDamMinigame(onWin));
        return;
      }
      requestAnimationFrame(tick);
    }
    function cleanup() {
      running = false;
      clearOverlay();
    }
    game.minigameCleanup = cleanup;
    requestAnimationFrame(tick);
  }

  function startOrderMinigame(onWin) {
    const order = {
      Wheat: 4,
      Eggs: 3,
      Milk: 2
    };
    const inv = {
      Wheat: 0,
      Eggs: 0,
      Milk: 0
    };

    function valid() {
      return Object.keys(order).every((k) => inv[k] === order[k]);
    }

    function draw() {
      openOverlay(`
        <div class="overlay-center">
          <h2>Mini-game: Barn Order Packing</h2>
          <p>Order: 4 Wheat, 3 Eggs, 2 Milk. Match exactly.</p>
          <div id="order-controls" style="margin-top:12px;display:grid;gap:8px;">
            ${Object.keys(inv)
              .map(
                (k) =>
                  `<div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;">
                    <button data-item-minus="${k}">< -1</button>
                    <span style="min-width:170px;">${k}: <strong>${inv[k]}</strong></span>
                    <button data-item="${k}">+1 ></button>
                  </div>`
              )
              .join("")}
          </div>
          <button id="submit-order">Submit Order</button>
          <div class="stat">Current: Wheat ${inv.Wheat}, Eggs ${inv.Eggs}, Milk ${inv.Milk}</div>
        </div>
      `);

      document.querySelectorAll("#order-controls button[data-item]").forEach((btn) => {
        btn.addEventListener("click", () => {
          inv[btn.dataset.item] += 1;
          draw();
        });
      });

      document.querySelectorAll("#order-controls button[data-item-minus]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.itemMinus;
          inv[key] = Math.max(0, inv[key] - 1);
          draw();
        });
      });

      document.getElementById("submit-order").addEventListener("click", () => {
        if (valid()) {
          clearOverlay();
          onWin();
        } else {
          showDialogue([{ name: "Farmer", text: "Not quite right. Check the quantities and try again." }]);
        }
      });
    }

    draw();
  }

  function startTriviaMinigame(onWin) {
    const questions = [
      {
        q: "What is 9 + 7?",
        options: ["16", "14", "18"],
        a: "16"
      },
      {
        q: "Water freezes at what temperature in Celsius?",
        options: ["0", "32", "-10"],
        a: "0"
      },
      {
        q: "Which skill helps communities understand each other?",
        options: ["Listening", "Ignoring", "Shouting"],
        a: "Listening"
      },
      {
        q: "What is 12 x 3?",
        options: ["36", "32", "42"],
        a: "36"
      },
      {
        q: "Which action builds unity?",
        options: ["Collaboration", "Isolation", "Blame"],
        a: "Collaboration"
      }
    ];

    let idx = 0;
    let score = 0;
    let timeLeft = 35;

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        cleanup();
        showDialogue([{ name: "System", text: "Time up. Try the challenge again." }], () => startTriviaMinigame(onWin));
      } else {
        render();
      }
    }, 1000);

    function render() {
      const current = questions[idx];
      openOverlay(`
        <div class="overlay-center">
          <h2>Mini-game: Learning Challenge</h2>
          <p>${current.q}</p>
          <div class="overlay-list" id="trivia-options">
            ${current.options.map((opt) => `<button data-opt="${opt}">${opt}</button>`).join("")}
          </div>
          <div class="stat">Question ${idx + 1}/${questions.length} | Score ${score} | Time ${timeLeft}s</div>
        </div>
      `);

      document.querySelectorAll("#trivia-options button").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.opt === current.a) score += 1;
          idx += 1;
          if (idx >= questions.length) {
            if (score >= 4) {
              cleanup();
              onWin();
            } else {
              cleanup();
              showDialogue([{ name: "Arcade Kid", text: "That was close. One more round?" }], () => startTriviaMinigame(onWin));
            }
            return;
          }
          render();
        });
      });
    }

    function cleanup() {
      clearInterval(interval);
      clearOverlay();
    }

    game.minigameCleanup = cleanup;
    render();
  }

  function startFinalCutscene() {
    game.scene = "ending";
    setUnity(100);
    for (let i = 0; i < 60; i += 1) {
      game.fireworks.push({
        x: Math.random() * canvas.width,
        y: 70 + Math.random() * 240,
        r: 1 + Math.random() * 2,
        life: 1,
        color: ["#ffe066", "#6dff9c", "#8be9ff", "#ff9f80"][Math.floor(Math.random() * 4)]
      });
    }

    showDialogue(
      [
        { name: "Narrator", text: "The town square glows with color, music, and celebration." },
        { name: "Narrator", text: "Unity doesn't come from one person..." },
        { name: "Narrator", text: "It comes from working together. Bit by bit." }
      ],
      () => {
        game.quest = "done";
        setObjective("Complete", "You rebuilt a connected community.");
      }
    );
  }

  function drawTile(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, TILE, TILE);
  }

  function drawWorld() {
    const camX = game.camera.x;
    const camY = game.camera.y;

    const tone = Math.max(0, 1 - game.unity / 120);
    const grassBase = `rgb(${Math.floor(42 + (1 - tone) * 42)}, ${Math.floor(92 + (1 - tone) * 65)}, ${Math.floor(
      48 + (1 - tone) * 32
    )})`;

    const startX = Math.floor(camX / TILE);
    const startY = Math.floor(camY / TILE);
    const endX = startX + Math.ceil(canvas.width / TILE) + 1;
    const endY = startY + Math.ceil(canvas.height / TILE) + 1;

    for (let ty = startY; ty <= endY; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;

        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;

        let color = grassBase;

        const asphalt = (tx >= 35 && tx <= 37) || (ty >= 34 && ty <= 36);
        if (asphalt) color = "#242d3c";

        const path = (tx >= 14 && tx <= 16) || (ty >= 16 && ty <= 18);
        if (path) color = "#be9c67";

        const inPark = tx >= zones.park.x && tx < zones.park.x + zones.park.w && ty >= zones.park.y && ty < zones.park.y + zones.park.h;
        if (inPark) color = game.level >= 2 ? "#4ea85d" : "#5e6f64";

        const inFarm = tx >= zones.farm.x && tx < zones.farm.x + zones.farm.w && ty >= zones.farm.y && ty < zones.farm.y + zones.farm.h;
        if (inFarm) color = game.level >= 3 ? "#8db84a" : "#69745c";

        const river = tx >= zones.river.x && tx < zones.river.x + zones.river.w && ty >= zones.river.y && ty < zones.river.y + zones.river.h;
        if (river) color = game.quest === "l3_dam" || game.level < 3 ? "#2d79cc" : "#56b8d6";

        drawTile(sx, sy, color);

        if (!river) {
          if ((tx + ty) % 3 === 0 && !path && !asphalt) {
            ctx.fillStyle = "rgba(255,255,255,0.035)";
            ctx.fillRect(sx + 1, sy + 4, TILE - 2, 1);
          }
          if ((tx * 13 + ty * 7) % 11 === 0 && (path || asphalt)) {
            ctx.fillStyle = "rgba(255,255,255,0.045)";
            ctx.fillRect(sx + 2, sy + 2, TILE - 4, 2);
          }
        }
      }
    }

    drawBuildings(camX, camY);
    drawScenery(camX, camY);
  }

  function drawSpriteWorld(name, wx, wy, size = 32) {
    const s = getSprite(name);
    ctx.drawImage(s, Math.floor(wx - game.camera.x), Math.floor(wy - game.camera.y), size, size);
  }

  function drawBuildings(camX, camY) {
    const buildings = [
      { x: zones.townHall.x, y: zones.townHall.y, w: zones.townHall.w, h: zones.townHall.h, title: "Town Hall" },
      { x: zones.mayorHouse.x, y: zones.mayorHouse.y, w: zones.mayorHouse.w, h: zones.mayorHouse.h, title: "Mayor House" },
      { x: zones.shed.x, y: zones.shed.y, w: zones.shed.w, h: zones.shed.h, title: "Equipment Shed" },
      { x: zones.barn.x, y: zones.barn.y, w: zones.barn.w, h: zones.barn.h, title: "Barn" },
      { x: zones.school.x, y: zones.school.y, w: zones.school.w, h: zones.school.h, title: "School" },
      { x: zones.arcade.x, y: zones.arcade.y, w: zones.arcade.w, h: zones.arcade.h, title: "Arcade" }
    ];

    for (const b of buildings) {
      const x = b.x * TILE - camX;
      const y = b.y * TILE - camY;
      const w = b.w * TILE;
      const h = b.h * TILE;

      const cracked = game.unity < 25;
      ctx.fillStyle = b.title === "Mayor House" ? "#5a5459" : cracked ? "#5a4f4f" : "#7f7467";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#2a2520";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      for (let i = 0; i < b.w; i += 2) {
        drawSpriteWorld("house", b.x * TILE + i * TILE + 8, b.y * TILE - 14, 36);
      }

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x, y + h - 18, w, 18);
      ctx.fillStyle = "#f7f1c6";
      ctx.font = "10px 'Press Start 2P'";
      ctx.fillText(b.title, x + 8, y + h - 5);

      if (b.title === "Mayor House") {
        const doorX = MAYOR_HOUSE_DOOR.x - camX - 14;
        const doorY = MAYOR_HOUSE_DOOR.y - camY - 14;
        ctx.fillStyle = "#0c0f15";
        ctx.fillRect(doorX, doorY, 28, 20);
        ctx.strokeStyle = game.quest === "l1_find_mayor" ? "#ffe169" : "#6ea9ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(doorX, doorY, 28, 20);
      }
      if (b.title === "School") {
        const doorX = SCHOOL_DOOR.x - camX - 14;
        const doorY = SCHOOL_DOOR.y - camY - 14;
        ctx.fillStyle = "#0c0f15";
        ctx.fillRect(doorX, doorY, 28, 20);
        ctx.strokeStyle = game.level >= 4 ? "#ffe169" : "#6ea9ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(doorX, doorY, 28, 20);
      }
      if (b.title === "Arcade") {
        const doorX = ARCADE_DOOR.x - camX - 14;
        const doorY = ARCADE_DOOR.y - camY - 14;
        ctx.fillStyle = "#0c0f15";
        ctx.fillRect(doorX, doorY, 28, 20);
        ctx.strokeStyle = game.quest === "l4_talk_kid" || game.quest === "l4_trivia" ? "#ffe169" : "#6ea9ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(doorX, doorY, 28, 20);
      }

      if (b.title === "Town Hall" && game.level >= 2) {
        ctx.strokeStyle = "#ff5c7a";
        ctx.beginPath();
        ctx.moveTo(x + 16, y - 6);
        ctx.lineTo(x + w - 16, y - 6);
        ctx.stroke();
      }
    }

    if (game.quest === "l1_fix_truck") {
      drawSpriteWorld("truck", zones.truckSpot.x * TILE + 12, zones.truckSpot.y * TILE + 16, 88);
    }
  }

  function drawScenery(camX, camY) {
    const trees = [
      [6, 8],
      [8, 9],
      [35, 8],
      [33, 10],
      [48, 20],
      [63, 42],
      [74, 25],
      [20, 44],
      [13, 23],
      [57, 20],
      [80, 18],
      [69, 41]
    ];

    for (const [tx, ty] of trees) {
      drawSpriteWorld("tree", tx * TILE - 4, ty * TILE - 8, 36);
    }

    for (const npc of visibleNpcs()) {
      drawSpriteWorld(npc.sprite, npc.x - 16, npc.y - 24, 38);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(npc.x - camX - 36, npc.y - camY - 38, 72, 14);
      ctx.fillStyle = "#f0f9ff";
      ctx.font = "8px 'Press Start 2P'";
      ctx.fillText(npc.name, npc.x - camX - 32, npc.y - camY - 28);
    }
  }

  function drawPlayer() {
    drawSpriteWorld(player.avatar, player.x - 16, player.y - 24, 38);
  }

  function drawObjectiveArrow() {
    const target = objectiveTarget();
    if (!target || game.busy || game.quest === "done") return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const angle = Math.atan2(dy, dx);
    const px = player.x - game.camera.x;
    const py = player.y - game.camera.y - 36 + Math.sin(performance.now() * 0.008) * 3;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = "#ffe16f";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawMayorHouseInterior() {
    ctx.fillStyle = "#2f5f37";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(0, y, canvas.width, 1);
    }

    ctx.fillStyle = "#1a1b1e";
    ctx.fillRect(mayorRoom.x - 8, mayorRoom.y - 8, mayorRoom.w + 16, mayorRoom.h + 16);
    ctx.fillStyle = "#504a4d";
    ctx.fillRect(mayorRoom.x, mayorRoom.y, mayorRoom.w, mayorRoom.h);
    ctx.fillStyle = "#262124";
    ctx.fillRect(mayorRoom.x, mayorRoom.y + mayorRoom.h - 36, mayorRoom.w, 36);

    for (let i = 0; i < 3; i += 1) {
      const bx = mayorRoom.x + 92 + i * 140;
      const by = mayorRoom.y - 10;
      ctx.fillStyle = "#4c99de";
      ctx.fillRect(bx, by, 34, 22);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(bx - 2, by + 2);
      ctx.lineTo(bx + 17, by - 16);
      ctx.lineTo(bx + 36, by + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f8f1d2";
      ctx.fillRect(bx + 10, by + 8, 10, 7);
    }

    ctx.fillStyle = "#111";
    ctx.fillRect(mayorRoom.mayorX - 48, mayorRoom.mayorY - 46, 98, 20);
    ctx.fillStyle = "#f5f7ff";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillText("Mayor", mayorRoom.mayorX - 30, mayorRoom.mayorY - 32);
    ctx.fillStyle = "#111";
    ctx.fillRect(mayorRoom.x + 14, mayorRoom.y + mayorRoom.h - 30, 174, 20);
    ctx.fillStyle = "#f3e6b8";
    ctx.fillText("Mayor House", mayorRoom.x + 20, mayorRoom.y + mayorRoom.h - 16);

    ctx.fillStyle = "#6e6159";
    ctx.fillRect(mayorRoom.x + 220, mayorRoom.y + 52, 160, 42);
    ctx.fillStyle = "#2c2522";
    ctx.fillRect(mayorRoom.x + 220, mayorRoom.y + 52, 160, 6);

    drawSpriteWorld("worker", mayorRoom.x + 8, mayorRoom.y + 166, 38);
    drawSpriteWorld("mayor", mayorRoom.mayorX - 18, mayorRoom.mayorY - 24, 38);
    drawPlayer();
  }
  function drawSchoolInterior() {
    ctx.fillStyle = "#2f5f37";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#8f7350";
    ctx.fillRect(schoolRoom.x - 8, schoolRoom.y - 8, schoolRoom.w + 16, schoolRoom.h + 16);
    ctx.fillStyle = "#c8aa76";
    ctx.fillRect(schoolRoom.x, schoolRoom.y, schoolRoom.w, schoolRoom.h);
    ctx.fillStyle = "#5a4730";
    ctx.fillRect(schoolRoom.x, schoolRoom.y + schoolRoom.h - 38, schoolRoom.w, 38);
    ctx.fillStyle = "#111";
    ctx.fillRect(schoolRoom.x + 18, schoolRoom.y + 18, 220, 28);
    ctx.fillStyle = "#f3e6b8";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillText("School", schoolRoom.x + 28, schoolRoom.y + 37);
    ctx.fillStyle = "#6e6159";
    ctx.fillRect(schoolRoom.x + 220, schoolRoom.y + 110, 260, 64);
    ctx.fillStyle = "#2c2522";
    ctx.fillRect(schoolRoom.x + 220, schoolRoom.y + 110, 260, 8);
    for (let i = 0; i < 6; i += 1) {
      drawSpriteWorld("kid", schoolRoom.x + 70 + i * 86, schoolRoom.y + 212, 34);
    }
    drawPlayer();
  }
  function drawArcadeInterior() {
    ctx.fillStyle = "#2a2339";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1326";
    ctx.fillRect(arcadeRoom.x - 8, arcadeRoom.y - 8, arcadeRoom.w + 16, arcadeRoom.h + 16);
    ctx.fillStyle = "#3d2f54";
    ctx.fillRect(arcadeRoom.x, arcadeRoom.y, arcadeRoom.w, arcadeRoom.h);
    ctx.fillStyle = "#221733";
    ctx.fillRect(arcadeRoom.x, arcadeRoom.y + arcadeRoom.h - 34, arcadeRoom.w, 34);
    ctx.fillStyle = "#111";
    ctx.fillRect(arcadeRoom.x + 20, arcadeRoom.y + 14, 170, 24);
    ctx.fillStyle = "#f3e6b8";
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillText("Arcade", arcadeRoom.x + 28, arcadeRoom.y + 30);
    const machines = [70, 196, 322, 448];
    for (const x of machines) {
      ctx.fillStyle = "#61b2ff";
      ctx.fillRect(arcadeRoom.x + x, arcadeRoom.y + 58, 64, 120);
      ctx.fillStyle = "#0f1724";
      ctx.fillRect(arcadeRoom.x + x + 8, arcadeRoom.y + 70, 48, 40);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(arcadeRoom.x + x + 22, arcadeRoom.y + 124, 20, 10);
    }
    ctx.fillStyle = "#111";
    ctx.fillRect(arcadeRoom.kidX - 55, arcadeRoom.kidY - 44, 112, 20);
    ctx.fillStyle = "#f5f7ff";
    ctx.fillText("Arcade Kid", arcadeRoom.kidX - 44, arcadeRoom.kidY - 30);
    drawSpriteWorld("kid", arcadeRoom.kidX - 18, arcadeRoom.kidY - 24, 38);
    drawPlayer();
  }

  function drawOpeningBackground() {
    const t = performance.now() * 0.001;
    ctx.fillStyle = "#10263a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
      ctx.fillRect(0, y, canvas.width, 1);
    }

    ctx.fillStyle = "#183149";
    ctx.fillRect(0, 320, canvas.width, 220);
    ctx.fillStyle = "#2a5d3a";
    ctx.fillRect(0, 430, canvas.width, 110);

    const pulse = 0.6 + Math.sin(t * 2.2) * 0.2;
    ctx.fillStyle = `rgba(145, 220, 255, ${pulse})`;
    ctx.font = "54px 'Press Start 2P'";
    ctx.fillText("BIT-BY-BIT", canvas.width / 2 - 285, 215);
    ctx.fillStyle = "#d7ecff";
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillText("A 16-bit community builder", canvas.width / 2 - 220, 255);
  }

  function drawTitlePrompt() {
    const blink = Math.sin(performance.now() * 0.005) > -0.1;
    ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
    ctx.fillRect(canvas.width / 2 - 220, 292, 440, 72);
    ctx.strokeStyle = "#8be9ff";
    ctx.strokeRect(canvas.width / 2 - 220, 292, 440, 72);
    if (blink) {
      ctx.fillStyle = "#f4faff";
      ctx.font = "12px 'Press Start 2P'";
      ctx.fillText("CLICK TO START", canvas.width / 2 - 126, 336);
    }
  }

  function drawEndingEffects(dt) {
    for (const p of game.fireworks) {
      p.life -= dt * 0.35;
      p.r += dt * 10;
      if (p.life < 0) {
        p.life = 1;
        p.r = 1;
        p.x = Math.random() * canvas.width;
        p.y = 50 + Math.random() * 250;
      }

      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function update(dt) {
    if (
      (game.scene === "world" ||
        game.scene === "ending" ||
        game.scene === "mayor_house" ||
        game.scene === "school_interior" ||
        game.scene === "arcade_interior") &&
      !game.busy
    ) {
      let mx = 0;
      let my = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) mx -= 1;
      if (keys.has("ArrowRight") || keys.has("d")) mx += 1;
      if (keys.has("ArrowUp") || keys.has("w")) my -= 1;
      if (keys.has("ArrowDown") || keys.has("s")) my += 1;

      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;

      const nx = player.x + mx * player.speed * dt;
      const ny = player.y + my * player.speed * dt;

      if (mx !== 0) player.dir = mx < 0 ? "left" : "right";
      if (my !== 0) player.dir = my < 0 ? "up" : "down";

      if (canMoveTo(nx, player.y)) player.x = nx;
      if (canMoveTo(player.x, ny)) player.y = ny;
    }

    if (game.scene === "world" || game.scene === "ending") {
      game.camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_W * TILE - canvas.width));
      game.camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_H * TILE - canvas.height));
    } else {
      game.camera.x = 0;
      game.camera.y = 0;
    }

    if (game.flashTimer > 0) game.flashTimer -= dt;
  }

  function render(dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (game.scene === "title") {
      drawOpeningBackground();
      drawTitlePrompt();
    } else if (game.scene === "opening") {
      drawOpeningBackground();
    } else if (game.scene === "mayor_house") {
      drawMayorHouseInterior();
    } else if (game.scene === "school_interior") {
      drawSchoolInterior();
    } else if (game.scene === "arcade_interior") {
      drawArcadeInterior();
    } else {
      drawWorld();
      drawPlayer();
      drawObjectiveArrow();
    }

    if (game.scene === "ending") {
      drawEndingEffects(dt);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(18, canvas.height - 104, canvas.width - 36, 86);
      ctx.fillStyle = "#ffe391";
      ctx.font = "14px 'Press Start 2P'";
      ctx.fillText("UNITY FESTIVAL", 36, canvas.height - 70);
      ctx.fillStyle = "#f4faff";
      ctx.font = "9px 'Press Start 2P'";
      ctx.fillText("Color returned to every street, classroom, field, and park.", 36, canvas.height - 46);
      ctx.fillText("You proved one thing: strong towns are built together.", 36, canvas.height - 28);
    }

    if (game.flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 200, ${game.flashTimer * 0.25})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!game.busy && game.scene === "world") {
      const near = findNearbyNpc();
      if (near) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(canvas.width / 2 - 180, canvas.height - 34, 360, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText(`Press SPACE to talk to ${near.name}`, canvas.width / 2 - 162, canvas.height - 18);
      } else if (game.quest === "l1_find_mayor" && nearMayorHouseDoor()) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(canvas.width / 2 - 214, canvas.height - 34, 428, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to enter Mayor House", canvas.width / 2 - 196, canvas.height - 18);
      } else if (game.level >= 4 && nearSchoolDoor()) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(canvas.width / 2 - 194, canvas.height - 34, 388, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to enter School", canvas.width / 2 - 172, canvas.height - 18);
      } else if ((game.quest === "l4_talk_kid" || game.quest === "l4_trivia") && nearArcadeDoor()) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.fillRect(canvas.width / 2 - 197, canvas.height - 34, 394, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to enter Arcade", canvas.width / 2 - 174, canvas.height - 18);
      }
    }

    if (!game.busy && game.scene === "mayor_house") {
      const nearMayor = distance(player.x, player.y, mayorRoom.mayorX, mayorRoom.mayorY) < 56;
      const nearExit = distance(player.x, player.y, mayorRoom.doorX, mayorRoom.doorY) < 56;
      if (nearMayor) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
        ctx.fillRect(canvas.width / 2 - 190, canvas.height - 34, 380, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to wake the Mayor", canvas.width / 2 - 168, canvas.height - 18);
      } else if (nearExit) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
        ctx.fillRect(canvas.width / 2 - 175, canvas.height - 34, 350, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to leave house", canvas.width / 2 - 153, canvas.height - 18);
      }
    }
    if (!game.busy && game.scene === "school_interior") {
      const nearExit = distance(player.x, player.y, schoolRoom.doorX, schoolRoom.doorY) < 56;
      if (nearExit) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
        ctx.fillRect(canvas.width / 2 - 183, canvas.height - 34, 366, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to leave school", canvas.width / 2 - 160, canvas.height - 18);
      }
    }
    if (!game.busy && game.scene === "arcade_interior") {
      const nearKid = distance(player.x, player.y, arcadeRoom.kidX, arcadeRoom.kidY) < 56;
      const nearExit = distance(player.x, player.y, arcadeRoom.doorX, arcadeRoom.doorY) < 56;
      if (nearKid && game.quest === "l4_talk_kid") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
        ctx.fillRect(canvas.width / 2 - 193, canvas.height - 34, 386, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to challenge kid", canvas.width / 2 - 170, canvas.height - 18);
      } else if (nearExit) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.76)";
        ctx.fillRect(canvas.width / 2 - 180, canvas.height - 34, 360, 22);
        ctx.fillStyle = "#9ff4ff";
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillText("Press SPACE to leave arcade", canvas.width / 2 - 158, canvas.height - 18);
      }
    }
  }

  document.addEventListener("keydown", (e) => {
    if (!game.audio) ensureAudioContext();
    if (game.musicOn && !game.musicClock) startMusic();
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.add(key);
    if (game.scene === "title" && (key === " " || key === "Enter")) {
      e.preventDefault();
      startOpening();
      return;
    }
    if (key === " " || key === "Enter") {
      e.preventDefault();
      if (ui.dialogue && !ui.dialogue.classList.contains("hidden")) {
        advanceDialogue();
      } else {
        interact();
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(key);
  });

  if (ui.musicToggle) {
    ui.musicToggle.addEventListener("click", () => {
      toggleMusic();
    });
  }
  canvas.addEventListener("click", () => {
    if (game.scene === "title") {
      if (!game.audio) ensureAudioContext();
      if (game.musicOn && !game.musicClock) startMusic();
      startOpening();
    }
  });
  updateMusicButton();

  setUnity(game.unity);
  startTitle();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render(dt);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

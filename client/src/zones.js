// client/src/zones.js
// Defines all interactive zones in the world.
// Coordinates are fractions of the background image (0–1), so they scale
// with any screen size automatically.
//
// x, y = top-left corner of zone (as fraction of image width/height)
// w, h = width/height of zone (as fraction)

export const ZONES = [
  {
    id: 'potion-lab',
    name: 'Potion Lab',
    description: 'Brew potions to boost your daily stats. Complete habits to unlock rare recipes.',
    icon: '⚗️',
    x: 0.02, y: 0.08,
    w: 0.32, h: 0.38,
  },
  {
    id: 'parchment-quill',
    name: 'Parchment & Quill',
    description: 'A scribe\'s shop. Track your quests and write in your adventurer\'s journal.',
    icon: '📜',
    x: 0.28, y: 0.04,
    w: 0.26, h: 0.32,
  },
  {
    id: 'lucky-cauldron',
    name: 'The Lucky Cauldron',
    description: 'A tavern where adventurers gather. Check the leaderboard and guild rankings.',
    icon: '🍺',
    x: 0.60, y: 0.06,
    w: 0.38, h: 0.38,
  },
  {
    id: 'curiosities',
    name: "Curiosities Shop",
    description: 'Mysterious wares for sale. Spend earned gold on cosmetics and player upgrades.',
    icon: '🔮',
    x: 0.02, y: 0.52,
    w: 0.26, h: 0.32,
  },
  {
    id: 'broomstick-museum',
    name: 'Broomstick Museum',
    description: 'House of achievements. View your completed challenges and earned trophies.',
    icon: '🏆',
    x: 0.52, y: 0.58,
    w: 0.46, h: 0.40,
  },
];

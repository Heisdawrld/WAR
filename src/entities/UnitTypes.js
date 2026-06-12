import * as THREE from 'three';

export const UNIT_TYPES = {
  swordsman: {
    name: 'Swordsman',
    icon: '⚔️',
    hp: 100,
    damage: 15,
    range: 2.5,
    speed: 5,
    attackSpeed: 1.0,
    color: 0xcc4444,
    special: 'shield',
    shieldChance: 0.25,
    size: 1.0
  },
  spearman: {
    name: 'Spearman',
    icon: '🗡️',
    hp: 80,
    damage: 12,
    range: 3.5,
    speed: 5,
    attackSpeed: 0.9,
    color: 0x44aa44,
    special: 'antiCavalry',
    bonusVsCavalry: 2.0,
    size: 1.0
  },
  archer: {
    name: 'Archer',
    icon: '🏹',
    hp: 60,
    damage: 10,
    range: 30,
    speed: 3.5,
    attackSpeed: 0.6,
    color: 0xccaa44,
    special: 'volley',
    volleyCount: 3,
    isRanged: true,
    projectileSpeed: 40,
    size: 0.9
  },
  knight: {
    name: 'Knight',
    icon: '🐴',
    hp: 150,
    damage: 25,
    range: 2.5,
    speed: 7,
    attackSpeed: 0.8,
    color: 0x8844cc,
    special: 'charge',
    chargeStun: 0.5,
    size: 1.3
  },
  horseman: {
    name: 'Horseman',
    icon: '🐎',
    hp: 90,
    damage: 18,
    range: 2.5,
    speed: 10,
    attackSpeed: 0.9,
    color: 0xcc8844,
    special: 'flank',
    flankBonus: 3.0,
    size: 1.2
  },
  musketeer: {
    name: 'Musketeer',
    icon: '🔫',
    hp: 70,
    damage: 20,
    range: 25,
    speed: 3,
    attackSpeed: 0.35,
    color: 0x4488cc,
    special: 'slowReload',
    reloadTime: 2.0,
    isRanged: true,
    projectileSpeed: 60,
    size: 0.95
  },
  giant: {
    name: 'Giant',
    icon: '👹',
    hp: 300,
    damage: 40,
    range: 4,
    speed: 2,
    attackSpeed: 0.5,
    color: 0x884422,
    special: 'aoe',
    aoeRadius: 5,
    size: 2.0
  },
  catapult: {
    name: 'Catapult',
    icon: '🏗️',
    hp: 50,
    damage: 60,
    range: 50,
    speed: 0,
    attackSpeed: 0.2,
    color: 0x886644,
    special: 'siege',
    aoeRadius: 6,
    isRanged: true,
    projectileSpeed: 25,
    projectileArc: 15,
    size: 1.8
  }
};

export const FORMATION_TYPES = {
  line: { name: 'Line', icon: '━━━', spacing: 3 },
  square: { name: 'Square', icon: '▣', spacing: 3 },
  circle: { name: 'Circle', icon: '◎', spacing: 4 },
  wedge: { name: 'Wedge', icon: '▼', spacing: 3 }
};

const REQUIRED_UNIT_FIELDS = ['name', 'icon', 'hp', 'damage', 'range', 'speed', 'attackSpeed', 'color', 'size'];

const REQUIRED_FORMATION_FIELDS = ['name', 'icon', 'spacing'];

export class DataLoader {
  static validateUnits(data) {
    if (!data || typeof data !== 'object') throw new Error('DataLoader.validateUnits: data must be an object');
    const units = data.units;
    if (!units || typeof units !== 'object') throw new Error('DataLoader.validateUnits: data.units must be an object');

    const result = new Map();

    for (const [id, def] of Object.entries(units)) {
      if (!def || typeof def !== 'object') {
        throw new Error(`DataLoader.validateUnits: unit "${id}" must be an object`);
      }

      for (const field of REQUIRED_UNIT_FIELDS) {
        if (!(field in def)) {
          throw new Error(`DataLoader.validateUnits: unit "${id}" missing required field "${field}"`);
        }
      }

      if (typeof def.hp !== 'number' || def.hp <= 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" hp must be > 0, got ${def.hp}`);
      }
      if (typeof def.damage !== 'number' || def.damage < 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" damage must be >= 0, got ${def.damage}`);
      }
      if (typeof def.range !== 'number' || def.range < 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" range must be >= 0, got ${def.range}`);
      }
      if (typeof def.speed !== 'number' || def.speed < 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" speed must be >= 0, got ${def.speed}`);
      }
      if (typeof def.attackSpeed !== 'number' || def.attackSpeed <= 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" attackSpeed must be > 0, got ${def.attackSpeed}`);
      }
      if (typeof def.size !== 'number' || def.size <= 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" size must be > 0, got ${def.size}`);
      }
      if (typeof def.name !== 'string' || def.name.length === 0) {
        throw new Error(`DataLoader.validateUnits: unit "${id}" name must be a non-empty string`);
      }

      const clamped = {
        ...def,
        hp: Math.max(1, Math.round(def.hp)),
        damage: Math.max(0, Math.round(def.damage)),
        range: Math.max(0, def.range),
        speed: Math.max(0, def.speed),
        attackSpeed: Math.max(0.01, def.attackSpeed),
        size: Math.max(0.01, def.size),
      };

      result.set(id, clamped);
    }

    return result;
  }

  static validateFormations(data) {
    if (!data || typeof data !== 'object') throw new Error('DataLoader.validateFormations: data must be an object');
    const formations = data.formations;
    if (!formations || typeof formations !== 'object') throw new Error('DataLoader.validateFormations: data.formations must be an object');

    const result = new Map();

    for (const [id, def] of Object.entries(formations)) {
      if (!def || typeof def !== 'object') {
        throw new Error(`DataLoader.validateFormations: formation "${id}" must be an object`);
      }
      for (const field of REQUIRED_FORMATION_FIELDS) {
        if (!(field in def)) {
          throw new Error(`DataLoader.validateFormations: formation "${id}" missing required field "${field}"`);
        }
      }
      result.set(id, { ...def, spacing: Math.max(1, def.spacing) });
    }

    return result;
  }

  static async loadUnits(url = '/src/data/units.json') {
    const res = await fetch(url);
    const data = await res.json();
    return DataLoader.validateUnits(data);
  }

  static async loadFormations(url = '/src/data/formations.json') {
    const res = await fetch(url);
    const data = await res.json();
    return DataLoader.validateFormations(data);
  }
}

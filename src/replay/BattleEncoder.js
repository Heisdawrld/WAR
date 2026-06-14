const TYPES = ['swordsman', 'spearman', 'archer', 'knight', 'horseman', 'musketeer', 'giant', 'catapult'];
const SIDES = ['red', 'blue'];

// Cross-platform base64 (works in both Node and browser)
const _encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function utf8ToBase64(str) {
  if (typeof btoa !== 'undefined') {
    // Browser path — btoa needs binary string
    const bytes = Array.from(new TextEncoder().encode(str), b => String.fromCharCode(b)).join('');
    return btoa(bytes);
  }
  return Buffer.from(str, 'utf-8').toString('base64');
}

function base64ToUtf8(b64) {
  if (typeof atob !== 'undefined') {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf-8');
}

export class BattleEncoder {
  static encode(setup) {
    if (!setup || typeof setup !== 'object') return null;
    try {
      const compact = {
        s: setup.seed,
        f: setup.formation || 'line',
        u: (setup.units || []).map(unit => {
          const ti = TYPES.indexOf(unit.type);
          if (ti === -1) throw new Error('bad type');
          const si = SIDES.indexOf(unit.side);
          if (si === -1) throw new Error('bad side');
          return [ti, Math.round(unit.x * 10), Math.round(unit.z * 10), si];
        }),
      };
      const json = JSON.stringify(compact);
      const b64 = utf8ToBase64(json);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~');
    } catch {
      return null;
    }
  }

  static decode(str) {
    if (typeof str !== 'string' || str.length === 0) return null;
    try {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=');
      const json = base64ToUtf8(b64);
      const compact = JSON.parse(json);
      if (!compact || !Array.isArray(compact.u)) return null;
      return {
        seed: compact.s,
        formation: compact.f || 'line',
        units: compact.u.map(([ti, x10, z10, si]) => ({
          type: TYPES[ti],
          x: x10 / 10,
          z: z10 / 10,
          side: SIDES[si],
        })),
      };
    } catch {
      return null;
    }
  }
}

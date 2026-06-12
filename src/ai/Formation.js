import * as THREE from 'three';
import { FORMATION_TYPES } from '../entities/UnitTypes.js';

export class Formation {
  constructor() {
    this.type = 'line';
  }

  setType(type) {
    if (FORMATION_TYPES[type]) this.type = type;
  }

  getPositions(count, center, facingDirection) {
    switch (this.type) {
      case 'line': return this.getLinePositions(count, center, facingDirection);
      case 'square': return this.getSquarePositions(count, center, facingDirection);
      case 'circle': return this.getCirclePositions(count, center);
      case 'wedge': return this.getWedgePositions(count, center, facingDirection);
      default: return this.getLinePositions(count, center, facingDirection);
    }
  }

  getLinePositions(count, center, facing) {
    const spacing = FORMATION_TYPES.line.spacing;
    const positions = [];
    const side = facing === 'red' ? -1 : 1;
    const perpX = 1;
    const perpZ = 0;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      positions.push(new THREE.Vector3(
        center.x + perpX * offset,
        0,
        center.z + perpZ * offset + side * 2
      ));
    }
    return positions;
  }

  getSquarePositions(count, center, facing) {
    const spacing = FORMATION_TYPES.square.spacing;
    const side = Math.ceil(Math.sqrt(count));
    const positions = [];
    const fwd = facing === 'red' ? -1 : 1;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / side);
      const col = i % side;
      positions.push(new THREE.Vector3(
        center.x + (col - (side - 1) / 2) * spacing,
        0,
        center.z + fwd * row * spacing
      ));
    }
    return positions;
  }

  getCirclePositions(count, center) {
    const spacing = FORMATION_TYPES.circle.spacing;
    const positions = [];
    const radius = Math.max(spacing * 2, Math.sqrt(count) * spacing * 0.6);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions.push(new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        0,
        center.z + Math.sin(angle) * radius
      ));
    }
    return positions;
  }

  getWedgePositions(count, center, facing) {
    const spacing = FORMATION_TYPES.wedge.spacing;
    const positions = [];
    const fwd = facing === 'red' ? -1 : 1;
    let placed = 0;
    let row = 0;

    while (placed < count) {
      const width = row + 1;
      for (let i = 0; i < width && placed < count; i++) {
        positions.push(new THREE.Vector3(
          center.x + (i - (width - 1) / 2) * spacing,
          0,
          center.z + fwd * row * spacing
        ));
        placed++;
      }
      row++;
    }
    return positions;
  }
}

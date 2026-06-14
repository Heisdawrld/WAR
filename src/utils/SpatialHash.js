export class SpatialHash {
  constructor(cellSize = 20) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  clear() {
    this.cells.clear();
  }

  insert(id, x, z) {
    const key = this._key(x, z);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(id);
  }

  queryRadius(x, z, radius) {
    const cs = this.cellSize;
    const minCx = Math.floor((x - radius) / cs);
    const maxCx = Math.floor((x + radius) / cs);
    const minCz = Math.floor((z - radius) / cs);
    const maxCz = Math.floor((z + radius) / cs);
    const result = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.cells.get(`${cx},${cz}`);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            result.push(bucket[i]);
          }
        }
      }
    }
    return result;
  }
}

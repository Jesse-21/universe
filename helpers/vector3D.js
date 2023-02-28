class Vector3D {
  constructor({ x, y, z }) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  normalize() {
    return {
      x: this.x || 0,
      y: this.y || 0,
      z: this.z || 0,
    };
  }
}

module.exports = { Vector3D };

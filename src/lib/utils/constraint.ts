
export class Constraint {
  constructor(public width: number, public height: number) {
  }

  static from(width: number, height: number) {
    return new Constraint(width, height);
  }

  clone() {
    return new Constraint(this.width, this.height);
  }

  small(width: number, height: number) {
    return Constraint.from(Math.min(this.width, width), Math.min(this.height, height));
  }

  sub(c: Constraint) {
    this.width = Math.max(this.width - c.width, 0)
    this.height = Math.max(this.height - c.height, 0)
    return this.clone();
  }
  subHorizontal(width: number) {
    this.width = Math.max(this.width - width, 0)
    return this.clone();
  }
}
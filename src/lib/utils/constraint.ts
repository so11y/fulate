export class Constraint<T extends Record<"width" | "height", number> = any> {
  isOverstep: boolean = false;
  constructor(public width: number, public height: number) {}

  static from(width: number, height: number) {
    return new Constraint(width, height);
  }

  clone() {
    return new Constraint(this.width, this.height);
  }

  small(width: number, height: number) {
    return Constraint.from(
      Math.min(this.width, width),
      Math.min(this.height, height)
    );
  }

  sub(c: T) {
    this._subWidth(c.width);
    this._subHeight(c.height);
    return this.clone();
  }

  subHorizontal(width: number) {
    this._subWidth(width);
    return this.clone();
  }

  subVertical(height: number) {
    this._subHeight(height);
    return this.clone();
  }

  ratioWidth(flex: number, count: number) {
    return Constraint.from(
      Math.max((this.width / count) * flex, 0),
      this.height
    );
  }

  ratioHeight(flex: number, count: number) {
    return Constraint.from(
      this.width,
      Math.max((this.height / count) * flex, 0)
    );
  }

  private _subWidth(_width: number) {
    const width = this.width - _width;
    this.width = Math.max(width, 0);
    if (width < 0) this.isOverstep = true;
  }

  private _subHeight(_height: number) {
    const height = this.height - _height;
    this.height = Math.max(height, 0);
    if (height < 0) this.isOverstep = true;
  }
}

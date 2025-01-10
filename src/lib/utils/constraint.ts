type ConstraintSize = Record<
  "minWidth" | "maxWidth" | "minHeight" | "maxHeight",
  number
>;

export class Constraint<T extends ConstraintSize = any> {
  isOverstep: boolean = false;

  constructor(
    public minWidth: number,
    public maxWidth: number,
    public minHeight: number,
    public maxHeight: number
  ) {}

  // 静态工厂方法
  static from(
    minWidth: number,
    maxWidth: number,
    minHeight: number,
    maxHeight: number
  ) {
    return new Constraint(minWidth, maxWidth, minHeight, maxHeight);
  }

  // 静态工厂方法
  static loose(maxWidth: number, maxHeight: number) {
    return new Constraint(0, maxWidth, 0, maxHeight);
  }

  static strict(width: number, height: number) {
    return new Constraint(width, width, height, height);
  }

  // 克隆当前实例
  clone() {
    return new Constraint(
      this.minWidth,
      this.maxWidth,
      this.minHeight,
      this.maxHeight
    );
  }

  // 返回一个新的 Constraint，其值为当前值和传入值的较小值
  small(
    minWidth: number,
    maxWidth: number,
    minHeight: number,
    maxHeight: number
  ) {
    return Constraint.from(
      Math.min(this.minWidth, minWidth),
      Math.min(this.maxWidth, maxWidth),
      Math.min(this.minHeight, minHeight),
      Math.min(this.maxHeight, maxHeight)
    );
  }

  // 减去另一个 Constraint 的值
  sub(c: T) {
    this._subMinWidth(c.minWidth);
    this._subMaxWidth(c.maxWidth);
    this._subMinHeight(c.minHeight);
    this._subMaxHeight(c.maxHeight);
    return this.clone();
  }

  // 减去水平方向的宽度
  subHorizontal(minWidth: number, maxWidth = 0) {
    this._subMinWidth(minWidth);
    this._subMaxWidth(maxWidth);
    return this.clone();
  }

  // 减去垂直方向的高度
  subVertical(minHeight: number, maxHeight = 0) {
    this._subMinHeight(minHeight);
    this._subMaxHeight(maxHeight);
    return this.clone();
  }

  // 根据比例计算宽度
  ratioWidth(flex: number, count: number) {
    return Constraint.from(
      Math.max((this.minWidth / count) * flex, 0),
      Math.max((this.maxWidth / count) * flex, 0),
      this.minHeight,
      this.maxHeight
    );
  }

  // 根据比例计算高度
  ratioHeight(flex: number, count: number) {
    return Constraint.from(
      this.minWidth,
      this.maxWidth,
      Math.max((this.minHeight / count) * flex, 0),
      Math.max((this.maxHeight / count) * flex, 0)
    );
  }

  compareSize<G extends Partial<{ width: number; height: number }>>(
    v: G
  ): Size {
    const size = new Size();

    if (v.width) {
      size.width = Math.max(v.width, this.minWidth);
    }

    if (v.height) {
      size.height = Math.max(v.height, this.minWidth);
    }

    if (v.width === undefined || v.width === Number.MAX_VALUE) {
      size.width = this.maxHeight;
    }

    if (v.height === undefined || v.height === Number.MAX_VALUE) {
      size.height = this.maxHeight;
    }

    return size;
  }

  // 减去最小宽度
  private _subMinWidth(_minWidth: number) {
    const minWidth = this.minWidth - _minWidth;
    this.minWidth = Math.max(minWidth, 0);
    if (minWidth < 0) this.isOverstep = true;
  }

  // 减去最大宽度
  private _subMaxWidth(_maxWidth: number) {
    const maxWidth = this.maxWidth - _maxWidth;
    this.maxWidth = Math.max(maxWidth, 0);
    if (maxWidth < 0) this.isOverstep = true;
  }

  // 减去最小高度
  private _subMinHeight(_minHeight: number) {
    const minHeight = this.minHeight - _minHeight;
    this.minHeight = Math.max(minHeight, 0);
    if (minHeight < 0) this.isOverstep = true;
  }

  // 减去最大高度
  private _subMaxHeight(_maxHeight: number) {
    const maxHeight = this.maxHeight - _maxHeight;
    this.maxHeight = Math.max(maxHeight, 0);
    if (maxHeight < 0) this.isOverstep = true;
  }
}

export class Size {
  width: number;
  height: number;
  constructor(width?: number | undefined, height?: number | undefined) {
    this.width = width ?? 0;
    this.height = height ?? 0;
  }
}

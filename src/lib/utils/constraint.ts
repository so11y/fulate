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
  ) { }

  static from(
    minWidth: number,
    maxWidth: number,
    minHeight: number,
    maxHeight: number
  ) {
    return new Constraint(minWidth, maxWidth, minHeight, maxHeight);
  }

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
    this._subMinWidth(c.minWidth ?? 0);
    this._subMaxWidth(c.maxWidth ?? 0);
    this._subMinHeight(c.minHeight ?? 0);
    this._subMaxHeight(c.maxHeight ?? 0);
    return this.clone();
  }

  // 减去水平方向的宽度
  subHorizontal(maxWidth = 0) {
    // this._subMinWidth(minWidth);
    this._subMaxWidth(maxWidth);
    return this.clone();
  }

  // 减去垂直方向的高度
  subVertical(maxHeight = 0) {
    // this._subMinHeight(minHeight);
    this._subMaxHeight(maxHeight);
    return this.clone();
  }

  // 根据比例计算宽度
  ratioWidth(flex: number, count: number) {
    return Constraint.from(
      this.minWidth,
      count === 0 ? 0 : Math.max((this.maxWidth / count) * flex, 0),
      this.minHeight,
      this.maxHeight
    );
  }

  // 根据比例计算高度
  ratioHeight(flex: number, count: number) {
    return Constraint.from(
      this.minWidth,
      this.maxWidth,
      this.minHeight,
      count === 0 ? 0 : Math.max((this.maxHeight / count) * flex, 0)
    );
  }

  extend<
    G extends Partial<{
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
      width: number;
      height: number;
    }>
  >(v: G) {
    const maxHeight = v.height === Number.MAX_VALUE
      ? this.maxHeight : v.maxHeight ?? v.height ?? this.maxHeight;
    const maxWidth = v.width === Number.MAX_VALUE
      ? this.maxWidth
      : v.maxWidth ?? v.width ?? this.maxWidth;
    const k = {
      minWidth:
        v.width === Number.MAX_VALUE
          ? this.maxWidth
          : v.minWidth ?? this.minWidth,
      maxWidth,
      minHeight:
        v.height === Number.MAX_VALUE
          ? this.maxHeight
          : v.minHeight ?? this.minHeight,
      maxHeight
    };

    return Constraint.from(k.minWidth, k.maxWidth, k.minHeight, k.maxHeight);
  }

  compareSize<G extends Partial<{ width: number; height: number }>>(
    v: G
  ): Size {
    const size = new Size();
    if (v.width) {
      size.width = Math.min(
        Math.max(v.width, this.minWidth),
        this.maxWidth ?? Number.MAX_VALUE
      );
    }

    if (v.height) {
      size.height = Math.min(
        Math.max(v.height, this.minHeight),
        this.maxHeight ?? Number.MAX_VALUE
      );
    }

    if (v.width === undefined || v.width === Number.MAX_VALUE) {
      size.width = this.minWidth ?? this.maxWidth;
    }

    if (v.height === undefined || v.height === Number.MAX_VALUE) {
      size.height = this.minHeight ?? this.maxHeight;
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

  add(size: Size) {
    return new Size(
      this.width + (size.width ?? 0),
      this.height + (size.height ?? 0)
    );
  }
}

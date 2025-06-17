import { type Element } from "../base";

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
    const newConstraint = this.clone();
    newConstraint._subMaxWidth(maxWidth);
    return newConstraint;
  }

  // 减去垂直方向的高度
  subVertical(maxHeight = 0) {
    const newConstraint = this.clone();
    newConstraint._subMaxHeight(maxHeight);
    return newConstraint;
  }

  // 根据比例计算宽度
  ratioWidth(flex: number | undefined, count: number, defaultWidth: number) {
    if (flex === undefined)
      return Constraint.from(0, defaultWidth, this.minHeight, this.maxHeight);
    return Constraint.from(
      this.minWidth,
      count === 0 ? 0 : Math.max((this.maxWidth / count) * flex, 0),
      this.minHeight,
      this.maxHeight
    );
  }

  // 根据比例计算高度
  ratioHeight(flex: number | undefined, count: number, defaultHeight: number) {
    if (flex === undefined)
      return Constraint.from(this.minWidth, this.maxWidth, 0, defaultHeight);
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
  >(v: G = {} as G) {
    const maxHeight =
      v.maxHeight ??
      (v.height === Number.MAX_VALUE
        ? this.maxHeight
        : v.height ?? this.maxHeight);
    const maxWidth =
      v.maxWidth ??
      (v.width === Number.MAX_VALUE ? this.maxWidth : v.width ?? this.maxWidth);
    const k = {
      minWidth: v.minWidth ?? this.minWidth ?? 0,
      maxWidth: maxWidth, // Math.min(maxWidth, this.maxWidth),
      minHeight: v.minHeight ?? this.minHeight ?? 0,
      maxHeight: maxHeight //Math.min(maxHeight, this.maxHeight)
    };
    return Constraint.from(k.minWidth, k.maxWidth, k.minHeight, k.maxHeight);
  }

  getChildConstraint(v: Element) {
    return this.clone()
      .subHorizontal(v.padding.left + v.padding.right)
      .subVertical(v.padding.top + v.padding.bottom);
  }

  compareSize<G extends Partial<{ width: number; height: number }>>(
    v: G,
    e: Pick<Element, "display" | "padding">
  ): Size {
    const size = new Size();

    if (v.width) {
      size.width = Math.min(
        Math.max(v.width + e.padding.left + e.padding.right, this.minWidth),
        this.maxWidth ?? Number.MAX_VALUE
      );
    }

    if (v.height) {
      size.height = Math.min(
        Math.max(v.height + e.padding.top + e.padding.bottom, this.minHeight),
        this.maxHeight ?? Number.MAX_VALUE
      );
    }

    if (
      (v.width === undefined && e.display === "block") ||
      v.width === Number.MAX_VALUE
    ) {
      size.width = Math.max(this.minWidth, this.maxWidth);
    }
    //v.height === undefined ||
    if (v.height === Number.MAX_VALUE) {
      size.height = Math.max(this.minHeight, this.maxHeight);
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
    // if (minHeight < 0) this.isOverstep = true;
  }

  // 减去最大高度
  private _subMaxHeight(_maxHeight: number) {
    const maxHeight = this.maxHeight - _maxHeight;
    this.maxHeight = Math.max(maxHeight, 0);
    // if (maxHeight < 0) this.isOverstep = true;
  }
}

export class Size {
  width: number;
  height: number;
  constructor(width?: number | undefined, height?: number | undefined) {
    this.width = width ?? 0;
    this.height = height ?? 0;
  }

  add<T extends { width?: number; height?: number }>(size: T) {
    return new Size(
      this.width + (size.width ?? 0),
      this.height + (size.height ?? 0)
    );
  }
}

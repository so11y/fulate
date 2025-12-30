


type XY = {
    x: number,
    y: number
}

export type TOriginX = 'center' | 'left' | 'right' | number;
export type TOriginY = 'center' | 'top' | 'bottom' | number;

export const createVector = (from: XY, to: XY): Point =>
    new Point(to.x, to.y).subtract(from);

export class Point extends DOMPoint {

    constructor();
    constructor(x: number, y: number);
    constructor(point?: XY);
    constructor(arg0: number | XY = 0, y = 0) {
        let _x, _y;
        if (typeof arg0 === 'object') {
            _x = arg0.x;
            _y = arg0.y;
        } else {
            _x = arg0;
            _y = y;
        }
        super(_x, _y)
    }

    rotate(angleInRadians: number, center = ZERO): DOMPoint {
        const cos = Math.cos(angleInRadians);
        const sin = Math.sin(angleInRadians);
        const nx = (cos * (this.x - center.x)) - (sin * (this.y - center.y)) + center.x;
        const ny = (sin * (this.x - center.x)) + (cos * (this.y - center.y)) + center.y;
        return new DOMPoint(nx, ny);
    }

    subtract(that: XY) {
        return new Point(this.x - that.x, this.y - that.y);
    }

    eq(that: XY): boolean {
        return this.x === that.x && this.y === that.y;
    }

    min(that: XY): Point {
        return new Point(Math.min(this.x, that.x), Math.min(this.y, that.y));
    }

    max(that: XY): Point {
        return new Point(Math.max(this.x, that.x), Math.max(this.y, that.y));
    }

    divide(that: XY): Point {
        return new Point(this.x / that.x, this.y / that.y);
    }

    setX(x: number) {
        this.x = x;
        return this;
    }

    setY(y: number) {
        this.y = y;
        return this;
    }

}

export function makeBoundingBoxFromPoints(points: Point[]) {
    let left = 0, top = 0, width = 0, height = 0;
    for (let i = 0, len = points.length; i < len; i++) {
        const { x, y } = points[i];
        if (x > width || !i)
            width = x;
        if (x < left || !i)
            left = x;
        if (y > height || !i)
            height = y;
        if (y < top || !i)
            top = y;
    }
    return {
        left,
        top,
        width: width - left,
        height: height - top
    };
}

export const ZERO = new Point(0, 0);
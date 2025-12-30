import { cos, sin } from "./math";
import { degreesToRadians } from "./radiansDegreesConversion";




export function createTranslateMatrix(x: number, y: number): DOMMatrix {
    const matrix = new DOMMatrix();
    matrix.e = x;
    matrix.f = y;
    return matrix;
}

export function createRotateMatrix({ angle = 0 } = {}, { x = 0, y = 0 } = {}) {
    const angleRadiant = degreesToRadians(angle)
        , cosValue = cos(angleRadiant)
        , sinValue = sin(angleRadiant);
    return new DOMMatrix([
        cosValue, sinValue,
        -sinValue, cosValue,
        x ? x - (cosValue * x - sinValue * y) : 0,
        y ? y - (sinValue * x + cosValue * y) : 0
    ]);
}
import { halfPI } from "./constants.ts";
export function cos(angle: number) {
    if (angle === 0) {
        return 1;
    }
    const angleSlice = Math.abs(angle) / halfPI;
    switch (angleSlice) {
        case 1:
        case 3:
            return 0;
        case 2:
            return -1;
    }
    return Math.cos(angle);
}


export function sin(angle: number) {
    if (angle === 0) {
        return 0;
    }
    const angleSlice = angle / halfPI;
    const value = Math.sign(angle);
    switch (angleSlice) {
        case 1:
            return value;
        case 2:
            return 0;
        case 3:
            return -value;
    }
    return Math.sin(angle);
}

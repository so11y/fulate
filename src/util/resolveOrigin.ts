
const originOffset = {
    left: -0.5,
    top: -0.5,
    center: 0,
    bottom: 0.5,
    right: 0.5
} as const;
export const resolveOrigin = (originValue: number | keyof typeof originOffset) => typeof originValue === "string" ? originOffset[originValue] : originValue;
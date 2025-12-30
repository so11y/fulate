

import { PiBy180 } from "./constants.ts";
export const degreesToRadians = (degrees: number) => degrees * PiBy180;
export const radiansToDegrees = (radians: number) => radians / PiBy180;

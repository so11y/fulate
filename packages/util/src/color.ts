export const ColorUtil = {
  parse(val?: string) {
    if (!val || val === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

    if (val.startsWith("#")) {
      let hex = val.slice(1);
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }

    const match = val.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
        a: match[3] ? parseFloat(match[3]) : 1
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  },

  // 还原给 Canvas 用 (|0 是高效的向下取整)
  format({ r, g, b, a }: any) {
    return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
  },

  blend(base: string, overlay: string, opacity: number): string {
    const b = ColorUtil.parse(base);
    const o = ColorUtil.parse(overlay);
    return ColorUtil.format({
      r: b.r * (1 - opacity) + o.r * opacity,
      g: b.g * (1 - opacity) + o.g * opacity,
      b: b.b * (1 - opacity) + o.b * opacity,
      a: b.a * (1 - opacity) + o.a * opacity,
    });
  }
};

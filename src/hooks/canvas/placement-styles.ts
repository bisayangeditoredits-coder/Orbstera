export function defaultShapeStyle(accent: string) {
  return { fill: accent, stroke: 'transparent' as const, strokeWidth: 0 };
}

export function defaultLineStyle(accent: string) {
  return { fill: accent, stroke: accent, strokeWidth: 4 };
}

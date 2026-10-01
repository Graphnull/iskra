export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}
export type EnvelopeStage = keyof ADSR;
export const ENVELOPE_RANGES: Readonly<
  Record<EnvelopeStage, readonly [number, number]>
> = {
  attack: [0.003, 2],
  decay: [0.02, 8],
  sustain: [0, 1],
  release: [0.05, 4],
};
export function envelopeRatio(stage: EnvelopeStage, value: number): number {
  const [min, max] = ENVELOPE_RANGES[stage];
  return stage === "sustain"
    ? value
    : Math.log(value / min) / Math.log(max / min);
}
export function envelopeValue(stage: EnvelopeStage, ratio: number): number {
  const [min, max] = ENVELOPE_RANGES[stage],
    bounded = Math.min(1, Math.max(0, ratio));
  return stage === "sustain" ? bounded : min * (max / min) ** bounded;
}
export function envelopeText(stage: EnvelopeStage, value: number): string {
  return stage === "sustain"
    ? `${Math.round(value * 100)}%`
    : value < 1
      ? `${Math.round(value * 1000)} мс`
      : `${Number(value.toFixed(2))} с`;
}
// Each time stage has a logarithmic editing region so millisecond attacks remain draggable.
export function envelopeGeometry(value: ADSR) {
  const handles: Record<EnvelopeStage, { x: number; y: number }> = {
    attack: { x: 24 + envelopeRatio("attack", value.attack) * 64, y: 12 },
    decay: {
      x: 106 + envelopeRatio("decay", value.decay) * 64,
      y: 68 - value.sustain * 56,
    },
    sustain: { x: 190, y: 68 - value.sustain * 56 },
    release: { x: 220 + envelopeRatio("release", value.release) * 76, y: 68 },
  };
  const points: [number, number][] = [[12, 68]],
    floor = 0.0005;
  const ramp = (start: number, end: number, from: number, to: number) => {
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      points.push([
        start + (end - start) * t,
        68 - 56 * from * (to / from) ** t,
      ]);
    }
  };
  ramp(12, handles.attack.x, floor, 1);
  ramp(handles.attack.x, handles.decay.x, 1, Math.max(floor, value.sustain));
  points.push([handles.sustain.x, handles.sustain.y]);
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    points.push([
      handles.sustain.x + (handles.release.x - handles.sustain.x) * t,
      68 - 56 * value.sustain * Math.exp(-6.36 * t),
    ]);
  }
  return {
    handles,
    path: points
      .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
      .join(" "),
  };
}
export function envelopeDrag(
  value: ADSR,
  stage: EnvelopeStage,
  dx: number,
  dy: number,
): number {
  return envelopeValue(
    stage,
    envelopeRatio(stage, value[stage]) +
      (stage === "sustain" ? -dy / 56 : dx / (stage === "release" ? 76 : 64)),
  );
}

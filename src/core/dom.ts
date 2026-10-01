export type ElementClass<T extends Element> = { new(): T };
export function element<T extends Element>(selector: string, ctor: ElementClass<T>, root: ParentNode = document): T {
  const node = root.querySelector(selector);
  if (!(node instanceof ctor)) throw new Error(`Missing or invalid element: ${selector}`);
  return node;
}
export function byId<T extends HTMLElement>(id: string, ctor: ElementClass<T>): T {
  return element(`#${id}`, ctor);
}
export function targetElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}
export function audioContext(): AudioContext {
  const Constructor = window.AudioContext || window.webkitAudioContext;
  if (!Constructor) throw new Error('Web Audio is unavailable');
  return new Constructor();
}

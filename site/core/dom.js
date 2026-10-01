export function element(selector, ctor, root = document) {
    const node = root.querySelector(selector);
    if (!(node instanceof ctor))
        throw new Error(`Missing or invalid element: ${selector}`);
    return node;
}
export function byId(id, ctor) {
    return element(`#${id}`, ctor);
}
export function targetElement(event) {
    return event.target instanceof Element ? event.target : null;
}
export function audioContext() {
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor)
        throw new Error('Web Audio is unavailable');
    return new Constructor();
}

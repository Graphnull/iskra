import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import type { ComponentType } from "react";
import { required } from "./core/guards.js";
import { element } from "./core/dom.js";
import { Piano } from "./instruments/piano/piano-view.js";
import { Tenorion } from "./instruments/tenorion/tenorion-view.js";
import { Drums } from "./instruments/drums/drums-view.js";
import { Synth } from "./instruments/synth/synth-view.js";
import { Recorder } from "./instruments/recorder/recorder-view.js";
const MODES: Record<
  string,
  { View: ComponentType; title: string; sequencer: boolean }
> = {
  piano: { View: Piano, title: "Пианино на клавиатуре", sequencer: false },
  tenorion: {
    View: Tenorion,
    title: "Tenori-on — световая музыка",
    sequencer: true,
  },
  drums: { View: Drums, title: "Драм-машина", sequencer: true },
  synth: { View: Synth, title: "Синтезатор — волны и ноты", sequencer: true },
  recorder: { View: Recorder, title: "Запись семпла", sequencer: false },
};
const parameters = new URLSearchParams(location.search),
  mode = parameters.get("mode") ?? "piano";
const current = required(
  MODES[Object.hasOwn(MODES, mode) ? mode : "piano"] ?? MODES.piano,
  "piano view",
);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
element('meta[name="theme-color"]', HTMLMetaElement).content =
  theme === "light" ? "#f3f2ef" : "#191918";
function App() {
  useEffect(() => {
    document.title = current.title;
    document.body.classList.toggle("tenorion-mode", current.sequencer);
  }, []);
  const View = current.View;
  return <View />;
}
createRoot(element("#root", HTMLDivElement)).render(<App />);

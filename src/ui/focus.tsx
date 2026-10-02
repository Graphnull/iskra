import { useEffect, useState } from "react";
export function FocusIndicator({ compact = true }: { compact?: boolean }) {
  const [active, setActive] = useState(
    () => document.hasFocus() && !document.hidden,
  );
  useEffect(() => {
    const sync = () => setActive(document.hasFocus() && !document.hidden);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <button
      type="button"
      className={`${compact ? "live-focus" : "focus-control"}${active ? " is-focused" : ""}`}
      aria-label={active ? "Клавиатура активна" : "Активировать клавиатуру"}
      title={active ? "Клавиатура активна" : "Нажми, чтобы играть с клавиатуры"}
      onClick={(event) => {
        window.focus();
        event.currentTarget.focus();
        setActive(document.hasFocus() && !document.hidden);
      }}
    >
      {compact && "⌨"}
      <span className="focus-dot" aria-hidden="true" />
      {!compact && (
        <span aria-live="polite">
          {active ? "Клавиатура активна" : "Нажми, чтобы включить клавиатуру"}
        </span>
      )}
    </button>
  );
}

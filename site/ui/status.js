import { jsx as _jsx } from "react/jsx-runtime";
// Operational messages share one presentation and occupy no space when empty.
export function InstrumentStatus({ children, id, }) {
    return children ? (_jsx("p", { id: id, className: "instrument-status", role: "status", children: children })) : null;
}

// Operational messages share one presentation and occupy no space when empty.
export function InstrumentStatus({
  children,
  id,
}: {
  children: string;
  id?: string;
}) {
  return children ? (
    <p id={id} className="instrument-status" role="status">
      {children}
    </p>
  ) : null;
}

import type { ReactNode } from "react";

export function Page({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {lead ? <p className="muted">{lead}</p> : null}
      {children}
    </section>
  );
}

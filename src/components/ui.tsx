import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  CheckCheck,
  Globe2,
  Layers3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Scenario } from "../types.ts";
import { compact } from "../domain.ts";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "purple";
}) {
  return (
    <span className={`badge ${tone}`}>
      {tone === "green" && <Check size={12} />}
      {children}
    </span>
  );
}
export function ProtocolMark({
  scenario,
  small = false,
}: {
  scenario: Scenario;
  small?: boolean;
}) {
  return (
    <span
      className={`protocol-mark ${small ? "small" : ""} ${scenario.id}`}
      style={{ "--protocol-color": scenario.color } as CSSProperties}
    >
      {scenario.id === "mayan" ? (
        <Layers3 size={small ? 15 : 22} />
      ) : scenario.id === "jupiter" ? (
        <Globe2 size={small ? 15 : 22} />
      ) : scenario.id === "kamino" ? (
        <Boxes size={small ? 15 : 22} />
      ) : (
        <span>R</span>
      )}
    </span>
  );
}
export function ChainMark({ chain }: { chain: string }) {
  return (
    <span className={`chain-mark ${chain}`} aria-hidden="true">
      {chain === "ethereum" ? "♦" : "≋"}
    </span>
  );
}
export function PanelTitle({
  icon: Icon,
  title,
  right,
}: {
  icon?: LucideIcon;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="panel-title">
      <h3>
        {Icon && <Icon size={17} />}
        {title}
      </h3>
      {right}
    </div>
  );
}
export function Detail({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : ""}>{children}</dd>
    </div>
  );
}
export function TxHash({ hash }: { hash: string }) {
  return (
    <span title={hash} className="mono hash">
      {compact(hash)}
    </span>
  );
}
export function NextCard({
  label,
  button,
  onNext,
}: {
  label: string;
  button: string;
  onNext: () => void;
}) {
  return (
    <div className="next-card">
      <span>
        <CheckCheck size={17} />
        {label}
      </span>
      <button className="button primary" onClick={onNext}>
        {button}
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

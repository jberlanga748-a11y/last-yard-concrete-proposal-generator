import { formatOptionLabel } from "../../utils/formatting/display.js";

export function Badge({ children, className = "" }) {
  return <span className={`app-badge ${className}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <Badge className={`status-${status || "draft"}`}>{formatOptionLabel(status || "draft")}</Badge>;
}

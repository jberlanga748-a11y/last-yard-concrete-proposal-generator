export function formatOptionLabel(value) {
  if (!value) {
    return "Select";
  }

  const labels = {
    add_alternate: "Add Alternate",
    allowance: "Allowance",
    base_bid: "Base Bid",
    deduct_alternate: "Deduct Alternate",
    detail_notes: "Detail Notes",
    general_backup: "General Backup",
    gc_prime: "GC / Prime Contractor",
    plan_takeoff_sheet: "Plan Takeoff Sheet",
    public_municipal: "Public / Municipal",
    pricing_summary: "Pricing Summary",
    proposal_notes: "Proposal Notes",
    schedule_of_values: "Schedule of Values",
    shade_footing_estimate: "Shade Footing Estimate",
    takeoff_quantities: "Takeoff Quantities",
    unit_price: "Unit Price",
  };

  if (labels[value]) {
    return labels[value];
  }

  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDashboardDate(value) {
  if (!value) {
    return "Not saved";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return formatDisplayDate(value) || value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatCloudSyncTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatAssetFileSize(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

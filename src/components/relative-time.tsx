"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";

export function RelativeTime({ iso, prefix = "", suffix = "" }: { iso: string; prefix?: string; suffix?: string }) {
  const [label, setLabel] = useState("recently");
  useEffect(() => {
    setLabel(formatRelative(iso));
  }, [iso]);
  return (
    <span>
      {prefix}
      {label}
      {suffix}
    </span>
  );
}

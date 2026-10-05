"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecurityPosture } from "../hooks";

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Unverified response shape (see schemas/manage-auth.schema.ts) — rendered
 * as a generic key/value grid rather than fixed metric tiles so this doesn't
 * silently go blank if the real backend uses different field names.
 */
export function SecurityPostureCard() {
  const { data, isLoading, isError } = useSecurityPosture();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Security Posture
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <Skeleton key={key} className="h-14 rounded-lg" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load security posture.
          </p>
        )}
        {!isLoading && !isError && data && Object.keys(data).length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {formatLabel(key)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatValue(value)}
                </p>
              </div>
            ))}
          </div>
        )}
        {!isLoading &&
          !isError &&
          (!data || Object.keys(data).length === 0) && (
            <p className="text-sm text-muted-foreground">No data to display</p>
          )}
      </CardContent>
    </Card>
  );
}

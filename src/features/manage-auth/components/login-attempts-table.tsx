"use client";

import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import Table, { type Data } from "@/components/dashboard/table/Table";
import THead from "@/components/dashboard/table/Thead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLoginAttempts } from "../hooks";
import type { LoginAttempt } from "../schemas";

const RESULT_OPTIONS = ["", "success", "failure", "locked", "throttled"];

const RESULT_BADGE: Record<string, string> = {
  success: "border-success/50 bg-success/10 text-success",
  failure: "border-destructive/50 bg-destructive/10 text-destructive",
  locked: "border-destructive/50 bg-destructive/10 text-destructive",
  throttled: "border-warning/50 bg-warning/10 text-warning",
};

const COLUMN_ORDER = [
  { column: "identifier", Label: "Identifier", isSortable: false },
  {
    column: "result",
    Label: "Result",
    isSortable: false,
    wrap: (data: string) => (
      <Badge
        variant="outline"
        className={
          RESULT_BADGE[data] ?? "border-border bg-muted text-muted-foreground"
        }
      >
        {data || "—"}
      </Badge>
    ),
  },
  { column: "ip_address", Label: "IP Address", isSortable: false },
  { column: "reason", Label: "Reason", isSortable: false },
  { column: "created_at", Label: "When", isSortable: false },
];

/** Unverified response field names — passthrough schema, see manage-auth.schema.ts. */
export function LoginAttemptsTable() {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState("");
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useLoginAttempts({
    identifier: identifier || undefined,
    result: result || undefined,
    limit,
  });

  const rows = (data?.items ?? []) as LoginAttempt[];
  const columnOrder = useMemo(() => COLUMN_ORDER, []);

  return (
    <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 py-0 sm:px-0 sm:py-0">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-3 py-1 text-xs font-semibold text-primary">
            <ListChecks className="size-3.5" />
            Sign-in Security
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Login Attempts
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 bg-transparent p-0 pt-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-3 md:flex-row md:items-center">
          <Input
            placeholder="Filter by identifier (email or muid)…"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="md:max-w-xs"
          />
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              {RESULT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt || "All"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger className="w-full md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table
          rows={rows as unknown as Data[]}
          isLoading={isLoading}
          page={1}
          perPage={limit}
          columnOrder={columnOrder}
        >
          <THead
            columnOrder={columnOrder}
            onIconClick={() => {}}
            action={false}
          />
          <div />
          <div />
        </Table>
      </CardContent>
    </Card>
  );
}

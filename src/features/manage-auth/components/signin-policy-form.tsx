"use client";

import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSigninPolicy, useUpdateSigninPolicy } from "../hooks";
import type { SigninPolicy } from "../schemas";

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Unverified response shape (see schemas/manage-auth.schema.ts) — edited as
 * a generic field list keyed off whatever GET returns, rather than a fixed
 * form, so this doesn't silently drop or mis-type fields the real backend
 * uses that weren't predicted here. Booleans get a switch, numbers a number
 * input, everything else plain text.
 */
export function SigninPolicyForm() {
  const { data, isLoading } = useSigninPolicy();
  const updateMutation = useUpdateSigninPolicy();
  const [draft, setDraft] = useState<SigninPolicy>({});

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const handleChange = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(draft);
  };

  const entries = Object.entries(draft);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5 text-primary" />
          Sign-in Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {["a", "b", "c", "d"].map((key) => (
              <Skeleton key={key} className="h-10 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No data to display</p>
        )}

        {!isLoading &&
          entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <Label htmlFor={`policy-${key}`} className="text-sm font-medium">
                {formatLabel(key)}
              </Label>
              {typeof value === "boolean" ? (
                <Switch
                  id={`policy-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => handleChange(key, checked)}
                />
              ) : typeof value === "number" ? (
                <Input
                  id={`policy-${key}`}
                  type="number"
                  value={value}
                  onChange={(e) => handleChange(key, Number(e.target.value))}
                  className="w-32"
                />
              ) : (
                <Input
                  id={`policy-${key}`}
                  value={String(value ?? "")}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-56"
                />
              )}
            </div>
          ))}

        {!isLoading && entries.length > 0 && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-xl"
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

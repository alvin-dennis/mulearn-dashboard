"use client";

import { Flame, Gamepad2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

interface GritMeterResponse {
  enabled: boolean;
}

export function FeaturesClient() {
  const [isGritMeterEnabled, setIsGritMeterEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<GritMeterResponse>(
        endpoints.admin.features.gritMeter,
      );
      setIsGritMeterEnabled(res?.enabled ?? false);
    } catch {
      toast.error("Failed to fetch Grit Meter feature status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGritMeterToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await apiClient.post<GritMeterResponse>(
        endpoints.admin.features.gritMeter,
        { enabled: checked },
      );
      const updated = res?.enabled ?? checked;
      setIsGritMeterEnabled(updated);
      toast.success(
        updated
          ? "Grit Meter feature enabled."
          : "Grit Meter feature disabled.",
      );
    } catch {
      toast.error("Failed to update Grit Meter feature status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Category Box: Gamification */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
        {/* Category Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Gamepad2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Gamification
              </h3>
              <p className="text-xs text-muted-foreground">
                Features related to user levels, grit, activity tracking, and
                rewards.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchStatus}
            disabled={isLoading || isUpdating}
            title="Refresh status"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Category Feature List */}
        <div className="divide-y bg-card">
          {/* Grit Meter Feature Row */}
          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Flame className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Grit Meter</span>
                  <Badge
                    variant={isGritMeterEnabled ? "default" : "secondary"}
                    className={
                      isGritMeterEnabled
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {isGritMeterEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automated daily activity tracking, HP decay, and level floor
                  protection.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isUpdating && (
                <Spinner className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch
                checked={isGritMeterEnabled}
                onCheckedChange={handleGritMeterToggle}
                disabled={isUpdating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

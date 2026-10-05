"use client";

import { KeyRound, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Table, { type Data } from "@/components/dashboard/table/Table";
import THead from "@/components/dashboard/table/Thead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthClients } from "../hooks";
import type { AuthClient } from "../schemas";
import { ClientDetailDialog } from "./client-detail-dialog";
import { CreateClientDialog } from "./create-client-dialog";

function buildColumnOrder(onView: (id: string | number | boolean) => void) {
  return [
    {
      column: "name",
      Label: "Name",
      isSortable: false,
      width: "min-w-[160px]",
    },
    {
      column: "client_id",
      Label: "Client ID",
      isSortable: false,
      width: "min-w-[200px]",
      wrap: (data: string) => (
        <code className="text-xs text-muted-foreground">{data}</code>
      ),
    },
    {
      column: "client_type",
      Label: "Type",
      isSortable: false,
      width: "min-w-[110px]",
    },
    {
      column: "is_active",
      Label: "Status",
      isSortable: false,
      width: "min-w-[100px]",
      wrap: (_data: string, _id: string, row: Record<string, unknown>) => {
        const active = row.disabled !== true && row.is_active !== false;
        return (
          <Badge
            variant="outline"
            className={
              active
                ? "border-success/50 bg-success/10 text-success"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            }
          >
            {active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      column: "id",
      Label: "Actions",
      isSortable: false,
      width: "w-28",
      wrap: (_data: string, id: string) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onView(id)}
          className="h-7"
        >
          View
        </Button>
      ),
    },
  ];
}

export function ClientsTable() {
  const { data, isLoading } = useAuthClients();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const rows = (data?.items ?? []) as AuthClient[];

  const handleView = useCallback((id: string | number | boolean) => {
    setSelectedClientId(String(id));
    setDetailOpen(true);
  }, []);

  const columnOrder = useMemo(() => buildColumnOrder(handleView), [handleView]);

  return (
    <>
      <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 py-0 sm:px-0 sm:py-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-3 py-1 text-xs font-semibold text-primary">
                <KeyRound className="size-3.5" />
                Sign-in Security
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Connected Apps
              </CardTitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              New app
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 bg-transparent p-0 pt-6">
          <Table
            rows={rows as unknown as Data[]}
            isLoading={isLoading}
            page={1}
            perPage={rows.length || 1}
            columnOrder={columnOrder}
            id={["id"]}
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

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ClientDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        clientId={selectedClientId}
      />
    </>
  );
}

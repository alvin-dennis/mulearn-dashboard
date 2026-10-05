"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAuthClientDetail,
  useDisableAuthClient,
  useEnableAuthClient,
  useUpdateAuthClient,
} from "../hooks";
import {
  UpdateClientFormSchema,
  type UpdateClientFormValues,
} from "../schemas";

interface ClientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
}

export function ClientDetailDialog({
  open,
  onOpenChange,
  clientId,
}: ClientDetailDialogProps) {
  const { data: client, isLoading } = useAuthClientDetail(
    open ? clientId : null,
  );
  const updateMutation = useUpdateAuthClient();
  const disableMutation = useDisableAuthClient();
  const enableMutation = useEnableAuthClient();
  const [disableReason, setDisableReason] = useState("");
  const [showDisableReason, setShowDisableReason] = useState(false);

  const form = useForm<UpdateClientFormValues>({
    resolver: zodResolver(UpdateClientFormSchema),
    defaultValues: { name: "", redirect_uris: "" },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        redirect_uris: Array.isArray(client.redirect_uris)
          ? client.redirect_uris.join(" ")
          : (client.redirect_uris ?? ""),
      });
    }
  }, [client, form]);

  useEffect(() => {
    if (!open) setShowDisableReason(false);
  }, [open]);

  if (!clientId) return null;

  const isActive = client?.disabled !== true && client?.is_active !== false;

  const onSubmit = async (values: UpdateClientFormValues) => {
    await updateMutation.mutateAsync({ clientId, payload: values });
  };

  const handleToggleDisable = async () => {
    if (isActive) {
      if (!showDisableReason) {
        setShowDisableReason(true);
        return;
      }
      await disableMutation.mutateAsync({
        clientId,
        reason: disableReason || undefined,
      });
      setShowDisableReason(false);
      setDisableReason("");
    } else {
      await enableMutation.mutateAsync({ clientId });
    }
  };

  const isToggling = disableMutation.isPending || enableMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Connected app</DialogTitle>
            {client && (
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }
              >
                {isActive ? "Active" : "Disabled"}
              </Badge>
            )}
          </div>
          <DialogDescription>
            View and edit this OAuth client's registration.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {!isLoading && client && (
          <>
            <Form {...form}>
              <form
                id="client-detail-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="redirect_uris"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redirect URI(s)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {showDisableReason && (
              <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-3">
                <label htmlFor="disable-reason" className="text-sm font-medium">
                  Reason for disabling (optional)
                </label>
                <Textarea
                  id="disable-reason"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. rotating credentials, deprecated integration…"
                />
              </div>
            )}

            <DialogFooter className="flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant={isActive ? "destructive" : "default"}
                onClick={handleToggleDisable}
                disabled={isToggling}
                className="rounded-2xl"
              >
                {isToggling
                  ? "Working…"
                  : isActive
                    ? showDisableReason
                      ? "Confirm disable"
                      : "Disable client"
                    : "Enable client"}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-2xl"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  form="client-detail-form"
                  disabled={updateMutation.isPending}
                  className="rounded-2xl"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

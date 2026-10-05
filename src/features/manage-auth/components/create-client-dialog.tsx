"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAuthClient } from "../hooks";
import {
  CreateClientFormSchema,
  type CreateClientFormValues,
} from "../schemas";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * client_secret is returned exactly once, on this creation response —
 * authserver never lets it be retrieved again. So this dialog has two
 * states: the create form, then (on success) a one-time reveal screen that
 * replaces it, with a copy button and an explicit "you will not see this
 * again" warning. Closing the dialog is the only way out of the reveal
 * screen — there's no "back to form" from there.
 */
export function CreateClientDialog({
  open,
  onOpenChange,
}: CreateClientDialogProps) {
  const createMutation = useCreateAuthClient();
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateClientFormValues>({
    resolver: zodResolver(CreateClientFormSchema),
    defaultValues: { name: "", redirect_uris: "", client_type: "public" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setRevealedSecret(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  const onSubmit = async (values: CreateClientFormValues) => {
    const client = await createMutation.mutateAsync(values);
    if (client.client_secret) {
      setRevealedSecret(client.client_secret);
    } else {
      handleOpenChange(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border border-border bg-card">
        {revealedSecret ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <KeyRound className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <DialogTitle>Client secret</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    Copy this now — it will not be shown again.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
              <code className="flex-1 break-all text-sm">{revealedSecret}</code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy client secret"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-2xl"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New connected app</DialogTitle>
              <DialogDescription>
                Registers a new OAuth client on authserver.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                id="create-client-form"
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
                        <Input placeholder="mulearn-dashboard" {...field} />
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
                        <Input
                          placeholder="https://app.mulearn.org/api/auth/oidc/callback"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            Public (PKCE, no secret used)
                          </SelectItem>
                          <SelectItem value="confidential">
                            Confidential
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter className="gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
                className="rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-client-form"
                disabled={createMutation.isPending}
                className="rounded-2xl"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

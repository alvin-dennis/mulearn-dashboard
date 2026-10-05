"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useRevokeMemberSessions } from "../hooks";
import {
  RevokeSessionFormSchema,
  type RevokeSessionFormValues,
} from "../schemas";

/**
 * 404 "Member not found" and 503 "Sessions were only partly revoked. Try
 * again." both surface as ordinary error toasts via getApiResponseError —
 * no special-casing needed here (see use-manage-auth.ts).
 */
export function RevokeSessionForm() {
  const revokeMutation = useRevokeMemberSessions();

  const form = useForm<RevokeSessionFormValues>({
    resolver: zodResolver(RevokeSessionFormSchema),
    defaultValues: { identifierType: "muid", identifier: "", reason: "" },
  });

  const onSubmit = async (values: RevokeSessionFormValues) => {
    await revokeMutation.mutateAsync(values);
    form.reset({
      identifierType: values.identifierType,
      identifier: "",
      reason: "",
    });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Revoke Member Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifierType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identify member by</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="muid">muID</SelectItem>
                      <SelectItem value="user_id">User ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("identifierType") === "muid"
                      ? "muID"
                      : "User ID"}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="e.g. reported lost device, suspected compromise…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="destructive"
              disabled={revokeMutation.isPending}
              className="rounded-xl"
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke all sessions"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

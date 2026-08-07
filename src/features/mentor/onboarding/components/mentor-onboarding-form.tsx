"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { useInterestGroupsList } from "@/features/home/hooks";
import { useOnboardingDraftStore } from "../hooks/use-draft-store";
import {
  useSubmitMentorApplication,
  useUpdateMentorApplication,
} from "../hooks/use-onboarding";
import type { MentorApplication } from "../schemas";
import { OnboardingFormSchema, type OnboardingFormValues } from "../schemas";

interface MentorOnboardingFormProps {
  existing?: MentorApplication;
  isEdit?: boolean;
  isReapply?: boolean;
}

export function MentorOnboardingForm({
  existing,
  isEdit = false,
  isReapply = false,
}: MentorOnboardingFormProps) {
  const { data: igList = [] } = useInterestGroupsList();
  const { mutate: submit, isPending: isSubmitting } =
    useSubmitMentorApplication();
  const { mutate: update, isPending: isUpdating } =
    useUpdateMentorApplication();

  const isPending = isSubmitting || isUpdating;

  // Read the mentor tier, company name, and org UUID the user chose during
  // onboarding registration. All three are written to localStorage by
  // register-client right after sign-up and cleared here once consumed.
  const savedOnboardingTier =
    typeof window !== "undefined"
      ? localStorage.getItem("mentor_onboarding_tier")
      : null;
  const savedOnboardingCompany =
    typeof window !== "undefined"
      ? localStorage.getItem("mentor_onboarding_company")
      : null;
  const savedOnboardingOrgId =
    typeof window !== "undefined"
      ? localStorage.getItem("mentor_onboarding_org_id")
      : null;

  // Draft must be declared BEFORE defaultValues so it's in scope when used below.
  const { draft, setDraft, clearDraft } = useOnboardingDraftStore();

  const rawDraftTier = draft?.mentor_tier || savedOnboardingTier;
  const normalizedTier =
    rawDraftTier === "IG Mentor"
      ? "IG_MENTOR"
      : rawDraftTier === "Company Mentor"
        ? "COMPANY_MENTOR"
        : rawDraftTier;

  const defaultValues: OnboardingFormValues = {
    mentor_tier: existing?.mentor_tier ?? normalizedTier ?? "",
    // `company` is display-only (human-readable name shown in the form).
    company:
      existing?.company ?? (draft?.company || savedOnboardingCompany) ?? "",
    // `org` is the UUID that actually gets sent to the API.
    org: existing?.org ?? (draft?.org || savedOnboardingOrgId) ?? "",
    about: existing?.about ?? "",
    // Expertise is stored as a comma string on the backend; split into chips.
    expertise:
      typeof existing?.expertise === "string"
        ? existing.expertise
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : Array.isArray(existing?.expertise)
          ? (existing.expertise as string[])
          : [],
    linkedin_url: existing?.linkedin_url ?? "",
    reason: existing?.reason ?? "",
    preferred_ig_ids: existing?.preferred_ig_ids ?? [],
  };

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: draft ? { ...defaultValues, ...draft } : defaultValues,
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      setDraft(value as Partial<OnboardingFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setDraft]);

  const igOptions = igList.map((ig) => ({ value: ig.id, label: ig.name }));

  const handleSuccess = () => {
    clearDraft();
    localStorage.removeItem("mentor_onboarding_tier");
    localStorage.removeItem("mentor_onboarding_company");
    localStorage.removeItem("mentor_onboarding_org_id");
  };

  function onSubmit(values: OnboardingFormValues) {
    // Join expertise chips into the comma string the backend stores.
    // Strip `company` (display-only name) — the API only accepts `org` (UUID).
    // Map `linkedin_url` to `linkedin` to match the API expectation.
    // Always send `hours` (even as 0) — the backend DB column is NOT NULL with
    // no default, so omitting it causes a 500 IntegrityError.
    const { company: _company, linkedin_url, ...rest } = values;
    const payload = {
      ...rest,
      hours: values.hours ?? 0,
      linkedin: linkedin_url,
      expertise: (values.expertise ?? []).join(", "),
    };
    if (isEdit) {
      update(payload, { onSuccess: handleSuccess });
    } else {
      submit(payload, { onSuccess: handleSuccess });
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isReapply
            ? "Reapply as Mentor"
            : isEdit
              ? "Update Your Application"
              : "Apply to Become a Mentor"}
        </CardTitle>
        <CardDescription>
          {isReapply
            ? "Update your application details and resubmit for admin review."
            : "Tell us about your expertise and why you want to mentor learners."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="mentor_tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor Tier</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. IG Mentor or Company Mentor"
                      {...field}
                      value={
                        field.value === "IG_MENTOR"
                          ? "IG Mentor"
                          : field.value === "COMPANY_MENTOR"
                            ? "Company Mentor"
                            : (field.value ?? "")
                      }
                      readOnly
                      className="bg-muted cursor-default"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company field — visible whenever the user selected a company
                during registration (toggle OFF). Hidden if they are a
                freelancer (toggle ON) because no org was saved in that case. */}
            {!!(form.watch("company") || form.watch("org")) && (
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your company or organisation name"
                        {...field}
                        value={field.value ?? ""}
                        readOnly
                        className="bg-muted cursor-default"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About You</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your background and experience (min 50 characters)..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expertise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Expertise{" "}
                    <span className="text-muted-foreground font-normal">
                      (at least 3, e.g. React, Python, Machine Learning)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Type a skill and press Enter…"
                    />
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
                  <FormLabel>Why do you want to mentor?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your motivation (min 30 characters)..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedin_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn Profile URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-username"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_ig_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Interest Groups</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={igOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select IGs you want to mentor in..."
                      dropUp
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending
                ? "Submitting..."
                : isReapply
                  ? "Resubmit Application"
                  : isEdit
                    ? "Update Application"
                    : "Submit Application"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

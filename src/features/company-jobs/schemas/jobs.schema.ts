/**
 * Company Jobs — Zod Schemas
 *
 * 📍 src/features/company-jobs/schemas/jobs.schema.ts
 *
 * Zod schemas for API response validation AND form validation.
 * Imports only from the types and constants layers (both leaf modules — the
 * `lint:circular` check guards this).
 */

import { z } from "zod";
import {
  getJobTypeFieldModel,
  HOURLY_RATE_PATTERN,
  isDurationUnitValue,
  isJobTypeValue,
  JOB_FIELD_LIMITS,
} from "../constants/jobs.constants";

// ─── Entity Schemas (API response validation) ───────────────

export const JobRuleSchema = z.object({
  id: z.string(),
  rule_type: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  rule_value: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
});

export const JobSchema = z.object({
  id: z.string(),
  company_name: z.string().optional().nullable(),
  company_logo: z.string().optional().nullable(),
  title: z.string(),
  experience: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  job_description: z.string().optional().nullable(),
  job_type: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  location: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  salary_range: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  created_at: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  updated_at: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  rules: z
    .array(JobRuleSchema)
    .nullish()
    .transform((v) => v ?? []),
  // Advanced options

  duration_value: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? Number(v) : null)),
  duration_unit: z.string().optional().nullable(),
  hourly_rate: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  deliverables: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .nullable(),
  stipend: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  certificate_provided: z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "true" || v === "1" || v === 1 || v === "Yes") return true;
      if (v === "false" || v === "0" || v === 0 || v === "No") return false;
      if (typeof v === "boolean") return v;
      return null;
    }),
  applicant_count: z.number().optional().nullable(),
  applications_count: z.number().optional().nullable(),
  total_applicants: z.number().optional().nullable(),
  applicantCount: z.number().optional().nullable(),
  applicationsCount: z.number().optional().nullable(),
});

export const PaginationSchema = z
  .object({
    count: z
      .number()
      .nullish()
      .transform((v) => v ?? 0),
    totalPages: z.number().nullish(),
    total_pages: z.number().nullish(),
    isNext: z.boolean().nullish(),
    isPrev: z.boolean().nullish(),
    nextPage: z.number().nullish(),
    current_page: z.number().nullish(),
    currentPage: z.number().nullish(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
  })
  .passthrough()
  .optional()
  .transform((v) => {
    const cp = v?.current_page ?? v?.currentPage ?? 1;
    const tp = v?.totalPages ?? v?.total_pages ?? 1;
    const hasNext = v?.isNext ?? (v?.next !== undefined ? !!v.next : cp < tp);
    const hasPrev =
      v?.isPrev ?? (v?.previous !== undefined ? !!v.previous : cp > 1);
    return {
      count: v?.count ?? 0,
      totalPages: tp,
      isNext: hasNext,
      isPrev: hasPrev,
      nextPage: v?.nextPage ?? (hasNext ? cp + 1 : null),
    };
  });

// ─── API Response Wrapper ───────────────────────────────────

const DjangoResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    hasError: z.boolean().optional(),
    statusCode: z.number().optional(),
    message: z.unknown().optional(),
    response: dataSchema,
  });

// ─── Jobs List Response ─────────────────────────────────────

export const JobsListDataSchema = z
  .object({
    company_id: z
      .string()
      .nullish()
      .transform((v) => v ?? ""),
    company_name: z
      .string()
      .nullish()
      .transform((v) => v ?? ""),
    data: z.array(JobSchema).nullish(),
    jobs: z.array(JobSchema).nullish(),
    pagination: PaginationSchema.nullish().transform(
      (v) =>
        v ?? {
          count: 0,
          totalPages: 1,
          isNext: false,
          isPrev: false,
          nextPage: null,
        },
    ),
  })
  .transform((val) => ({
    company_id: val.company_id,
    company_name: val.company_name,
    jobs: val.jobs ?? val.data ?? [],
    pagination: val.pagination,
  }));

export const JobsListResponseSchema = DjangoResponse(JobsListDataSchema);

// ─── Job Detail Response ────────────────────────────────────

export const JobDetailDataSchema = z
  .union([z.object({ job: JobSchema }), JobSchema])
  .transform((val) => {
    if ("job" in val) {
      return { job: val.job };
    }
    return { job: val };
  });

export const JobDetailResponseSchema = DjangoResponse(JobDetailDataSchema);

export const PublicJobSchema = z.object({
  id: z.string(),
  company_name: z.string().optional().nullable(),
  company_logo: z.string().optional().nullable(),
  title: z.string(),
  job_type: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  experience: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  job_description: z.string().optional().nullable(),
  salary_range: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  status: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),

  duration_value: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? Number(v) : null)),
  duration_unit: z.string().optional().nullable(),
  hourly_rate: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  deliverables: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .nullable(),
  stipend: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  certificate_provided: z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "true" || v === "1" || v === 1 || v === "Yes") return true;
      if (v === "false" || v === "0" || v === 0 || v === "No") return false;
      if (typeof v === "boolean") return v;
      return null;
    }),
  rules: z
    .array(JobRuleSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export const LearnerApplicationSchema = z.object({
  id: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  job: JobSchema,
  resume_link: z.string().optional().nullable(),
  cover_letter: z.string().optional().nullable(),
  status: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return "pending";
      const lower = v.toLowerCase();
      if (lower === "pending") return "pending";
      if (lower === "in-review") return "in-review";
      if (lower === "shortlisted") return "shortlisted";
      if (lower === "interview") return "interview";
      if (lower === "selected" || lower === "accepted") return "selected";
      if (lower === "rejected") return "rejected";
      return "pending";
    }),
  rejection_reason: z.string().optional().nullable(),
  applied_at: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
});

export const LevelSchema = z.object({
  id: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  level_order: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
});

export const JobApplicantSchema = z.object({
  id: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  job: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  applicant_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  applicant_email: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  resume_link: z.string().optional().nullable(),
  cover_letter: z.string().optional().nullable(),
  status: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return "pending";
      const lower = v.toLowerCase();
      if (lower === "pending") return "pending";
      if (lower === "in-review") return "in-review";
      if (lower === "shortlisted") return "shortlisted";
      if (lower === "interview") return "interview";
      if (lower === "selected" || lower === "accepted") return "selected";
      if (lower === "rejected") return "rejected";
      return "pending";
    }),
  rejection_reason: z.string().optional().nullable(),
  applied_at: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
});

export const LearnerProfileSchema = z.object({
  id: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  full_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  muid: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  email: z.string().optional().nullable(),
  karma: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  level: z.number().optional().nullable(),
  college: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  graduation_year: z.string().optional().nullable(),
});

export const PublicJobsResponseSchema = DjangoResponse(
  z
    .object({
      data: z.array(PublicJobSchema).nullish(),
      jobs: z.array(PublicJobSchema).nullish(),
      pagination: z
        .object({
          count: z
            .number()
            .nullish()
            .transform((v) => v ?? 0),
          // camelCase (new API shape)
          totalPages: z.number().nullish(),
          isNext: z.boolean().nullish(),
          isPrev: z.boolean().nullish(),
          nextPage: z.number().nullish(),
          // snake_case (old API shape — kept for backwards compat)
          total_pages: z.number().nullish(),
          current_page: z.number().nullish(),
          per_page: z.number().nullish(),
          next: z.string().nullable().optional(),
          previous: z.string().nullable().optional(),
        })
        .passthrough()
        .optional()
        .transform((v) => ({
          count: v?.count ?? 0,
          totalPages: v?.totalPages ?? v?.total_pages ?? 1,
          isNext: v?.isNext ?? !!v?.next,
          isPrev: v?.isPrev ?? !!v?.previous,
          nextPage: v?.nextPage ?? (v?.next ? (v.current_page ?? 1) + 1 : null),
        })),
    })
    .transform((val) => ({
      jobs: val.jobs ?? val.data ?? [],
      pagination: val.pagination ?? {
        count: 0,
        totalPages: 1,
        isNext: false,
        isPrev: false,
        nextPage: null,
      },
    })),
);

export const LearnerApplicationsResponseSchema = DjangoResponse(
  z
    .object({
      data: z.array(LearnerApplicationSchema).nullish(),
      applications: z.array(LearnerApplicationSchema).nullish(),
      pagination: PaginationSchema.nullish().transform(
        (v) =>
          v ?? {
            count: 0,
            totalPages: 1,
            isNext: false,
            isPrev: false,
            nextPage: null,
          },
      ),
    })
    .transform((val) => ({
      applications: val.applications ?? val.data ?? [],
      pagination: val.pagination,
    })),
);

export const JobApplicantsResponseSchema = DjangoResponse(
  z
    .object({
      job_id: z
        .string()
        .nullish()
        .transform((v) => v ?? ""),
      job_title: z
        .string()
        .nullish()
        .transform((v) => v ?? ""),
      data: z.array(JobApplicantSchema).nullish(),
      applicants: z.array(JobApplicantSchema).nullish(),
      pagination: PaginationSchema.nullish().transform(
        (v) =>
          v ?? {
            count: 0,
            totalPages: 1,
            isNext: false,
            isPrev: false,
            nextPage: null,
          },
      ),
    })
    .transform((val) => ({
      job_id: val.job_id,
      job_title: val.job_title,
      applicants: val.applicants ?? val.data ?? [],
      pagination: val.pagination,
    })),
);

export const LearnerDiscoveryResponseSchema = DjangoResponse(
  z
    .object({
      data: z.array(LearnerProfileSchema).nullish(),
      learners: z.array(LearnerProfileSchema).nullish(),
      pagination: z
        .object({
          count: z
            .number()
            .nullish()
            .transform((v) => v ?? 0),
          total_pages: z.number().nullish(),
          totalPages: z.number().nullish(),
          current_page: z.number().nullish(),
          currentPage: z.number().nullish(),
          per_page: z.number().nullish(),
          perPage: z.number().nullish(),
          next: z.string().nullable().optional(),
          previous: z.string().nullable().optional(),
          isNext: z.boolean().optional(),
          isPrev: z.boolean().optional(),
        })
        .passthrough()
        .optional()
        .transform((v) => {
          const totalPages = v?.total_pages ?? v?.totalPages ?? 1;
          const currentPage = v?.current_page ?? v?.currentPage ?? 1;
          const isNext = !!(v?.next || v?.isNext);
          const isPrev = !!(v?.previous || v?.isPrev);
          return {
            count: v?.count ?? 0,
            totalPages,
            isNext,
            isPrev,
            nextPage: v?.next ? currentPage + 1 : null,
          };
        }),
    })
    .transform((val) => ({
      learners: val.learners ?? val.data ?? [],
      pagination: val.pagination ?? {
        count: 0,
        totalPages: 1,
        isNext: false,
        isPrev: false,
        nextPage: null,
      },
    })),
);

// ─── Mutation Response Schemas ──────────────────────────────

export const CreateJobResponseSchema = DjangoResponse(JobSchema);

export const UpdateJobDataSchema = z
  .union([z.object({ job: JobSchema }), JobSchema])
  .transform((val) => {
    if ("job" in val && typeof val.job === "object") {
      return val.job;
    }
    return val;
  });

export const UpdateJobResponseSchema = DjangoResponse(UpdateJobDataSchema);

export const DeleteJobResponseSchema = DjangoResponse(
  z.union([
    z.object({
      job_id: z.string(),
      deleted_at: z.string(),
    }),
    z.record(z.string(), z.unknown()),
  ]),
);

export const CreateRuleResponseSchema = DjangoResponse(
  z.object({
    job_rule: z.object({
      id: z.string(),
      job_id: z.string(),
      rule_type: z.string(),
      rule_value: z.string(),
      created_at: z.string(),
    }),
  }),
);

export const UpdateRuleResponseSchema = DjangoResponse(
  z.object({
    rule_id: z.string(),
    updated_value: z.string(),
  }),
);

export const DeleteRuleResponseSchema = DjangoResponse(
  z.object({
    rule_id: z.string(),
    job_id: z.string(),
    deleted_at: z.string(),
  }),
);

export const ApplyJobResponseSchema = DjangoResponse(
  z.object({}).passthrough().optional().nullable(),
);

export const UpdateApplicantStatusResponseSchema =
  DjangoResponse(JobApplicantSchema);

export const GenericResponseSchema = DjangoResponse(z.unknown());

// ─── Company Profile Response ───────────────────────────────

export const CompanyTestimonialSchema = z.object({
  learner_name: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? ""),
  role: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? ""),
  quote: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? ""),
});

export const CompanyGalleryItemSchema = z.union([
  z.string().transform((url) => ({
    image_url: url,
    caption: undefined,
    sort_order: undefined,
  })),
  z.object({
    image_url: z.string(),
    caption: z
      .string()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    sort_order: z
      .number()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
  }),
]);

export const CompanyProfileSchema = z.object({
  id: z.string(),
  company_user_id: z.string().optional(),
  name: z.string(),
  logo: z.string().nullable().optional(),
  description: z.string().optional().nullable(),
  industry_sector: z.string().optional().nullable(),
  website_link: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  slug: z.string(),
  status: z.string(),
  location: z.string().optional().nullable(),
  legal_name: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  company_size: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  verification_document_url: z.string().optional().nullable(),
  verification_requested_at: z.string().optional().nullable(),
  verified_at: z.string().optional().nullable(),
  verified_by: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().optional().nullable(),
  // Extended fields (new in backend — optional for backwards compat)
  founded_year: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => (v != null && v !== "" ? Number(v) : null))
    .default(null),
  remote_policy: z.string().nullable().optional(),
  culture_text: z.string().nullable().optional(),
  tech_stack: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  perks: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  testimonials: z
    .array(CompanyTestimonialSchema)
    .nullish()
    .transform((v) => v ?? []),
  gallery: z
    .array(CompanyGalleryItemSchema)
    .nullish()
    .transform((v) => v ?? []),
  hire_count: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  alumni_count: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  avg_karma_of_hires: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  campus_events_count: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
});

export const CompanyProfileResponseSchema =
  DjangoResponse(CompanyProfileSchema);

// Public company profile schema — extends CompanyProfileSchema with public-only fields
export const PublicCompanyProfileSchema = CompanyProfileSchema.omit({
  company_user_id: true,
  status: true,
  legal_name: true,
  registration_number: true,
  tax_id: true,
  verification_document_url: true,
  verification_requested_at: true,
  verified_at: true,
  verified_by: true,
  rejection_reason: true,
}).extend({
  short_pitch: z.string().nullable().optional(),
  district_name: z.string().nullable().optional(),
  state_name: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
});
export type PublicCompanyProfile = z.infer<typeof PublicCompanyProfileSchema>;

export const PublicCompanyProfileResponseSchema = DjangoResponse(
  PublicCompanyProfileSchema,
);

// Public jobs by slug — matches GET /profile/public/<slug>/jobs/ response
export const PublicJobRuleSchema = z.object({
  id: z.string(),
  rule_type: z.string(),
  rule_value: z.string(),
});

export const PublicJobBySlugSchema = z.object({
  id: z.string(),
  company_name: z.string().optional().nullable(),
  company_logo: z.string().optional().nullable(),
  title: z.string(),
  experience: z.string().optional().nullable(),
  job_description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  salary_range: z.string().optional().nullable(),
  job_type: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  duration_value: z.number().optional().nullable(),
  duration_unit: z.string().optional().nullable(),
  hourly_rate: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v != null ? String(v) : null)),
  deliverables: z.string().optional().nullable(),
  stipend: z.string().optional().nullable(),
  certificate_provided: z.boolean().optional().nullable(),
  rules: z
    .array(PublicJobRuleSchema)
    .nullish()
    .transform((v) => v ?? []),
  created_at: z.string(),
});
export type PublicJobBySlug = z.infer<typeof PublicJobBySlugSchema>;

export const PublicJobsBySlugDataSchema = z.object({
  data: z.array(PublicJobBySlugSchema),
  pagination: z
    .object({
      count: z
        .number()
        .nullish()
        .transform((v) => v ?? 0),
      total_pages: z
        .number()
        .nullish()
        .transform((v) => v ?? 1),
      current_page: z
        .number()
        .nullish()
        .transform((v) => v ?? 1),
      per_page: z
        .number()
        .nullish()
        .transform((v) => v ?? 10),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional(),
    })
    .passthrough()
    .optional(),
});
export type PublicJobsBySlugData = z.infer<typeof PublicJobsBySlugDataSchema>;

export const PublicJobsBySlugResponseSchema = DjangoResponse(
  PublicJobsBySlugDataSchema,
);

// ─── Job Form Schema ────────────────────────────────────────
//
// Every limit below is traceable to a column in db/job.py :: CompanyJob.
// The backend requires only `title` and `job_type`; every other column is
// null=True, blank=True, so the wizard is free to hide fields that do not
// apply to the chosen job type.
//
// Cross-field rules live in ONE superRefine on the object rather than in
// chained .refine() calls. Zod aborts an object parse when a field fails with
// an invalid_type error (e.g. a field is `undefined` rather than ""), and an
// aborted parse silently skips top-level refinements — which is how the old
// "Salary range is required" rule could go missing. Keeping every base field a
// plain string and doing the conditional work in superRefine means the rules
// are evaluated on every keystroke regardless of what else is incomplete.

const HOURLY_RATE_HINT = `Numbers only — up to ${JOB_FIELD_LIMITS.hourlyRateIntegerDigits} digits and ${JOB_FIELD_LIMITS.hourlyRateDecimalPlaces} decimal places (e.g. 499.50)`;

const JobFormObjectSchema = z.object({
  // — Always applicable —
  title: z
    .string()
    .trim()
    .min(1, "Job title is required")
    .max(
      JOB_FIELD_LIMITS.title,
      `Keep this within ${JOB_FIELD_LIMITS.title} characters`,
    ),
  job_type: z.string().min(1, "Select a job type"),
  location: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(
      JOB_FIELD_LIMITS.location,
      `Keep this within ${JOB_FIELD_LIMITS.location} characters`,
    ),
  experience: z
    .string()
    .trim()
    .min(1, "Experience is required")
    .max(
      JOB_FIELD_LIMITS.experience,
      `Keep this short — ${JOB_FIELD_LIMITS.experience} characters max (e.g. "2-4 years")`,
    ),
  job_description: z
    .string()
    .trim()
    .min(10, "Give candidates at least a sentence — 10 characters minimum")
    .max(
      JOB_FIELD_LIMITS.jobDescription,
      `Keep this within ${JOB_FIELD_LIMITS.jobDescription} characters`,
    ),

  // — Compensation: exactly one applies, decided by job type —
  salary_range: z
    .string()
    .trim()
    .max(
      JOB_FIELD_LIMITS.salaryRange,
      `Keep this within ${JOB_FIELD_LIMITS.salaryRange} characters`,
    )
    .optional(),
  stipend: z
    .string()
    .trim()
    .max(
      JOB_FIELD_LIMITS.stipend,
      `Keep this within ${JOB_FIELD_LIMITS.stipend} characters`,
    )
    .optional(),
  /** Backend is DecimalField(10, 2) — a bare number, never a formatted string. */
  hourly_rate: z.string().trim().optional(),

  // — Fixed-term engagement fields —
  duration_value: z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(1, "Must be at least 1")
    .max(JOB_FIELD_LIMITS.durationValueMax, "That duration is too large")
    .optional(),
  duration_unit: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  certificate_provided: z.boolean().optional(),
});

export const JobFormSchema = JobFormObjectSchema.superRefine((values, ctx) => {
  const model = getJobTypeFieldModel(values.job_type);

  // job_type must be one the backend recognises.
  if (values.job_type && !isJobTypeValue(values.job_type)) {
    ctx.addIssue({
      code: "custom",
      path: ["job_type"],
      message: "Select a job type from the list",
    });
  }

  // ── Compensation — required, and only the one this job type uses ──
  if (model.compensation === "salary") {
    if (!values.salary_range) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_range"],
        message: "Salary range is required",
      });
    }
  } else if (model.compensation === "stipend") {
    if (!values.stipend) {
      ctx.addIssue({
        code: "custom",
        path: ["stipend"],
        message: "Stipend is required for an internship",
      });
    }
  } else {
    const rate = values.hourly_rate ?? "";
    if (!rate) {
      ctx.addIssue({
        code: "custom",
        path: ["hourly_rate"],
        message: "Hourly rate is required for a gig",
      });
    } else if (!HOURLY_RATE_PATTERN.test(rate)) {
      ctx.addIssue({
        code: "custom",
        path: ["hourly_rate"],
        message: HOURLY_RATE_HINT,
      });
    } else if (Number(rate) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["hourly_rate"],
        message: "Hourly rate must be greater than 0",
      });
    }
  }

  // ── Duration — optional, but the serializer rejects a half-filled pair ──
  if (model.duration) {
    const hasValue = values.duration_value != null;
    const hasUnit = !!values.duration_unit;

    if (hasValue && !hasUnit) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_unit"],
        message: "Choose a unit to go with the duration",
      });
    }
    if (hasUnit && !hasValue) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_value"],
        message: "Enter a duration to go with the unit",
      });
    }
    if (hasUnit && !isDurationUnitValue(values.duration_unit as string)) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_unit"],
        message: "Choose days, weeks or months",
      });
    }
  }

  // ── Deliverables — no blanks, no duplicates ──
  if (model.deliverables && values.deliverables?.length) {
    const seen = new Set<string>();
    for (const item of values.deliverables) {
      const trimmedItem = item.trim();
      if (!trimmedItem) {
        ctx.addIssue({
          code: "custom",
          path: ["deliverables"],
          message: "Remove the empty deliverable",
        });
        break;
      }
      if (seen.has(trimmedItem.toLowerCase())) {
        ctx.addIssue({
          code: "custom",
          path: ["deliverables"],
          message: `"${trimmedItem}" is listed twice`,
        });
        break;
      }
      seen.add(trimmedItem.toLowerCase());
    }
  }
});

export type JobFormValues = z.infer<typeof JobFormObjectSchema>;

// ─── Rule Form Schema ───────────────────────────────────────

// All rule values (Karma + Level) are compared with int() on the backend, so
// they MUST be non-negative integers. Kept inline because schemas import only
// from the types layer.
const NUMERIC_RULE_TYPE_SET = new Set([
  "min_karma",
  "max_karma",
  "min_level",
  "max_level",
]);

export const RuleFormSchema = z
  .object({
    rule_type: z.string().min(1, "Rule type is required"),
    rule_value: z.string().min(1, "Please select a value"),
  })
  .superRefine((val, ctx) => {
    if (
      NUMERIC_RULE_TYPE_SET.has(val.rule_type) &&
      !/^\d+$/.test(val.rule_value.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rule_value"],
        message: "Enter a valid whole number.",
      });
    }
  });

export type RuleFormValues = z.infer<typeof RuleFormSchema>;

// ─── Company Tasks Schemas ───────────────────────────────────

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  hashtag: z.string(),
  discord_link: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  karma: z.number(),
  channel: z.string().nullable().optional(),
  type: z.string(),
  active: z.boolean(),
  variable_karma: z.boolean(),
  usage_count: z.number(),
  level: z.string().nullable().optional(),
  org: z.string().nullable().optional(),
  ig: z.string().nullable().optional(),
  event: z.string().nullable().optional(),
  bonus_karma: z.number(),
  bonus_time: z.string().nullable().optional(),
  approval_status: z.string(),
  rejection_reason: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  requested_by_name: z.string().nullable().optional(),
  requested_at: z.string().nullable().optional(),
  skills: z.array(SkillSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const TasksListResponseSchema = DjangoResponse(
  z.object({
    data: z.array(TaskSchema),
    pagination: z.object({
      count: z
        .number()
        .nullish()
        .transform((v) => v ?? 0),
      total_pages: z
        .number()
        .nullish()
        .transform((v) => v ?? 1),
      current_page: z
        .number()
        .nullish()
        .transform((v) => v ?? 1),
      per_page: z
        .number()
        .nullish()
        .transform((v) => v ?? 10),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional(),
    }),
  }),
);

export const TaskDetailResponseSchema = DjangoResponse(TaskSchema);

export const GenericTaskMutationResponseSchema = DjangoResponse(
  z.object({}).passthrough(),
);

// ─── Company Mentor Nomination Schemas ──────────────────────

export const MentorNominationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_email: z.string().email().optional().nullable(),
  org_name: z.string(),
  mentor_tier: z.string(),
  status: z.string(),
  reason: z.string(),
  verification_note: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
});

export const NominateMentorResponseSchema = DjangoResponse(
  MentorNominationSchema,
);

export const ListMentorNominationsResponseSchema = DjangoResponse(
  z.array(MentorNominationSchema),
);

// ─── Analytics Schemas ────────────────────────────────────────

export const GigAnalyticsSchema = z.object({
  total_gigs_posted: z.number(),
  active_gigs: z.number(),
  closed_gigs: z.number(),
  average_hourly_rate: z.number(),
  application_funnel: z.record(z.string(), z.number()),
  conversion_rate: z.string(),
});

export const GigAnalyticsResponseSchema = DjangoResponse(GigAnalyticsSchema);

export const CompanyDashboardSummarySchema = z.object({
  company: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    logo: z.string().nullable().optional(),
  }),
  quick_stats: z
    .object({
      jobs_posted: z.number().catch(0),
      total_views: z.number().catch(0),
      applications: z.number().catch(0),
      hired: z.number().catch(0),
    })
    .catch({ jobs_posted: 0, total_views: 0, applications: 0, hired: 0 }),
  stat_cards: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.number(),
      delta: z.number(),
      delta_type: z.string(),
      period: z.string(),
    }),
  ),
  talent_pool: z.object({
    total_learners: z.number(),
    level_distribution: z.array(
      z.object({
        level_id: z.string(),
        level_name: z.string(),
        level_order: z.number(),
        count: z.number(),
        percentage: z.number(),
      }),
    ),
    top_interest_groups: z.array(
      z.object({
        ig_id: z.string(),
        name: z.string(),
        learner_count: z.number(),
        total_karma: z.number(),
      }),
    ),
  }),
});

export const CompanyDashboardSummaryResponseSchema = DjangoResponse(
  CompanyDashboardSummarySchema,
);

export const TrackJobViewResponseSchema = DjangoResponse(
  z.object({}).passthrough(),
);

export const JobEngagementAnalyticsSchema = z.object({
  job_id: z.string(),
  job_title: z.string(),
  total_views: z.number(),
  total_applications: z.number(),
  total_hired: z.number(),
  conversion_rate_percentage: z.number(),
});

export const JobEngagementAnalyticsResponseSchema = DjangoResponse(
  JobEngagementAnalyticsSchema,
);

export const TalentPoolAnalyticsSchema = z.object({
  total_learners: z.number(),
  level_distribution: z.array(
    z.object({
      level_id: z.string(),
      level_name: z.string(),
      level_order: z.number(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  top_interest_groups: z.array(
    z.object({
      ig_id: z.string(),
      name: z.string(),
      learner_count: z.number(),
      total_karma: z.number(),
    }),
  ),
});

export const TalentPoolAnalyticsResponseSchema = DjangoResponse(
  TalentPoolAnalyticsSchema,
);

export const AdminSummarySchema = z.object({
  total_companies: z.number(),
  verified_companies: z.number(),
  pending_companies: z.number(),
  rejected_companies: z.number(),
  total_jobs: z.number(),
  total_company_tasks: z.number(),
});

export const AdminSummaryResponseSchema = DjangoResponse(AdminSummarySchema);

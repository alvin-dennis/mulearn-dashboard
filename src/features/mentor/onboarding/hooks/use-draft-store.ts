import { create } from "zustand";
import type { OnboardingFormValues } from "../schemas";

import { persist } from "zustand/middleware";

interface DraftStore {
  draft: Partial<OnboardingFormValues> | null;
  setDraft: (draft: Partial<OnboardingFormValues>) => void;
  clearDraft: () => void;
}

export const useOnboardingDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: "mentor-onboarding-draft",
    },
  ),
);

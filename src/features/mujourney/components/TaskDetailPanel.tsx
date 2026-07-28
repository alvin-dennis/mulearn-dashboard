/**
 * Task Detail Panel Component
 *
 * 📍 src/features/mujourney/components/TaskDetailPanel.tsx
 *
 * Side panel that displays detailed task information with markdown support
 */

"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUserInfo } from "@/features/auth";
import { chipColor } from "@/lib/chip-colors";
import type { Task } from "../schemas";
import { MarkdownRenderer } from "../utils/markdown";

interface ExtendedTask extends Task {
  skills?: string[];
  organization?: {
    title?: string;
  };
  prerequisites?: string;
}

const DISCORD_GUILD_ID = "771670169691881483";
const DEFAULT_DISCORD_CHANNEL_ID = "782353185552465951";

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
}: TaskDetailPanelProps) {
  const extendedTask = task as ExtendedTask | null;
  const userInfo = useUserInfo();
  const discordConnected = userInfo.data?.exist_in_guild === true;
  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!bg-card !z-[101] !shadow-2xl !w-full md:!min-w-[75%] !sm:max-w-none !outline-none !gap-0 !border-border"
      >
        <SheetTitle className="sr-only">Task Details</SheetTitle>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Task Title - with Markdown */}
          <div className="text-3xl font-bold text-foreground">
            <MarkdownRenderer content={task.task_name} className="*:mb-0" />
          </div>

          {/* Task Description/Steps - with Markdown */}
          {task.task_description && (
            <div className="text-base text-foreground prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={task.task_description} />
            </div>
          )}

          {/* Metadata Sections */}
          <div className="space-y-6 pt-4">
            {/* Interest Group */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                Interest Group
              </h3>
              <p className="text-base text-muted-foreground">
                {task.interest_group?.name || "General Tasks"}
              </p>
              {task.hashtag && (
                <div className="pt-1">
                  <span className="text-sm font-bold text-foreground">
                    Hashtag:
                  </span>{" "}
                  <span className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full font-mono text-sm">
                    {task.hashtag}
                  </span>
                </div>
              )}
            </div>

            {/* Skills */}
            {extendedTask?.skills &&
              Array.isArray(extendedTask.skills) &&
              extendedTask.skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Skills:</h3>
                  <div className="flex flex-wrap gap-2">
                    {extendedTask.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${chipColor(skill)}`}
                      >
                        <MarkdownRenderer
                          content={skill}
                          className="*:inline *:mb-0"
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Published Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                Published Info
              </h3>
              <p className="text-base text-muted-foreground">
                <span className="font-bold text-foreground">By:</span>{" "}
                {extendedTask?.organization?.title || "μLearn Foundation"}
              </p>
            </div>

            {/* Prerequisites - with Markdown */}
            {extendedTask?.prerequisites && (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">
                  Prerequisites
                </h3>
                <div className="text-base text-muted-foreground">
                  <MarkdownRenderer content={extendedTask.prerequisites} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Proof of Work Button - Footer */}
        <SheetFooter className="pt-6">
          <Button
            variant="default"
            className="font-semibold px-8"
            onClick={() => {
              if (!discordConnected) {
                toast.error(
                  "Please connect your Discord account first to submit proof of work.",
                );
                return;
              }
              const channelId =
                task.submission_channel?.discord_id ||
                DEFAULT_DISCORD_CHANNEL_ID;
              window.open(
                `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`,
                "_blank",
              );
            }}
          >
            Submit Proof of Work
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

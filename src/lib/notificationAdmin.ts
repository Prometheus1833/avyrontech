import { z } from "zod";
import { cfAuth } from "./cfAuth";
import { notificationSettingsSchema } from "@/shared/notifications";
const counter = z.number().int().nonnegative();
const responseSchema = z.object({
  config: notificationSettingsSchema,
  revision: counter,
  updated_at: counter,
  counts: z
    .array(z.object({ category: z.string(), total: counter, unread: counter }))
    .max(20),
});
export type NotificationAdminData = z.infer<typeof responseSchema>;
/** Incomplete deployment/proxy responses must remain recoverable UI states. */
export async function loadNotificationAdmin(
  signal?: AbortSignal,
): Promise<NotificationAdminData> {
  return responseSchema.parse(
    await cfAuth.request<unknown>("/api/notifications/admin", { signal }),
  );
}

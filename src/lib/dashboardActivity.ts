export const ACTIVITY_CHANGED = "avyron:activity-changed";
export function refreshDashboardActivity() {
  if(typeof window!=="undefined")window.dispatchEvent(new Event(ACTIVITY_CHANGED));
}

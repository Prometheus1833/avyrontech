import OperationsConsole from "./OperationsConsole";
import type { Access } from "@/lib/access";
import type { OsNavigate } from "./OsWorkspaceDirectory";
export default function OsCentersTab({
  access,
  onNavigate,
}: {
  access: Access;
  onNavigate: OsNavigate;
}) {
  return <OperationsConsole access={access} onNavigate={onNavigate} />;
}

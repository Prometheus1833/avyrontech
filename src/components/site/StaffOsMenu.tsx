import Link from './WorkspaceLink';
import { useAuth } from "@/hooks/useAuth";
import { buildAccess, defaultSection } from "@/lib/access";
export default function StaffOsMenu() {
  const { user, isStaff, roles, isSuperAdmin, capabilities } = useAuth();
  if (!user || !isStaff) return null;
  const access = buildAccess({ roles, superadmin: isSuperAdmin, capabilities });
  return (
    <Link
      to={"/profil?tab=" + defaultSection(access)}
      aria-label="Deschide INTERN OS"
      className="staff-intern-link"
    >
      INTERN OS
    </Link>
  );
}

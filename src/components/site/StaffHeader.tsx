import { useAuth } from "@/hooks/useAuth";
import StaffOsMenu from "./StaffOsMenu";
import LangSwitch from "./LangSwitch";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import StaffWorkspaceActions from "./StaffWorkspaceActions";
import logo from "@/assets/avyron-logo.webp";
import "./staffHeader.css";
export default function StaffHeader({ scrollLift }: { scrollLift: number }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <header
      className="staff-site-header"
      style={{ transform: `translate3d(0,${scrollLift}px,0)` }}
    >
      <nav className="staff-site-bar" aria-label="Navigare staff">
        <a href="/#hero" aria-label="AVYRON" className="staff-site-brand">
          <img src={logo} width={26} height={26} alt="" />
          <span>AVYRON</span>
        </a>
        <StaffOsMenu />
        <StaffWorkspaceActions />
        <div className="staff-header-personal">
          <LangSwitch />
          <ThemeToggle />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User as UserIcon,
  Package,
  CreditCard,
  Settings,
  Newspaper,
  MessageSquare,
  LogOut,
  Briefcase,
  Wrench,
  Users as UsersIcon,
  FolderKanban,
  ShoppingCart,
  Boxes,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { ContactDialog } from "./ContactDialog";

type MenuItem = {
  label: string;
  icon: typeof UserIcon;
  dot: string; // comma-separated HSL, e.g. "264, 90%, 62%"
  to?: string;
  onSelect?: () => void;
  comingSoon?: boolean;
};

const UserMenu = () => {
  const { user, profile, isStaff, signOut } = useAuth();
  const { t, lang } = useLang();
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const initials = (profile?.display_name || user.email || "A")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const productsLabel = lang === "en" ? "Products" : "Produse";
  const productsPath = lang === "en" ? "/en/pricing" : "/costurisiproduse";
  const aboutLabel = lang === "en" ? "About us" : "Despre noi";
  const aboutPath = lang === "en" ? "/en/about" : "/despre-noi";

  const userItems: MenuItem[] = [
    { label: t.auth.menu.profile, icon: UserIcon, dot: "264, 90%, 62%", to: "/profil?tab=profile" },
    { label: productsLabel, icon: Boxes, dot: "200, 95%, 55%", to: productsPath },
    { label: aboutLabel, icon: UsersRound, dot: "86, 78%, 60%", to: aboutPath },
    { label: t.auth.menu.product, icon: Package, dot: "330, 85%, 65%", to: "/profil?tab=subscriptions" },
    { label: t.auth.menu.subscription, icon: CreditCard, dot: "40, 95%, 60%", to: "/profil?tab=invoices" },
    { label: t.auth.menu.cart, icon: ShoppingCart, dot: "170, 80%, 45%", to: "/profil?tab=cart" },
    { label: t.auth.menu.settings, icon: Settings, dot: "222, 25%, 40%", to: "/profil?tab=settings" },
    { label: t.auth.menu.news, icon: Newspaper, dot: "280, 70%, 55%", to: "/profil?tab=tickets" },
    { label: t.auth.menu.contact, icon: MessageSquare, dot: "340, 80%, 60%", onSelect: () => setContactOpen(true) },
  ];

  const staffItems: MenuItem[] = [
    { label: t.auth.menu.profile, icon: UserIcon, dot: "264, 90%, 62%", to: "/profil?tab=profile" },
    { label: productsLabel, icon: Boxes, dot: "200, 95%, 55%", to: productsPath },
    { label: aboutLabel, icon: UsersRound, dot: "86, 78%, 60%", to: aboutPath },
    { label: t.auth.menu.projects, icon: FolderKanban, dot: "210, 90%, 55%", to: "/profil?tab=projects" },
    { label: t.auth.menu.maintenance, icon: Wrench, dot: "30, 90%, 55%", to: "/profil?tab=maintenance" },
    { label: t.auth.menu.internal, icon: UsersIcon, dot: "260, 80%, 60%", to: "/profil?tab=intern" },
    { label: t.auth.menu.resources, icon: Briefcase, dot: "150, 70%, 45%", to: "/profil?tab=resources" },
    { label: t.auth.menu.contact, icon: MessageSquare, dot: "340, 80%, 60%", onSelect: () => setContactOpen(true) },
    { label: t.auth.menu.settings, icon: Settings, dot: "222, 25%, 40%", to: "/profil?tab=settings" },
  ];

  const items = isStaff ? staffItems : userItems;

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    toast.success(t.auth.logout);
    window.location.href = "/";
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="size-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-brand/40 transition"
            aria-label="Profil"
            aria-expanded={menuOpen}
          >
            <Avatar className="size-10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-foreground to-brand text-background text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          collisionPadding={12}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={() => setMenuOpen(false)}
          onInteractOutside={() => setMenuOpen(false)}
          className="z-[70] w-64"
        >
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium truncate">{profile?.display_name || user.email}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            {isStaff && (
              <span className="mt-1 inline-flex w-fit text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                Staff
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => {
            const inner = (
              <span className="flex items-center justify-between w-full gap-2">
                <span className="flex items-center gap-2">
                  <item.icon className="size-4" />
                  {item.label}
                </span>
                {item.comingSoon && (
                  <span className="text-[10px] uppercase text-muted-foreground">{t.auth.menu.comingSoon}</span>
                )}
              </span>
            );
            if (item.to) {
              return (
                <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
                  <Link to={item.to} onClick={() => setMenuOpen(false)}>{inner}</Link>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem
                key={item.label}
                onSelect={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  item.onSelect?.();
                }}
                className="cursor-pointer"
              >
                {inner}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="size-4 mr-2" />
            {t.auth.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default UserMenu;

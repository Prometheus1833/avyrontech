import {NOTIFICATIONS_OPEN_EVENT} from "@/lib/dashboardActivity";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import { useNavigate } from "react-router-dom";
import { STUDIO_PATHS } from "@/data/logoStudioCopy";
import { publicSiteHref } from "@/lib/appHost";
import { useMemo,useState } from "react";
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
  FileText,
  MessageSquare,
  LogOut,
  UsersRound,
  Bot,
  Wallet,
  ShoppingCart,
  BookOpen,
  LibraryBig,
  PenTool,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import {buildAccess,canOpenSection} from "@/lib/access";
import { accountDisplayName } from "@/lib/accountDisplayName";

type MenuItem = {
  label: string;
  icon: typeof UserIcon;
  to?: string;
  onSelect?: () => void;
  comingSoon?: boolean;
};

const UserMenu = ({showNotificationBell=true}:{showNotificationBell?:boolean}) => {
  const { user, profile, isStaff, isSuperAdmin, roles, capabilities, hasCollaborations, isAgencyPartner,refreshProfile, signOut } = useAuth();
  const { t, lang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen,setNoticeOpen]=useState(false);
  const navigate=useNavigate();
  const noticeAccess=useMemo(()=>buildAccess({roles,superadmin:isSuperAdmin,capabilities,hasCollaborations}),[roles,isSuperAdmin,capabilities,hasCollaborations]);

  if (!user) return null;

  const accountName = accountDisplayName(user, profile, lang === "en" ? "My account" : "Contul meu", isStaff);
  const initials = accountName
    .split(" ")
    .map((s) => s.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

  const userItems:MenuItem[]=[
    {label:lang==='en'?'Profile':'Profil',icon:UserIcon,to:'/profil?tab=profile'},
    {label:lang==='en'?'Services':'Servicii',icon:Package,to:'/profil?tab=catalog'},
    {label:lang==='en'?'Maintenance / Subscriptions':'Mentenanță / Abonamente',icon:CreditCard,to:'/profil?tab=subscriptions'},
    {label:lang==='en'?'Payments and Invoices':'Plăți și Facturi',icon:Wallet,to:'/profil?tab=payments'},
    {label:lang==='en'?'Development Products':'Produse Development',icon:Package,to:'/profil?tab=collection'},
    {label:lang==='en'?'My Documents':'Documentele Mele',icon:FileText,to:'/profil?tab=documents'},
    {label:lang==='en'?'Create Logo':'Creează Logo',icon:PenTool,to:publicSiteHref(STUDIO_PATHS[lang])},
    {label:lang==='en'?'Cart':'Coș',icon:ShoppingCart,to:'/profil?tab=cart'},
    {label:lang==='en'?'Staff Support':'Suport Staff',icon:MessageSquare,to:'/profil?tab=tickets'},
    {label:t.auth.menu.settings,icon:Settings,to:'/profil?tab=settings'},
  ];

  const access=buildAccess({roles,superadmin:isSuperAdmin,capabilities});
  const staffItems: MenuItem[] = [
    {label:t.auth.menu.profile,icon:UserIcon,to:"/profil?tab=profile"},
    ...(canOpenSection("ai-projects",access)?[{label:"Proiecte AI",icon:Bot,to:"/profil?tab=ai-projects"}]:[]),
    ...(canOpenSection("finance",access)?[{label:"Financiar",icon:Wallet,to:"/profil?tab=finance"}]:[]),
    {label:t.auth.menu.settings,icon:Settings,to:"/profil?tab=settings"},
  ];

  const items = [...(isStaff ? staffItems : userItems),...(hasCollaborations?[{label:lang==="en"?"My collaborations":"Colaborările mele",icon:UsersRound,to:"/profil?tab=my-collaborations"}]:[])];

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    toast.success(t.auth.logout);
    window.location.href = "/";
  };

  return (
    <>
      {showNotificationBell&&<NotificationCenter access={noticeAccess} onNavigate={section=>navigate(`/profil?tab=${section}`)} requestedOpen={noticeOpen} onClose={()=>setNoticeOpen(false)} />}
      <DropdownMenu open={menuOpen} onOpenChange={(open)=>{setMenuOpen(open);if(open)void refreshProfile();}} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="size-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-brand/40 transition"
            aria-label={lang === "en" ? "Profile" : "Profil"}
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
          onPointerDownOutside={() => setMenuOpen(false)}
          onInteractOutside={() => setMenuOpen(false)}
          className={`z-[70] max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-5rem))] max-w-[calc(100vw-1.5rem)] ${isStaff ? "w-64" : "w-72"} overflow-y-auto overscroll-contain rounded-xl p-1`}
        >
          <DropdownMenuLabel className="flex min-w-0 flex-col px-3 py-2">
            <span data-testid="account-menu-identity" title={accountName} className="line-clamp-2 break-words font-medium leading-5 [overflow-wrap:anywhere]">{accountName}</span>
            {isAgencyPartner&&<span className="mt-1 w-fit rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Avyron Partener</span>}
            {isStaff && (
              <span className="mt-1 inline-flex w-fit text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                Staff
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isStaff&&<DropdownMenuItem onSelect={()=>{setMenuOpen(false);if(showNotificationBell)setNoticeOpen(true);else window.dispatchEvent(new Event(NOTIFICATIONS_OPEN_EVENT));}}><Bell className="mr-2 size-4"/>{lang==="en"?"Notifications":"Notificări"}</DropdownMenuItem>}
          <div className="space-y-0.5">{items.map((item) => {
            const inner = (
              <span className="flex items-center justify-between w-full gap-2">
                <span className={`flex min-w-0 items-center gap-2 ${isStaff ? "" : "text-[13px] leading-5"}`}>
                  <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {item.label}
                </span>
                {item.comingSoon && (
                  <span className="text-[10px] uppercase text-muted-foreground">{t.auth.menu.comingSoon}</span>
                )}
              </span>
            );
            if (item.to) {
              return (
                <DropdownMenuItem
                  key={item.label}
                  asChild
                  className="min-h-9 cursor-pointer rounded-lg px-3 py-2"
                >
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
                className="min-h-9 cursor-pointer rounded-lg px-3 py-2"
              >
                {inner}
              </DropdownMenuItem>
            );
          })}</div>
          {!isStaff && <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-9 cursor-pointer rounded-lg px-3 py-2 text-[13px]">
              <Link to={publicSiteHref(lang === "en" ? "/en/library" : "/biblioteca")} onClick={() => setMenuOpen(false)}><LibraryBig className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />{lang === "en" ? "Artifact Library" : "Bibliotecă Artefacte"}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="min-h-9 cursor-pointer rounded-lg px-3 py-2 text-[13px]">
              <Link to={publicSiteHref(lang === "en" ? "/en/blog" : "/blog")} onClick={() => setMenuOpen(false)}><BookOpen className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />{lang === "en" ? "Avyron Blog" : "Blogul Avyron"}</Link>
            </DropdownMenuItem>
          </>}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="min-h-9 cursor-pointer rounded-lg px-3 py-2 text-[13px] text-destructive focus:text-destructive"
          >
            <LogOut className="size-4 mr-2" />
            {t.auth.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default UserMenu;

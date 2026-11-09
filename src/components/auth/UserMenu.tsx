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
  Boxes,
  UsersRound,
  Bot,
  Wallet,
  BookOpen,
  LibraryBig,
  PenTool,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import {buildAccess,canOpenSection} from "@/lib/access";

type MenuItem = {
  label: string;
  icon: typeof UserIcon;
  dot: string; // comma-separated HSL, e.g. "264, 90%, 62%"
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

  const initials = (profile?.display_name || user.email || "A")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const userItems:MenuItem[]=[
    {label:lang==='en'?'Home':'Acasă',icon:UserIcon,dot:'264, 90%, 62%',to:'/profil?tab=overview'},
    {label:lang==='en'?'Staff Support':'Suport Staff',icon:MessageSquare,dot:'340, 80%, 60%',to:'/profil?tab=tickets'},
    {label:lang==='en'?'My projects':'Proiectele mele',icon:Boxes,dot:'200, 95%, 55%',to:'/profil?tab=projects'},
    {label:lang==='en'?'Maintenance / Subscriptions':'Mentenanță / Abonamente',icon:CreditCard,dot:'40, 95%, 60%',to:'/profil?tab=subscriptions'},
    {label:lang==='en'?'My products':'Produsele mele',icon:Package,dot:'155, 72%, 42%',to:'/profil?tab=collection'},
    {label:lang==='en'?'Services':'Servicii',icon:Package,dot:'330, 85%, 65%',to:'/profil?tab=catalog'},
    {label:lang==='en'?'Documents':'Documente',icon:FileText,dot:'264, 90%, 62%',to:'/profil?tab=documents'},
    {label:lang==='en'?'Payments / History':'Plăți/Istoric',icon:Wallet,dot:'155, 72%, 42%',to:'/profil?tab=payments'},
    {label:lang==='en'?'Create Logo':'Creează Logo',icon:PenTool,dot:'280, 85%, 65%',to:publicSiteHref(STUDIO_PATHS[lang])},
    {label:t.auth.menu.profile,icon:UserIcon,dot:'222, 25%, 40%',to:'/profil?tab=profile'},
    {label:t.auth.menu.settings,icon:Settings,dot:'222, 25%, 40%',to:'/profil?tab=settings'},
  ];

  const access=buildAccess({roles,superadmin:isSuperAdmin,capabilities});
  const staffItems: MenuItem[] = [
    {label:t.auth.menu.profile,icon:UserIcon,dot:"264, 90%, 62%",to:"/profil?tab=profile"},
    ...(canOpenSection("ai-projects",access)?[{label:"Proiecte AI",icon:Bot,dot:"270, 88%, 62%",to:"/profil?tab=ai-projects"}]:[]),
    ...(canOpenSection("finance",access)?[{label:"Financiar",icon:Wallet,dot:"155, 72%, 42%",to:"/profil?tab=finance"}]:[]),
    {label:t.auth.menu.settings,icon:Settings,dot:"222, 25%, 40%",to:"/profil?tab=settings"},
  ];

  const items = [...(isStaff ? staffItems : userItems),...(hasCollaborations?[{label:lang==="en"?"My collaborations":"Colaborările mele",icon:UsersRound,dot:"264, 90%, 62%",to:"/profil?tab=my-collaborations"}]:[])];

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
          className={`z-[70] max-h-[calc(100dvh-5rem)] ${isStaff?"w-64":"w-[min(22rem,calc(100vw-1.5rem))]"} overflow-y-auto`}
        >
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium truncate">{profile?.display_name || user.email}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            {isAgencyPartner&&<span className="mt-1 w-fit rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Avyron Partener</span>}
            {isStaff && (
              <span className="mt-1 inline-flex w-fit text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                Staff
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isStaff&&<DropdownMenuItem onSelect={()=>{setMenuOpen(false);if(showNotificationBell)setNoticeOpen(true);else window.dispatchEvent(new Event(NOTIFICATIONS_OPEN_EVENT));}}><Bell className="mr-2 size-4"/>{lang==="en"?"Notifications":"Notificări"}</DropdownMenuItem>}
          <div className={isStaff?"":"grid grid-cols-2 gap-1"}>{items.map((item) => {
            const itemStyle = { ["--dot-color" as string]: item.dot };
            const inner = (
              <span className="flex items-center justify-between w-full gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <item.icon className="size-4" />
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full shadow-sm"
                    style={{ backgroundColor: `hsl(${item.dot})` }}
                  />
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
                  className="cursor-pointer menu-press active:scale-[0.98] transition-transform duration-150 ease-out"
                  style={itemStyle}
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
                className="cursor-pointer menu-press active:scale-[0.98] transition-transform duration-150 ease-out"
                style={itemStyle}
              >
                {inner}
              </DropdownMenuItem>
            );
          })}</div>
          {!isStaff && <>
            <DropdownMenuSeparator />
            <div className="mx-1 my-1 rounded-xl border border-violet-400/15 bg-violet-500/5 p-1" aria-label={lang === "en" ? "Reading and inspiration" : "Lectură și inspirație"}>
              <DropdownMenuItem asChild className="cursor-pointer"><Link to={publicSiteHref(lang === "en" ? "/en/blog" : "/blog")} onClick={() => setMenuOpen(false)}><BookOpen className="mr-2 size-4 text-violet-300" />Blog Avyron</Link></DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer"><Link to={publicSiteHref(lang === "en" ? "/en/library" : "/biblioteca")} onClick={() => setMenuOpen(false)}><LibraryBig className="mr-2 size-4 text-violet-300" />{lang === "en" ? "Artifact Library" : "Biblioteca Artefacte"}</Link></DropdownMenuItem>
            </div>
          </>}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="cursor-pointer menu-press active:scale-[0.98] transition-transform duration-150 ease-out text-destructive focus:text-destructive"
            style={{ ["--dot-color" as string]: "0, 84%, 60%" }}
          >
            <LogOut className="size-4 mr-2" />
            <span
              aria-hidden="true"
              className="size-2 rounded-full shadow-sm mr-2"
              style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
            />
            {t.auth.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default UserMenu;

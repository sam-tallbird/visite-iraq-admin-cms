"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ListFilter, 
  FileText, 
  Users, 
  Settings, 
  ChevronDown,
  LogOut,
  Home,
  MapPin,
  LayoutTemplate
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  hasSubMenu?: boolean;
  subMenuOpen?: boolean;
  onSubMenuToggle?: () => void;
  onItemClick?: () => void;
}

const NavItem = ({ 
  href, 
  icon, 
  title, 
  active, 
  hasSubMenu, 
  subMenuOpen, 
  onSubMenuToggle,
  onItemClick
}: NavItemProps) => {
  return (
    <div>
      <Link 
        href={href}
        onClick={onItemClick}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </div>
        {hasSubMenu && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              onSubMenuToggle?.();
            }}
            className="ml-auto"
          >
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform", 
                subMenuOpen && "rotate-180"
              )} 
            />
          </button>
        )}
      </Link>
    </div>
  );
};

interface SubMenuItemProps {
  href: string;
  title: string;
  active?: boolean;
  onItemClick?: () => void;
}

const SubMenuItem = ({ href, title, active, onItemClick }: SubMenuItemProps) => {
  return (
    <Link 
      href={href}
      onClick={onItemClick}
      className={cn(
        "flex items-center rounded-md py-2 pl-11 pr-3 text-sm transition-colors",
        active 
          ? "bg-secondary font-medium text-secondary-foreground" 
          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
      )}
    >
      {title}
    </Link>
  );
};

interface SidebarProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function Sidebar({ isMobile, onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [listingsOpen, setListingsOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);

  const toggleListings = () => setListingsOpen(!listingsOpen);
  const toggleContent = () => setContentOpen(!contentOpen);

  const mainNavItems = [
    { 
      href: "/dashboard", 
      icon: <LayoutDashboard className="h-5 w-5" />, 
      title: "Dashboard",
      active: pathname === "/dashboard"
    },
    { 
      href: "/dashboard/listings", 
      icon: <MapPin className="h-5 w-5" />, 
      title: "Listings",
      active: pathname.startsWith("/dashboard/listings"),
      hasSubMenu: true,
      subMenuOpen: listingsOpen,
      onSubMenuToggle: toggleListings
    },
    { 
      href: "/dashboard/categories", 
      icon: <ListFilter className="h-5 w-5" />, 
      title: "Categories",
      active: pathname === "/dashboard/categories"
    },
    { 
      href: "/dashboard/content", 
      icon: <FileText className="h-5 w-5" />, 
      title: "Content",
      active: pathname.startsWith("/dashboard/content"),
      hasSubMenu: true,
      subMenuOpen: contentOpen,
      onSubMenuToggle: toggleContent
    },
    { 
      href: "/dashboard/appearance/hero-banners", 
      icon: <LayoutTemplate className="h-5 w-5" />,
      title: "Appearance",
      active: pathname.startsWith("/dashboard/appearance")
    },
    { 
      href: "/dashboard/users", 
      icon: <Users className="h-5 w-5" />, 
      title: "Users",
      active: pathname === "/dashboard/users"
    },
    { 
      href: "/dashboard/settings", 
      icon: <Settings className="h-5 w-5" />, 
      title: "Settings",
      active: pathname === "/dashboard/settings"
    },
  ];

  const listingSubMenuItems = [
    { href: "/dashboard/listings/all", title: "All Listings" },
    { href: "/dashboard/listings/restaurants", title: "Restaurants" },
    { href: "/dashboard/listings/historical-sites", title: "Historical Sites" },
    { href: "/dashboard/listings/museums", title: "Museums" },
    { href: "/dashboard/listings/parks-nature", title: "Parks & Nature" },
    { href: "/dashboard/listings/religious-sites", title: "Religious Sites" },
    { href: "/dashboard/listings/shopping", title: "Shopping" },
    { href: "/dashboard/listings/experiences", title: "Experiences" }
  ];

  const contentSubMenuItems = [
    { href: "/dashboard/content/pages", title: "Pages" },
    { href: "/dashboard/content/blog", title: "Blog Posts" },
    { href: "/dashboard/content/faqs", title: "FAQs" }
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const sidebarContent = (
    <>
      {!isMobile && (
        <div className="flex h-16 items-center border-b px-3 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Home className="h-5 w-5 text-primary" />
            <span className="text-lg">Iraq Tourism CMS</span>
          </Link>
        </div>
      )}
      <nav className={cn("flex-1 overflow-auto py-4", isMobile && "pb-16")}>
        <div className="flex flex-col gap-1 px-2">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              active={item.active}
              hasSubMenu={item.hasSubMenu}
              subMenuOpen={item.subMenuOpen}
              onSubMenuToggle={item.onSubMenuToggle}
              onItemClick={onItemClick}
            />
          ))}
          
          {listingsOpen && (
            <div className="flex flex-col gap-1 pt-1">
              {listingSubMenuItems.map((item) => (
                <SubMenuItem
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  active={pathname === item.href}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          )}
          
          {contentOpen && (
            <div className="flex flex-col gap-1 pt-1">
              {contentSubMenuItems.map((item) => (
                <SubMenuItem
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  active={pathname === item.href}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="border-t px-2 py-4">
        <button
          onClick={handleLogout}
          className="btn btn-secondary flex w-full items-center gap-3 text-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return sidebarContent;
  }

  return (
    <div className="sidebar">
      {sidebarContent}
    </div>
  );
} 
"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Menu, Bell, User, ChevronDown, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export default function Header({ toggleMobileMenu }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Simple theme toggler
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  // Check for saved theme preference - only on client side
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUserMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-card px-4 shadow-sm md:px-6">
      <div className="flex items-center md:hidden">
        <button
          className="btn-icon mr-2"
          onClick={toggleMobileMenu}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </button>
      </div>
      
      <div className="flex flex-1 items-center justify-between">
        <div className="md:hidden">
          <h1 className="text-lg font-semibold">Iraq Tourism CMS</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {mounted && (
            <button 
              onClick={toggleTheme}
              className="btn-icon rounded-full"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          )}
          
          <button 
            className="btn-icon rounded-full"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full p-1 text-sm hover:bg-secondary"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden md:block">
                <div className="font-medium">{user?.email?.split('@')[0] || 'Admin'}</div>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform", 
                userMenuOpen && "rotate-180"
              )} />
            </button>
            
            {userMenuOpen && (
              <div className="card absolute right-0 mt-2 w-56 origin-top-right p-0">
                <div className="p-2">
                  <div className="border-b pb-2 mb-2">
                    <p className="px-3 py-2 text-sm font-medium">{user?.email}</p>
                  </div>
                  
                  <Link 
                    href="/dashboard/profile" 
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  
                  <Link 
                    href="/dashboard/settings" 
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  
                  <div className="border-t mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 
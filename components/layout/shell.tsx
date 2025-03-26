"use client";

import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import Head from 'next/head';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Sidebar for desktop */}
        <Sidebar />
        
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden">
            <div className="fixed inset-y-0 left-0 z-40 w-full max-w-xs overflow-y-auto bg-card p-4 shadow-lg animate-in slide-in-from-left">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">Iraq Tourism CMS</span>
                <button
                  className="btn-icon"
                  onClick={toggleMobileMenu}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </button>
              </div>
              <div className="mt-6">
                <Sidebar isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div className="main-content">
          <Header toggleMobileMenu={toggleMobileMenu} />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
} 
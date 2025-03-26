"use client";

export default function TestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sidebar">
        <div className="flex h-16 items-center border-b px-4">
          <span className="text-lg font-semibold">Iraq Tourism CMS</span>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <div className="flex flex-col gap-2 px-4">
            <div className="rounded-md bg-primary px-3 py-2 text-primary-foreground">
              Dashboard
            </div>
            <div className="text-muted-foreground hover:bg-secondary rounded-md px-3 py-2">
              Listings
            </div>
            <div className="text-muted-foreground hover:bg-secondary rounded-md px-3 py-2">
              Categories
            </div>
          </div>
        </nav>
      </div>
      
      <div className="main-content">
        <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <button className="md:hidden btn-icon">
              <span>☰</span>
            </button>
          </div>
          <div>
            <button className="btn-icon">
              <span>👤</span>
            </button>
          </div>
        </header>
        
        <main className="flex-1 px-4 py-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 
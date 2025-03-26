"use client";

import TestShell from "@/components/layout/test-shell";

export default function TestPage() {
  return (
    <TestShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">UI Test Page</h1>
          <p className="text-muted-foreground">
            This page tests if our UI components are styled correctly.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Cards and Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-outline">Outline</button>
            <button className="btn btn-destructive">Destructive</button>
            <button className="btn btn-ghost">Ghost</button>
            <button className="btn-icon">
              <span>🔍</span>
            </button>
          </div>
        </div>

        <div className="dashboard-grid dashboard-grid-cols-4">
          <div className="card">Card 1</div>
          <div className="card">Card 2</div>
          <div className="card">Card 3</div>
          <div className="card">Card 4</div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Form Elements</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Text Input</label>
              <input type="text" className="input-field w-full" placeholder="Enter text here" />
              <p className="form-hint">This is a hint for the input field</p>
            </div>
            <div>
              <label className="form-label">Select Input</label>
              <select className="input-select w-full">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label className="form-label">Search Input</label>
              <input type="search" className="input-search w-full" placeholder="Search..." />
            </div>
          </div>
        </div>
      </div>
    </TestShell>
  );
} 
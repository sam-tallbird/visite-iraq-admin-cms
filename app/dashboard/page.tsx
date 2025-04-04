"use client";

import Shell from "@/components/layout/shell";
import { useEffect, useState } from "react";
import { 
  Users, 
  MapPin,
  PieChart,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseTable } from "@/hooks/use-supabase";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
  loading?: boolean;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
}

const StatCard = ({ title, value, icon, description, loading, change }: StatCardProps) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="mt-1 text-3xl font-bold">{loading ? "—" : value}</h3>
        {!loading && change && (
          <div className={cn(
            "mt-1 flex items-center text-xs",
            change.type === "increase" ? "text-green-500" : "text-red-500"
          )}>
            <span className="mr-1">
              {change.type === "increase" ? "↑" : "↓"}
            </span>
            <span>{change.value}% from last month</span>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        {icon}
      </div>
    </div>
  </div>
);

interface RecentActivityProps {
  loading?: boolean;
}

const RecentActivity = ({ loading }: RecentActivityProps) => {
  const activities = [
    { id: 1, type: "add", item: "New listing 'Baghdad Museum' added", time: "2 hours ago" },
    { id: 2, type: "update", item: "Updated 'Babylon Historical Site' details", time: "Yesterday" },
    { id: 3, type: "delete", item: "Removed inactive restaurant listing", time: "2 days ago" },
    { id: 4, type: "update", item: "Updated homepage banner images", time: "3 days ago" },
    { id: 5, type: "add", item: "New user registered", time: "1 week ago" },
  ];

  return (
    <div className="card">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <History className="h-5 w-5 text-primary" />
        Recent Activity
      </h3>
      <div className="mt-4 divide-y">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="py-3">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse"></div>
              <div className="mt-2 h-3 w-1/4 rounded bg-muted animate-pulse"></div>
            </div>
          ))
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="py-3">
              <p className="font-medium">{activity.item}</p>
              <p className="text-sm text-muted-foreground">{activity.time}</p>
            </div>
          ))
        )}
      </div>
      <button className="btn btn-secondary mt-4 w-full">
        View All Activity
      </button>
    </div>
  );
};

interface StatsChartProps {
  loading?: boolean;
}

const StatsChart = ({ loading }: StatsChartProps) => (
  <div className="card">
    <h3 className="flex items-center gap-2 text-lg font-semibold">
      <PieChart className="h-5 w-5 text-primary" />
      Listings by Category
    </h3>
    <div className="mt-4 aspect-video bg-secondary flex items-center justify-center">
      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>Chart visualization would be displayed here</p>
          <p className="text-sm">(Placeholder for actual chart component)</p>
        </div>
      )}
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalListings: 0,
    users: 0,
  });

  const { data: listingsData, status: listingsStatus } = useSupabaseTable('listings');
  const { data: profilesData, status: profilesStatus } = useSupabaseTable('profiles');

  const loading = listingsStatus === 'loading' || listingsStatus === 'idle' || profilesStatus === 'loading' || profilesStatus === 'idle';

  useEffect(() => {
    if (listingsStatus === 'success' && profilesStatus === 'success') {
      const totalListings = listingsData?.length || 0;
      const usersCount = profilesData?.length || 0;
      
      setStats({
        totalListings,
        users: usersCount,
      });
    }
  }, [listingsStatus, profilesStatus, listingsData, profilesData]);

  const statCards = [
    {
      title: "Total Listings",
      value: stats.totalListings,
      icon: <MapPin size={24} />,
      description: "All tourism locations",
    },
    {
      title: "Registered Users",
      value: stats.users,
      icon: <Users size={24} />,
      description: "Total registered users",
    },
  ];

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Iraq Tourism CMS dashboard. View and manage your content.
          </p>
        </div>

        <div className="dashboard-grid dashboard-grid-cols-4">
          {statCards.slice(0, 4).map((card, i) => (
            <StatCard
              key={i}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
              loading={loading}
            />
          ))}
        </div>
        
        <div className="dashboard-grid md:grid-cols-12">
          <div className="md:col-span-8">
            <StatsChart loading={loading} />
          </div>
          <div className="md:col-span-4">
            <RecentActivity loading={loading} />
          </div>
        </div>

        <div className="dashboard-grid dashboard-grid-cols-4">
          {statCards.slice(4).map((card, i) => (
            <StatCard
              key={i}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </Shell>
  );
} 
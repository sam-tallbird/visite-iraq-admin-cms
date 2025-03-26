"use client";

import Shell from "@/components/layout/shell";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { 
  Building2, 
  Landmark, 
  TreePine, 
  Utensils, 
  ShoppingBag, 
  Users, 
  MapPin,
  PieChart,
  History,
  Church
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    restaurants: 0,
    historicalSites: 0,
    parks: 0,
    museums: 0,
    shopping: 0,
    religiousSites: 0,
    users: 0,
  });
  const [statChanges, setStatChanges] = useState<{[key: string]: {value: number, type: "increase" | "decrease"}}>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Generate random percent changes only once after mounting on client
  useEffect(() => {
    setMounted(true);
    
    // Generate random stats only on client side to avoid hydration mismatch
    const changes = {
      totalListings: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      restaurants: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      historicalSites: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      parks: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      museums: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      shopping: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      religiousSites: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
      users: { value: Math.floor(Math.random() * 20) + 1, type: Math.random() > 0.5 ? "increase" as const : "decrease" as const },
    };
    
    setStatChanges(changes);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch collections count from Firestore
        const listingsSnapshot = await getDocs(collection(db, "listings"));
        const totalListings = listingsSnapshot.size;
        
        // Count by category
        let restaurantCount = 0;
        let historicalCount = 0;
        let parksCount = 0;
        let museumsCount = 0;
        let shoppingCount = 0;
        let religiousCount = 0;
        
        listingsSnapshot.forEach((doc) => {
          const data = doc.data();
          const category = data.category;
          
          if (category === "restaurants") restaurantCount++;
          else if (category === "historical_sites") historicalCount++;
          else if (category === "parks_nature") parksCount++;
          else if (category === "museums") museumsCount++;
          else if (category === "shopping") shoppingCount++;
          else if (category === "religious_sites") religiousCount++;
        });
        
        // Get users count
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersCount = usersSnapshot.size;
        
        setStats({
          totalListings,
          restaurants: restaurantCount,
          historicalSites: historicalCount,
          parks: parksCount,
          museums: museumsCount,
          shopping: shoppingCount,
          religiousSites: religiousCount,
          users: usersCount,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        // Simulate a slight delay to show loading state
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Listings",
      value: stats.totalListings,
      icon: <MapPin size={24} />,
      description: "All tourism locations",
      change: mounted ? statChanges.totalListings : undefined
    },
    {
      title: "Restaurants",
      value: stats.restaurants,
      icon: <Utensils size={24} />,
      description: "Food & dining listings",
      change: mounted ? statChanges.restaurants : undefined
    },
    {
      title: "Historical Sites",
      value: stats.historicalSites,
      icon: <Landmark size={24} />,
      description: "Historical locations",
      change: mounted ? statChanges.historicalSites : undefined
    },
    {
      title: "Parks & Nature",
      value: stats.parks,
      icon: <TreePine size={24} />,
      description: "Natural attractions",
      change: mounted ? statChanges.parks : undefined
    },
    {
      title: "Museums",
      value: stats.museums,
      icon: <Building2 size={24} />,
      description: "Museums & galleries",
      change: mounted ? statChanges.museums : undefined
    },
    {
      title: "Shopping",
      value: stats.shopping,
      icon: <ShoppingBag size={24} />,
      description: "Shopping locations",
      change: mounted ? statChanges.shopping : undefined
    },
    {
      title: "Religious Sites",
      value: stats.religiousSites,
      icon: <Church size={24} />,
      description: "Religious locations",
      change: mounted ? statChanges.religiousSites : undefined
    },
    {
      title: "Users",
      value: stats.users,
      icon: <Users size={24} />,
      description: "Registered app users",
      change: mounted ? statChanges.users : undefined
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
              change={card.change}
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
              change={card.change}
            />
          ))}
        </div>
      </div>
    </Shell>
  );
} 
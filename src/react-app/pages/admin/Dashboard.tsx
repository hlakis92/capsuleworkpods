import { useEffect, useState } from "react";
import { AdminLayout } from "@/react-app/components/AdminLayout";
import {
  MapPin,
  Box,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Stats {
  totalLocations: number;
  totalPods: number;
  podsOutOfService: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalMembers: number;
  membersByTier: {
    free: number;
    plus: number;
    pro: number;
  };
  totalRevenue: number;
  recentBookings: Array<{
    id: number;
    user_id: string;
    pod_name: string;
    location_name: string;
    start_time: string;
    status: string;
    price_final: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-400">{error || "Failed to load dashboard"}</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      label: "Total Locations",
      value: stats.totalLocations,
      icon: MapPin,
      color: "bg-blue-500",
    },
    {
      label: "Total Pods",
      value: stats.totalPods,
      subtitle: `${stats.podsOutOfService} out of service`,
      icon: Box,
      color: "bg-emerald-500",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      subtitle: `${stats.pendingBookings} pending`,
      icon: Calendar,
      color: "bg-violet-500",
    },
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "bg-amber-500",
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      label: "Confirmed Bookings",
      value: stats.confirmedBookings,
      icon: TrendingUp,
      color: "bg-cyan-500",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of your Capsule Pod network</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`${stat.color} p-2.5 rounded-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Membership Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Membership Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.membersByTier.free}</p>
              <p className="text-sm text-slate-400 mt-1">Free</p>
              <div className="h-1 bg-slate-700 rounded-full mt-3">
                <div
                  className="h-1 bg-slate-500 rounded-full"
                  style={{
                    width: `${(stats.membersByTier.free / stats.totalMembers) * 100 || 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-violet-400">{stats.membersByTier.plus}</p>
              <p className="text-sm text-slate-400 mt-1">Plus</p>
              <div className="h-1 bg-slate-700 rounded-full mt-3">
                <div
                  className="h-1 bg-violet-500 rounded-full"
                  style={{
                    width: `${(stats.membersByTier.plus / stats.totalMembers) * 100 || 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{stats.membersByTier.pro}</p>
              <p className="text-sm text-slate-400 mt-1">Pro</p>
              <div className="h-1 bg-slate-700 rounded-full mt-3">
                <div
                  className="h-1 bg-amber-500 rounded-full"
                  style={{
                    width: `${(stats.membersByTier.pro / stats.totalMembers) * 100 || 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
          </div>
          {stats.recentBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      ID
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      Pod
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      Location
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stats.recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4 text-sm text-slate-300">#{booking.id}</td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {booking.pod_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {booking.location_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(booking.start_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-500/10 text-green-400"
                              : booking.status === "pending"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium text-right">
                        ${booking.price_final.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

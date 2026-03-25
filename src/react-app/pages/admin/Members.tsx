import { useState, useEffect } from "react";
import { AdminLayout } from "@/react-app/components/AdminLayout";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import {
  Search,
  Users,
  Crown,
  Star,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";

interface Member {
  id: number;
  user_id: string;
  email: string;
  membership_tier: string;
  is_admin: number;
  created_at: string;
  booking_count: number;
  total_spent: number;
}

interface Booking {
  id: number;
  pod_name: string;
  location_name: string;
  start_time: string;
  end_time: string;
  status: string;
  price_final: number;
  payment_status: string;
}

const TIER_CONFIG = {
  free: { label: "Free", icon: Users, color: "bg-gray-100 text-gray-700" },
  plus: { label: "Plus", icon: Star, color: "bg-blue-100 text-blue-700" },
  pro: { label: "Pro", icon: Crown, color: "bg-amber-100 text-amber-700" },
};

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [memberBookings, setMemberBookings] = useState<Record<string, Booking[]>>({});
  const [bookingsLoading, setBookingsLoading] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMemberBookings(userId: string) {
    if (memberBookings[userId]) {
      setExpandedMember(expandedMember === userId ? null : userId);
      return;
    }
    setBookingsLoading(userId);
    try {
      const res = await fetch(`/api/admin/members/${userId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setMemberBookings((prev) => ({ ...prev, [userId]: data.bookings }));
        setExpandedMember(userId);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setBookingsLoading(null);
    }
  }

  async function updateMember() {
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${editMember.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_tier: editMember.membership_tier,
          is_admin: editMember.is_admin,
        }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === editMember.user_id
              ? { ...m, membership_tier: editMember.membership_tier, is_admin: editMember.is_admin }
              : m
          )
        );
        setEditMember(null);
      }
    } catch (err) {
      console.error("Failed to update member:", err);
    } finally {
      setSaving(false);
    }
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || m.membership_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const stats = {
    total: members.length,
    free: members.filter((m) => m.membership_tier === "free").length,
    plus: members.filter((m) => m.membership_tier === "plus").length,
    pro: members.filter((m) => m.membership_tier === "pro").length,
    admins: members.filter((m) => m.is_admin).length,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage users, tiers, and view booking history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Total Members
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Users className="h-4 w-4" />
              Free Tier
            </div>
            <p className="text-2xl font-bold mt-1">{stats.free}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Star className="h-4 w-4" />
              Plus Tier
            </div>
            <p className="text-2xl font-bold mt-1">{stats.plus}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <Crown className="h-4 w-4" />
              Pro Tier
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pro}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <Shield className="h-4 w-4" />
              Admins
            </div>
            <p className="text-2xl font-bold mt-1">{stats.admins}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="plus">Plus</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Members List */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-sm">Member</th>
                <th className="px-4 py-3 font-medium text-sm">Tier</th>
                <th className="px-4 py-3 font-medium text-sm hidden md:table-cell">Bookings</th>
                <th className="px-4 py-3 font-medium text-sm hidden md:table-cell">Total Spent</th>
                <th className="px-4 py-3 font-medium text-sm hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No members found
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const tierConfig = TIER_CONFIG[member.membership_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.free;
                  const TierIcon = tierConfig.icon;
                  const isExpanded = expandedMember === member.user_id;

                  return (
                    <>
                      <tr key={member.user_id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.email}</span>
                            {member.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tierConfig.color}`}>
                            <TierIcon className="h-3 w-3" />
                            {tierConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {member.booking_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {(member.total_spent || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditMember(member)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchMemberBookings(member.user_id)}
                              disabled={bookingsLoading === member.user_id}
                            >
                              {bookingsLoading === member.user_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && memberBookings[member.user_id] && (
                        <tr key={`${member.user_id}-bookings`}>
                          <td colSpan={6} className="px-4 py-3 bg-muted/20">
                            <BookingHistory bookings={memberBookings[member.user_id]} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editMember && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-muted-foreground">{editMember.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Membership Tier</label>
                <Select
                  value={editMember.membership_tier}
                  onValueChange={(v) => setEditMember({ ...editMember, membership_tier: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (0% discount)</SelectItem>
                    <SelectItem value="plus">Plus (10% discount)</SelectItem>
                    <SelectItem value="pro">Pro (20% discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={!!editMember.is_admin}
                  onChange={(e) => setEditMember({ ...editMember, is_admin: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="is_admin" className="text-sm font-medium">
                  Admin Access
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditMember(null)}>
                  Cancel
                </Button>
                <Button onClick={updateMember} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function BookingHistory({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No bookings found</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Booking History ({bookings.length})</p>
      <div className="grid gap-2 max-h-64 overflow-y-auto">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between bg-card rounded border p-3 text-sm">
            <div>
              <p className="font-medium">{booking.pod_name}</p>
              <p className="text-muted-foreground text-xs">{booking.location_name}</p>
            </div>
            <div className="text-right">
              <p>{new Date(booking.start_time).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(booking.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(booking.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  booking.status === "confirmed"
                    ? "bg-green-100 text-green-700"
                    : booking.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {booking.status}
              </span>
              <span className="font-medium">${booking.price_final.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

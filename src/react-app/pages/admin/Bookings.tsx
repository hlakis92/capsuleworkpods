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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Badge } from "@/react-app/components/ui/badge";
import { Calendar, Search, X, AlertTriangle, DollarSign, Clock, MapPin } from "lucide-react";

interface Booking {
  id: number;
  user_id: string;
  user_email: string;
  pod_id: number;
  pod_name: string;
  location_id: number;
  location_name: string;
  start_time: string;
  end_time: string;
  status: string;
  price_base: number;
  discount_percent: number;
  price_final: number;
  payment_status: string;
  qr_token: string | null;
  created_at: string;
}

interface Location {
  id: number;
  name: string;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Cancel modal
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchLocations();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/admin/locations");
      if (!res.ok) return;
      const data = await res.json();
      setLocations(data.locations || []);
    } catch {
      // Ignore
    }
  };

  const handleCancel = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/bookings/${cancelBooking.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel booking");
      }
      await fetchBookings();
      setCancelBooking(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return `${hours}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Paid</Badge>;
      case "unpaid":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Unpaid</Badge>;
      case "refunded":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Apply filters
  const filteredBookings = bookings.filter((booking) => {
    // Search query (email or booking id)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesEmail = booking.user_email?.toLowerCase().includes(query);
      const matchesId = booking.id.toString().includes(query);
      if (!matchesEmail && !matchesId) return false;
    }

    // Status filter
    if (statusFilter !== "all" && booking.status !== statusFilter) return false;

    // Payment filter
    if (paymentFilter !== "all" && booking.payment_status !== paymentFilter) return false;

    // Location filter
    if (locationFilter !== "all" && booking.location_id.toString() !== locationFilter) return false;

    // Date range
    if (dateFrom) {
      const bookingDate = new Date(booking.start_time);
      const fromDate = new Date(dateFrom);
      if (bookingDate < fromDate) return false;
    }
    if (dateTo) {
      const bookingDate = new Date(booking.start_time);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (bookingDate > toDate) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setLocationFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || paymentFilter !== "all" || locationFilter !== "all" || dateFrom || dateTo;

  // Stats
  const stats = {
    total: filteredBookings.length,
    confirmed: filteredBookings.filter((b) => b.status === "confirmed").length,
    pending: filteredBookings.filter((b) => b.status === "pending").length,
    revenue: filteredBookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + b.price_final, 0),
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">View and manage all bookings</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              Total Bookings
            </div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              Confirmed
            </div>
            <div className="text-2xl font-bold mt-1 text-green-500">{stats.confirmed}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="w-4 h-4" />
              Pending
            </div>
            <div className="text-2xl font-bold mt-1 text-yellow-500">{stats.pending}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="w-4 h-4" />
              Revenue
            </div>
            <div className="text-2xl font-bold mt-1">${stats.revenue.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Location */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input type="date" placeholder="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />

            {/* Date To */}
            <Input type="date" placeholder="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location / Pod</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "No bookings match your filters" : "No bookings yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">#{booking.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">{booking.user_email || "Unknown"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">{booking.location_name}</div>
                          <div className="text-xs text-muted-foreground">{booking.pod_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDateTime(booking.start_time)}</div>
                    </TableCell>
                    <TableCell>{getDuration(booking.start_time, booking.end_time)}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>{getPaymentBadge(booking.payment_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">${booking.price_final.toFixed(2)}</div>
                      {booking.discount_percent > 0 && (
                        <div className="text-xs text-muted-foreground">-{booking.discount_percent}%</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {booking.status !== "cancelled" && booking.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelBooking(booking)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog open={!!cancelBooking} onOpenChange={() => setCancelBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel booking #{cancelBooking?.id}?
            </DialogDescription>
          </DialogHeader>

          {cancelBooking && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span>{cancelBooking.user_email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span>{cancelBooking.location_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pod</span>
                <span>{cancelBooking.pod_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(cancelBooking.start_time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span>${cancelBooking.price_final.toFixed(2)}</span>
              </div>
              {cancelBooking.payment_status === "paid" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  This booking has been paid. You may need to process a refund through Stripe.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelBooking(null)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

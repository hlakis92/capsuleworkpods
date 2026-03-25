import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Calendar, Clock, MapPin, Loader2, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import Layout from "@/react-app/components/Layout";
import { cn } from "@/react-app/lib/utils";
import { useAuth } from "@getmocha/users-service/react";

interface Booking {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
  price_final: number;
  payment_status: string;
  pod_name: string;
  pod_type: string;
  pod_image_url: string;
  location_name: string;
  location_slug: string;
  location_city: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  completed: {
    label: "Completed",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  },
};

function BookingCard({ booking }: { booking: Booking }) {
  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isUpcoming = new Date(booking.start_time) > new Date();

  return (
    <Link to={`/bookings/${booking.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <img
            src={booking.pod_image_url}
            alt={booking.pod_name}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{booking.pod_name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {booking.location_name}
                </p>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", status.color)}>
                {status.label}
              </span>
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(booking.start_time)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(booking.start_time)}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold">${booking.price_final.toFixed(2)}</span>
              {isUpcoming && booking.status === "pending" && (
                <span className="text-xs text-amber-600 dark:text-amber-400">Payment required</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function MyBookingsPage() {
  const { user, isPending: authPending, redirectToLogin } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (authPending) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your bookings.
          </p>
          <Button onClick={() => redirectToLogin()}>
            Sign In with Google
          </Button>
        </div>
      </Layout>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_time) > new Date() && b.status !== "cancelled"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.start_time) <= new Date() || b.status === "cancelled"
  );

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <Button asChild>
            <Link to="/locations" className="gap-2">
              Book a Pod
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
            <p className="text-muted-foreground mb-6">
              Ready to rest and recharge? Book your first pod session.
            </p>
            <Button asChild>
              <Link to="/locations">Browse Locations</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {upcomingBookings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Upcoming ({upcomingBookings.length})
                </h2>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Past Bookings ({pastBookings.length})
                </h2>
                <div className="space-y-3 opacity-80">
                  {pastBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

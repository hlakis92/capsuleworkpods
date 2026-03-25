import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router";
import { ArrowLeft, MapPin, Clock, Calendar, CreditCard, CheckCircle, AlertCircle, Loader2, QrCode } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import Layout from "@/react-app/components/Layout";
import { cn } from "@/react-app/lib/utils";

interface Booking {
  id: number;
  user_id: string;
  pod_id: number;
  start_time: string;
  end_time: string;
  status: string;
  price_base: number;
  discount_percent: number;
  price_final: number;
  qr_token: string | null;
  payment_status: string;
  pod_name: string;
  pod_type: string;
  pod_image_url: string;
  pod_amenities: string[];
  location_name: string;
  location_slug: string;
  location_address: string;
  location_city: string;
  location_state: string;
}

const statusConfig = {
  pending: {
    label: "Pending Payment",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: CheckCircle,
  },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const paymentStatus = searchParams.get("payment");

  const fetchBooking = () => {
    fetch(`/api/bookings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Booking not found");
        return res.json();
      })
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBooking();
    // If returning from successful payment, poll briefly for webhook update
    if (paymentStatus === "success") {
      const interval = setInterval(fetchBooking, 2000);
      setTimeout(() => clearInterval(interval), 10000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, paymentStatus]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: Number(id) }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
        setProcessingPayment(false);
      }
    } catch {
      setError("Failed to initiate payment");
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This booking doesn't exist or you don't have access to it."}
          </p>
          <Button asChild>
            <Link to="/bookings">View My Bookings</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const duration = Math.round(
    (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60 * 60)
  );

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Bookings
        </Link>

        {/* Payment Success Message */}
        {paymentStatus === "success" && booking.status === "confirmed" && (
          <Card className="p-4 mb-6 flex items-center gap-3 border bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm opacity-80">Your booking is now confirmed. Check your email for details.</p>
            </div>
          </Card>
        )}

        {/* Status Banner */}
        <Card className={cn("p-4 mb-6 flex items-center gap-3 border", status.color)}>
          <StatusIcon className="h-5 w-5" />
          <div>
            <p className="font-semibold">{status.label}</p>
            {booking.status === "pending" && (
              <p className="text-sm opacity-80">Complete payment to confirm your booking</p>
            )}
          </div>
        </Card>

        {/* Booking Details */}
        <Card className="p-6 space-y-6">
          {/* Pod Info */}
          <div className="flex gap-4">
            <img
              src={booking.pod_image_url}
              alt={booking.pod_name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-xl font-bold">{booking.pod_name}</h2>
              <p className="text-muted-foreground capitalize">{booking.pod_type} Pod</p>
              <Link
                to={`/locations/${booking.location_slug}`}
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <MapPin className="h-3 w-3" />
                {booking.location_name}
              </Link>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid gap-4 sm:grid-cols-2 border-t pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-muted-foreground">{formatDate(booking.start_time)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-muted-foreground">
                  {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                </p>
                <p className="text-sm text-muted-foreground">{duration} hour{duration !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t pt-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Price</span>
              <span>${booking.price_base.toFixed(2)}</span>
            </div>
            {booking.discount_percent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Member Discount ({booking.discount_percent}%)</span>
                <span>-${((booking.price_base * booking.discount_percent) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>${booking.price_final.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Action */}
          {booking.status === "pending" && booking.payment_status === "unpaid" && (
            <div className="border-t pt-6">
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handlePayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Secure payment powered by Stripe
              </p>
            </div>
          )}

          {/* QR Access Code */}
          {booking.status === "confirmed" && booking.qr_token && (
            <div className="border-t pt-6">
              <div className="text-center">
                <QrCode className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-semibold mb-1">Access Code</p>
                <p className="text-sm text-muted-foreground mb-3">Show this code to access your pod</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-lg tracking-wider">
                  {booking.qr_token.split("-")[0].toUpperCase()}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Booking Reference */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Booking Reference: #{booking.id}
        </p>
      </div>
    </Layout>
  );
}

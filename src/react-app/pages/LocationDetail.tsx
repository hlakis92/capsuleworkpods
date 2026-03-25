import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { MapPin, Clock, ArrowLeft, Wifi, Thermometer, Volume2, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/react-app/components/ui/badge";
import { Button } from "@/react-app/components/ui/button";
import Layout from "@/react-app/components/Layout";

interface Pod {
  id: number;
  slug: string;
  name: string;
  type: "standard" | "premium" | "executive";
  price_per_hour: number;
  amenities: string[];
  image_url: string;
  is_out_of_service: boolean;
}

interface LocationWithPods {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  image_url: string;
  description: string;
  open_hours: string;
  pods: Pod[];
}

function PodTypeIcon({ type }: { type: Pod["type"] }) {
  const colors = {
    standard: "bg-blue-500/10 text-blue-600",
    premium: "bg-amber-500/10 text-amber-600",
    executive: "bg-purple-500/10 text-purple-600",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors[type]}`}>
      {type}
    </span>
  );
}

function AmenityIcon({ amenity }: { amenity: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "WiFi": <Wifi className="h-3.5 w-3.5" />,
    "Climate Control": <Thermometer className="h-3.5 w-3.5" />,
    "Sound System": <Volume2 className="h-3.5 w-3.5" />,
    "Noise Cancellation": <Volume2 className="h-3.5 w-3.5" />,
  };

  return iconMap[amenity] || null;
}

function AmenitiesList({ amenities }: { amenities: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = 4;
  const hasMore = amenities.length > visibleCount;
  const displayedAmenities = expanded ? amenities : amenities.slice(0, visibleCount);

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {displayedAmenities.map((amenity) => (
        <span
          key={amenity}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs"
        >
          <AmenityIcon amenity={amenity} />
          {amenity}
        </span>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
        >
          {expanded ? "Show less" : `+${amenities.length - visibleCount} more`}
        </button>
      )}
    </div>
  );
}

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const [location, setLocation] = useState<LocationWithPods | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;

    fetch(`/api/locations/${locationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Location not found");
        return res.json();
      })
      .then((data) => {
        setLocation(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [locationId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !location) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Location not found</h1>
          <p className="text-muted-foreground mb-6">
            The location you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/locations">Back to Locations</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const availablePods = location.pods.filter((p) => !p.is_out_of_service);
  const outOfServicePods = location.pods.filter((p) => p.is_out_of_service);

  return (
    <Layout>
      {/* Hero */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={location.image_url}
          alt={location.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/locations"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              All Locations
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">{location.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Location Info */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location.address}, {location.city}, {location.state}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{location.open_hours}</span>
          </div>
          <Badge variant="secondary">
            {availablePods.length} pod{availablePods.length !== 1 ? "s" : ""} available
          </Badge>
        </div>

        <p className="text-muted-foreground mb-10 max-w-3xl">
          {location.description}
        </p>

        {/* Pods Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-6">Available Pods</h2>
          
          {availablePods.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
              <p className="text-muted-foreground">No pods available at this location right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availablePods.map((pod) => (
                <div
                  key={pod.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={pod.image_url}
                      alt={pod.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{pod.name}</h3>
                      <PodTypeIcon type={pod.type} />
                    </div>
                    
                    <AmenitiesList amenities={pod.amenities} />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold">${pod.price_per_hour}</span>
                        <span className="text-muted-foreground text-sm">/hour</span>
                      </div>
                      <Button size="sm" asChild>
                        <Link to={`/book/${location.slug}/${pod.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Out of Service Pods */}
        {outOfServicePods.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-6 text-muted-foreground">
              Temporarily Unavailable
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outOfServicePods.map((pod) => (
                <div
                  key={pod.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-muted/30 opacity-60"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={pod.image_url}
                      alt={pod.name}
                      className="h-full w-full object-cover grayscale"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-full text-white">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Out of Service</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{pod.name}</h3>
                      <PodTypeIcon type={pod.type} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This pod is temporarily unavailable for booking.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { MapPin, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/react-app/components/ui/badge";
import Layout from "@/react-app/components/Layout";

interface LocationWithCounts {
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
  pod_count: number;
  available_pod_count: number;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        setLocations(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load locations");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Find a Location
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose from our network of premium capsule pod locations across Minnesota.
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Link
              key={location.id}
              to={`/locations/${location.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/50 transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={location.image_url}
                  alt={location.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {location.city}, {location.state}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {location.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white border-0 backdrop-blur-sm"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {location.open_hours}
                    </Badge>
                    <span className="text-white/80 text-sm">
                      {location.available_pod_count}/{location.pod_count} pods
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary transition-colors">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

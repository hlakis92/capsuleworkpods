import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Clock, Navigation, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Slider } from "@/react-app/components/ui/slider";
import Layout from "@/react-app/components/Layout";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// Component to recenter map when user location changes
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

interface LocationData {
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

interface LocationWithDistance extends LocationData {
  distance: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function NearMePage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [rangeMiles, setRangeMiles] = useState(25);

  // Default center on Minneapolis
  const defaultCenter: [number, number] = [44.9778, -93.2650];

  // Fetch locations from API
  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        setLocations(data);
        setLoadingLocations(false);
      })
      .catch(() => {
        setLoadingLocations(false);
      });
  }, []);

  const nearbyLocations = useMemo((): LocationWithDistance[] => {
    if (!userLocation) return [];
    return locations
      .map((loc) => ({
        ...loc,
        distance: calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng),
      }))
      .filter((loc) => loc.distance <= rangeMiles)
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation, rangeMiles, locations]);

  const mapCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : defaultCenter;

  const requestLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  if (loadingLocations) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Navigation className="h-8 w-8 text-primary" />
            Near Me
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Find capsule pod locations near your current position.
          </p>
        </div>

        {/* Location Request / Range Controls */}
        <div className="mb-6 p-4 rounded-xl border border-border bg-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={requestLocation}
              disabled={isLocating}
              className="shrink-0"
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  {userLocation ? "Update Location" : "Find My Location"}
                </>
              )}
            </Button>

            {userLocation && (
              <div className="flex-1 w-full sm:w-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Search radius</span>
                  <span className="text-sm font-medium">{rangeMiles} miles</span>
                </div>
                <Slider
                  value={[rangeMiles]}
                  onValueChange={(value) => setRangeMiles(value[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {locationError && (
            <div className="mt-4 flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {userLocation && (
            <div className="mt-4 text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{nearbyLocations.length}</span>{" "}
              location{nearbyLocations.length !== 1 ? "s" : ""} within {rangeMiles} miles
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-border">
            <MapContainer
              center={mapCenter}
              zoom={userLocation ? 10 : 8}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} zoom={userLocation ? 10 : 8} />

              {/* User location marker */}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                  <Popup>
                    <div className="font-medium">Your Location</div>
                  </Popup>
                </Marker>
              )}

              {/* Location markers */}
              {(userLocation ? nearbyLocations : locations).map((loc) => (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={defaultIcon}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-semibold text-base">{loc.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {loc.address}, {loc.city}
                      </div>
                      {"distance" in loc && (
                        <div className="text-sm text-primary font-medium mt-1">
                          {(loc as LocationWithDistance).distance.toFixed(1)} miles away
                        </div>
                      )}
                      <div className="text-sm mt-1">
                        {loc.available_pod_count} pods available
                      </div>
                      <Link
                        to={`/locations/${loc.slug}`}
                        className="inline-block mt-2 text-sm text-primary hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Locations List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {!userLocation ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Enable Location</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Click "Find My Location" to discover capsule pods near you.
                </p>
              </div>
            ) : nearbyLocations.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Locations Found</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Try increasing your search radius to find nearby pods.
                </p>
              </div>
            ) : (
              nearbyLocations.map((location) => (
                <Link
                  key={location.id}
                  to={`/locations/${location.slug}`}
                  className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-300"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {location.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {location.city}, {location.state}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {location.distance.toFixed(1)} mi
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {location.open_hours}
                      </div>
                      <span className="text-sm">
                        {location.available_pod_count} pod{location.available_pod_count !== 1 ? "s" : ""} available
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary transition-colors">
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

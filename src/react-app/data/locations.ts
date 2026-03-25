export interface Pod {
  id: string;
  name: string;
  type: "standard" | "premium" | "executive";
  pricePerHour: number;
  amenities: string[];
  imageUrl: string;
  isOutOfService: boolean;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  imageUrl: string;
  description: string;
  openHours: string;
  pods: Pod[];
}

export const locations: Location[] = [
  {
    id: "loc-msp-airport",
    name: "MSP Airport Terminal 1",
    address: "4300 Glumack Dr",
    city: "Minneapolis",
    state: "MN",
    lat: 44.8848,
    lng: -93.2223,
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
    description: "Rest between flights at Minneapolis-Saint Paul International Airport. Located in Terminal 1, Concourse G after security for easy access during layovers.",
    openHours: "5:00 AM - 12:00 AM",
    pods: [
      {
        id: "pod-msp-1",
        name: "Sky Pod 1",
        type: "premium",
        pricePerHour: 22,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-msp-2",
        name: "Sky Pod 2",
        type: "premium",
        pricePerHour: 22,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-msp-3",
        name: "Executive Suite 1",
        type: "executive",
        pricePerHour: 35,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Noise Cancellation", "Shower Access", "Lounge Chair"],
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80",
        isOutOfService: false,
      },
    ],
  },
  {
    id: "loc-downtown-mpls",
    name: "Downtown Minneapolis",
    address: "50 S 6th Street",
    city: "Minneapolis",
    state: "MN",
    lat: 44.9778,
    lng: -93.2650,
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    description: "Located in the heart of downtown Minneapolis near the Skyway system. Perfect for business travelers and remote workers seeking a quiet, productive space.",
    openHours: "24/7",
    pods: [
      {
        id: "pod-dtm-1",
        name: "Pod A1",
        type: "standard",
        pricePerHour: 12,
        amenities: ["WiFi", "USB Charging", "Reading Light"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-dtm-2",
        name: "Pod A2",
        type: "standard",
        pricePerHour: 12,
        amenities: ["WiFi", "USB Charging", "Reading Light"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-dtm-3",
        name: "Pod B1",
        type: "premium",
        pricePerHour: 18,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-dtm-4",
        name: "Pod C1",
        type: "executive",
        pricePerHour: 28,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System", "Monitor", "Privacy Glass"],
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80",
        isOutOfService: true,
      },
    ],
  },
  {
    id: "loc-mall-of-america",
    name: "Mall of America",
    address: "60 E Broadway",
    city: "Bloomington",
    state: "MN",
    lat: 44.8549,
    lng: -93.2422,
    imageUrl: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80",
    description: "Take a break from shopping at America's largest mall. Our pods offer a quiet escape in the midst of all the excitement.",
    openHours: "10:00 AM - 9:00 PM",
    pods: [
      {
        id: "pod-moa-1",
        name: "Rest Pod 1",
        type: "standard",
        pricePerHour: 14,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-moa-2",
        name: "Rest Pod 2",
        type: "standard",
        pricePerHour: 14,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-moa-3",
        name: "Premium Pod 1",
        type: "premium",
        pricePerHour: 20,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "Sound System", "Massage Chair"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
    ],
  },
  {
    id: "loc-st-paul",
    name: "St. Paul Union Depot",
    address: "214 4th Street E",
    city: "St. Paul",
    state: "MN",
    lat: 44.9480,
    lng: -93.0860,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    description: "Historic Union Depot meets modern comfort. Perfect for light rail commuters and visitors exploring downtown St. Paul.",
    openHours: "6:00 AM - 10:00 PM",
    pods: [
      {
        id: "pod-sp-1",
        name: "Work Pod 1",
        type: "standard",
        pricePerHour: 12,
        amenities: ["WiFi", "USB Charging", "Desk", "Ergonomic Chair"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-sp-2",
        name: "Work Pod 2",
        type: "standard",
        pricePerHour: 12,
        amenities: ["WiFi", "USB Charging", "Desk", "Ergonomic Chair"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-sp-3",
        name: "Focus Room 1",
        type: "premium",
        pricePerHour: 22,
        amenities: ["WiFi", "USB Charging", "Desk", "Ergonomic Chair", "4K Monitor", "Keyboard", "Standing Desk Option"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
    ],
  },
  {
    id: "loc-rochester",
    name: "Rochester Mayo Clinic Area",
    address: "125 1st Avenue SW",
    city: "Rochester",
    state: "MN",
    lat: 44.0234,
    lng: -92.4631,
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    description: "Peaceful rest pods near Mayo Clinic. Ideal for patients, families, and medical professionals seeking a quiet space to recharge.",
    openHours: "24/7",
    pods: [
      {
        id: "pod-roc-1",
        name: "Comfort Pod 1",
        type: "standard",
        pricePerHour: 10,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Blackout Blinds"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-roc-2",
        name: "Comfort Pod 2",
        type: "standard",
        pricePerHour: 10,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Blackout Blinds"],
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-roc-3",
        name: "Wellness Pod 1",
        type: "premium",
        pricePerHour: 18,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "White Noise", "Aromatherapy"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
      {
        id: "pod-roc-4",
        name: "Wellness Pod 2",
        type: "premium",
        pricePerHour: 18,
        amenities: ["WiFi", "USB Charging", "Reading Light", "Climate Control", "White Noise", "Aromatherapy"],
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        isOutOfService: false,
      },
    ],
  },
];

export function getLocationById(id: string): Location | undefined {
  return locations.find((loc) => loc.id === id);
}

export function getPodById(locationId: string, podId: string): Pod | undefined {
  const location = getLocationById(locationId);
  return location?.pods.find((pod) => pod.id === podId);
}

// Calculate distance between two points in miles using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function getLocationsWithinRange(
  userLat: number,
  userLng: number,
  rangeMiles: number
): (Location & { distance: number })[] {
  return locations
    .map((loc) => ({
      ...loc,
      distance: calculateDistance(userLat, userLng, loc.lat, loc.lng),
    }))
    .filter((loc) => loc.distance <= rangeMiles)
    .sort((a, b) => a.distance - b.distance);
}

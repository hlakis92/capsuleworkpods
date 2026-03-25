import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, MapPin, Check, Clock, Calendar, CreditCard, Loader2, AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/react-app/components/ui/radio-group";
import Layout from "@/react-app/components/Layout";
import { cn } from "@/react-app/lib/utils";
import { useAuth } from "@getmocha/users-service/react";

type MembershipTier = "free" | "plus" | "pro";

interface UserWithTier {
  id: string;
  membership_tier?: string;
}

const DEFAULT_DISCOUNTS: Record<MembershipTier, number> = {
  free: 0,
  plus: 10,
  pro: 20,
};

const DURATION_OPTIONS = [
  { value: 0.5, label: "30 minutes" },
  { value: 1, label: "1 hour" },
  { value: 1.5, label: "1.5 hours" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 4, label: "4 hours" },
  { value: 6, label: "6 hours" },
  { value: 8, label: "8 hours" },
];

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

interface LocationData {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  image_url: string;
  pod_count?: number;
  available_pod_count?: number;
  pods?: Pod[];
}

interface BookingState {
  locationSlug: string;
  podId: number | null;
  date: string;
  time: string;
  duration: number;
}

const steps = [
  { id: 1, name: "Location", icon: MapPin },
  { id: 2, name: "Pod", icon: Check },
  { id: 3, name: "Date & Time", icon: Calendar },
  { id: 4, name: "Duration", icon: Clock },
  { id: 5, name: "Review", icon: CreditCard },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                isCurrent && "border-primary text-primary",
                !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 sm:w-12 h-0.5 mx-1",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LocationStep({
  locations,
  selectedSlug,
  onSelect,
}: {
  locations: LocationData[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-6">Select a Location</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {locations.map((location) => {
          const isSelected = selectedSlug === location.slug;

          return (
            <button
              key={location.id}
              onClick={() => onSelect(location.slug)}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 text-left transition-all",
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={location.image_url}
                  alt={location.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {location.city}, {location.state} · {location.available_pod_count} pods available
                </p>
              </div>
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PodStep({
  location,
  selectedId,
  onSelect,
}: {
  location: LocationData;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const availablePods = (location.pods || []).filter((p) => !p.is_out_of_service);

  const typeColors = {
    standard: "bg-blue-500/10 text-blue-600 border-blue-200",
    premium: "bg-amber-500/10 text-amber-600 border-amber-200",
    executive: "bg-purple-500/10 text-purple-600 border-purple-200",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-2">Select a Pod</h2>
      <p className="text-muted-foreground mb-6">at {location.name}</p>

      {availablePods.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <p className="text-muted-foreground">No pods available at this location.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availablePods.map((pod) => {
            const isSelected = selectedId === pod.id;

            return (
              <button
                key={pod.id}
                onClick={() => onSelect(pod.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={pod.image_url}
                    alt={pod.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{pod.name}</h3>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                        typeColors[pod.type]
                      )}
                    >
                      {pod.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pod.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                  <div className="text-lg font-bold">
                    ${pod.price_per_hour}
                    <span className="text-sm font-normal text-muted-foreground">/hour</span>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateTimeStep({
  date,
  time,
  onDateChange,
  onTimeChange,
  bookedSlots,
  podName,
}: {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  bookedSlots: { start: string; end: string }[];
  podName: string;
}) {
  const today = new Date().toISOString().split("T")[0];

  const formatTimeDisplay = (isoString: string) => {
    const d = new Date(isoString);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Generate time slots from 6 AM to 10 PM in 30-minute increments
  const timeSlots = Array.from({ length: 33 }, (_, i) => {
    const totalMinutes = i * 30 + 6 * 60; // Start at 6 AM
    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return {
      hour,
      minutes,
      label: `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`,
    };
  });

  // Check if a time slot overlaps with any booking (30-minute slot granularity)
  const isSlotBooked = (slotHour: number, slotMinutes: number) => {
    if (!date) return false;
    const slotStartMinutes = slotHour * 60 + slotMinutes;
    const slotEndMinutes = slotStartMinutes + 30; // Each slot is 30 minutes
    
    return bookedSlots.some((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      const slotDate = slotStart.toISOString().split("T")[0];
      if (slotDate !== date) return false;
      
      const bookingStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
      const bookingEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      
      // Check for ANY overlap between slot range and booking range
      return slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes;
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-center mb-6">Choose Date & Time</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              min={today}
              className="text-lg h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Start Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="text-lg h-12"
            />
          </div>
        </div>

        {/* Schedule View */}
        <div className="space-y-2">
          <Label>{date ? `Schedule for ${podName}` : "Select a date to see schedule"}</Label>
          <div className="border rounded-lg p-3 bg-muted/30 max-h-[280px] overflow-y-auto">
            {!date ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Choose a date to view availability
              </p>
            ) : (
              <div className="space-y-1">
                {timeSlots.map(({ hour, minutes, label }) => {
                  const booked = isSlotBooked(hour, minutes);
                  return (
                    <div
                      key={`${hour}-${minutes}`}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded text-sm",
                        booked
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      )}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-xs">
                        {booked ? "Booked" : "Available"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {date && bookedSlots.length > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Existing Bookings:</p>
              <div className="space-y-1">
                {bookedSlots.map((slot, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatTimeDisplay(slot.start)} – {formatTimeDisplay(slot.end)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function calculateProratedMinutes(date: string, time: string, durationHours: number): { actualMinutes: number; isProrated: boolean } {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const bookingStart = new Date(`${date}T${time}:00`);
  const bookingEndMinutes = hours * 60 + minutes + durationHours * 60;
  
  // If booking starts in the past (same day, earlier time)
  if (bookingStart < now && date === now.toISOString().split("T")[0]) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = hours * 60 + minutes;
    
    // Only prorate if we're within the booking window
    if (nowMinutes < bookingEndMinutes && nowMinutes > startMinutes) {
      const remainingMinutes = bookingEndMinutes - nowMinutes;
      return { actualMinutes: remainingMinutes, isProrated: true };
    }
  }
  
  return { actualMinutes: durationHours * 60, isProrated: false };
}

function DurationStep({
  duration,
  onDurationChange,
  pricePerHour,
  date,
  time,
}: {
  duration: number;
  onDurationChange: (duration: number) => void;
  pricePerHour: number;
  date: string;
  time: string;
}) {
  const pricePerMinute = pricePerHour / 60;
  
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-center mb-6">Select Duration</h2>

      <RadioGroup
        value={duration.toString()}
        onValueChange={(val) => onDurationChange(parseFloat(val))}
        className="grid gap-3"
      >
        {DURATION_OPTIONS.map((option) => {
          const isSelected = duration === option.value;
          const { actualMinutes, isProrated } = calculateProratedMinutes(date, time, option.value);
          const total = (pricePerMinute * actualMinutes).toFixed(2);
          const fullPrice = (pricePerHour * option.value).toFixed(2);

          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={option.value.toString()} id={`duration-${option.value}`} />
                <span className="font-medium">{option.label}</span>
                {isProrated && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {Math.round(actualMinutes)} min remaining
                  </span>
                )}
              </div>
              <div className="text-right">
                {isProrated ? (
                  <>
                    <span className="text-muted-foreground line-through text-sm mr-2">${fullPrice}</span>
                    <span className="text-green-600 font-medium">${total}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">${total}</span>
                )}
              </div>
            </label>
          );
        })}
      </RadioGroup>
      
      {date && time && (
        <p className="text-sm text-muted-foreground text-center">
          Prices are prorated if booking starts within the current time slot
        </p>
      )}
    </div>
  );
}

function ReviewStep({
  location,
  pod,
  date,
  time,
  duration,
  membershipTier,
  discounts,
}: {
  location: LocationData;
  pod: Pod;
  date: string;
  time: string;
  duration: number;
  membershipTier: MembershipTier;
  discounts: Record<MembershipTier, number>;
}) {
  const { actualMinutes, isProrated } = calculateProratedMinutes(date, time, duration);
  const pricePerMinute = pod.price_per_hour / 60;
  const basePrice = pricePerMinute * actualMinutes;
  const fullPrice = pod.price_per_hour * duration;
  const discountPercent = discounts[membershipTier];
  const discountAmount = (basePrice * discountPercent) / 100;
  const finalPrice = basePrice - discountAmount;

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr${hours !== 1 ? "s" : ""}`;
    return `${hours} hr ${minutes} min`;
  };

  const endTime = (() => {
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold text-center mb-6">Review Your Booking</h2>

      <Card className="p-6 space-y-4">
        <div className="flex gap-4">
          <img
            src={pod.image_url}
            alt={pod.name}
            className="w-24 h-24 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-semibold text-lg">{pod.name}</h3>
            <p className="text-sm text-muted-foreground">{location.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{pod.type} Pod</p>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">
              {formatTime(time)} – {formatTime(endTime)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">
              {formatDuration(duration * 60)}
              {isProrated && (
                <span className="text-amber-600 text-sm ml-2">
                  ({formatDuration(actualMinutes)} actual)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          {isProrated ? (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span className="line-through">
                  ${pod.price_per_hour}/hr × {duration} hr{duration !== 1 ? "s" : ""}
                </span>
                <span className="line-through">${fullPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>
                  Prorated ({formatDuration(actualMinutes)})
                </span>
                <span>${basePrice.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                ${pod.price_per_hour}/hr × {duration} hr{duration !== 1 ? "s" : ""}
              </span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} Member Discount ({discountPercent}%)</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>${finalPrice.toFixed(2)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function BookingWizardPage() {
  const { locationId, podId } = useParams<{ locationId?: string; podId?: string }>();
  const navigate = useNavigate();
  const { user, isPending: authPending, redirectToLogin } = useAuth();

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<{ start: string; end: string }[]>([]);
  const [membershipDiscounts, setMembershipDiscounts] = useState<Record<MembershipTier, number>>(DEFAULT_DISCOUNTS);

  const getInitialStep = () => {
    if (locationId && podId) return 3;
    if (locationId) return 2;
    return 1;
  };

  const [step, setStep] = useState(getInitialStep);
  const [booking, setBooking] = useState<BookingState>({
    locationSlug: locationId || "",
    podId: podId ? parseInt(podId) : null,
    date: "",
    time: "",
    duration: 2,
  });

  // Get membership tier from authenticated user
  const typedUser = user as unknown as UserWithTier | null;
  const membershipTier: MembershipTier = (typedUser?.membership_tier as MembershipTier) || "free";

  // Fetch all locations for step 1
  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        setLocations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch membership discounts from settings
  useEffect(() => {
    fetch("/api/membership-discounts")
      .then((res) => res.json())
      .then((data) => {
        setMembershipDiscounts({ ...DEFAULT_DISCOUNTS, ...data });
      })
      .catch(() => {});
  }, []);

  // Fetch location details when location is selected
  useEffect(() => {
    if (!booking.locationSlug) {
      setSelectedLocation(null);
      return;
    }

    fetch(`/api/locations/${booking.locationSlug}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedLocation(data);
      })
      .catch(() => {});
  }, [booking.locationSlug]);

  // Fetch availability when pod and date are selected
  useEffect(() => {
    if (!booking.podId || !booking.date) {
      setBookedSlots([]);
      return;
    }

    fetch(`/api/pods/${booking.podId}/availability?date=${booking.date}`)
      .then((res) => res.json())
      .then((data) => {
        setBookedSlots(data.booked_slots || []);
      })
      .catch(() => setBookedSlots([]));
  }, [booking.podId, booking.date]);

  const selectedPod = useMemo(() => {
    if (!selectedLocation?.pods || !booking.podId) return null;
    return selectedLocation.pods.find((p) => p.id === booking.podId) || null;
  }, [selectedLocation, booking.podId]);

  // Check if selected time conflicts with existing bookings
  const hasTimeConflict = useMemo(() => {
    if (!booking.date || !booking.time || !booking.duration) return false;

    const startTime = new Date(`${booking.date}T${booking.time}:00`);
    const endTime = new Date(startTime.getTime() + booking.duration * 60 * 60 * 1000);

    return bookedSlots.some((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return (startTime < slotEnd && endTime > slotStart);
    });
  }, [booking.date, booking.time, booking.duration, bookedSlots]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return !!booking.locationSlug;
      case 2:
        return !!booking.podId;
      case 3:
        return !!booking.date && !!booking.time && !hasTimeConflict;
      case 4:
        return booking.duration > 0 && !hasTimeConflict;
      case 5:
        return !!user && !hasTimeConflict;
      default:
        return false;
    }
  }, [step, booking, user, hasTimeConflict]);

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Submit booking to backend
      if (!user) {
        await redirectToLogin();
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        const startTime = `${booking.date}T${booking.time}:00`;
        
        // Calculate end time by adding duration (in hours, can be fractional) to start time
        const [startHours, startMinutes] = booking.time.split(":").map(Number);
        const totalStartMinutes = startHours * 60 + startMinutes;
        const durationMinutes = booking.duration * 60;
        const totalEndMinutes = totalStartMinutes + durationMinutes;
        const endHours = Math.floor(totalEndMinutes / 60) % 24;
        const endMinutes = totalEndMinutes % 60;
        const endTime = `${booking.date}T${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:00`;
        
        // Calculate prorated minutes for pricing
        const { actualMinutes, isProrated } = calculateProratedMinutes(booking.date, booking.time, booking.duration);

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pod_id: booking.podId,
            start_time: startTime,
            end_time: endTime,
            duration: booking.duration,
            actual_minutes: actualMinutes,
            is_prorated: isProrated,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create booking");
        }

        const bookingData = await response.json();
        // Navigate to payment or booking confirmation
        navigate(`/bookings/${bookingData.id}`);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to create booking");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLocationSelect = (slug: string) => {
    setBooking({ ...booking, locationSlug: slug, podId: null });
  };

  const handlePodSelect = (id: number) => {
    setBooking({ ...booking, podId: id });
  };

  if (loading || authPending) {
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          to={locationId ? `/locations/${locationId}` : "/locations"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {locationId ? "Location" : "Locations"}
        </Link>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <LocationStep
              locations={locations}
              selectedSlug={booking.locationSlug}
              onSelect={handleLocationSelect}
            />
          )}

          {step === 2 && selectedLocation && (
            <PodStep
              location={selectedLocation}
              selectedId={booking.podId}
              onSelect={handlePodSelect}
            />
          )}

          {step === 3 && (
            <DateTimeStep
              date={booking.date}
              time={booking.time}
              onDateChange={(date) => setBooking({ ...booking, date })}
              onTimeChange={(time) => setBooking({ ...booking, time })}
              bookedSlots={bookedSlots}
              podName={selectedPod?.name || "this pod"}
            />
          )}

          {step === 4 && selectedPod && (
            <DurationStep
              duration={booking.duration}
              onDurationChange={(duration) => setBooking({ ...booking, duration })}
              pricePerHour={selectedPod.price_per_hour}
              date={booking.date}
              time={booking.time}
            />
          )}

          {step === 5 && selectedLocation && selectedPod && (
            <>
              <ReviewStep
                location={selectedLocation}
                pod={selectedPod}
                date={booking.date}
                time={booking.time}
                duration={booking.duration}
                membershipTier={membershipTier}
                discounts={membershipDiscounts}
              />
              
              {/* Login prompt for unauthenticated users */}
              {!user && (
                <Card className="max-w-lg mx-auto mt-6 p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-start gap-3">
                    <LogIn className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Sign in to complete booking</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        You'll need to sign in with Google to confirm your booking.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Error message */}
              {submitError && (
                <Card className="max-w-lg mx-auto mt-6 p-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">Booking failed</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{submitError}</p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Time conflict warning */}
        {hasTimeConflict && (step === 3 || step === 4) && (
          <Card className="mt-4 p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Time slot unavailable</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This time slot conflicts with an existing booking. Please select a different time.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button 
            onClick={handleNext} 
            disabled={!canProceed || submitting} 
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : step === 5 ? (
              user ? "Confirm & Pay" : "Sign in to Book"
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

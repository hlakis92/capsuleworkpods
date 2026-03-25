import { useAuth } from "@getmocha/users-service/react";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { User, Mail, Calendar, Crown, LogOut, Loader2, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";
import Layout from "@/react-app/components/Layout";

interface UserWithTier {
  id: string;
  email: string;
  google_user_data: {
    name?: string | null;
    picture?: string | null;
    given_name?: string | null;
  };
  created_at: string;
  membership_tier?: string;
}

interface MembershipTier {
  tier: string;
  discount_percent: number;
  description: string;
  monthly_price: number;
}

const tierColors: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-600 border-gray-200",
  plus: "bg-blue-500/10 text-blue-600 border-blue-200",
  pro: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const tierBenefits: Record<string, string[]> = {
  free: ["Browse all locations", "Book pods", "Standard support"],
  plus: ["Everything in Free", "10% discount on all bookings", "Priority support", "Extended booking hours"],
  pro: ["Everything in Plus", "20% discount on all bookings", "VIP support", "Early access to new locations", "Exclusive pod access"],
};

const tierIcons: Record<string, string> = {
  free: "🌱",
  plus: "⚡",
  pro: "👑",
};

export default function ProfilePage() {
  const { user, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Check for upgrade success from Stripe redirect and verify payment
  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    const sessionId = searchParams.get("session_id");

    if (upgradeStatus === "success" && sessionId) {
      // Verify the payment and complete the upgrade
      fetch("/api/membership/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUpgradeSuccess(true);
            // Reload the page to get updated user data
            window.history.replaceState({}, "", "/profile");
            window.location.reload();
          }
        })
        .catch((err) => {
          console.error("Upgrade verification failed:", err);
        });
    }
  }, [searchParams]);

  // Fetch membership tiers when modal opens
  useEffect(() => {
    if (showUpgradeModal && tiers.length === 0) {
      setLoadingTiers(true);
      fetch("/api/membership-tiers")
        .then(res => res.json())
        .then((data: MembershipTier[]) => {
          setTiers(data);
          setLoadingTiers(false);
        })
        .catch(() => setLoadingTiers(false));
    }
  }, [showUpgradeModal, tiers.length]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleUpgrade = async (tier: string) => {
    setUpgrading(tier);
    try {
      const res = await fetch("/api/membership/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
      setUpgrading(null);
    }
  };

  if (isPending) {
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
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-4">Sign in to view your profile</h1>
          <p className="text-muted-foreground mb-8">
            Access your bookings, membership benefits, and account settings.
          </p>
          <Button onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
      </Layout>
    );
  }

  const typedUser = user as unknown as UserWithTier;
  const membershipTier = typedUser.membership_tier || "free";
  const memberSince = new Date(typedUser.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const tierOrder = { free: 0, plus: 1, pro: 2 };
  const canUpgradeTo = (tier: string) => {
    return tierOrder[tier as keyof typeof tierOrder] > tierOrder[membershipTier as keyof typeof tierOrder];
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {/* Upgrade Success Banner */}
        {upgradeSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-700">Membership upgraded successfully!</p>
              <p className="text-sm text-green-600">Your new benefits are now active.</p>
            </div>
          </div>
        )}

        {/* User Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            {typedUser.google_user_data?.picture ? (
              <img
                src={typedUser.google_user_data.picture}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {typedUser.google_user_data?.name || typedUser.google_user_data?.given_name || "User"}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Mail className="h-4 w-4" />
                <span>{typedUser.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>Member since {memberSince}</span>
              </div>
            </div>

            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Membership Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Membership</h2>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <Badge className={`${tierColors[membershipTier]} capitalize text-sm px-3 py-1`}>
              {tierIcons[membershipTier]} {membershipTier}
            </Badge>
            {membershipTier === "pro" && (
              <span className="text-sm text-purple-600 font-medium">
                You have the best membership!
              </span>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">Your Benefits</h3>
            <ul className="space-y-1">
              {tierBenefits[membershipTier]?.map((benefit, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {membershipTier !== "pro" && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Unlock more benefits
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade your membership for bigger discounts and perks
                  </p>
                </div>
                <Button onClick={() => setShowUpgradeModal(true)} className="gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/bookings")}>
            <h3 className="font-medium">My Bookings</h3>
            <p className="text-sm text-muted-foreground">View and manage your reservations</p>
          </Card>
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/locations")}>
            <h3 className="font-medium">Find a Pod</h3>
            <p className="text-sm text-muted-foreground">Browse available locations</p>
          </Card>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Upgrade Your Membership</h2>
                <p className="text-muted-foreground">Choose a plan that works for you</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowUpgradeModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6">
              {loadingTiers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {tiers.map((tier) => {
                    const isCurrentTier = tier.tier === membershipTier;
                    const canUpgrade = canUpgradeTo(tier.tier);
                    const isHighlighted = tier.tier === "plus";

                    return (
                      <div
                        key={tier.tier}
                        className={`relative rounded-xl border-2 p-5 transition-all ${
                          isHighlighted
                            ? "border-blue-500 bg-blue-500/5"
                            : isCurrentTier
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        {isHighlighted && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                            Most Popular
                          </div>
                        )}

                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">{tierIcons[tier.tier]}</div>
                          <h3 className="text-lg font-bold capitalize">{tier.tier}</h3>
                          <div className="mt-2">
                            {tier.monthly_price === 0 ? (
                              <span className="text-2xl font-bold">Free</span>
                            ) : (
                              <>
                                <span className="text-3xl font-bold">${(tier.monthly_price / 100).toFixed(0)}</span>
                                <span className="text-muted-foreground">/month</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-6">
                          {tierBenefits[tier.tier]?.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                          {tier.discount_percent > 0 && (
                            <div className="flex items-start gap-2 text-sm font-medium text-green-600">
                              <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{tier.discount_percent}% off all bookings</span>
                            </div>
                          )}
                        </div>

                        {isCurrentTier ? (
                          <Button className="w-full" disabled variant="outline">
                            Current Plan
                          </Button>
                        ) : canUpgrade ? (
                          <Button
                            className="w-full"
                            onClick={() => handleUpgrade(tier.tier)}
                            disabled={upgrading !== null}
                          >
                            {upgrading === tier.tier ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Upgrade to ${tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}`
                            )}
                          </Button>
                        ) : (
                          <Button className="w-full" disabled variant="outline">
                            —
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

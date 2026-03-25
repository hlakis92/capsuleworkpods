import { useState, useEffect } from "react";
import { AdminLayout } from "@/react-app/components/AdminLayout";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Card } from "@/react-app/components/ui/card";
import {
  CreditCard,
  Percent,
  Save,
  Loader2,
  Users,
  Star,
  Crown,
  AlertCircle,
  Check,
} from "lucide-react";

interface MembershipSetting {
  id: number;
  tier: string;
  discount_percent: number;
  description: string;
}

interface MembersByTier {
  free: number;
  plus: number;
  pro: number;
}

const tierIcons: Record<string, React.ReactNode> = {
  free: <Users className="h-5 w-5" />,
  plus: <Star className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
};

const tierColors: Record<string, string> = {
  free: "from-slate-500 to-slate-600",
  plus: "from-blue-500 to-blue-600",
  pro: "from-violet-500 to-violet-600",
};

const tierBorderColors: Record<string, string> = {
  free: "border-slate-500/30",
  plus: "border-blue-500/30",
  pro: "border-violet-500/30",
};

export default function AdminMemberships() {
  const [settings, setSettings] = useState<MembershipSetting[]>([]);
  const [memberStats, setMemberStats] = useState<MembersByTier>({ free: 0, plus: 0, pro: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, { discount: string; description: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch("/api/admin/membership-settings"),
        fetch("/api/admin/stats"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
        const initial: Record<string, { discount: string; description: string }> = {};
        data.forEach((s: MembershipSetting) => {
          initial[s.tier] = {
            discount: s.discount_percent.toString(),
            description: s.description || "",
          };
        });
        setEditedValues(initial);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMemberStats(statsData.membersByTier || { free: 0, plus: 0, pro: 0 });
      }
    } catch (err) {
      setError("Failed to load membership settings");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(tier: string, field: "discount" | "description", value: string) {
    setEditedValues((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
    setSuccessMessage(null);
  }

  async function handleSave(setting: MembershipSetting) {
    const edited = editedValues[setting.tier];
    if (!edited) return;

    const discount = parseFloat(edited.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError("Discount must be between 0 and 100");
      return;
    }

    setSaving(setting.tier);
    setError(null);

    try {
      const res = await fetch(`/api/admin/membership-settings/${setting.tier}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount_percent: discount,
          description: edited.description,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      setSuccessMessage(`${setting.tier.charAt(0).toUpperCase() + setting.tier.slice(1)} tier updated successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err) {
      setError("Failed to update settings");
    } finally {
      setSaving(null);
    }
  }

  function getMemberCount(tier: string): number {
    return memberStats[tier as keyof MembersByTier] || 0;
  }

  function hasChanges(setting: MembershipSetting): boolean {
    const edited = editedValues[setting.tier];
    if (!edited) return false;
    return (
      parseFloat(edited.discount) !== setting.discount_percent ||
      edited.description !== (setting.description || "")
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-violet-500" />
            Membership Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Configure discount percentages and descriptions for each membership tier
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-emerald-400">{successMessage}</p>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {settings.map((setting) => (
            <Card
              key={setting.tier}
              className={`bg-slate-900 border ${tierBorderColors[setting.tier]} overflow-hidden`}
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${tierColors[setting.tier]} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg text-white">
                      {tierIcons[setting.tier]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg capitalize">
                        {setting.tier}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {getMemberCount(setting.tier)} members
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {setting.discount_percent}%
                    </div>
                    <p className="text-white/70 text-xs">discount</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-slate-400 text-sm">Discount Percentage</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={editedValues[setting.tier]?.discount || ""}
                      onChange={(e) => handleChange(setting.tier, "discount", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Description</Label>
                  <Input
                    type="text"
                    value={editedValues[setting.tier]?.description || ""}
                    onChange={(e) => handleChange(setting.tier, "description", e.target.value)}
                    placeholder="Tier description..."
                    className="bg-slate-800 border-slate-700 text-white mt-1.5"
                  />
                </div>

                <Button
                  onClick={() => handleSave(setting)}
                  disabled={saving === setting.tier || !hasChanges(setting)}
                  className={`w-full ${
                    hasChanges(setting)
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "bg-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {saving === setting.tier ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {hasChanges(setting) ? "Save Changes" : "No Changes"}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-slate-900/50 border-slate-800 p-6">
          <h3 className="text-white font-medium mb-3">How Discounts Work</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              Discounts are automatically applied at checkout based on the user's membership tier
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              Changes take effect immediately for all new bookings
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              Existing bookings retain their original pricing
            </li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}

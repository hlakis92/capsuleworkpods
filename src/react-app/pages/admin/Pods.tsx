import { useState, useEffect } from "react";
import { AdminLayout } from "@/react-app/components/AdminLayout";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Box,
  Save,
  AlertCircle,
  Search,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Location {
  id: number;
  name: string;
  city: string;
}

interface Pod {
  id: number;
  location_id: number;
  slug: string;
  name: string;
  type: string;
  price_per_hour: number;
  amenities: string | null;
  image_url: string | null;
  is_out_of_service: number;
  location_name?: string;
  location_city?: string;
}

type ModalMode = "closed" | "add" | "edit";

const POD_TYPES = ["standard", "premium", "executive", "quiet", "family"];
const AMENITIES_OPTIONS = [
  "WiFi",
  "Power Outlets",
  "USB Charging",
  "Climate Control",
  "Adjustable Lighting",
  "Privacy Screen",
  "Noise Canceling",
  "Ergonomic Seat",
  "Work Desk",
  "TV/Monitor",
  "Bluetooth Speakers",
  "Mini Fridge",
  "Coffee Machine",
];

export default function AdminPods() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    location_id: "",
    name: "",
    slug: "",
    type: "standard",
    price_per_hour: "",
    amenities: [] as string[],
    image_url: "",
    is_out_of_service: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [podsRes, locsRes] = await Promise.all([
        fetch("/api/admin/pods"),
        fetch("/api/admin/locations"),
      ]);

      if (!podsRes.ok || !locsRes.ok) throw new Error("Failed to fetch data");

      const podsData = await podsRes.json();
      const locsData = await locsRes.json();

      setPods(podsData.pods);
      setLocations(locsData.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function openAddModal() {
    setFormData({
      location_id: locations[0]?.id?.toString() || "",
      name: "",
      slug: "",
      type: "standard",
      price_per_hour: "15",
      amenities: ["WiFi", "Power Outlets", "USB Charging"],
      image_url: "",
      is_out_of_service: false,
    });
    setFormError(null);
    setEditingPod(null);
    setModalMode("add");
  }

  function openEditModal(pod: Pod) {
    let amenitiesList: string[] = [];
    if (pod.amenities) {
      try {
        amenitiesList = JSON.parse(pod.amenities);
      } catch {
        amenitiesList = [];
      }
    }

    setFormData({
      location_id: String(pod.location_id),
      name: pod.name,
      slug: pod.slug,
      type: pod.type,
      price_per_hour: String(pod.price_per_hour),
      amenities: amenitiesList,
      image_url: pod.image_url || "",
      is_out_of_service: pod.is_out_of_service === 1,
    });
    setFormError(null);
    setEditingPod(pod);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setEditingPod(null);
    setFormError(null);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: modalMode === "add" ? generateSlug(name) : prev.slug,
    }));
  }

  function toggleAmenity(amenity: string) {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formData.location_id || !formData.name || !formData.slug || !formData.price_per_hour) {
      setFormError("Please fill in all required fields");
      return;
    }

    const price = parseFloat(formData.price_per_hour);
    if (isNaN(price) || price <= 0) {
      setFormError("Please enter a valid price per hour");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        location_id: parseInt(formData.location_id),
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        price_per_hour: price,
        amenities: JSON.stringify(formData.amenities),
        image_url: formData.image_url || null,
        is_out_of_service: formData.is_out_of_service ? 1 : 0,
      };

      const url =
        modalMode === "add" ? "/api/admin/pods" : `/api/admin/pods/${editingPod!.id}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save pod");
      }

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pods/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete pod");
      }
      await fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleOutOfService(pod: Pod) {
    try {
      const res = await fetch(`/api/admin/pods/${pod.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_out_of_service: pod.is_out_of_service === 1 ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const filteredPods = pods.filter((pod) => {
    const matchesSearch =
      pod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !filterLocation || String(pod.location_id) === filterLocation;
    return matchesSearch && matchesLocation;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "premium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "executive":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "quiet":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "family":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Pods</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage capsule pods across all locations
            </p>
          </div>
          <Button
            onClick={openAddModal}
            disabled={locations.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Pod
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search pods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Create a location first before adding pods</p>
          </div>
        ) : filteredPods.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Box className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery || filterLocation ? "No pods match your filters" : "No pods yet"}
            </p>
            {!searchQuery && !filterLocation && (
              <Button
                onClick={openAddModal}
                variant="outline"
                className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Add your first pod
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Pod
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Price/hr
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPods.map((pod) => (
                    <tr key={pod.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {pod.image_url ? (
                            <img
                              src={pod.image_url}
                              alt={pod.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                              <Box className="h-5 w-5 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{pod.name}</p>
                            <p className="text-xs text-slate-500">/{pod.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-300">{pod.location_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border capitalize ${getTypeColor(
                            pod.type
                          )}`}
                        >
                          {pod.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <DollarSign className="h-4 w-4 text-slate-500" />
                          {pod.price_per_hour.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleOutOfService(pod)}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border transition-colors ${
                            pod.is_out_of_service
                              ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                          }`}
                        >
                          {pod.is_out_of_service ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              Out of Service
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Available
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(pod)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {deleteConfirm === pod.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(pod.id)}
                                disabled={deleting}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                              >
                                {deleting ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(pod.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalMode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {modalMode === "add" ? "Add Pod" : "Edit Pod"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{formError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">
                  Location <span className="text-red-400">*</span>
                </Label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData((p) => ({ ...p, location_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Pod A1"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Slug <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="pod-a1"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Type</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm capitalize"
                  >
                    {POD_TYPES.map((type) => (
                      <option key={type} value={type} className="capitalize">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Price per Hour ($) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData((p) => ({ ...p, price_per_hour: e.target.value }))}
                    placeholder="15.00"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES_OPTIONS.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        formData.amenities.includes(amenity)
                          ? "bg-violet-600 text-white border-violet-500"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Image URL</Label>
                <Input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="out-of-service"
                  checked={formData.is_out_of_service}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, is_out_of_service: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-500"
                />
                <Label htmlFor="out-of-service" className="text-slate-300 cursor-pointer">
                  Mark as out of service
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {modalMode === "add" ? "Create Pod" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

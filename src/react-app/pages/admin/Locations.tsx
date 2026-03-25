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
  MapPin,
  Box,
  Save,
  AlertCircle,
  Search,
} from "lucide-react";

interface Location {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  image_url: string | null;
  description: string | null;
  open_hours: string | null;
  pod_count?: number;
}

type ModalMode = "closed" | "add" | "edit";

export default function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    address: "",
    city: "",
    state: "",
    lat: "",
    lng: "",
    image_url: "",
    description: "",
    open_hours: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const res = await fetch("/api/admin/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      const data = await res.json();
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
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
      name: "",
      slug: "",
      address: "",
      city: "",
      state: "MN",
      lat: "",
      lng: "",
      image_url: "",
      description: "",
      open_hours: "24/7",
    });
    setFormError(null);
    setEditingLocation(null);
    setModalMode("add");
  }

  function openEditModal(location: Location) {
    setFormData({
      name: location.name,
      slug: location.slug,
      address: location.address,
      city: location.city,
      state: location.state,
      lat: String(location.lat),
      lng: String(location.lng),
      image_url: location.image_url || "",
      description: location.description || "",
      open_hours: location.open_hours || "",
    });
    setFormError(null);
    setEditingLocation(location);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode("closed");
    setEditingLocation(null);
    setFormError(null);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: modalMode === "add" ? generateSlug(name) : prev.slug,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.slug || !formData.address || !formData.city) {
      setFormError("Please fill in all required fields");
      return;
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setFormError("Please enter valid latitude and longitude values");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        lat,
        lng,
        image_url: formData.image_url || null,
        description: formData.description || null,
        open_hours: formData.open_hours || null,
      };

      const url =
        modalMode === "add"
          ? "/api/admin/locations"
          : `/api/admin/locations/${editingLocation!.id}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save location");
      }

      await fetchLocations();
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
      const res = await fetch(`/api/admin/locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete location");
      }
      await fetchLocations();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Locations</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage capsule pod locations across Minnesota
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
          />
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
        ) : filteredLocations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery ? "No locations match your search" : "No locations yet"}
            </p>
            {!searchQuery && (
              <Button
                onClick={openAddModal}
                variant="outline"
                className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Add your first location
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
                      Location
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Pods
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {location.image_url ? (
                            <img
                              src={location.image_url}
                              alt={location.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{location.name}</p>
                            <p className="text-xs text-slate-500">/{location.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{location.address}</p>
                        <p className="text-xs text-slate-500">
                          {location.city}, {location.state}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-300">
                          <Box className="h-4 w-4 text-slate-500" />
                          {location.pod_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300">{location.open_hours || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(location)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {deleteConfirm === location.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(location.id)}
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
                              onClick={() => setDeleteConfirm(location.id)}
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
                {modalMode === "add" ? "Add Location" : "Edit Location"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="MSP Airport Terminal 1"
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
                    placeholder="msp-airport-terminal-1"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">
                  Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="4300 Glumack Drive"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    City <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Minneapolis"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                    placeholder="MN"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label className="text-slate-300">Hours</Label>
                  <Input
                    value={formData.open_hours}
                    onChange={(e) => setFormData((p) => ({ ...p, open_hours: e.target.value }))}
                    placeholder="24/7"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Latitude <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData((p) => ({ ...p, lat: e.target.value }))}
                    placeholder="44.8848"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Longitude <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData((p) => ({ ...p, lng: e.target.value }))}
                    placeholder="-93.2223"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
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

              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="A brief description of this location..."
                  rows={3}
                  className="w-full rounded-md bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
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
                      {modalMode === "add" ? "Create Location" : "Save Changes"}
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

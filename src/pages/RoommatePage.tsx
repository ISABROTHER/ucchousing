import { useState, useEffect } from "react";
import { Users, MapPin, BookOpen, Heart, Plus, X, Send, User, AlertCircle } from "lucide-react";
import { PageType } from "../App";
import {
  RoommateRequest,
  getActiveRoommateRequests,
  getUserRoommateRequest,
  createRoommateRequest,
  updateRoommateRequest,
  deleteRoommateRequest,
} from "../lib/roommates";

interface RoommatePageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

const LIFESTYLE_OPTIONS = [
  { value: "quiet", label: "Quiet & Studious" },
  { value: "social", label: "Social & Outgoing" },
  { value: "studious", label: "Study-focused" },
  { value: "flexible", label: "Flexible / Open" },
];

const LEVEL_OPTIONS = [
  { value: "100", label: "Level 100" },
  { value: "200", label: "Level 200" },
  { value: "300", label: "Level 300" },
  { value: "400", label: "Level 400" },
  { value: "graduate", label: "Graduate" },
];

function getLifestyleLabel(v: string) {
  return LIFESTYLE_OPTIONS.find((o) => o.value === v)?.label || v;
}

function getLevelLabel(v: string) {
  return LEVEL_OPTIONS.find((o) => o.value === v)?.label || v;
}

function getLifestyleColor(v: string) {
  const colors: Record<string, string> = {
    quiet: "bg-sky-50 text-sky-700 border-sky-200",
    social: "bg-amber-50 text-amber-700 border-amber-200",
    studious: "bg-emerald-50 text-emerald-700 border-emerald-200",
    flexible: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return colors[v] || "bg-slate-50 text-slate-700 border-slate-200";
}

export default function RoommatePage({ user, userProfile, onNavigate }: RoommatePageProps) {
  const [requests, setRequests] = useState<RoommateRequest[]>([]);
  const [myRequest, setMyRequest] = useState<RoommateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    budget_min: "",
    budget_max: "",
    preferred_location: "",
    lifestyle: "flexible",
    gender_preference: "any",
    academic_level: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allRequests = await getActiveRoommateRequests();
      setRequests(allRequests);

      if (user) {
        const mine = await getUserRoommateRequest(user.id);
        setMyRequest(mine);
        if (mine) {
          setForm({
            budget_min: mine.budget_min?.toString() || "",
            budget_max: mine.budget_max?.toString() || "",
            preferred_location: mine.preferred_location || "",
            lifestyle: mine.lifestyle || "flexible",
            gender_preference: mine.gender_preference || "any",
            academic_level: mine.academic_level || "",
            description: mine.description || "",
          });
        }
      }
    } catch {
      setError("Failed to load roommate requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        user_id: user.id,
        budget_min: parseFloat(form.budget_min) || 0,
        budget_max: parseFloat(form.budget_max) || 0,
        preferred_location: form.preferred_location,
        lifestyle: form.lifestyle,
        gender_preference: form.gender_preference,
        academic_level: form.academic_level,
        description: form.description,
        is_active: true,
      };

      if (myRequest) {
        await updateRoommateRequest(myRequest.id, payload);
      } else {
        await createRoommateRequest(payload);
      }

      setShowForm(false);
      await loadData();
    } catch {
      setError("Failed to save your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myRequest) return;
    try {
      await deleteRoommateRequest(myRequest.id);
      setMyRequest(null);
      setShowForm(false);
      await loadData();
    } catch {
      setError("Failed to remove your request");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Roommate</h2>
          <p className="text-gray-600 mb-6">Sign in to browse roommate requests and post your own.</p>
          <button
            onClick={() => onNavigate("auth")}
            className="bg-[#DC143C] text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading roommate requests...</p>
        </div>
      </div>
    );
  }

  const otherRequests = requests.filter((r) => r.user_id !== user?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-[#DC143C]" />
              Find a Roommate
            </h1>
            <p className="text-gray-600 mt-1">Match with compatible students by budget, lifestyle, and location.</p>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-[#DC143C] text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" />
              {myRequest ? "Edit Request" : "Post Request"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {myRequest ? "Update Your Request" : "Post a Roommate Request"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Budget (GHS)</label>
                  <input
                    type="number"
                    value={form.budget_min}
                    onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Budget (GHS)</label>
                  <input
                    type="number"
                    value={form.budget_max}
                    onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                    placeholder="e.g. 3000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Location</label>
                <input
                  type="text"
                  value={form.preferred_location}
                  onChange={(e) => setForm({ ...form, preferred_location: e.target.value })}
                  placeholder="e.g. Amamoma, Ayensu, Kwaprow"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lifestyle</label>
                  <select
                    value={form.lifestyle}
                    onChange={(e) => setForm({ ...form, lifestyle: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                  >
                    {LIFESTYLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender Preference</label>
                  <select
                    value={form.gender_preference}
                    onChange={(e) => setForm({ ...form, gender_preference: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                  >
                    <option value="any">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Level</label>
                  <select
                    value={form.academic_level}
                    onChange={(e) => setForm({ ...form, academic_level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                  >
                    <option value="">Select level</option>
                    {LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">About You / Preferences</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Tell potential roommates a bit about yourself and what you're looking for..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC143C] text-white font-bold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Saving..." : myRequest ? "Update Request" : "Post Request"}
                </button>
                {myRequest && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {myRequest && !showForm && (
          <div className="bg-gradient-to-r from-[#DC143C] to-red-600 rounded-2xl p-5 sm:p-6 text-white mb-8 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5" />
              <span className="font-bold text-sm opacity-90">YOUR ACTIVE REQUEST</span>
            </div>
            <p className="text-lg font-bold">
              Budget: GHS {myRequest.budget_min || 0} - {myRequest.budget_max || 0}
              {myRequest.preferred_location && ` | ${myRequest.preferred_location}`}
            </p>
            {myRequest.description && (
              <p className="mt-1 text-white/80 text-sm">{myRequest.description}</p>
            )}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {otherRequests.length > 0
              ? `${otherRequests.length} Student${otherRequests.length > 1 ? "s" : ""} Looking for Roommates`
              : "No Roommate Requests Yet"}
          </h2>
        </div>

        {otherRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {req.user_profiles?.full_name || "Anonymous"}
                      </p>
                      {req.academic_level && (
                        <p className="text-xs text-gray-500 font-medium">{getLevelLabel(req.academic_level)}</p>
                      )}
                    </div>
                  </div>
                  {req.lifestyle && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getLifestyleColor(req.lifestyle)}`}>
                      {getLifestyleLabel(req.lifestyle)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  {(req.budget_min > 0 || req.budget_max > 0) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-bold text-gray-900">
                        GHS {req.budget_min || 0} - {req.budget_max || 0}
                      </span>
                      <span className="text-gray-400">/ semester</span>
                    </div>
                  )}
                  {req.preferred_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{req.preferred_location}</span>
                    </div>
                  )}
                  {req.gender_preference && req.gender_preference !== "any" && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="capitalize">{req.gender_preference} preferred</span>
                    </div>
                  )}
                </div>

                {req.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    {req.description}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium">
                  Posted {new Date(req.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Requests Yet</h3>
            <p className="text-gray-500 mb-6">Be the first to post a roommate request!</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#DC143C] text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                Post a Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

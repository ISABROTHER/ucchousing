// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Star, ShieldCheck, Tag, Globe, AlertTriangle } from 'lucide-react';
import { PageType } from '../App';
import { getFeaturedHostels } from '../lib/hostels';
import HostelCard from '../components/HostelCard';

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];

export default function HomePage({ onNavigate }: HomePageProps) {
  const [searchCity, setSearchCity] = useState<string>('');
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const canSearch = useMemo(() => searchCity.trim().length > 0, [searchCity]);

  useEffect(() => {
    void loadFeatured();
  }, []);

  const loadFeatured = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFeaturedHostels(6);
      setFeatured(Array.isArray(data) ? data : []);
    } catch {
      setFeatured([]);
      setError('We could not load featured hostels right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSearch) return;
    onNavigate('search');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

        <div className="relative">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Verified stays, student-friendly pricing
              </div>

              <h1 className="text-4xl font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-5xl">
                Find hostels you can trust
              </h1>
              <p className="mt-4 text-lg font-normal leading-[1.5] text-slate-600 sm:text-xl">
                Search by city, compare options, and book with confidence using real reviews and transparent pricing.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-2xl">
              <form
                onSubmit={handleSearch}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      placeholder="Search by city (e.g., Oslo, Accra, London)"
                      aria-label="Search by city"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base font-normal leading-[1.5] text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSearch}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Search className="h-5 w-5" />
                    <span className="hidden sm:inline">Search</span>
                    <span className="sm:hidden">Go</span>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-600 sm:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <Tag className="h-4 w-4 text-slate-600" />
                    Best-value picks
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <Star className="h-4 w-4 text-amber-600" />
                    Top-rated stays
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <Globe className="h-4 w-4 text-sky-700" />
                    Cities worldwide
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-600" />
              <h2 className="text-2xl font-bold leading-[1.2] text-slate-900 sm:text-3xl">
                Featured hostels
              </h2>
            </div>
            <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
              Handpicked stays with strong ratings, location, and value.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadFeatured()}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-700" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold leading-[1.5] text-rose-900">{error}</p>
                <p className="mt-1 text-sm font-normal leading-[1.5] text-rose-800">
                  Check your connection and try again.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void loadFeatured()}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-700/20"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-40 w-full animate-pulse rounded-xl bg-slate-100" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((hostel) => (
              <div key={hostel.id} className="group">
                <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                  <HostelCard hostel={hostel} onClick={() => onNavigate('detail', hostel.id)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Star className="h-6 w-6 text-slate-700" />
            </div>
            <p className="mt-4 text-lg font-semibold leading-[1.5] text-slate-900">
              No featured hostels yet
            </p>
            <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
              Please check back soon, or refresh to try again.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold leading-[1.2] text-slate-900">Global coverage</h3>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
                Browse student-friendly hostels across popular cities and campus areas.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold leading-[1.2] text-slate-900">Trusted reviews</h3>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
                Make decisions using clear ratings and feedback from real travellers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold leading-[1.2] text-slate-900">Better value</h3>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
                Compare options quickly and pick the stay that fits your budget.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row">
            <p className="text-base font-normal leading-[1.5] text-slate-700">
              Ready to explore? Search a city to view available hostels.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/15"
            >
              Browse listings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

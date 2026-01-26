// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Tag,
} from 'lucide-react';
import { PageType } from '../App';
import { getFeaturedHostels } from '../lib/hostels';
import HostelCard from '../components/HostelCard';

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];

const QUICK_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'Near campus', value: 'near campus' },
  { label: 'Most booked', value: 'most booked' },
  { label: 'Budget friendly', value: 'budget' },
  { label: 'Private rooms', value: 'private room' },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const [searchCity, setSearchCity] = useState<string>('');
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const canSearch = useMemo(() => searchCity.trim().length > 0, [searchCity]);
  const subtitle = useMemo(() => {
    const base = 'Discover vetted hostels close to lectures, transport, and essentials.';
    return searchCity.trim().length > 0 ? `${base} Searching: ${searchCity.trim()}` : base;
  }, [searchCity]);

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

  const applyQuickFilter = (value: string) => {
    const next = searchCity.trim().length > 0 ? `${searchCity.trim()} • ${value}` : value;
    setSearchCity(next);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-slate-50 pb-16 pt-20 sm:pt-24 lg:pt-28">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="absolute top-1/2 -left-28 h-80 w-80 -translate-y-1/2 rounded-full bg-sky-100/60 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Verified student housing around campus
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Find a safe, affordable hostel{' '}
              <span className="text-emerald-700">near campus</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-[1.5] text-slate-600 sm:mt-6 sm:text-lg">
              {subtitle}
            </p>

            <div className="mx-auto mt-10 max-w-3xl">
              <form
                onSubmit={handleSearch}
                className="group relative rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 transition focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/10"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                  <div className="relative flex-1">
                    <MapPin className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-700" />
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      placeholder="Search by city or area (e.g., Cape Coast, Kwaprow, Amamoma)"
                      aria-label="Search by city or area"
                      className="h-14 w-full rounded-2xl bg-transparent pl-14 pr-4 text-base font-normal leading-[1.5] text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSearch}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 text-base font-bold leading-[1.2] text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:text-lg"
                  >
                    <Search className="h-5 w-5" />
                    Search
                  </button>
                </div>

                <div className="mt-2 px-2 pb-2 sm:px-3">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {QUICK_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => applyQuickFilter(f.value)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-[1.2] text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                      >
                        <Tag className="h-4 w-4 text-slate-600" />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium leading-[1.5] text-slate-600">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  No hidden fees
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Verified listings
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Student rates
                </span>
              </div>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition hover:bg-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-[1.2] text-slate-900">Better locations</p>
                    <p className="mt-1 text-sm font-normal leading-[1.5] text-slate-600">
                      Stay closer to campus and transport routes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition hover:bg-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-[1.2] text-slate-900">Real reviews</p>
                    <p className="mt-1 text-sm font-normal leading-[1.5] text-slate-600">
                      See ratings from students and residents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition hover:bg-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-[1.2] text-slate-900">Built for students</p>
                  <p className="mt-1 text-sm font-normal leading-[1.5] text-slate-600">
                    Simple search, clear pricing, and quick decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-600" />
              <h2 className="text-2xl font-bold leading-[1.2] text-slate-900 sm:text-3xl">
                Most loved hostels
              </h2>
            </div>
            <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600 sm:text-lg">
              Highly rated places chosen by fellow students.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
          >
            View all listings
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-700" />
            <p className="mt-4 text-base font-bold leading-[1.5] text-rose-900">{error}</p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-700 px-5 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-700/20"
              >
                Try again
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100" />
                <div className="mt-6 space-y-3">
                  <div className="h-5 w-2/3 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
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
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Star className="h-6 w-6 text-slate-700" />
            </div>
            <p className="mt-4 text-lg font-bold leading-[1.2] text-slate-900">No featured hostels yet</p>
            <p className="mt-2 text-base font-normal leading-[1.5] text-slate-600">
              Please check back soon, or refresh to try again.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold leading-[1.2] text-emerald-300">Trust and safety</p>
            <h3 className="mt-2 text-3xl font-bold leading-[1.2] text-white sm:text-4xl">
              Built for student peace of mind
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-[1.5] text-slate-300 sm:text-lg">
              Choose confidently using verified listings, clear policies, and honest reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <Building2 className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-xl font-bold leading-[1.2]">Better locations</h4>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-300">
                Stay closer to lectures, groceries, and daily transport routes.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <Star className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-xl font-bold leading-[1.2]">Verified reviews</h4>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-300">
                Read feedback from real residents and student travellers.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <Tag className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-xl font-bold leading-[1.2]">Student pricing</h4>
              <p className="mt-2 text-base font-normal leading-[1.5] text-slate-300">
                Clear costs, no surprises, and fair rates negotiated with owners.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-600/20 bg-emerald-700 px-6 py-12 text-center text-white shadow-lg shadow-emerald-900/20 sm:px-12 sm:py-16">
          <div className="absolute inset-0">
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-emerald-600/55 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-emerald-900/40 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold leading-[1.2] sm:text-4xl lg:text-5xl">
              Ready to find your room?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal leading-[1.5] text-emerald-50/90 sm:mt-6 sm:text-lg">
              Browse listings, compare options, and shortlist your best choices in minutes.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigate('search')}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 text-base font-bold leading-[1.2] text-emerald-900 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-white/20 sm:w-auto sm:px-8"
              >
                Browse listings
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/30 bg-transparent px-6 text-base font-bold leading-[1.2] text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/15 sm:w-auto sm:px-8"
              >
                List your hostel
              </button>
            </div>

            <p className="mt-6 text-sm font-medium leading-[1.5] text-emerald-50/85">
              Tip: Use filters to narrow down by price, distance, and facilities.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

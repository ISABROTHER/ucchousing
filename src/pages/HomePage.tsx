import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Star, ShieldCheck, Tag, Globe, AlertTriangle, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-50 pb-20 pt-24 lg:pt-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />
          <div className="absolute top-1/2 -left-24 h-72 w-72 rounded-full bg-sky-100/50 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/50 px-4 py-1.5 text-sm font-semibold text-emerald-800 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified student housing at UCC</span>
            </div>
            
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Your home away from <span className="text-emerald-700">campus</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-[1.5] text-slate-600 sm:text-xl">
              Discover vetted hostels near your faculty. Safe, affordable, and approved by the student community.
            </p>

            <div className="mx-auto mt-12 max-w-3xl">
              <form
                onSubmit={handleSearch}
                className="group relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 transition-all focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 sm:flex-row sm:items-center sm:gap-2"
              >
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600" />
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="Where do you want to stay?"
                    className="h-14 w-full rounded-2xl border-none bg-transparent pl-14 pr-4 text-lg outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSearch}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 text-lg font-bold text-white transition-all hover:bg-emerald-800 active:scale-[0.98] disabled:bg-slate-200"
                >
                  <Search className="h-5 w-5" />
                  Search
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No hidden fees</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 100% Verified</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Student rates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-[1.2] text-slate-900 sm:text-4xl">
              Most loved hostels
            </h2>
            <p className="text-lg font-normal leading-[1.5] text-slate-600">
              Top-rated accommodation chosen by fellow students this semester.
            </p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="group flex items-center gap-2 font-bold text-emerald-700 hover:text-emerald-800"
          >
            View all listings
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-4 font-bold text-rose-900">{error}</p>
            <button onClick={() => void loadFeatured()} className="mt-4 text-sm font-bold text-rose-700 underline underline-offset-4">
              Try refreshing
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
                <div className="mt-6 space-y-4">
                  <div className="h-6 w-2/3 rounded-lg bg-slate-200" />
                  <div className="h-4 w-full rounded-lg bg-slate-200" />
                  <div className="h-12 w-full rounded-xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((hostel) => (
              <HostelCard 
                key={hostel.id} 
                hostel={hostel} 
                onClick={() => onNavigate('detail', hostel.id)} 
              />
            ))}
          </div>
        )}
      </section>

      {/* Trust Section */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold leading-[1.2]">Premium Locations</h3>
              <p className="text-lg font-normal leading-[1.5] text-slate-400">
                Strategic spots within walking distance to lecture halls and campus facilities.
              </p>
            </div>
            <div className="space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Star className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold leading-[1.2]">Verified Reviews</h3>
              <p className="text-lg font-normal leading-[1.5] text-slate-400">
                Honest feedback from actual residents to help you make the right choice.
              </p>
            </div>
            <div className="space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Tag className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold leading-[1.2]">Best Price Guarantee</h3>
              <p className="text-lg font-normal leading-[1.5] text-slate-400">
                We negotiate directly with owners to ensure you get the best student rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-700 px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-600/50 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 translate-y-1/2 -translate-x-1/2 rounded-full bg-emerald-800/50 blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold leading-[1.2] sm:text-5xl">Ready to find your room?</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg font-normal leading-[1.5] text-emerald-100/90 sm:text-xl">
              Join 2,000+ UCC students who have found their perfect accommodation through our platform.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => onNavigate('search')}
                className="h-14 w-full rounded-2xl bg-white px-8 text-lg font-bold text-emerald-900 transition-all hover:bg-emerald-50 sm:w-auto"
              >
                Browse Listings
              </button>
              <button className="h-14 w-full rounded-2xl border-2 border-emerald-500 bg-transparent px-8 text-lg font-bold text-white transition-all hover:bg-emerald-600 sm:w-auto">
                List Your Hostel
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
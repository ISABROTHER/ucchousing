import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Star } from "lucide-react";
import { PageType } from "../App";
import { getFeaturedHostels } from "../lib/hostels";
import HostelCard from "../components/HostelCard";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];

type ActionCard = {
  title: string;
  description: string;
  onClick: () => void;
};

export default function HomePage({ onNavigate }: HomePageProps) {
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const actions: ActionCard[] = useMemo(
    () => [
      {
        title: "Apply for housing",
        description: "Find your new home!",
        onClick: () => onNavigate("search"),
      },
      {
        title: "Frequently Asked Questions",
        description:
          "The information you need about student housing — from applying to moving out.",
        onClick: () => onNavigate("faq" as PageType),
      },
      {
        title: "Calendar",
        description: "See what is taking place at your campus!",
        onClick: () => onNavigate("calendar" as PageType),
      },
    ],
    [onNavigate]
  );

  useEffect(() => {
    void loadFeatured();
  }, []);

  const loadFeatured = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFeaturedHostels(6);
      setFeatured(Array.isArray(data) ? data : []);
    } catch {
      setFeatured([]);
      setError("We could not load featured hostels right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Mobile-first spacing to sit nicely under your new pill header */}
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:pt-28">
        {/* Hero media with the requested image */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
          <div className="aspect-[16/10] w-full sm:aspect-[16/9] relative">
            <img 
              src="https://kuulchat.com/universities/slides/daa2e0179416fa0829b3586d2410fd94.png" 
              alt="UCC Housing" 
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Subtle overlay to ensure text/ui contrast if needed later */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/5" />
          </div>
        </div>

        {/* Big headline */}
        <h1 className="mt-10 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
          We want you to have a fun, safe and healthy student life.
        </h1>

        {/* Action cards */}
        <div className="mt-8 space-y-4">
          {actions.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="group w-full rounded-3xl bg-amber-100/55 px-5 py-5 text-left transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-200 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-extrabold leading-[1.15] text-slate-900 sm:text-2xl">
                    {item.title}
                  </div>
                  <div className="mt-2 text-base font-medium leading-[1.5] text-slate-700">
                    {item.description}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-200/60 text-slate-900 transition group-hover:bg-amber-200">
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Featured hostels */}
        <div className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Featured hostels
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("search")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-
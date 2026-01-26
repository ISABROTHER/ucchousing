import { Building2, Star } from "lucide-react";

export default function HomeHero() {
  return (
    <>
      {/* HERO BANNER SECTION */}
      <div className="relative w-full h-96 sm:h-[32rem] lg:h-[40rem] bg-slate-100">
        <img
          src="https://kuulchat.com/universities/slides/daa2e0179416fa0829b3586d2410fd94.png"
          alt="UCC Housing Campus"
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      {/* MAIN CONTENT CONTAINER - Headline */}
      <div className="mx-auto max-w-5xl px-4 -mt-16 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-slate-100 sm:p-8">
          <h1 className="text-2xl font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            We have digitized student housing on campus. UCC, Find and apply without stress!
          </h1>
        </div>
      </div>
    </>
  );
}
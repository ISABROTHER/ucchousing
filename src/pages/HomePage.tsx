// Replace your housingTypes array with this:
const housingTypes: Array<{
  title: string;
  image: string;
  desc: string;
  badge: string;
  meta: string;
  chips: [string, string];
  icon: 'building' | 'campus' | 'map' | 'users';
}> = [
  {
    title: 'New Site',
    image:
      'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop',
    desc: 'Modern campus residences',
    badge: 'On campus',
    meta: 'Popular for first-years',
    chips: ['Walk to lectures', 'Reliable water'],
    icon: 'campus',
  },
  {
    title: 'Old Site',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    desc: 'Historic halls & housing',
    badge: 'On campus',
    meta: 'Great community vibe',
    chips: ['Near facilities', 'Quiet zones'],
    icon: 'building',
  },
  {
    title: 'Outside Campus',
    image:
      'https://images.unsplash.com/photo-1600596542815-e32c8ec23fc2?q=80&w=800&auto=format&fit=crop',
    desc: 'Private hostels nearby',
    badge: 'More options',
    meta: 'Best for privacy',
    chips: ['More space', 'Flexible pricing'],
    icon: 'map',
  },
  {
    title: 'Traditional Halls',
    image:
      'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop',
    desc: 'Community living',
    badge: 'Classic',
    meta: 'Student life experience',
    chips: ['Social setting', 'Shared amenities'],
    icon: 'users',
  },
];

// Then replace your 4 cards map block with this:
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
  {housingTypes.map((type) => {
    const Icon =
      type.icon === 'campus'
        ? Building2
        : type.icon === 'building'
        ? Building2
        : type.icon === 'map'
        ? MapPin
        : type.icon === 'users'
        ? Star
        : Building2;

    return (
      <button
        key={type.title}
        type="button"
        onClick={() => onNavigate('search')}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
        aria-label={`Explore ${type.title} housing`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={type.image}
            alt={type.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-800">
              <Icon className="h-3.5 w-3.5" />
            </span>
            {type.badge}
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-base font-extrabold leading-[1.2] text-white">
              {type.title}
            </p>
            <p className="mt-1 text-xs font-semibold leading-[1.5] text-white/85">
              {type.meta}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <p className="text-sm font-semibold leading-[1.5] text-slate-600">
            {type.desc}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
              {type.chips[0]}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
              {type.chips[1]}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-slate-500">
              Tap to view
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700 transition group-hover:text-emerald-800">
              Explore
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </button>
    );
  })}
</div>

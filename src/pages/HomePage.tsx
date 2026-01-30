import { PageType } from "../App";
import HomeHero from "./home/HomeHero";
import HomeCategories from "./home/HomeCategories";
import HomeFeatured from "./home/HomeFeatured";
import RoommateBanner from "./home/RoommateBanner";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* 1. Hero Section: Main entrance and headline */}
      <HomeHero />
      
      {/* 2. Categories: Quick filtering by location (New Site, Old Site, etc.) */}
      <HomeCategories onNavigate={onNavigate} />
      
      {/* 3. Featured: Showcasing specific high-quality hostels */}
      <HomeFeatured onNavigate={onNavigate} />

      {/* 4. Roommate Banner: Moved to bottom as a supplementary search feature */}
      <RoommateBanner onNavigate={onNavigate} />
    </div>
  );
}
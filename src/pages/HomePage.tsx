import { PageType } from "../App";
import HomeHero from "./home/HomeHero";
import HomeCategories from "./home/HomeCategories";
import HomeFeatured from "./home/HomeFeatured";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      <HomeHero />
      <HomeCategories onNavigate={onNavigate} />
      <HomeFeatured onNavigate={onNavigate} />
    </div>
  );
}
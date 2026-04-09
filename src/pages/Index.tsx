import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhatIsEchoo from "@/components/WhatIsEchoo";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <WhatIsEchoo />
      <FeaturesSection />
      <HowItWorks />
      <Footer />
    </div>
  );
};

export default Index;

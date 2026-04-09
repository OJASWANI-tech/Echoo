import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroIllustration from "@/assets/hero-illustration.png";

const HeroSection = () => {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12" style={{ background: "var(--hero-gradient)" }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground leading-tight mb-6">
            Seamless Video Calling with Echoo
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Experience high-quality video calls with no hassle. Connect with friends, family, or colleagues instantly with just one click.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" className="border-primary text-primary hover:bg-secondary px-6 py-3" asChild>
              <Link to="/signup">Join as Guest</Link>
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
        <div className="flex-1 flex justify-center animate-fade-in">
          <div className="bg-card rounded-2xl shadow-xl p-4">
            <img src={heroIllustration} alt="Video calling illustration" width={800} height={700} className="w-full max-w-md" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

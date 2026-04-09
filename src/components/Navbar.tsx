import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-4 bg-card">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Video className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-heading font-bold text-primary">Echoo</span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="border-primary text-primary hover:bg-secondary" asChild>
          <Link to="/signup">Sign Up</Link>
        </Button>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
          <Link to="/login">Login</Link>
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;

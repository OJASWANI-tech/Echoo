const features = [
  { emoji: "📅", title: "Meeting History", description: "Access a complete log of your past video calls — including times, users, and duration." },
  { emoji: "👥", title: "Attendee Tracking", description: "See a full list of attendees for each meeting. Perfect for tracking participation and collaboration." },
  { emoji: "🔐", title: "Google Login", description: "Sign in quickly and securely with your Google account. No extra passwords, just one click." },
  { emoji: "💬", title: "Real-Time Video & Chat", description: "High-quality video, audio, and messaging — all in one sleek, responsive interface." },
  { emoji: "✨", title: "Simple & Intuitive", description: "Clean design with zero clutter. Echoo is built for humans, not just techies." },
  { emoji: "📝", title: "Editable Profile", description: "Update your name, profile picture, and preferences anytime. Keep your Echoo identity fresh and personal." },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 px-6 md:px-12 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground text-center mb-12">
          Built for You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="text-lg font-heading font-semibold text-primary mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

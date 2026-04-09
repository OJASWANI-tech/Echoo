import howImg1 from "@/assets/how-it-works-1.jpg";
import howImg2 from "@/assets/how-it-works-2.jpg";
import howImg3 from "@/assets/how-it-works-3.jpg";

const steps = [
  { emoji: "🚀", title: "Start or Join Instantly", description: "Click log in to launch a meeting in seconds — no setup or downloads.", image: howImg1, reverse: false },
  { emoji: "🔗", title: "Share the Link", description: "Send the unique meeting link to others — they can join instantly.", image: howImg2, reverse: true },
  { emoji: "📊", title: "View History & Attendees", description: "After the call, see a complete meeting history and who attended — all in your dashboard.", image: howImg3, reverse: false },
];

const HowItWorks = () => {
  return (
    <section className="py-20 px-6 md:px-12 bg-card">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground text-center mb-4">
          How It Works
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Just a few simple steps to start, connect, and stay on top of every meeting.
        </p>
        <div className="space-y-20">
          {steps.map((step) => (
            <div key={step.title} className={`flex flex-col md:flex-row items-center gap-12 ${step.reverse ? "md:flex-row-reverse" : ""}`}>
              <div className="flex-1">
                <img src={step.image} alt={step.title} loading="lazy" width={640} height={512} className="rounded-2xl shadow-lg w-full" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-heading font-semibold text-primary mb-3">
                  {step.emoji} {step.title}
                </h3>
                <p className="text-muted-foreground text-lg">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

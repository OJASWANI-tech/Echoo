const Footer = () => {
  return (
    <footer className="py-8 px-6 md:px-12 bg-foreground text-center">
      <p className="text-sm" style={{ color: "hsl(var(--primary-foreground))" }}>
        © 2026 Echoo. All rights reserved.
      </p>
      <p className="text-sm mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
        Designed and Developed with ❤️ by{" "}
        <a
          href="https://www.linkedin.com/in/ojaswani-rajor/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary transition-colors"
          style={{ color: "hsl(var(--accent))" }}
        >
          Ojaswani Rajor
        </a>
      </p>
    </footer>
  );
};

export default Footer;

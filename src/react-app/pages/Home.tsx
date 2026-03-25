import { Link } from "react-router";
import { ArrowRight, Clock, Shield, Wifi, Zap } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import Layout from "@/react-app/components/Layout";

const features = [
  {
    icon: Clock,
    title: "Book by the Hour",
    description: "Flexible booking from 1 hour to overnight stays. Pay only for the time you need.",
  },
  {
    icon: Wifi,
    title: "Work-Ready",
    description: "High-speed WiFi, power outlets, and optional monitors for productive work sessions.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Personal pod with secure QR access. Your space, your privacy.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Book, pay, and receive your QR code instantly. No waiting at check-in desks.",
  },
];

export default function HomePage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Now Open Across Minnesota
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Your private space,
              <span className="block text-primary">whenever you need it</span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl">
              Book premium capsule pods for rest, work, or recharge. Located at transit hubs, 
              airports, and business districts across Minnesota.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/near-me">
                  Find Pods Near Me
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Why choose Capsule?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Modern pod booking designed for the way you move through the city.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-primary to-primary/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground">
            Ready to book your first pod?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Join thousands of professionals who use Capsule for rest and productivity 
            throughout the city.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 bg-white text-primary hover:bg-white/90"
              asChild
            >
              <Link to="/locations">
                Browse Locations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <div className="h-3.5 w-3.5 rounded-sm bg-white/90" />
              </div>
              <span className="font-semibold">Capsule</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Capsule Pod Booking. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}

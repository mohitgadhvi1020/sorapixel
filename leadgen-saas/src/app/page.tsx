import Link from "next/link";
import {
  Globe, Mail, Sparkles, Zap, ArrowRight, CheckCircle, Star,
  ChevronRight, Building2, Send, Brain, FileText, Target,
  Search, Users, BarChart3
} from "lucide-react";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-text-primary">Reach<span className="text-primary">Wise</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-text-secondary hover:text-primary transition-colors">How It Works</a>
          <a href="#features" className="text-sm text-text-secondary hover:text-primary transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-text-secondary hover:text-primary transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors px-4 py-2">
            Log In
          </Link>
          <Link href="/signup" className="text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 transition-opacity px-5 py-2.5 rounded-full">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-subtle text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            AI Outbound Research Copilot
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-slide-up">
            Turn Your Website Into{" "}
            <span className="text-gradient">Personalized Outreach</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up animate-stagger-1">
            Give us your website and assets. AI builds your company brain, finds prospects, researches them, and drafts personalized emails — ready for human review.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-slide-up animate-stagger-2">
            <Link href="/signup" className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              Start Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#how-it-works" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-text-primary font-semibold rounded-full shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all duration-300">
              See How It Works
            </Link>
          </div>

          <div className="relative max-w-5xl mx-auto animate-slide-up animate-stagger-3">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <div className="bg-white p-1">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-secondary rounded-t-xl">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-4 py-1.5 text-xs text-text-tertiary border border-border/50 max-w-md mx-auto">
                      app.reachwise.ai/dashboard
                    </div>
                  </div>
                </div>
                <div className="bg-surface-secondary p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Company Brain", value: "Active", icon: Brain, color: "text-primary" },
                      { label: "Prospects Found", value: "247", icon: Users, color: "text-secondary" },
                      { label: "Drafts Ready", value: "38", icon: Mail, color: "text-accent" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                          <span className="text-xs text-text-tertiary">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">Recent Drafts</span>
                      <span className="text-xs text-primary cursor-pointer">View All →</span>
                    </div>
                    {["Bright Digital Agency", "GrowthStack Marketing", "CloudNine Solutions"].map((name, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-t border-border-light">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-card flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-text-tertiary">Personalized draft ready</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${i === 0 ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                          {i === 0 ? "High" : "Medium"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { number: "01", title: "Onboard Your Business", description: "Enter your website URL and upload brochures, catalogs, or pitch decks. AI builds a deep company brain — your services, USP, tone, and proof points.", icon: Globe },
    { number: "02", title: "Discover & Research", description: "Define your ideal customer. AI finds matching businesses, scrapes their websites, identifies pain points, and enriches contact data.", icon: Search },
    { number: "03", title: "Review & Send", description: "AI drafts personalized emails using both your company context and each prospect's research. Review, edit, and send with confidence.", icon: Send },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-surface-secondary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-subtle text-primary text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            How It Works
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">From Website to Outbound in Minutes</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            No manual research. No generic templates. Just context-aware outreach that sounds human.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < 2 && (
                <div className="hidden md:block absolute top-20 left-[60%] w-[80%] h-[2px]">
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 to-secondary/20" />
                  <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                </div>
              )}
              <div className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Brain,
      title: "Company Brain",
      description: "AI scrapes your website and parses your documents to deeply understand your services, positioning, and tone of voice.",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Target,
      title: "Prospect Research",
      description: "Every prospect gets individually researched — their services, pain points, size signals, and recent activity.",
      color: "bg-secondary/10 text-secondary",
    },
    {
      icon: FileText,
      title: "Personalized Drafts",
      description: "AI writes emails using both your company context and each prospect's research. With transparent reasoning for every angle.",
      color: "bg-accent/10 text-accent",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-subtle text-primary text-sm font-medium mb-4">
            <Star className="w-4 h-4" />
            Features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Research-Driven Outreach</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Not another AI email writer. A research assistant that understands both sides of the conversation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group relative p-8 rounded-2xl bg-white border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
              <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "For freelancers and solo consultants getting started with outbound.",
      features: ["1 company brain", "50 prospect discoveries/mo", "25 email drafts/mo", "Website scraping", "Email support"],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "$149",
      period: "/month",
      description: "For agencies and teams running outbound for multiple clients.",
      features: ["5 company brains", "500 prospect discoveries/mo", "250 email drafts/mo", "Prospect research", "Email enrichment", "Priority support", "CSV export"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Agency",
      price: "$399",
      period: "/month",
      description: "For lead gen agencies with high-volume client needs.",
      features: ["Unlimited company brains", "2,000 discoveries/mo", "1,000 email drafts/mo", "Deep prospect research", "Full enrichment", "Dedicated support", "API access"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-subtle text-primary text-sm font-medium mb-4">
            <BarChart3 className="w-4 h-4" />
            Pricing
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Start free. Upgrade when you need more. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${plan.popular ? "bg-gradient-primary text-white shadow-xl scale-105" : "bg-white border border-border/50 shadow-card hover:shadow-card-hover"}`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-white text-xs font-bold shadow-md">
                  Most Popular
                </span>
              )}
              <h3 className={`text-lg font-bold mb-2 ${plan.popular ? "text-white" : ""}`}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className={`text-4xl font-bold ${plan.popular ? "text-white" : ""}`}>{plan.price}</span>
                <span className={`text-sm ${plan.popular ? "text-white/70" : "text-text-tertiary"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-8 ${plan.popular ? "text-white/80" : "text-text-secondary"}`}>{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.popular ? "text-accent-light" : "text-accent"}`} />
                    <span className={plan.popular ? "text-white/90" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`block text-center w-full py-3 rounded-full text-sm font-semibold transition-all ${plan.popular ? "bg-white text-primary hover:bg-white/90" : "bg-gradient-primary text-white hover:opacity-90"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-text-primary text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Reach<span className="text-primary-light">Wise</span></span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
          <p className="text-sm text-white/40">&copy; 2026 ReachWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}

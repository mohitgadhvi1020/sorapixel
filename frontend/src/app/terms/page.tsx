import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "SoraiPixel terms of service. Read our terms and conditions for using our AI jewelry photography platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — SoraiPixel",
    description: "Terms and conditions for using SoraiPixel AI jewelry photography.",
    url: `${SITE_URL}/terms`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">SoraiPixel</span>
          </Link>
          <Link href="/" className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors">Back to Home</Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
        <h1 className="font-display font-bold text-[#0a0a0a] text-[2rem] md:text-[2.5rem] tracking-tight mb-3">Terms of Service</h1>
        <p className="text-[#8c8c8c] text-[14px] mb-10">Last updated: March 2026</p>

        <div className="prose-custom space-y-8 text-[#4a4a4a] text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using SoraiPixel (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">2. Service Description</h2>
            <p>SoraiPixel is an AI-powered jewelry photography platform that transforms product photos into studio-quality images. The Service includes image generation, enhancement, styling, and related features available through our website and API.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">3. Accounts &amp; Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>One account per person or business entity. Multiple accounts may be terminated.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">4. Tokens &amp; Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Our Service uses a token-based system. Tokens are consumed when generating images.</li>
              <li>Token packs are non-refundable once used. Unused tokens from one-time packs do not expire.</li>
              <li>Monthly subscription tokens reset each billing cycle. Unused monthly tokens do not roll over.</li>
              <li>Free daily tokens expire at the end of each day and cannot be accumulated.</li>
              <li>Prices are displayed in your local currency (INR, USD, or EUR) and are subject to applicable taxes.</li>
              <li>All payments are processed securely through Razorpay.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">5. Refund Policy</h2>
            <p>We offer a satisfaction guarantee on paid plans:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>If you are unsatisfied with the quality of AI-generated images, contact us within 7 days of purchase for a full refund.</li>
              <li>Refund requests must include examples of unsatisfactory output.</li>
              <li>Refunds are processed to the original payment method within 5-10 business days.</li>
              <li>Abuse of the refund policy may result in account restrictions.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">6. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your Content:</strong> You retain full ownership of all images you upload and all AI-generated outputs based on your images.</li>
              <li><strong>Our Service:</strong> SoraiPixel&apos;s platform, AI models, brand, and related intellectual property remain our property.</li>
              <li><strong>Usage Rights:</strong> You grant us a limited license to process your uploaded images solely for the purpose of providing the Service. We do not claim ownership of your content.</li>
              <li><strong>Commercial Use:</strong> You may use generated images for any commercial purpose, including e-commerce listings, marketing materials, and catalogs.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Upload images you do not own or have rights to use.</li>
              <li>Use the Service to generate misleading or fraudulent product representations.</li>
              <li>Attempt to reverse-engineer, copy, or replicate our AI models or technology.</li>
              <li>Use automated bots or scripts to access the Service beyond normal usage.</li>
              <li>Resell or redistribute the Service without authorization.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">8. Design Integrity Guarantee</h2>
            <p>SoraiPixel guarantees zero design changes to your jewelry. Our AI enhances backgrounds, lighting, and presentation while preserving every detail of your original jewelry design — including stones, prongs, engravings, and settings. If you believe the AI has altered your jewelry design, contact us for a free re-generation or refund.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">9. Limitation of Liability</h2>
            <p>SoraiPixel is provided &quot;as is&quot; without warranty of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account for violation of these terms. You may cancel your account at any time. Upon termination, your data will be retained for 30 days before permanent deletion, unless you request immediate deletion.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">11. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Material changes will be communicated via email or platform notification at least 14 days before taking effect.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">12. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:contact@soraipixel.com" className="text-[#8b7355] underline">contact@soraipixel.com</a>.</p>
          </section>
        </div>
      </main>

      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link href="/about" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

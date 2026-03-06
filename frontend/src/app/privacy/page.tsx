import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "SoraiPixel privacy policy. Learn how we collect, use, and protect your data when you use our AI jewelry photography platform.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — SoraiPixel",
    description: "Learn how SoraiPixel collects, uses, and protects your data.",
    url: `${SITE_URL}/privacy`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

export default function PrivacyPage() {
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
        <h1 className="font-display font-bold text-[#0a0a0a] text-[2rem] md:text-[2.5rem] tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-[#8c8c8c] text-[14px] mb-10">Last updated: March 2026</p>

        <div className="prose-custom space-y-8 text-[#4a4a4a] text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">1. Information We Collect</h2>
            <p>When you use SoraiPixel, we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Account Information:</strong> Email address, phone number, name, and company name when you create an account.</li>
              <li><strong>Payment Information:</strong> Payment details are processed securely through Razorpay. We do not store credit card numbers or bank account details on our servers.</li>
              <li><strong>Uploaded Images:</strong> Photos you upload for AI processing. These are stored securely and used solely for generating your output images.</li>
              <li><strong>Usage Data:</strong> How you interact with our platform, including features used, images generated, and session data.</li>
              <li><strong>Device Information:</strong> Browser type, IP address, device type, and operating system for analytics and security purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve our AI jewelry photography services.</li>
              <li>To process payments and manage your account and token balance.</li>
              <li>To send important service updates and, with your consent, marketing communications.</li>
              <li>To detect and prevent fraud and abuse.</li>
              <li>To improve our AI models and platform performance (using aggregated, anonymized data only).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">3. Your Uploaded Images</h2>
            <p>Your jewelry photos are important to us. Here&apos;s how we handle them:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Images are processed through our AI pipeline solely to generate your requested output.</li>
              <li>We do not use your images to train AI models without your explicit consent.</li>
              <li>Uploaded images and generated outputs are stored securely on encrypted servers.</li>
              <li>You can request deletion of your images at any time by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Payment Processors:</strong> Razorpay, to process your payments securely.</li>
              <li><strong>Cloud Infrastructure:</strong> Supabase and Google Cloud, for secure data storage and AI processing.</li>
              <li><strong>Analytics:</strong> Anonymized usage data for improving our services.</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">5. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS/SSL), encrypted storage, secure authentication via Supabase, and regular security audits. While we strive to protect your data, no method of electronic transmission or storage is 100% secure.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">6. Cookies</h2>
            <p>We use essential cookies for authentication, session management, and geo-detection (to display the correct currency). We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Access your personal data.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>Opt out of marketing communications.</li>
              <li>Export your data in a portable format.</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:contact@soraipixel.com" className="text-[#8b7355] underline">contact@soraipixel.com</a>.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">8. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of significant changes via email or a notice on our platform.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">9. Contact Us</h2>
            <p>If you have questions about this privacy policy, contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> <a href="mailto:contact@soraipixel.com" className="text-[#8b7355] underline">contact@soraipixel.com</a></p>
          </section>
        </div>
      </main>

      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Terms of Service</Link>
            <Link href="/about" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

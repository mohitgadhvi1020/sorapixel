"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";

export default function CreatePage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => router.back()} />

      {/* Desktop: centered modal */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-[#1A1B22] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.08)] animate-scale-in">
          <div className="p-6 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Create New</h2>
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.5)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <OptionCard
                label="Studio"
                description="Product-only photos with styled backgrounds"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                }
                onClick={() => router.push("/studio")}
              />
              <OptionCard
                label="Catalogue"
                description="Product on AI models for UGC-style shots"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }
                onClick={() => router.push("/catalogue")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-[#1A1B22] rounded-t-2xl animate-slide-up border-t border-[rgba(255,255,255,0.08)]">
        <div className="px-6 pt-4 pb-2 flex justify-center">
          <div className="w-8 h-1 bg-[rgba(255,255,255,0.15)] rounded-full" />
        </div>
        <div className="px-6 pb-2">
          <h2 className="text-lg font-semibold text-white">Create New</h2>
        </div>
        <div className="px-6 pb-8 grid grid-cols-2 gap-3">
          <OptionCard
            label="Studio"
            description="Styled backgrounds"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            }
            onClick={() => router.push("/studio")}
          />
          <OptionCard
            label="Catalogue"
            description="AI model shots"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            }
            onClick={() => router.push("/catalogue")}
          />
        </div>
      </div>
    </div>
  );
}

function OptionCard({ label, description, icon, onClick }: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card
      hover
      onClick={onClick}
      padding="md"
      className="text-center group"
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(255,255,255,0.5)] group-hover:text-[#FF8A3D] group-hover:bg-[rgba(255,106,0,0.1)] transition-all duration-250 mb-3">
        {icon}
      </div>
      <p className="font-semibold text-sm text-white">{label}</p>
      <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">{description}</p>
    </Card>
  );
}

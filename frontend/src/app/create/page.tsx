"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold">Select One</h1>
      </div>

      <div className="p-6 grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/studio")}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-20 h-20 mx-auto bg-pink-50 rounded-xl mb-3 flex items-center justify-center text-3xl">
            📸
          </div>
          <h3 className="font-bold text-pink-500">Studio</h3>
          <p className="text-xs text-gray-400 mt-1">Product on background</p>
        </button>

        <button
          onClick={() => router.push("/catalogue")}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-20 h-20 mx-auto bg-pink-50 rounded-xl mb-3 flex items-center justify-center text-3xl">
            👤
          </div>
          <h3 className="font-bold text-pink-500">Model / UGC</h3>
          <p className="text-xs text-gray-400 mt-1">Product on AI model</p>
        </button>

        <button
          onClick={() => router.push("/jewelry")}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-20 h-20 mx-auto bg-pink-50 rounded-xl mb-3 flex items-center justify-center text-3xl">
            💎
          </div>
          <h3 className="font-bold text-pink-500">Jewelry</h3>
          <p className="text-xs text-gray-400 mt-1">Jewelry photography</p>
        </button>

        <button
          onClick={() => router.push("/tryon")}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <div className="w-20 h-20 mx-auto bg-pink-50 rounded-xl mb-3 flex items-center justify-center text-3xl">
            👗
          </div>
          <h3 className="font-bold text-pink-500">Try-On</h3>
          <p className="text-xs text-gray-400 mt-1">Virtual try-on</p>
        </button>
      </div>
    </div>
  );
}

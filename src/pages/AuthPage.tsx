// src/pages/AuthPage.tsx
import { useMemo, useState } from "react";
import { Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { signUp, signIn } from "../lib/auth";
import { PageType } from "../App";

interface AuthPageProps {
  onNavigate: (page: PageType) => void;
}

export default function AuthPage({ onNavigate }: AuthPageProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [userType, setUserType] = useState<"student" | "owner">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => (isSignup ? "Create account" : "Welcome back"), [isSignup]);
  const subtitle = useMemo(
    () => (isSignup ? "Sign up to find and book hostels faster." : "Sign in to continue to your dashboard."),
    [isSignup]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await signUp(email, password, fullName, userType);
      } else {
        await signIn(email, password);
      }
      onNavigate("home");
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-rose-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:18px_18px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-900">UCC Housing</div>
                <div className="text-xs font-medium text-slate-500">Secure access</div>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">{subtitle}</p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pl-10 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">Account type</label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserType("student")}
                        className={`flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          userType === "student"
                            ? "border-amber-300 bg-amber-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        aria-pressed={userType === "student"}
                      >
                        Student
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserType("owner")}
                        className={`flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          userType === "owner"
                            ? "border-amber-300 bg-amber-50 text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        aria-pressed={userType === "owner"}
                      >
                        Hostel owner
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pl-10 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pl-10 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60"
              >
                <span>{loading ? "Processing..." : isSignup ? "Create account" : "Sign in"}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm font-medium text-slate-600">
                {isSignup ? "Already have an account?" : "Don’t have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError("");
                  }}
                  className="ml-2 font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
                >
                  {isSignup ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs font-medium text-slate-500">
            By continuing, you agree to basic account security and acceptable use.
          </div>
        </div>
      </div>
    </div>
  );
}

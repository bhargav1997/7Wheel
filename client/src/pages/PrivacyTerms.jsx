import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, FileText, AlertTriangle, Coins } from 'lucide-react';

const PrivacyTerms = () => {
  return (
    <div className="min-h-screen bg-casino-dark text-slate-100 flex flex-col relative overflow-hidden selection:bg-brand-500 selection:text-white">
      {/* Background blur decorative glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gold-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 border-b border-casino-border bg-casino-card/40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-sm font-black glow-brand">
              7
            </div>
            <span className="font-display font-bold text-white text-base">7 Wheel Hub Legal</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10 w-full">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Terms of Service & Privacy Policy
            </h1>
            <p className="text-slate-400 text-xs">
              Last updated: August 5, 2026. Please read these terms carefully before participating in game rounds.
            </p>
          </div>

          {/* Social Casino Disclaimer — Legal Shield */}
          <div className="flex gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs leading-relaxed">
            <span className="text-xl flex-shrink-0">🎮</span>
            <div className="space-y-1">
              <strong className="font-bold text-sm">Social Entertainment Platform — Not Gambling</strong>
              <p>
                7 Wheel is a <strong>social entertainment platform</strong>. Virtual credits used in gameplay have <strong>no real-world monetary value</strong>. Credits cannot be withdrawn, redeemed, or exchanged for cash, prizes, or any item of real-world value. By participating, you acknowledge this is a game of entertainment and skill-based prediction, not a gambling product.
              </p>
            </div>
          </div>

          {/* Legal Alert banner */}
          <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-400 text-xs leading-relaxed">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">Important Liability Disclaimer</strong>
              <p>
                7 Wheel operates a simulated multiplayer prediction game using virtual credits. By registering and playing, you acknowledge that virtual wagers carry inherent risk of credit loss, outcomes are generated using random server-side seeds, and the platform holds no liability for credits lost during game rounds. No real money is risked at any time.
              </p>
            </div>
          </div>

          <div className="space-y-6 bg-casino-card border border-casino-border rounded-2xl p-6 sm:p-8">
            {/* Section 1: Terms of Use */}
            <div className="space-y-3">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <FileText size={16} className="text-brand-400" />
                1. Terms of Use & Eligibility
              </h3>
              <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to open an account or use virtual credits. It is your sole responsibility to ensure that your participation in this entertainment platform is permitted within your region.
                </p>
                <p>
                  We reserve the right to audit accounts, restrict access, or ban users suspected of exploiting game bugs, attempting multiple session entries from duplicate IPs, or creating bot accounts.
                </p>
              </div>
            </div>

            {/* Section 2: Game Rules & Rake */}
            <div className="space-y-3 pt-6 border-t border-casino-border/50">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Coins size={16} className="text-gold-400" />
                2. Gaming Rules & Fees
              </h3>
              <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  <strong>Credit Packs:</strong> Credits are virtual entertainment tokens purchased for use within the 7 Wheel platform only. Credits have no monetary value and <strong>cannot be withdrawn, redeemed, or converted to cash or prizes</strong> under any circumstances. All credit pack purchases are final and non-refundable.
                </p>
                <p>
                  <strong>Dynamic Pool Splits (Pari-Mutuel):</strong> On each round, the platform takes a flat <strong>3.5% commission fee</strong> (2.0% service fee + 1.5% support fee) off the total virtual credits wagered. The remaining 96.5% is distributed proportionally among winning players based on their bet sizes.
                </p>
                <p>
                  <strong>No-Winner Rounds:</strong> In the event that a round is resolved and no player placed a bet on the winning outcome, 100% of the credits wagered during that round are retained by the house.
                </p>
              </div>
            </div>

            {/* Section 3: Privacy & Security */}
            <div className="space-y-3 pt-6 border-t border-casino-border/50">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Lock size={16} className="text-emerald-400" />
                3. Privacy & Security Policies
              </h3>
              <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  <strong>Card & Account Security:</strong> Credit card wagers are processed exclusively by Stripe Elements and PayPal portals. Your full card numbers, CVVs, and PayPal auth keys are encrypted and transmitted directly to those processors. Our databases never capture, see, or store your private card credentials.
                </p>
                <p>
                  <strong>Personal Data:</strong> We collect only normalized usernames, secure salted password hashes, and email addresses to establish session identity and handle deposits. We do not sell or distribute user information to third-party marketing entities.
                </p>
              </div>
            </div>

            {/* Section 4: Limitation of Liability */}
            <div className="space-y-3 pt-6 border-t border-casino-border/50">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Shield size={16} className="text-red-400" />
                4. Limitation of Liability
              </h3>
              <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                <p>
                  Under no circumstances shall the platform administrators, developers, or affiliates be liable for any direct or indirect losses resulting from server disconnections, connection dropouts, latency errors, wheel physics animation sync, or account terminations. All software is provided "as is" with no guarantee of uptime or accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-casino-border bg-casino-card/20 py-8 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>&copy; 2026 7 Wheel Hub. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-slate-300">Home</Link>
            <Link to="/login" className="hover:text-slate-300">Sign In</Link>
            <Link to="/register" className="hover:text-slate-300">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyTerms;

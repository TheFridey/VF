const verificationSteps = [
  'Create an account and complete your basic profile.',
  'Submit veteran evidence through the verification flow.',
  'A moderator reviews the request and records the decision.',
  'Your account status updates and the relevant access opens up.',
];

export function VerificationSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Verification clarity</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">What &quot;verified veteran&quot; means here.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
            It means the account has gone through a review process intended to protect the quality of the network.
            Verification is not a marketing badge. It is a product control that supports trust, access, and moderation.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <ol className="space-y-4">
            {verificationSteps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

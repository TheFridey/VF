const verificationSteps = [
  'Create an account and complete your basic profile.',
  'Submit veteran evidence through the verification flow.',
  'A moderator reviews the request and records the decision.',
  'Your account status updates and the relevant access opens up.',
];

const verificationExplainer = [
  {
    title: 'What you can upload',
    description: 'Veteran card photos, supporting service documents, a short evidence video, or PDF copies where needed.',
  },
  {
    title: 'What reviewers check',
    description: 'That the evidence matches the account, supports veteran status, and is strong enough to keep access trustworthy.',
  },
  {
    title: 'How long it usually takes',
    description: 'Requests are queued for review with a 48-hour target. Urgent and breached cases are surfaced to operators.',
  },
];

export function VerificationSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Verification clarity</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">What &quot;verified veteran&quot; means here.</h2>
          <p className="mt-5 max-w-xl text-sm leading-8 text-slate-300">
            It means the account has gone through a review process intended to protect the quality of the network.
            Verification is not a marketing badge. It is a product control that supports trust, access, and moderation.
          </p>
          <div className="mt-8 space-y-3">
            {verificationExplainer.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <ol className="space-y-4">
            {verificationSteps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-8 text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

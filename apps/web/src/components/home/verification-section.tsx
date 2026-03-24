const verificationSteps = [
  'Create an account and complete your basic profile.',
  'Submit veteran evidence through the verification flow.',
  'A moderator reviews the request and records the decision.',
  'Your account status updates and the relevant access opens up.',
];

const verificationExplainer = [
  {
    title: 'What you can upload',
    description: 'A photo of your veteran card or service documents. A short evidence video if you prefer. PDF copies are fine.',
  },
  {
    title: 'What reviewers check',
    description: 'That the evidence is real, matches the account, and is strong enough to be confident about. If it&apos;s borderline, they&apos;ll ask for more.',
  },
  {
    title: 'How long it usually takes',
    description: 'Most requests are reviewed within 48 hours. If yours is taking longer, the team will follow up.',
  },
];

export function VerificationSection() {
  return (
    <section className="border-y border-sky-100 bg-[linear-gradient(180deg,#0f172a_0%,#082f49_100%)] text-slate-100">
      <div className="grid w-full gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 xl:px-14 2xl:px-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">What verified means here</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Verified means someone checked.</h2>
          <p className="mt-5 max-w-xl text-sm leading-8 text-slate-300">
            When an account is verified on VeteranFinder, it means a moderator
            has looked at the evidence they submitted — a veteran card, a service
            document — and confirmed it stacks up. It&apos;s not automated. It&apos;s not
            a checkbox. Someone looked.
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
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

import { BlogPostSeed, LONDON_1030_PUBLISH_SCHEDULE } from './blog-posts.seed.shared';

export const BLOG_POST_SEEDS_PART_1: BlogPostSeed[] = [
  {
    slug: 'how-to-find-someone-you-served-with',
    title: 'How to find someone you served with: a complete guide for UK veterans',
    excerpt:
      'Losing touch happens quietly, then suddenly matters. This guide covers the real UK routes for tracing former colleagues, from APC trace requests and regimental associations to Facebook groups, museums, and private veteran-only search tools.',
    tags: ['finding-veterans', 'community'],
    metaTitle: 'How to Find Someone You Served With in the UK',
    metaDescription:
      'How to find someone you served with in the UK using APC traces, regimental associations, Facebook groups, museums, and VeteranFinder.',
    publishAt: LONDON_1030_PUBLISH_SCHEDULE[0],
    intro: [
      'Finding one person from your service life should be simple. Most of the time it is the opposite. A surname changes after marriage, a phone number dies with an old handset, a regiment merges, a battalion rotates, and before long the one person you are trying to track has vanished into hundreds of wrong results on Facebook.',
      'There is no public, central register of former service personnel in the UK. The Ministry of Defence will not hand out somebody’s address or mobile number because that would be a security and privacy failure. That does not mean the trail stops there. It means you have to use the routes that still preserve enough service context to narrow the field.',
      'The right question is not usually “where are they now?” It is “what is the narrowest verifiable route back to them?” Once you know that, the search gets practical. Regiment, trade, tour, duty station, association secretary, trace letter, museum archive, Facebook group post, LinkedIn experience filter: those are the things that actually move the search on.',
    ],
    sections: [
      {
        heading: 'Why the search is harder than people expect',
        paragraphs: [
          'Civilian social media is built for current friendships, not historic service connections. If you type a common name into Facebook you get a wall of people with no service context attached. Even when you recognise a face, you still do not know whether the profile is active, whether the person served in the same place and years, or whether you have found the right David Williams out of fifty.',
          'The other problem is time. Service life is concentrated. You might spend two years talking to the same small group every day, then leave camp, marry, move county, switch jobs twice, and wake up fifteen years later realising you have no contact details for the people who knew you best. The break often happens without any argument or deliberate distance. People simply scatter.',
          'The search also gets distorted by how military identity is recorded. Army veterans often think in terms of regiment or battalion. Navy veterans think first of ship and draft. RAF veterans may remember station, squadron, or trade. If you search only by name, you lose the most useful identifier you have. If you search by unit and time period, the pool shrinks fast.',
        ],
      },
      {
        heading: 'Use the Army Personnel Centre trace route properly',
        paragraphs: [
          'For Army cases, the Army Personnel Centre in Glasgow is still one of the few formal routes that can help without breaching privacy. The APC will not release a former soldier’s contact details to you. What it can sometimes do is forward a sealed letter to the person’s last known address on file. That matters because it turns a dead end into one more chance for contact.',
          'The address you need is Army Personnel Centre, Kentigern House, 65 Brown Street, Glasgow G2 8EX. What you send should be plain, specific, and respectful. Include the person’s full name if you know it, service number if you have it, unit, approximate years served, and anything that helps identify them cleanly. Put your own contact details in the letter being forwarded, not just in the cover note.',
          'Do not write to the APC asking for a phone number, email address, or confirmation that the person still lives at a given property. They will not do that. What you are asking for is a trace or letter-forwarding attempt. Think of it as a one-way knock on the last recorded door. If the address is still live and the person wants to reply, they can. If not, the APC has still exhausted the formal privacy-safe route.',
        ],
        listItems: [
          'Army Personnel Centre, Kentigern House, 65 Brown Street, Glasgow G2 8EX',
          'State that you are asking for a trace or for a sealed letter to be forwarded',
          'Include the person’s name, unit, approximate service dates, and any known service number',
          'Keep the letter short, factual, and easy to trust when it arrives',
        ],
      },
      {
        heading: 'Regimental associations and museums often know more than people think',
        paragraphs: [
          'Most successful reconnections happen through humans who still sit inside an old unit network. A regimental association secretary may not have a magical database, but they often know who still turns up to dinners, who moved to which county branch, who keeps the old nominal roll, and who can quietly ask around without making it public. That is far more useful than a blind internet search.',
          'The most productive approach is not “Can you give me his details?” It is “Can you pass my details to him, or to somebody who still knows him?” That gives the association a route to help without crossing a line. Many will do exactly that if your request is sensible, specific, and clearly rooted in real service history.',
          'A few major examples worth checking are the Royal Signals Association, The Rifles and its regimental network, the Parachute Regiment Association, the Royal Anglian Association, and specialist corps associations such as REME or Royal Engineers groups. If the regiment has amalgamated, search both the old title and the current parent regiment. A former Royal Green Jacket may still identify that way even if the paperwork now sits under The Rifles.',
        ],
      },
      {
        heading: 'Facebook, LinkedIn, and veterans groups work best when you search by context',
        paragraphs: [
          'Facebook is still worth using, but not the lazy way. Searching a name alone is usually useless. Searching for a group called “Royal Signals Veterans”, “1 PARA Veterans”, “Op Herrick 14”, or “BFG Veterans” is far better. Once you are inside the right group, post a short trace note: who you are looking for, unit, years, deployment, and why you are trying to reach them. That format gets shared by people who recognise the details.',
          'LinkedIn is badly underused for veteran tracing. Many former service personnel list regiment, corps, squadron, ship, or branch in the experience section because it helps explain later civilian roles. Searching “Royal Signals 2006” or “2 PARA Afghanistan” in LinkedIn’s experience filter can surface exactly the sort of quietly professional profile that never appears in a Facebook veterans group search.',
          'The Royal British Legion can also be useful, especially where welfare is part of the picture. Their teams and local branches sometimes know whether somebody is engaged with the Legion, receiving support, or known to the local veteran community. They will not hand over private data, but they may help pass a message or point you to the right local contact. Veterans UK is not a tracing service in the ordinary sense, but it is still worth mentioning because it sits inside the official records landscape and can signpost the right route for a records-related query.',
        ],
      },
      {
        heading: 'When the trail is old, archives matter more than social media',
        paragraphs: [
          'For older cases, especially where the person served before widespread email and mobile phones, archives start to matter. Regimental museums and the National Army Museum can hold photographs, unit journals, association newsletters, casualty lists, or museum contacts who know which volunteer archivist has been keeping names alive for decades. That is not glamorous, but it is often what breaks a thirty-year deadlock.',
          'Unit photos are especially useful because they let you rebuild context even when the name is uncertain. A date, a company group shot, a deployment board, or a museum volunteer who recognises a face can tell you which platoon, which tour, or which follow-on association to contact. If you know the person only as “Smudge from Bosnia” or “the signaller from X-Ray Company”, archives help convert memory into something traceable.',
          'If the person has died, the search changes but it does not become pointless. You may be able to find a death notice, a branch obituary, a regimental journal mention, or a memorial entry that fills in what happened after service. The Commonwealth War Graves Commission helps for deaths in service in covered conflicts. For later life, the General Register Office, regimental journals, local notices, and museum records are the realistic routes.',
        ],
      },
      {
        heading: 'What to do when the person cannot be found',
        paragraphs: [
          'Sometimes the honest outcome is that the person does not want to be found, the trail has gone cold, or they have died. That is difficult, but it is better to know which routes have actually been exhausted. Keep a record of every group you posted in, every association you contacted, and every formal request you made. It stops you circling the same dead ground and makes it easier to ask for help from somebody else later.',
          'If there is a welfare concern, say so plainly when you contact organisations. A message that reads as “I have not spoken to him in years and would like to reconnect” is different from “multiple former colleagues are concerned about him and need to know if a welfare organisation can pass on a message.” The Royal British Legion, SSAFA, and local association welfare officers are more likely to engage if the welfare element is real and clearly stated.',
          'If the search is really about one of those names that keeps returning to you years later, use a platform built around service history rather than hoping the right person wanders past a public post. VeteranFinder is for that exact problem. You search by regiment, years served, and deployment, which is the information veterans actually remember when they are trying to find each other again.',
        ],
      },
    ],
    closing: [
      'Start narrow, stay factual, and use the military context you already have. That is what turns a vague hope into a traceable lead.',
    ],
  },
  {
    slug: 'how-to-get-your-service-record-uk',
    title: 'How to get a copy of your service record from the MOD',
    excerpt:
      'Service records are one of the most useful pieces of paperwork a veteran can hold, but the request process still catches people out. This guide covers where to write, what to include, how long it takes, and what to do when the record comes back incomplete.',
    tags: ['records', 'admin'],
    metaTitle: 'How to Get Your Service Record From the MOD',
    metaDescription:
      'How to get a copy of your UK military service record from the MOD, what to include in a SAR, and what to do if records are incomplete.',
    publishAt: LONDON_1030_PUBLISH_SCHEDULE[1],
    intro: [
      'Most veterans do not realise how many later-life problems can be solved faster with one document. A proper service record helps with medal claims, pension questions, compensation cases, housing applications, veteran card proof, GP conversations, and the basic task of proving where you served and when.',
      'The process is simple in principle. You make a Subject Access Request for your own data. In practice, people lose weeks by sending the wrong details, asking the wrong office for medical records, or leaving out the one identifier that lets staff locate the file quickly: usually a service number and date of birth together.',
      'If you treat the request like admin rather than a mystery, it is manageable. The Ministry of Defence route is not perfect, older paper records can be patchy, and deceased cases follow a different process. But there is a clear path, and it is worth doing before you urgently need the record for something else.',
    ],
    sections: [
      {
        heading: 'What a service record contains and what it does not',
        paragraphs: [
          'A service record is not just a certificate saying that you served. In most cases it contains your dates of enlistment and discharge, units, postings, rank progression, trade information, conduct entries, honours or awards noted on record, and administrative history that shows where you were in the system. For claims or formal applications, that level of detail is what matters.',
          'What it usually does not give you is a neat narrative of your career. It may not list every operational detail in the way veterans remember it. It is an administrative record, not a memoir. People request it expecting a polished summary and are disappointed when they get copies of forms, postings, and clerical entries instead. That is still useful. A tribunal, welfare adviser, or association secretary can read more from those entries than most people expect.',
          'Medical records are a separate issue. If you want your in-service medical notes, you may need a separate request through the Veterans Medical Records service rather than the standard service record route. That distinction matters in compensation and health cases because people often assume “service record” automatically includes the clinical side. It often does not.',
        ],
      },
      {
        heading: 'Use a Subject Access Request and send it with the right identifiers',
        paragraphs: [
          'For your own record, the governing idea is straightforward: you are asking for personal data held about you. That is a Subject Access Request under UK GDPR and the Data Protection Act framework. The quality of the response often depends on how precisely you identify yourself on day one.',
          'The address most veterans still use is Veterans UK, Norcross, Thornton-Cleveleys, Lancashire FY5 3WP. There are also online routes through the Veterans UK service pages at veterans-uk.info and GOV.UK. Whether you use paper or online, include your full current name, any previous names, date of birth, service number if you know it, branch, approximate service dates, and a return address that will still be valid when the pack arrives.',
          'The most common mistake is thinking staff can find you from one partial detail. “Served in the Army in the eighties, surname Thompson” is not enough. “Michael James Thompson, born 14 June 1962, service number 249xxxx, served 1981 to 1994 in the Royal Engineers” is the sort of request that can actually be matched without weeks of back-and-forth.',
        ],
        listItems: [
          'Veterans UK, Norcross, Thornton-Cleveleys, Lancashire FY5 3WP',
          'Include full name, previous names, date of birth, service number, branch, and service dates',
          'Ask separately for medical records if that is what you actually need',
          'Keep a copy of the request and the date you sent it',
        ],
      },
      {
        heading: 'How long it takes and what arrives back',
        paragraphs: [
          'The statutory expectation for a Subject Access Request is usually 30 days, though straightforward service record requests are often turned around faster. If the office needs more identity information or the records are archived in a slower format, the clock can stretch. That does not mean the request has failed. It usually means it needs chasing with specifics rather than impatience.',
          'What arrives can be a digital pack, scanned records, or copied pages that look more administrative than people expect. Do not skim them once and throw them in a drawer. Read the lot. Check dates, postings, unit names, release category, and any references that may help with medals, pension, compensation, or reconstruction of your career timeline.',
          'If something looks missing, compare what you received against what you know should exist. Was there a later posting, a deployment, or a transfer that is absent? Missing pages are not rare, especially for older records that lived on paper. Flag the gap clearly and ask whether there are further archived holdings, appendices, or legacy files still to be searched.',
        ],
      },
      {
        heading: 'Older and deceased records need a different kind of patience',
        paragraphs: [
          'Pre-1990s service can be messy. Some files were paper-based for years, some were transferred between offices, and some survive in incomplete form. That is frustrating, but it is normal enough that you should plan for it. If the first response is partial, do not assume bad faith. Ask what search was carried out, what identifiers were used, and whether legacy or archived holdings remain to be checked.',
          'Requests for a deceased family member are different again. The office will usually want proof of death and evidence of your relationship or another legitimate interest. If you are acting as next of kin, make that plain. If you are not next of kin but have a legitimate reason, explain it carefully and expect some limits on what can be released.',
          'This is also where the difference between service records and medical records matters most. A family seeking to understand a death, a pension trail, or a service-related illness may need to run more than one request. Treat the record hunt as a file-building exercise rather than a single envelope that will solve everything at once.',
        ],
      },
      {
        heading: 'What the record is actually useful for once you have it',
        paragraphs: [
          'A service record earns its keep in administrative situations where vague memory is not enough. Veterans Welfare Service advisers use it to help evidence claims. Solicitors ask for it in Armed Forces Compensation Scheme or pension matters. Housing schemes for veterans sometimes want proof of service. GP registrations that record veteran status are easier when the paperwork is straightforward. So are veteran card applications where identity history is messy.',
          'It also helps with things people do not expect. Mortgage brokers dealing with specialist veteran housing schemes may want to understand periods of service and discharge status. Medal claims often depend on reconstructing dates and qualifying operations. If you are trying to find somebody you served with, your own record can jog the exact unit title, date range, or theatre that makes the search workable.',
          'Request it before you are up against a deadline. That is the real lesson. People usually start this process because a tribunal, grant, housing officer, or charity asks for proof next week. It is far easier to have the record scanned, indexed, and ready than to begin the request on the day you discover you need it.',
        ],
      },
    ],
    closing: [
      'One clean copy of your service record saves a lot of scrambling later. Once you have it, keep a digital backup and a paper copy where you can find it quickly.',
    ],
  },
  {
    slug: 'uk-veteran-card-2026',
    title: "The UK Veteran Card: what it does, what it doesn't, and how to get one",
    excerpt:
      'The UK Veteran Card has become more visible since the digital rollout, but many veterans still assume it unlocks more than it does. This guide explains eligibility, application routes, genuine uses, and the claims the card does not support.',
    tags: ['admin', 'legal-entitlements'],
    metaTitle: 'UK Veteran Card 2026: What It Does and How to Get It',
    metaDescription:
      'What the UK Veteran Card does, what it does not do, who is eligible, and how to apply in 2026.',
    publishAt: LONDON_1030_PUBLISH_SCHEDULE[2],
    intro: [
      'The Veteran Card matters because it solves one dull but recurring problem: proving you served without dragging your whole service record around with you. That is useful. What it is not is a magic pass for every discount, treatment route, or entitlement that gets repeated in Facebook comments.',
      'The confusion comes from the fact that three different things get blurred together. There is proof of veteran status, there are actual entitlements set by law or policy, and there are voluntary discounts offered by companies that happen to accept the card as evidence. Those are not the same thing, and most bad advice comes from treating them as if they are.',
      'Since the digital expansion through GOV.UK Wallet, the card is easier to carry and easier to show. That changes convenience. It does not change the underlying rules about what the card proves and what it does not.',
    ],
    sections: [
      {
        heading: 'Who can get a Veteran Card',
        paragraphs: [
          'In broad terms, eligibility is simple: if you have served at least one day in His Majesty’s Armed Forces and have been discharged, you are usually eligible unless the discharge was dishonourable. That wide definition catches more people than many assume. It includes short-service cases and reserve service that still counts as service.',
          'The card is issued through Veterans UK. For most people, the modern route is through the Veterans UK account system rather than a paper-heavy process. If your identity history is straightforward and your service is already well recorded, the application tends to be routine.',
          'The cases that take longer are the ones where records need matching across name changes, partial historical data, reserve service, or old paper files. That does not mean you are ineligible. It means the evidence trail needs to be clearer. Have your service number, date of birth, and discharge details ready before you begin.',
        ],
      },
      {
        heading: 'What the card is genuinely useful for',
        paragraphs: [
          'The best use of the Veteran Card is as a clean proof-of-status document. That helps when you are registering with a GP and want veteran status recorded properly, when a housing provider or welfare adviser needs proof of service, or when a business offers a veteran discount but sensibly wants evidence before applying it.',
          'It also helps with things such as identity checks for veteran-specific schemes and some local authority conversations where proving service status quickly removes a layer of delay. In ordinary life that matters more than people admit. Anything that stops you having to explain your whole service history at a reception desk is worth having.',
          'The rail question comes up constantly. The card itself does not give you discounted rail travel. The Veterans Railcard is a separate product with its own application route. What the Veteran Card can do is help prove status when another scheme or service wants evidence that you are in fact a veteran.',
        ],
      },
      {
        heading: 'What the card does not do',
        paragraphs: [
          'The fastest way to avoid disappointment is to be blunt. The Veteran Card does not give you automatic priority NHS treatment in all circumstances. It does not exempt you from prescription charges. It does not prove entitlement to an Armed Forces pension. It does not by itself unlock compensation, grants, or housing priority.',
          'Where veterans get caught out is in assuming that proof of status is the same as proof of entitlement. It is not. A pension office wants pension evidence. An AFCS case needs medical and service evidence. A local authority making a housing decision is working to housing law and guidance, not simply to the sight of a card.',
          'That does not make the card pointless. It just means it should be treated as the first document in the chain, not the whole chain. It proves that you are who you say you are in one important respect. The rest of the case still depends on the rules of the scheme you are using.',
        ],
      },
      {
        heading: 'What changed with the digital version',
        paragraphs: [
          'The digital rollout through GOV.UK Wallet made the card easier to present and harder to lose. For younger veterans especially, that is enough to make it actually usable rather than something left in a drawer. If a receptionist, employer, or support worker asks for proof, showing a verified digital credential is simpler than hunting for a letter.',
          'What did not change is the underlying legal position. A digital card is still a proof-of-status tool. It does not create new benefits by existing in a different format. If a business chooses to honour it for a voluntary discount, that is because the business accepts it. If a public body has a policy for veterans, the policy still governs what happens next.',
          'That distinction matters because digital government products can look more powerful than they are. A well-designed wallet credential feels authoritative. In practice it is authoritative only for the limited point it is intended to prove: veteran status.',
        ],
      },
      {
        heading: 'Where the card fits alongside the Armed Forces Covenant',
        paragraphs: [
          'The Armed Forces Covenant is not a blanket promise that every public service will treat every veteran differently. It is a framework that says those who serve or have served should face no disadvantage because of service, with special consideration where justified for the injured or bereaved. The Veteran Card sits beside that framework as evidence, not as enforcement.',
          'In practice, some councils, NHS trusts, housing providers, and businesses understand the Covenant well. Others use the language and know little about the actual obligations. That is why the card helps most when paired with knowledge. If you can say “I am a veteran, here is proof, and this is the policy or scheme I am relying on,” you are in a stronger position than if you simply present the card and hope.',
          'Apply for it, carry it, and use it where it genuinely helps. Just do not mistake it for a shortcut around every other process. The card is useful precisely because it does one job cleanly.',
        ],
      },
    ],
    closing: [
      'If you are not already holding one, it is worth applying. Proof of service solves small problems quickly, and small problems have a habit of becoming large ones when the paperwork is missing.',
    ],
  },
];

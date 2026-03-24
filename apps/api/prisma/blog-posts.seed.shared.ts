export type BlogPostSection = {
  heading: string;
  paragraphs: string[];
  listItems?: string[];
};

export type BlogPostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  publishAt: string;
  intro: string[];
  sections: BlogPostSection[];
  closing: string[];
  coverImageUrl?: string | null;
};

export const LONDON_1030_PUBLISH_SCHEDULE = [
  '2026-03-25T10:30:00.000Z',
  '2026-03-26T10:30:00.000Z',
  '2026-03-27T10:30:00.000Z',
  '2026-03-28T10:30:00.000Z',
  '2026-03-29T09:30:00.000Z',
  '2026-03-30T09:30:00.000Z',
  '2026-03-31T09:30:00.000Z',
  '2026-04-01T09:30:00.000Z',
  '2026-04-02T09:30:00.000Z',
  '2026-04-03T09:30:00.000Z',
  '2026-04-04T09:30:00.000Z',
  '2026-04-05T09:30:00.000Z',
  '2026-04-06T09:30:00.000Z',
  '2026-04-07T09:30:00.000Z',
  '2026-04-08T09:30:00.000Z',
  '2026-04-09T09:30:00.000Z',
  '2026-04-10T09:30:00.000Z',
  '2026-04-11T09:30:00.000Z',
  '2026-04-12T09:30:00.000Z',
  '2026-04-13T09:30:00.000Z',
  '2026-04-14T09:30:00.000Z',
  '2026-04-15T09:30:00.000Z',
  '2026-04-16T09:30:00.000Z',
  '2026-04-17T09:30:00.000Z',
  '2026-04-18T09:30:00.000Z',
  '2026-04-19T09:30:00.000Z',
  '2026-04-20T09:30:00.000Z',
  '2026-04-21T09:30:00.000Z',
  '2026-04-22T09:30:00.000Z',
  '2026-04-23T09:30:00.000Z',
] as const;

type ArticleExpansion = {
  intro?: string[];
  sections?: BlogPostSection[];
  closing?: string[];
};

const FINDING_AND_COMMUNITY_EXPANSION: ArticleExpansion = {
  intro: [
    'The mistake most veterans make in these searches is treating them like ordinary internet lookups. They are not. The best searches behave more like intelligence work at a very human scale: one verified detail at a time, a written note of what has already been checked, and enough privacy that the right person can reply without being pushed into a public performance.',
  ],
  sections: [
    {
      heading: 'How to keep the search organised instead of emotional',
      paragraphs: [
        'Write the search down as you go. That sounds dry and it saves time. Keep one note with the full name, nicknames, unit or ship, years served, tours, likely garrison towns, association contacts, group posts, old phone numbers, and every route already tried. Veterans often think they will remember all of it because the person matters to them. Two weeks later they are repeating the same search terms, forgetting which association already replied, and missing the one clue that narrowed the field properly.',
        'Be disciplined about what counts as a confirmed fact. “Served with me in Bosnia in ninety-four” is useful if you are certain. “Might have moved to Plymouth after discharge” belongs in a separate list marked as uncertain until something supports it. The difference matters because people waste a lot of time building searches on half-memory. One uncertain detail can still be helpful. Five uncertain details layered together usually produce noise.',
        'Use the broadest route first only if you have nothing else. In most cases the better sequence is narrow to broad: service history, operation, regiment or ship, association, old comrades network, then wider platforms. Doing it the other way round creates public clutter before you have earned enough context to know what you are asking for. It also makes it harder for somebody else to trust that you are genuine when they eventually see the post.',
        'Keep one clean version of the trace message ready. Include who you are, how you served alongside the person, the years or operation, and how you can be contacted. If somebody helpful asks you for a version they can forward, having that text ready saves time and avoids the rushed message that sounds vague or intrusive.',
      ],
    },
    {
      heading: 'How to make contact without putting people off',
      paragraphs: [
        'The first message should be recognisable, light, and easy to ignore if the person is not ready. Veterans often get stuck because they think the first contact has to do emotional heavy lifting. It does not. In most cases it should do one job only: prove who you are and make it easy for the other person to choose a reply. “It is Chris from 39 Engineer Regiment, we were in Bosnia in ninety-six, I have been trying to track old faces down and thought of you” is enough to open the door.',
        'Do not load the first message with unresolved history unless that is genuinely unavoidable. If the two of you shared a traumatic tour, a bereavement, or a messy fallout, the other person still deserves a first contact that gives them room. You can say why you are reaching out now without forcing them to answer the hardest question immediately. That is especially important for veterans who may have spent years keeping that part of life compartmentalised.',
        'If a public group helps you identify the right person, move private as soon as possible. Public groups are good for discovery. They are a poor place to start the actual reconnection because the other veteran may not want their name, service history, or emotional reaction played out in front of strangers. A private message, email, or association-forwarded note is usually the point where the conversation becomes real.',
        'Once contact is made, let the pace be set by the person who was found. Some veterans respond with a phone call that lasts two hours. Others send one line and disappear for a week before returning properly. That range is normal. Reconnection succeeds more often when neither side mistakes caution for rejection.',
      ],
    },
    {
      heading: 'How to tell whether to keep pushing or change route',
      paragraphs: [
        'A search that has gone quiet is not always a failed search. Sometimes it simply means the route was too broad or too public. Before abandoning it, ask whether you have genuinely used the service context properly. Do you know the exact regiment, battalion, ship, trade, station, deployment, or year group? Have you contacted the association rather than only searched the public groups? Have you written a message another veteran would trust on first read? Those questions usually reveal whether the problem is the lack of a trail or the way the trail has been approached so far.',
        'Change route when the current one only produces noise. If Facebook gives you fifty false positives, move to LinkedIn, association secretaries, museums, or service-history search. If a public post identifies the right cohort but no one wants to respond in the open, take the search private. If the name is too common, build the query around operation and years rather than around surname. Persistence helps, but useful persistence is usually about changing angle rather than repeating the same weak search longer and louder.',
      ],
    },
  ],
  closing: [
    'The search nearly always goes better when it is built on service detail, patience, and privacy rather than urgency alone. That is true whether you are looking for one old oppo, a whole section, or the one person whose name has stayed with you for years.',
    'There is also a practical morale point here. A search feels impossible when it lives only in your head. It becomes manageable once it turns into actions, dates, names, and routes. That is usually the moment veterans stop feeling as if they are hoping for luck and start feeling as if they are working a real trail again.',
  ],
};

const RECORDS_AND_ENTITLEMENTS_EXPANSION: ArticleExpansion = {
  intro: [
    'With record requests and entitlement cases, the practical edge usually comes from file discipline. The veterans who get answers faster are rarely the ones with the most dramatic stories. They are the ones who can show dates, names, copies, previous correspondence, and a clean chronology without having to rebuild it in the middle of every phone call.',
  ],
  sections: [
    {
      heading: 'How to build a paper trail that actually helps',
      paragraphs: [
        'Make one folder for the issue and keep every version of everything in it. That means the original request, posted letters, delivery confirmations, email acknowledgements, screenshots of online submissions, scans of service record pages, ID documents, and notes of every phone call with date, time, and the name of the person spoken to if one was given. It sounds excessive until the first time an organisation says it cannot see your earlier submission and you can send it back inside two minutes.',
        'Where the issue turns on dates, write the chronology out separately on one page in plain English. Enlisted on this date. Posted here on that date. Condition first noticed here. GP note here. Discharge here. Request submitted here. Veterans often keep all the raw material but never produce the one-page timeline that makes the whole case legible. Decision-makers, welfare advisers, and tribunal judges all understand a clear chronology faster than they understand a thick stack of unsorted paper.',
        'Do not send original irreplaceable documents unless you are specifically told to and the route is secure. Use clear copies, labelled properly. If the document is hard to read, say why and point to the relevant section. Good admin is not about sending more paper. It is about sending the right paper in a shape another human can use without guessing what matters.',
        'Keep a version of your own explanation that can be reused. One of the most exhausting parts of veteran admin is having to retell the case from scratch every time it moves to a different desk. A short summary, a chronology, and the key documents stop you from wasting emotional energy on repetition and reduce the chance that something important drops out halfway through.',
      ],
    },
    {
      heading: 'What to do when the first answer is incomplete or wrong',
      paragraphs: [
        'Do not assume the first answer is final just because it arrived on official paper. Records requests come back incomplete. Entitlement decisions miss evidence. Dates are interpreted wrongly. Archives search the wrong name variation. The useful response is not outrage first. It is precision. What exactly is missing, what exactly is incorrect, and what evidence or argument addresses that point directly?',
        'When you challenge a response, keep the tone steady and the structure tight. Quote the part you dispute, explain why it is wrong or incomplete, and attach the material that answers it. “Please review” is weak. “The response omits my service under the previous surname Smith between 1988 and 1991; attached are marriage details and the original request showing both names” is much stronger because it tells the reviewer what to fix.',
        'If the matter has review or appeal rights, use them in the proper timeframe. Veterans lose good cases by letting frustration turn into delay. The same principle applies whether the issue is a missing service record page, a medal question, compensation, or a pension-related point. Systems often move slowly, but they are much harder to challenge once the formal window has closed.',
        'Get outside help when the issue moves beyond ordinary admin. Welfare advisers, veterans organisations, specialist charities, and sometimes solicitors earn their keep at the point where the veteran can no longer see the case clearly because they are too close to it. Good help does not replace your paper trail. It uses it properly.',
      ],
    },
    {
      heading: 'When a second pair of eyes makes the difference',
      paragraphs: [
        'Veterans are often at their weakest administratively when they know the subject too well. They assume a reader will see the importance of a date, an acronym, or a missing page because it is obvious to them. Another person usually spots the gaps instantly: the unexplained date range, the missing surname variation, the paragraph that never quite says what is being asked for. That second pair of eyes can be a welfare adviser, association secretary, solicitor, family member, or simply another veteran who has been through the same kind of form-heavy process before.',
        'Use outside help before the case becomes combative if you can. The best time to get a second view is when the issue still looks fixable rather than after three rounds of frustration. A short review of the chronology, the key evidence, and the exact point being disputed often strengthens a request or appeal far more than sending another emotional covering letter ever will. In veteran admin, clarity is not a style preference. It is often the thing that unlocks the answer.',
      ],
    },
  ],
  closing: [
    'Most record and entitlement problems become more manageable once the paperwork is clean and the chronology is visible. That sounds mundane because it is. It is also the difference between a case that drags and a case that moves.',
    'Veterans are used to pressing on with imperfect information. In administration, that habit can become expensive. The stronger move is usually to slow down just enough to make the file usable, the dates obvious, and the ask precise. That extra hour at the desk often saves weeks later.',
    'If the matter still feels overwhelming, reduce it to the next concrete move only: one document to find, one email to send, one date to verify, one adviser to contact. Administrative progress is often built exactly that way, especially in veteran cases where the paper trail runs across years or decades.',
  ],
};

const SUPPORT_AND_TRANSITION_EXPANSION: ArticleExpansion = {
  intro: [
    'Veterans often wait too long because they think they should approach support only once they can explain the whole problem neatly. In real life, support starts working sooner when the veteran arrives with the essentials clear enough to act on, even if the deeper story still takes time to tell.',
  ],
  sections: [
    {
      heading: 'How to prepare before asking for help',
      paragraphs: [
        'Before you call, book, or message, write down the practical version of the problem. What is happening, how long has it been happening, what is getting worse, and what has already been tried? For mental health that may mean sleep, anger, panic, drinking, numbness, or isolation. For transition that may mean housing instability, job uncertainty, pension confusion, and loss of routine all arriving at once. The point is not to produce a polished story. It is to stop the key facts vanishing when you are tired, wound up, or speaking to somebody new.',
        'If service context matters, make it explicit. Branch, years served, tours, discharge timing, and any major service-linked issue should be noted down in one place. Civilian services are usually better when they understand the veteran frame early. They are not good at inferring it from hints. A clear sentence about service history often saves fifteen minutes of side explanation and increases the chance of getting the right pathway first time.',
        'Think about what good help would actually look like. Some veterans say they need support when what they really need first is safe housing, debt stabilisation, medication review, or one old oppo who will keep in touch while the system catches up. Naming the first useful outcome makes the search for help far more practical. It also reduces the disappointment that comes from expecting one service to solve problems that belong across three or four different parts of life.',
        'If somebody else can help you make the first contact, use them. A partner, sibling, old service friend, or welfare worker can sit with you while the call is made, help you keep to the point, and make sure the next steps are actually written down afterwards. Veterans are often brilliant at supporting someone else and poor at letting someone steady them through the first step. Borrow the steadiness if you need it.',
      ],
    },
    {
      heading: 'How to keep the process moving when the first contact disappoints',
      paragraphs: [
        'The first service, GP, charity, or helpline response is not always the right one. That does not automatically mean the system is useless. It often means you have landed at a front door rather than the correct room. Veterans can lose momentum here because one poor conversation confirms the fear that nobody understands the issue properly. The better move is to treat the first disappointing contact as information. What did they miss, what route did they suggest, and what named service or professional should be tried next?',
        'Follow-up matters more than people expect. If you were told someone would ring back, note the date and chase if they do not. If you were given a referral name, use it. If the advice was vague, ask for the exact service name, form, or next action. Support pathways often fail less because there was no help and more because the handover between one part and the next was never made concrete enough to survive ordinary life getting in the way.',
        'Keep one person in the loop if you can. Recovery, transition, and welfare problems all go worse in isolation. One informed person who knows the names of the services involved, the appointments coming up, and the warning signs that things are slipping can make a disproportionate difference. It reduces the chance of disappearing between one stage and the next when motivation dips or pride starts rewriting the problem as “not serious enough”.',
        'This is also where veteran-specific context matters. Services do not need to flatter veterans. They do need to understand enough of service life, military identity, and post-service drift that the veteran does not feel they are explaining themselves from first principles every time. When you find that level of understanding, stick with it and build from there rather than starting over elsewhere unless you truly have to.',
      ],
    },
    {
      heading: 'What steady progress usually looks like',
      paragraphs: [
        'Support and transition rarely improve in one dramatic jump. More often the progress looks modest and ordinary: one call made, one appointment kept, one benefits form submitted, one drinking pattern named honestly, one GP record updated, one old friend told the truth about how bad things feel. Veterans sometimes miss genuine progress because it does not feel decisive enough. In reality those smaller steps are often what create enough stability for the bigger changes to become possible later.',
        'That matters because disappointment can distort judgment. If the housing situation is not solved in a week, or the first mental health appointment is underwhelming, it is easy to decide the whole system has failed. Sometimes it has. Often the reality is that the veteran has moved from no line of support at all to the very start of a line that still needs follow-through. The practical test is simple: are there more named actions, more named people, and more structure around the problem than there were a week ago? If the answer is yes, the process may be slow but it is moving.',
      ],
    },
  ],
  closing: [
    'The first useful step is usually smaller and more ordinary than people expect. Clarity, follow-up, and one steady contact often matter more than the perfect service appearing at the perfect moment.',
    'For most veterans, progress begins once the problem stops being carried alone and unnamed. That is why basic actions matter so much: getting the note written down, making the call, telling one trusted person, asking for the named pathway rather than a vague promise of help. Those small acts create traction.',
  ],
};

function getArticleExpansion(article: BlogPostSeed): ArticleExpansion | null {
  const tags = new Set(article.tags);

  if (tags.has('support') || tags.has('mental-health') || tags.has('transition')) {
    return SUPPORT_AND_TRANSITION_EXPANSION;
  }

  if (tags.has('records') || tags.has('admin') || tags.has('legal-entitlements')) {
    return RECORDS_AND_ENTITLEMENTS_EXPANSION;
  }

  if (
    tags.has('finding-veterans') ||
    tags.has('community') ||
    tags.has('regiment-history') ||
    tags.has('operations')
  ) {
    return FINDING_AND_COMMUNITY_EXPANSION;
  }

  return null;
}

function buildExpandedArticle(article: BlogPostSeed): BlogPostSeed {
  const expansion = getArticleExpansion(article);
  if (!expansion) return article;

  return {
    ...article,
    intro: [...article.intro, ...(expansion.intro ?? [])],
    sections: [...article.sections, ...(expansion.sections ?? [])],
    closing: [...article.closing, ...(expansion.closing ?? [])],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderArticleBody(article: BlogPostSeed): string {
  const expandedArticle = buildExpandedArticle(article);
  const intro = expandedArticle.intro.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n');

  const sections = expandedArticle.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      const list = section.listItems?.length
        ? `<ul>\n${section.listItems.map((item) => `  <li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>`
        : '';

      return `<h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}${list ? `\n${list}` : ''}`;
    })
    .join('\n');

  const closing = expandedArticle.closing
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  return [intro, sections, closing].filter(Boolean).join('\n');
}

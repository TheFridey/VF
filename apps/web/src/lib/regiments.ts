export type RegimentBranch = 'BRITISH_ARMY' | 'ROYAL_NAVY' | 'ROYAL_AIR_FORCE' | 'ROYAL_MARINES' | 'RESERVE_FORCES';

export interface Regiment {
  slug: string;
  name: string;
  branch: RegimentBranch;
  category: string;
}

export const UK_REGIMENTS: Regiment[] = [
  // ─── Guards Division ────────────────────────────────────────────────────────
  { slug: 'grenadier-guards',        name: 'Grenadier Guards',                                          branch: 'BRITISH_ARMY',    category: 'Guards Division' },
  { slug: 'coldstream-guards',       name: 'Coldstream Guards',                                         branch: 'BRITISH_ARMY',    category: 'Guards Division' },
  { slug: 'scots-guards',            name: 'Scots Guards',                                              branch: 'BRITISH_ARMY',    category: 'Guards Division' },
  { slug: 'irish-guards',            name: 'Irish Guards',                                              branch: 'BRITISH_ARMY',    category: 'Guards Division' },
  { slug: 'welsh-guards',            name: 'Welsh Guards',                                              branch: 'BRITISH_ARMY',    category: 'Guards Division' },

  // ─── Scottish Division ──────────────────────────────────────────────────────
  { slug: '1-scots',                 name: '1 SCOTS – Royal Scots Borderers',                           branch: 'BRITISH_ARMY',    category: 'Scottish Division' },
  { slug: '2-scots',                 name: '2 SCOTS – Royal Highland Fusiliers',                        branch: 'BRITISH_ARMY',    category: 'Scottish Division' },
  { slug: '3-scots',                 name: '3 SCOTS – Black Watch',                                     branch: 'BRITISH_ARMY',    category: 'Scottish Division' },
  { slug: '4-scots',                 name: '4 SCOTS – Highlanders',                                     branch: 'BRITISH_ARMY',    category: 'Scottish Division' },
  { slug: '5-scots',                 name: '5 SCOTS – Argyll and Sutherland Highlanders',               branch: 'BRITISH_ARMY',    category: 'Scottish Division' },

  // ─── Queen's / King's Division ─────────────────────────────────────────────
  { slug: 'pwrr',                    name: "Princess of Wales's Royal Regiment (PWRR)",                 branch: 'BRITISH_ARMY',    category: "Queen's Division" },
  { slug: 'royal-regiment-fusiliers',name: 'Royal Regiment of Fusiliers',                               branch: 'BRITISH_ARMY',    category: "Queen's Division" },
  { slug: 'royal-anglian',           name: 'Royal Anglian Regiment',                                    branch: 'BRITISH_ARMY',    category: "Queen's Division" },
  { slug: 'duke-of-lancasters',      name: "Duke of Lancaster's Regiment",                              branch: 'BRITISH_ARMY',    category: "King's Division" },
  { slug: 'yorkshire-regiment',      name: 'Yorkshire Regiment',                                        branch: 'BRITISH_ARMY',    category: "King's Division" },
  { slug: 'mercian',                 name: 'Mercian Regiment',                                          branch: 'BRITISH_ARMY',    category: "King's Division" },

  // ─── Prince of Wales's Division ────────────────────────────────────────────
  { slug: 'royal-welsh',             name: 'Royal Welsh',                                               branch: 'BRITISH_ARMY',    category: "Prince of Wales's Division" },
  { slug: 'rifles',                  name: 'The Rifles',                                                branch: 'BRITISH_ARMY',    category: "Prince of Wales's Division" },

  // ─── Irish Division ─────────────────────────────────────────────────────────
  { slug: 'royal-irish',             name: 'Royal Irish Regiment',                                      branch: 'BRITISH_ARMY',    category: 'Irish Division' },

  // ─── Parachute Regiment ─────────────────────────────────────────────────────
  { slug: '1-para',                  name: '1st Battalion Parachute Regiment (1 PARA)',                  branch: 'BRITISH_ARMY',    category: 'Parachute Regiment' },
  { slug: '2-para',                  name: '2nd Battalion Parachute Regiment (2 PARA)',                  branch: 'BRITISH_ARMY',    category: 'Parachute Regiment' },
  { slug: '3-para',                  name: '3rd Battalion Parachute Regiment (3 PARA)',                  branch: 'BRITISH_ARMY',    category: 'Parachute Regiment' },

  // ─── Special Forces ─────────────────────────────────────────────────────────
  { slug: '22-sas',                  name: '22 Special Air Service Regiment (22 SAS)',                   branch: 'BRITISH_ARMY',    category: 'Special Forces' },
  { slug: 'sbs',                     name: 'Special Boat Service (SBS)',                                 branch: 'ROYAL_MARINES',   category: 'Special Forces' },
  { slug: 'srr',                     name: 'Special Reconnaissance Regiment (SRR)',                      branch: 'BRITISH_ARMY',    category: 'Special Forces' },
  { slug: 'sfsg',                    name: 'Special Forces Support Group (SFSG)',                        branch: 'BRITISH_ARMY',    category: 'Special Forces' },
  { slug: '18-signal-sf',            name: '18 Signal Regiment (Special Forces)',                        branch: 'BRITISH_ARMY',    category: 'Special Forces' },

  // ─── Household Cavalry ──────────────────────────────────────────────────────
  { slug: 'life-guards',             name: 'Life Guards',                                               branch: 'BRITISH_ARMY',    category: 'Household Cavalry' },
  { slug: 'blues-and-royals',        name: 'Blues and Royals',                                          branch: 'BRITISH_ARMY',    category: 'Household Cavalry' },

  // ─── Royal Armoured Corps ───────────────────────────────────────────────────
  { slug: '1-queens-dragoon-guards', name: "1st The Queen's Dragoon Guards",                            branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'royal-scots-dragoon-guards', name: 'Royal Scots Dragoon Guards',                            branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'royal-dragoon-guards',    name: 'Royal Dragoon Guards',                                      branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'queens-royal-hussars',    name: "Queen's Royal Hussars",                                     branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: '9-12-lancers',            name: '9th/12th Royal Lancers',                                    branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'kings-royal-hussars',     name: "King's Royal Hussars",                                      branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'light-dragoons',          name: 'Light Dragoons',                                            branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'queens-royal-lancers',    name: "Queen's Royal Lancers",                                     branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },
  { slug: 'royal-tank-regiment',     name: 'Royal Tank Regiment',                                       branch: 'BRITISH_ARMY',    category: 'Royal Armoured Corps' },

  // ─── Royal Artillery ────────────────────────────────────────────────────────
  { slug: 'royal-horse-artillery',   name: 'Royal Horse Artillery',                                     branch: 'BRITISH_ARMY',    category: 'Royal Artillery' },
  { slug: 'royal-artillery',         name: 'Royal Artillery',                                           branch: 'BRITISH_ARMY',    category: 'Royal Artillery' },

  // ─── Royal Engineers ────────────────────────────────────────────────────────
  { slug: 'royal-engineers',         name: 'Royal Engineers (Sappers)',                                  branch: 'BRITISH_ARMY',    category: 'Corps' },

  // ─── Royal Corps of Signals ─────────────────────────────────────────────────
  { slug: 'royal-signals',           name: 'Royal Corps of Signals',                                    branch: 'BRITISH_ARMY',    category: 'Corps' },

  // ─── Intelligence Corps ─────────────────────────────────────────────────────
  { slug: 'intelligence-corps',      name: 'Intelligence Corps',                                        branch: 'BRITISH_ARMY',    category: 'Corps' },

  // ─── Army Air Corps ─────────────────────────────────────────────────────────
  { slug: 'army-air-corps',          name: 'Army Air Corps',                                            branch: 'BRITISH_ARMY',    category: 'Corps' },

  // ─── Support & Logistics Corps ──────────────────────────────────────────────
  { slug: 'royal-logistic-corps',    name: 'Royal Logistic Corps',                                      branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'reme',                    name: 'Royal Electrical and Mechanical Engineers (REME)',            branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'ramc',                    name: 'Royal Army Medical Corps (RAMC)',                            branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'royal-military-police',   name: 'Royal Military Police',                                     branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'agc',                     name: "Adjutant General's Corps",                                  branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'qaranc',                  name: "Queen Alexandra's Royal Army Nursing Corps (QARANC)",        branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'army-catering-corps',     name: 'Army Catering Corps',                                       branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'small-arms-school',       name: 'Small Arms School Corps',                                   branch: 'BRITISH_ARMY',    category: 'Support Corps' },
  { slug: 'royal-army-chaplains',    name: "Royal Army Chaplains' Department",                          branch: 'BRITISH_ARMY',    category: 'Support Corps' },

  // ─── Royal Marines ──────────────────────────────────────────────────────────
  { slug: '40-commando',             name: '40 Commando Royal Marines',                                  branch: 'ROYAL_MARINES',   category: 'Commando' },
  { slug: '42-commando',             name: '42 Commando Royal Marines',                                  branch: 'ROYAL_MARINES',   category: 'Commando' },
  { slug: '45-commando',             name: '45 Commando Royal Marines',                                  branch: 'ROYAL_MARINES',   category: 'Commando' },
  { slug: '539-assault-sqn',         name: '539 Assault Squadron Royal Marines',                         branch: 'ROYAL_MARINES',   category: 'Commando' },
  { slug: 'fleet-protection-group',  name: 'Fleet Protection Group Royal Marines',                       branch: 'ROYAL_MARINES',   category: 'Commando' },
  { slug: 'royal-marines-general',   name: 'Royal Marines (General Service)',                            branch: 'ROYAL_MARINES',   category: 'Royal Marines' },

  // ─── Royal Navy ─────────────────────────────────────────────────────────────
  { slug: 'royal-navy-surface',      name: 'Royal Navy – Surface Fleet',                                branch: 'ROYAL_NAVY',      category: 'Royal Navy' },
  { slug: 'submarine-service',       name: 'Submarine Service',                                         branch: 'ROYAL_NAVY',      category: 'Royal Navy' },
  { slug: 'fleet-air-arm',           name: 'Fleet Air Arm',                                             branch: 'ROYAL_NAVY',      category: 'Royal Navy' },
  { slug: 'royal-navy-medical',      name: 'Royal Navy Medical Service',                                branch: 'ROYAL_NAVY',      category: 'Royal Navy' },
  { slug: 'royal-navy-general',      name: 'Royal Navy (General Service)',                              branch: 'ROYAL_NAVY',      category: 'Royal Navy' },

  // ─── Royal Air Force ────────────────────────────────────────────────────────
  { slug: 'raf-regiment',            name: 'RAF Regiment',                                              branch: 'ROYAL_AIR_FORCE', category: 'Royal Air Force' },
  { slug: 'raf-police',              name: 'RAF Police',                                                branch: 'ROYAL_AIR_FORCE', category: 'Royal Air Force' },
  { slug: 'raf-medical',             name: 'RAF Medical Services',                                      branch: 'ROYAL_AIR_FORCE', category: 'Royal Air Force' },
  { slug: 'raf-general',             name: 'Royal Air Force (General Service)',                         branch: 'ROYAL_AIR_FORCE', category: 'Royal Air Force' },

  // ─── Reserve Forces ─────────────────────────────────────────────────────────
  { slug: 'army-reserve',            name: 'Army Reserve',                                              branch: 'RESERVE_FORCES',  category: 'Reserve Forces' },
  { slug: 'royal-naval-reserve',     name: 'Royal Naval Reserve',                                      branch: 'RESERVE_FORCES',  category: 'Reserve Forces' },
  { slug: 'royal-marines-reserve',   name: 'Royal Marines Reserve',                                    branch: 'RESERVE_FORCES',  category: 'Reserve Forces' },
  { slug: 'raf-reserve',             name: 'Royal Air Force Reserve',                                  branch: 'RESERVE_FORCES',  category: 'Reserve Forces' },
];

export function getRegimentBySlug(slug: string): Regiment | undefined {
  return UK_REGIMENTS.find((r) => r.slug === slug);
}

export const REGIMENT_BRANCH_LABELS: Record<RegimentBranch, string> = {
  BRITISH_ARMY:    'British Army',
  ROYAL_NAVY:      'Royal Navy',
  ROYAL_AIR_FORCE: 'Royal Air Force',
  ROYAL_MARINES:   'Royal Marines',
  RESERVE_FORCES:  'Reserve Forces',
};

/** Group the regiment list by branch, preserving order. */
export function getRegimentsByBranch(): Record<RegimentBranch, Regiment[]> {
  const groups: Record<RegimentBranch, Regiment[]> = {
    BRITISH_ARMY:    [],
    ROYAL_NAVY:      [],
    ROYAL_AIR_FORCE: [],
    ROYAL_MARINES:   [],
    RESERVE_FORCES:  [],
  };
  for (const r of UK_REGIMENTS) groups[r.branch].push(r);
  return groups;
}

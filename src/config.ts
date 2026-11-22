import type {
  InteriorConcept,
  ProjectBrief,
  ProjectType,
  ServiceArea,
  SpaceRequirement,
  VastuRule,
} from './models';
import areas from './service-areas.json';
export const disclaimer = 'Draft concept — professional review required.';
export const types: { id: ProjectType; label: string; description: string; icon: string }[] = [
  { id: 'home', label: 'Home', description: 'Spaces for everyday living', icon: 'home' },
  { id: 'office', label: 'Office', description: 'Make room for better work', icon: 'office' },
  {
    id: 'warehouse',
    label: 'Warehouse',
    description: 'Storage, loading & operations',
    icon: 'warehouse',
  },
  {
    id: 'commercial',
    label: 'Shop & commercial',
    description: 'A place for your business',
    icon: 'shop',
  },
  {
    id: 'custom',
    label: 'Custom space',
    description: 'Start with your own vision',
    icon: 'custom',
  },
  {
    id: 'interior',
    label: 'Interior only',
    description: 'A fresh direction for a room',
    icon: 'interior',
  },
];
const presets: Record<ProjectType, [string, SpaceRequirement['category'], number][]> = {
  home: [
    ['Living & dining', 'living', 24],
    ['Kitchen', 'kitchen', 12],
    ['Primary bedroom', 'bedroom', 18],
    ['Bedroom 2', 'bedroom', 15],
    ['Bathroom', 'washroom', 6],
  ],
  office: [
    ['Open workspace', 'work', 36],
    ['Meeting room', 'work', 18],
    ['Reception', 'living', 12],
    ['Pantry', 'kitchen', 8],
    ['Washroom', 'washroom', 6],
  ],
  warehouse: [
    ['Storage zone', 'storage', 160],
    ['Loading & dispatch', 'loading', 45],
    ['Operations office', 'work', 20],
    ['Staff facilities', 'washroom', 10],
  ],
  commercial: [
    ['Retail floor', 'retail', 45],
    ['Stockroom', 'storage', 18],
    ['Checkout', 'work', 9],
    ['Washroom', 'washroom', 5],
  ],
  custom: [
    ['Main activity space', 'custom', 40],
    ['Support space', 'storage', 15],
    ['Washroom', 'washroom', 6],
  ],
  interior: [
    ['Main room', 'living', 24],
    ['Reading & storage', 'storage', 6],
  ],
};
export function makeBrief(type: ProjectType = 'home'): ProjectBrief {
  return {
    name: `My ${types.find((t) => t.id === type)!.label.toLowerCase()} concept`,
    type,
    city: '',
    locality: '',
    width: type === 'warehouse' ? 20 : type === 'interior' ? 6 : 12,
    depth: type === 'warehouse' ? 18 : type === 'interior' ? 6 : 10,
    unit: 'm',
    shape: 'rectangle',
    north: 'north',
    roads: ['south'],
    floors: 1,
    budget: 0,
    constraints: '',
    spaces: presets[type].map(([name, category, area], i) => ({
      id: `${type}-${i}`,
      name,
      category,
      area,
      priority: 'essential',
      floor: 0,
      notes: '',
    })),
    vastu: 'none',
    ruleIds: [],
    roomType: type === 'office' ? 'office' : type === 'commercial' ? 'retail' : 'living',
    style: 'warm',
    envelopeConfirmed: false,
  };
}
export const vastuRules: VastuRule[] = [
  {
    id: 'kitchen-east',
    label: 'Kitchen toward east',
    category: 'kitchen',
    direction: 'east',
    description: 'Prefer an eastern kitchen zone as a selected discussion preference.',
  },
  {
    id: 'bedroom-south',
    label: 'Bedroom toward south',
    category: 'bedroom',
    direction: 'south',
    description: 'Prefer a southern sleeping zone.',
  },
  {
    id: 'living-north',
    label: 'Living space toward north',
    category: 'living',
    direction: 'north',
    description: 'Prefer a northern living or reception zone.',
  },
];
export const interiorStyles: Record<ProjectBrief['style'], InteriorConcept> = {
  warm: {
    name: 'Warm contemporary',
    palette: [
      { name: 'Linen', hex: '#e9e1d4' },
      { name: 'Oak', hex: '#bb936e' },
      { name: 'Olive', hex: '#81856c' },
      { name: 'Charcoal', hex: '#393e39' },
    ],
    finishes: [
      'Matte warm-white walls',
      'Natural oak or oak-look joinery',
      'Textured linen and woven accents',
    ],
    lighting:
      'Layer warm ambient light with focused task lighting; verify fixture loads and placement with a designer.',
    furniture: {
      living: ['Low-profile modular sofa', 'Rounded coffee table', 'Open storage console'],
      bedroom: ['Upholstered bed', 'Compact bedside tables', 'Full-height wardrobe'],
      office: ['Adjustable task chairs', 'Modular shared desks', 'Acoustic storage divider'],
      retail: [
        'Flexible display shelving',
        'Accessible-height service counter',
        'Movable merchandising tables',
      ],
    },
  },
  minimal: {
    name: 'Quiet minimal',
    palette: [
      { name: 'Chalk', hex: '#eeeee8' },
      { name: 'Ash', hex: '#c7c9bf' },
      { name: 'Slate', hex: '#6a7b7b' },
      { name: 'Ink', hex: '#29393e' },
    ],
    finishes: [
      'Low-sheen neutral walls',
      'Light ash-effect surfaces',
      'Simple brushed metal details',
    ],
    lighting:
      'Use diffuse ceiling light and glare-controlled task lights; coordinate with daylight.',
    furniture: {
      living: ['Clean-lined sofa', 'Nested side tables', 'Closed storage'],
      bedroom: ['Platform bed', 'Floating bedside shelves', 'Flush wardrobe'],
      office: ['Simple desks', 'Ergonomic task seating', 'Enclosed document storage'],
      retail: ['Slim display rails', 'Modular counters', 'Adjustable shelves'],
    },
  },
  earthy: {
    name: 'Earth & texture',
    palette: [
      { name: 'Sand', hex: '#e1cdb1' },
      { name: 'Clay', hex: '#b4775f' },
      { name: 'Moss', hex: '#687159' },
      { name: 'Walnut', hex: '#635144' },
    ],
    finishes: [
      'Clay-tone washable paint',
      'Timber or timber-look flooring',
      'Woven natural-fibre accents',
    ],
    lighting:
      'Combine soft reflected lighting with shaded pendants; review cleaning and fire requirements.',
    furniture: {
      living: ['Textured fabric sofa', 'Timber coffee table', 'Woven accent chair'],
      bedroom: ['Timber bed frame', 'Woven headboard', 'Storage bench'],
      office: ['Timber-look desks', 'Fabric acoustic screens', 'Comfortable task seating'],
      retail: ['Timber display plinths', 'Textured feature backdrop', 'Durable service counter'],
    },
  },
};
export const serviceAreas: ServiceArea[] = areas;
export const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/^\+/, '') || '';
export const whatsappUrl = /^[1-9]\d{7,14}$/.test(whatsappNumber)
  ? `https://wa.me/${whatsappNumber}`
  : null;
export const sampleProjects = (
  [
    ['home', 'The courtyard home', 'Bengaluru', 'Whitefield'],
    ['office', 'A calmer kind of workspace', 'Hyderabad', 'Gachibowli'],
    ['warehouse', 'Room to grow operations', 'Pune', 'Wagholi'],
  ] as const
).map(([type, name, city, locality]) => ({ ...makeBrief(type), name, city, locality }));

import { z } from 'zod';
export const projectTypes = [
  'home',
  'office',
  'warehouse',
  'commercial',
  'custom',
  'interior',
] as const;
export const directions = ['north', 'east', 'south', 'west'] as const;
export const spaceSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1, 'Name this space').max(80),
  category: z.enum([
    'living',
    'kitchen',
    'bedroom',
    'work',
    'storage',
    'loading',
    'washroom',
    'retail',
    'custom',
  ]),
  area: z.number().min(2, 'Use at least 2 square units').max(100000),
  priority: z.enum(['essential', 'preferred']),
  floor: z.number().int().min(0).max(4),
  notes: z.string().max(500),
});
export const briefSchema = z
  .object({
    name: z.string().trim().min(2, 'Use at least two characters').max(100),
    type: z.enum(projectTypes),
    city: z.string().trim().min(2, 'Enter a city').max(100),
    locality: z.string().trim().min(2, 'Enter a locality').max(100),
    width: z.number().positive('Enter a positive width').max(500),
    depth: z.number().positive('Enter a positive depth').max(500),
    unit: z.enum(['m', 'ft']),
    shape: z.enum(['rectangle', 'irregular']),
    north: z.enum(directions),
    roads: z.array(z.enum(directions)).min(1, 'Select at least one road side').max(4),
    floors: z.number().int().min(1).max(5),
    budget: z.number().min(0).max(10000000000),
    constraints: z.string().max(2000),
    spaces: z.array(spaceSchema).min(1, 'Add at least one space').max(30),
    vastu: z.enum(['none', 'consider', 'prioritize']),
    ruleIds: z.array(z.string().max(80)).max(20),
    roomType: z.enum(['living', 'bedroom', 'office', 'retail']),
    style: z.enum(['warm', 'minimal', 'earthy']),
    envelopeConfirmed: z.boolean(),
  })
  .superRefine((b, ctx) => {
    if (b.shape === 'irregular' && !b.envelopeConfirmed)
      ctx.addIssue({
        code: 'custom',
        path: ['envelopeConfirmed'],
        message: 'Confirm the inscribed rectangular envelope.',
      });
    if (b.spaces.some((s) => s.floor >= b.floors))
      ctx.addIssue({
        code: 'custom',
        path: ['spaces'],
        message: 'Assign all spaces to an available floor.',
      });
    if (b.type === 'interior' && b.floors !== 1)
      ctx.addIssue({
        code: 'custom',
        path: ['floors'],
        message: 'Interior-only projects use one room envelope.',
      });
  });
export type ProjectType = (typeof projectTypes)[number];
export type Direction = (typeof directions)[number];
export type SpaceRequirement = z.infer<typeof spaceSchema>;
export type ProjectBrief = z.infer<typeof briefSchema>;
export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  floor: z.number().int(),
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
  width: z.number().positive(),
  depth: z.number().positive(),
  requestedArea: z.number().nonnegative(),
  allocatedArea: z.number().positive(),
  kind: z.enum(['room', 'circulation', 'stairs']),
});
export type PlacedSpace = z.infer<typeof roomSchema>;
export const noteSchema = z.object({
  ruleId: z.string(),
  label: z.string(),
  status: z.enum(['considered', 'unmet', 'conflict', 'unevaluable']),
  message: z.string(),
});
export const layoutSchema = z
  .object({
    engineVersion: z.literal(1),
    width: z.number().positive(),
    depth: z.number().positive(),
    floors: z.number().int().min(1).max(5),
    rooms: z.array(roomSchema).min(1).max(40),
    assumptions: z.array(z.string().max(2000)).max(100),
    notes: z.array(noteSchema).max(20),
  })
  .superRefine((l, ctx) => {
    if (new Set(l.rooms.map((r) => r.id)).size !== l.rooms.length)
      ctx.addIssue({ code: 'custom', message: 'Room IDs must be unique.' });
    for (const r of l.rooms) {
      if (
        r.floor < 0 ||
        r.floor >= l.floors ||
        r.x + r.width > l.width + 1e-6 ||
        r.y + r.depth > l.depth + 1e-6 ||
        Math.abs(r.allocatedArea - r.width * r.depth) > 1e-5
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid room geometry.' });
    }
    for (let i = 0; i < l.rooms.length; i++)
      for (let j = i + 1; j < l.rooms.length; j++) {
        const a = l.rooms[i],
          b = l.rooms[j];
        if (
          a.floor === b.floor &&
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-6 &&
          Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y) > 1e-6
        )
          ctx.addIssue({ code: 'custom', message: 'Concept zones overlap.' });
      }
  });
export type ConceptLayout = z.infer<typeof layoutSchema>;
export interface VastuRule {
  id: string;
  label: string;
  category: SpaceRequirement['category'];
  direction: Direction;
  description: string;
}
export interface InteriorConcept {
  name: string;
  palette: { name: string; hex: string }[];
  finishes: string[];
  lighting: string;
  furniture: Record<ProjectBrief['roomType'], string[]>;
}
export interface ServiceArea {
  city: string;
  locality: string;
  citySlug: string;
  slug: string;
  title: string;
  description: string;
  illustrative: boolean;
}
export const versionSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.string().datetime({ offset: true }),
    brief: briefSchema,
    layout: layoutSchema,
  })
  .superRefine((v, ctx) => {
    const factor = v.brief.unit === 'ft' ? 0.3048 : 1;
    if (
      Math.abs(v.layout.width - v.brief.width * factor) > 1e-5 ||
      Math.abs(v.layout.depth - v.brief.depth * factor) > 1e-5 ||
      v.layout.floors !== v.brief.floors ||
      v.brief.spaces.some(
        (s) =>
          !v.layout.rooms.some((r) => r.id === s.id && r.floor === s.floor && r.kind === 'room'),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Layout does not match its project brief.' });
  });
export type ProjectVersion = z.infer<typeof versionSchema>;
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  updatedAt: z.string().datetime({ offset: true }),
  versions: z.array(versionSchema).min(1),
});
export type Project = z.infer<typeof projectSchema>;
export const leadSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().max(2000),
  consent: z.literal(true),
  createdAt: z.string().datetime({ offset: true }),
});
export type Lead = z.infer<typeof leadSchema>;
export interface UploadedFile {
  id: string;
  projectId: string;
  path: string;
  name: string;
}

export const draftSchema = z
  .object(briefSchema.shape)
  .partial()
  .extend({
    name: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    locality: z.string().max(100).optional(),
    width: z.number().min(0).max(500).optional(),
    depth: z.number().min(0).max(500).optional(),
    spaces: z
      .array(
        z
          .object(spaceSchema.shape)
          .extend({ name: z.string().max(80), area: z.number().min(0).max(100000) }),
      )
      .max(30)
      .optional(),
  });

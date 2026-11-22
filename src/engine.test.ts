import { describe, expect, it } from 'vitest';
import { makeBrief, sampleProjects, vastuRules } from './config';
import {
  compassDirection,
  fromMetres,
  layoutEngine,
  preferenceEvaluator,
  toMetres,
} from './engine';
import { briefSchema, projectTypes } from './models';
import { readLocal } from './storage';
function valid(type: (typeof projectTypes)[number] = 'home') {
  return { ...makeBrief(type), city: 'Bengaluru', locality: 'Whitefield' };
}
describe('deterministic concepts', () => {
  for (const type of projectTypes)
    it(`generates bounded non-overlapping ${type} zones`, () => {
      const b = valid(type),
        l = layoutEngine.generate(b);
      expect(layoutEngine.generate(b)).toEqual(l);
      expect(l.rooms.filter((r) => r.kind === 'room')).toHaveLength(b.spaces.length);
      for (const r of l.rooms) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(l.width + 1e-8);
        expect(r.y + r.depth).toBeLessThanOrEqual(l.depth + 1e-8);
        for (const s of l.rooms.filter((s) => s.id !== r.id && s.floor === r.floor)) {
          expect(
            Math.min(r.x + r.width, s.x + s.width) - Math.max(r.x, s.x) > 1e-8 &&
              Math.min(r.y + r.depth, s.y + s.depth) - Math.max(r.y, s.y) > 1e-8,
          ).toBe(false);
        }
      }
    });
  it('has valid home, office and warehouse samples', () =>
    sampleProjects.forEach((b) => expect(briefSchema.safeParse(b).success).toBe(true)));
  it('reserves stairs and circulation on each floor', () => {
    const b = valid();
    b.floors = 2;
    b.spaces[3].floor = 1;
    b.spaces[4].floor = 1;
    const l = layoutEngine.generate(b);
    expect(l.rooms.filter((r) => r.kind === 'stairs')).toHaveLength(2);
    expect(l.rooms.filter((r) => r.kind === 'circulation')).toHaveLength(2);
  });
  it('rejects an unused floor and an infeasible narrow zone', () => {
    expect(() => layoutEngine.generate({ ...valid(), floors: 2 })).toThrow('floor 2');
    expect(() => layoutEngine.generate({ ...valid(), width: 2 })).toThrow('at least 3 m');
    const b = valid();
    b.spaces[0].area = 10000;
    expect(() => layoutEngine.generate(b)).toThrow('too narrow');
  });
  it('reports proportional shortages without omitting spaces', () => {
    const b = valid();
    b.spaces = b.spaces.map((s) => ({ ...s, area: s.area * 2 }));
    const l = layoutEngine.generate(b);
    expect(l.assumptions.some((a) => a.includes('reduced proportionally'))).toBe(true);
    expect(l.rooms.filter((r) => r.kind === 'room')).toHaveLength(b.spaces.length);
  });
  it('converts units without changing geometry', () => {
    const m = valid(),
      factor = 1 / 0.3048,
      ft = {
        ...m,
        unit: 'ft' as const,
        width: m.width * factor,
        depth: m.depth * factor,
        spaces: m.spaces.map((s) => ({ ...s, area: s.area * factor ** 2 })),
      };
    const a = layoutEngine.generate(m),
      b = layoutEngine.generate(ft);
    expect(a.width).toBeCloseTo(b.width);
    expect(a.rooms[0].width).toBeCloseTo(b.rooms[0].width);
    expect(fromMetres(toMetres(12, 'ft'), 'ft')).toBeCloseTo(12);
  });
  it('requires irregular envelope confirmation', () => {
    expect(briefSchema.safeParse({ ...valid(), shape: 'irregular' }).success).toBe(false);
    const l = layoutEngine.generate({ ...valid(), shape: 'irregular', envelopeConfirmed: true });
    expect(l.assumptions.join(' ')).toContain('actual irregular boundary');
  });
  it('rejects invalid names, floors, roads and budgets', () => {
    expect(briefSchema.safeParse({ ...valid(), name: '', roads: [], budget: -1 }).success).toBe(
      false,
    );
    expect(briefSchema.safeParse({ ...valid('interior'), floors: 2 }).success).toBe(false);
  });
});
describe('Vastu discussion checks', () => {
  it('performs no checks without preference', () => {
    const b = valid();
    b.ruleIds = ['kitchen-east'];
    expect(layoutEngine.generate(b).notes).toEqual([]);
  });
  it('rotates compass direction with north', () => {
    const l = layoutEngine.generate(valid()),
      r = { ...l.rooms[0], x: l.width / 2 - 0.5, y: 0, width: 1, depth: 1 };
    expect(compassDirection(r, l.width, l.depth, 'north')).toBe('north');
    expect(compassDirection(r, l.width, l.depth, 'east')).toBe('west');
  });
  it('handles missing rooms, unknown rules and conflicts', () => {
    const b = {
      ...valid('warehouse'),
      vastu: 'consider' as const,
      ruleIds: ['bedroom-south', 'unknown'],
    };
    expect(layoutEngine.generate(b).notes.map((n) => n.status)).toEqual([
      'unevaluable',
      'unevaluable',
    ]);
    const home = {
      ...valid(),
      vastu: 'consider' as const,
      ruleIds: ['kitchen-east', 'kitchen-west'],
    };
    const l = layoutEngine.generate(home);
    expect(
      preferenceEvaluator.evaluate(home, l, [
        ...vastuRules,
        { ...vastuRules[0], id: 'kitchen-west', direction: 'west' },
      ])[0].status,
    ).toBe('conflict');
  });
  it('prioritization never scores worse than the base partition', () => {
    const b = { ...valid(), vastu: 'consider' as const, ruleIds: vastuRules.map((r) => r.id) };
    const count = (notes: ReturnType<typeof layoutEngine.generate>['notes']) =>
      notes.filter((n) => n.status === 'considered').length;
    expect(
      count(layoutEngine.generate({ ...b, vastu: 'prioritize' }).notes),
    ).toBeGreaterThanOrEqual(count(layoutEngine.generate(b).notes));
  });
});
describe('storage validation', () => {
  it('returns an empty versioned store for first use', () =>
    expect(readLocal({ getItem: () => null }).projects).toEqual([]));
  it('preserves corrupted data and raises a helpful error', () => {
    const raw = '{broken';
    expect(() => readLocal({ getItem: () => raw })).toThrow('not overwritten');
    expect(() => readLocal({ getItem: () => '{"schemaVersion":99}' })).toThrow('unreadable');
  });
});

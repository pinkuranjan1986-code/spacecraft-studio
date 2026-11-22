import { vastuRules } from './config';
import type {
  ConceptLayout,
  Direction,
  PlacedSpace,
  ProjectBrief,
  SpaceRequirement,
  VastuRule,
} from './models';
import { briefSchema } from './models';
export const toMetres = (n: number, unit: ProjectBrief['unit']) => (unit === 'ft' ? n * 0.3048 : n);
export const fromMetres = (n: number, unit: ProjectBrief['unit']) =>
  unit === 'ft' ? n / 0.3048 : n;
export function formatLength(n: number, unit: ProjectBrief['unit']) {
  return `${fromMetres(n, unit).toFixed(1)} ${unit}`;
}
export function compassDirection(
  room: PlacedSpace,
  width: number,
  depth: number,
  north: Direction,
): Direction {
  const x = (room.x + room.width / 2) / width - 0.5,
    y = (room.y + room.depth / 2) / depth - 0.5;
  const screen: Direction =
    Math.abs(x) > Math.abs(y) ? (x > 0 ? 'east' : 'west') : y > 0 ? 'south' : 'north';
  const order: Direction[] = ['north', 'east', 'south', 'west'];
  return order[(order.indexOf(screen) - order.indexOf(north) + 4) % 4];
}
export interface PreferenceEvaluator {
  evaluate(brief: ProjectBrief, layout: ConceptLayout, rules?: VastuRule[]): ConceptLayout['notes'];
}
export const preferenceEvaluator: PreferenceEvaluator = {
  evaluate(b, l, rules = vastuRules) {
    if (b.vastu === 'none') return [];
    return b.ruleIds.map((id) => {
      const r = rules.find((r) => r.id === id);
      if (!r)
        return {
          ruleId: id,
          label: 'Unavailable preference',
          status: 'unevaluable' as const,
          message: 'This rule is no longer configured. Ask a reviewer to revise it.',
        };
      const conflict = rules.some(
        (other) =>
          other.id !== id &&
          b.ruleIds.includes(other.id) &&
          other.category === r.category &&
          other.direction !== r.direction,
      );
      const rooms = l.rooms.filter((s) => s.category === r.category && s.kind === 'room');
      const ok = rooms.some((s) => compassDirection(s, l.width, l.depth, b.north) === r.direction);
      return {
        ruleId: id,
        label: r.label,
        status: conflict
          ? ('conflict' as const)
          : !rooms.length
            ? ('unevaluable' as const)
            : ok
              ? ('considered' as const)
              : ('unmet' as const),
        message: conflict
          ? 'Selected rules request different directions for the same space category. Professional interpretation is needed.'
          : !rooms.length
            ? 'No matching space exists in this concept.'
            : ok
              ? 'At least one matching space centre falls in the selected compass zone.'
              : 'The selected direction could not be achieved with this partition. Other spatial needs take precedence.',
      };
    });
  },
};
export interface LayoutEngine {
  generate(brief: ProjectBrief): ConceptLayout;
}
export const layoutEngine: LayoutEngine = {
  generate(input) {
    const b = briefSchema.parse(input),
      width = toMetres(b.width, b.unit),
      depth = toMetres(b.depth, b.unit);
    if (width < 3 || depth < 3)
      throw new Error(
        'Use an envelope at least 3 m (9.85 ft) wide and deep for this starter engine.',
      );
    const assumptions = [
      'All dimensions are approximate clear-zone allocations; wall thickness, structure and building services are excluded.',
      'Circulation is a reserved concept strip, not a verified access or fire-escape route.',
      'Road sides, budget and free-text constraints are recorded for review; the engine does not verify access, costs or regulations.',
    ];
    if (b.shape === 'irregular')
      assumptions.push(
        'Only your confirmed inscribed rectangular envelope is used. The actual irregular boundary has not been surveyed or checked.',
      );
    if (b.type === 'interior')
      assumptions.push(
        'Interior zones indicate activities within one room; they are not proposed structural partitions.',
      );
    const candidate = (reverse: boolean, mirror: boolean): ConceptLayout => {
      const rooms: PlacedSpace[] = [];
      for (let floor = 0; floor < b.floors; floor++) {
        const required = b.spaces
          .filter((s) => s.floor === floor)
          .sort(
            (a, c) => (a.priority === 'essential' ? 0 : 1) - (c.priority === 'essential' ? 0 : 1),
          );
        if (!required.length)
          throw new Error(
            `Add at least one space on floor ${floor + 1}, or reduce the floor count.`,
          );
        const corridor = Math.max(1, Math.min(1.5, depth * 0.12));
        const stairWidth = b.floors > 1 ? 2 : 0;
        const useWidth = width - stairWidth,
          useDepth = depth - corridor;
        if (useWidth < 3 || useDepth < 2)
          throw new Error(
            'The envelope is too small after circulation and stair reservations. Increase it or reduce floors.',
          );
        rooms.push({
          id: `circulation-${floor}`,
          name: 'Circulation',
          category: 'circulation',
          floor,
          x: stairWidth,
          y: depth - corridor,
          width: useWidth,
          depth: corridor,
          requestedArea: 0,
          allocatedArea: useWidth * corridor,
          kind: 'circulation',
        });
        if (stairWidth)
          rooms.push({
            id: `stairs-${floor}`,
            name: 'Stair / landing reserve',
            category: 'stairs',
            floor,
            x: 0,
            y: 0,
            width: stairWidth,
            depth,
            requestedArea: 0,
            allocatedArea: stairWidth * depth,
            kind: 'stairs',
          });
        const list = reverse ? [...required].reverse() : required;

        // Weighted recursive bisection avoids tiny full-width strips for small rooms.
        function partition(
          items: SpaceRequirement[],
          x: number,
          y: number,
          w: number,
          h: number,
        ): void {
          if (items.length === 1) {
            const s = items[0];
            if (w < 1.2 - 1e-8 || h < 1.2 - 1e-8 || w * h < 2 - 1e-8)
              throw new Error(
                `“${s.name}” becomes too narrow or small. Increase the envelope, reduce spaces, or rebalance requested areas.`,
              );
            rooms.push({
              id: s.id,
              name: s.name,
              category: s.category,
              floor,
              x: mirror ? width - (x + w) + stairWidth : x,
              y,
              width: w,
              depth: h,
              requestedArea: s.area * toMetres(1, b.unit) ** 2,
              allocatedArea: w * h,
              kind: 'room',
            });
            return;
          }
          const sum = items.reduce((n, s) => n + s.area, 0);
          let count = 1,
            first = items[0].area;
          while (
            count < items.length - 1 &&
            Math.abs(first + items[count].area - sum / 2) < Math.abs(first - sum / 2)
          ) {
            first += items[count].area;
            count++;
          }
          const ratio = first / sum;
          if (w >= h) {
            partition(items.slice(0, count), x, y, w * ratio, h);
            partition(items.slice(count), x + w * ratio, y, w * (1 - ratio), h);
          } else {
            partition(items.slice(0, count), x, y, w, h * ratio);
            partition(items.slice(count), x, y + h * ratio, w, h * (1 - ratio));
          }
        }
        partition(list, stairWidth, 0, useWidth, useDepth);
      }
      return {
        engineVersion: 1,
        width,
        depth,
        floors: b.floors,
        rooms,
        assumptions: [],
        notes: [],
      };
    };
    const candidates = [candidate(false, false)];
    if (b.vastu === 'prioritize')
      for (const [reverse, mirror] of [
        [true, false],
        [false, true],
        [true, true],
      ]) {
        try {
          candidates.push(candidate(reverse, mirror));
        } catch {
          /* Keep feasible partitions only; base candidate already passed. */
        }
      }
    const score = (l: ConceptLayout) =>
      preferenceEvaluator.evaluate(b, l).filter((n) => n.status === 'considered').length;
    const layout = candidates.sort((a, c) => score(c) - score(a))[0];
    for (let f = 0; f < b.floors; f++) {
      const rs = layout.rooms.filter((r) => r.floor === f && r.kind === 'room');
      const requested = rs.reduce((n, r) => n + r.requestedArea, 0),
        allocated = rs.reduce((n, r) => n + r.allocatedArea, 0);
      assumptions.push(
        `Floor ${f + 1}: requested ${requested.toFixed(1)} m²; allocated ${allocated.toFixed(1)} m² after reserves. ${requested > allocated ? 'Requested areas were reduced proportionally.' : 'Available area was distributed proportionally.'}`,
      );
    }
    if (b.vastu === 'prioritize')
      assumptions.push(
        'Selected preferences scored four deterministic partitions. This does not establish Vastu compliance.',
      );
    layout.assumptions = assumptions;
    layout.notes = preferenceEvaluator.evaluate(b, layout);
    return layout;
  },
};
// Future integrations must be server-side and explicitly consented to. No implementation is enabled.
export interface AIProvider {
  suggest(input: {
    brief: ProjectBrief;
    explicitConsent: true;
  }): Promise<{ suggestions: string[] }>;
}

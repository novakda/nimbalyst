// @vitest-environment node
/**
 * Bisect probe: does a custom tracker-type YAML still project into a model?
 *
 * Kept OUTSIDE the repo and copied in by the bisect wrapper, because
 * `git bisect run` checks the working tree out from under anything inside it.
 *
 * Asserts the shape of the lab's `strip` type — a defaultless priority select,
 * a self-referencing relationship, and a declared `tags` role — because those
 * are the parts a schema loader is most likely to reject.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSchemaModelFromContent } from '../trackerSchemaProjection';

const YAML_PATH =
  process.env.NIMB_YAML ?? '/mnt/c/main/nimbalyst-lab/.nimbalyst/trackers/strip.yaml';

describe('custom tracker type YAML projection', () => {
  it('projects strip.yaml into a usable model', () => {
    const content = readFileSync(YAML_PATH, 'utf8');
    const model = resolveSchemaModelFromContent('strip.yaml', content) as any;

    expect(model?.type).toBe('strip');

    const fieldNames: string[] = (model.fields ?? []).map((f: any) => f.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'title',
        'status',
        'priority',
        'lane',
        'pai_id',
        'waiting_on',
        'held_since',
        'receipt',
        'parent',
        'tags',
      ]),
    );

    // Roles are what the board reads; the tag axis resolves through roles.tags.
    expect(model.roles?.workflowStatus).toBe('status');
    expect(model.roles?.tags).toBe('tags');

    // A priority select with NO default is the whole point of the lab type —
    // if a loader silently injects one, the unset state stops being expressible.
    const priority = (model.fields ?? []).find((f: any) => f.name === 'priority');
    expect(priority?.type).toBe('select');
    expect(priority?.default).toBeUndefined();

    // Self-referencing relationship: the most likely thing a loader rejects.
    const parent = (model.fields ?? []).find((f: any) => f.name === 'parent');
    expect(parent?.type).toBe('relationship');
    expect(parent?.targetTrackerTypes).toContain('strip');
  });
});

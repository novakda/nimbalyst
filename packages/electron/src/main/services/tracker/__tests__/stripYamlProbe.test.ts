// @vitest-environment node
/**
 * Bisect probe: does a custom tracker-type YAML still project into a model?
 *
 * The fixture is inline so the test is self-contained in any checkout (it used to read an
 * absolute path from an env var, which made it unrunnable anywhere but the author's machine).
 *
 * Asserts the shape of the lab's `strip` type — a defaultless priority select,
 * a self-referencing relationship, and a declared `tags` role — because those
 * are the parts a schema loader is most likely to reject.
 */
import { describe, expect, it } from 'vitest';
import { resolveSchemaModelFromContent } from '../trackerSchemaProjection';

const STRIP_YAML = `type: strip
displayName: Strip
displayNamePlural: Strips
icon: flight
color: "#2563eb"

modes:
  inline: true
  fullDocument: true

sharing: personal
draftByDefault: false

idPrefix: strip
idFormat: ulid

fields:
  - name: title
    type: string
    required: true

  # Custody — where the work is in its own lifecycle.
  # queued  = at the gate, never departed, costs nothing
  # holding = airborne and stuck, costs attention every re-read
  - name: status
    type: select
    default: queued
    options:
      - value: queued
        label: At the gate
        icon: flight_takeoff
      - value: active
        label: Airborne
        icon: flight
        color: "#3b82f6"
      - value: holding
        label: Holding
        icon: motion_photos_pause
        color: "#f97316"
      - value: review
        label: On approach
        icon: rate_review
      - value: done
        label: Landed
        icon: check_circle
        color: "#22c55e"
      - value: dropped
        label: Cancelled
        icon: cancel

  # NO default, deliberately: an untriaged strip and a deliberately
  # deprioritised one must be distinguishable. Filter with "is empty".
  - name: priority
    type: select
    options:
      - value: p5
        label: 5 - drop other things
        color: "#dc2626"
      - value: p4
        label: 4 - important
      - value: p3
        label: 3 - normal
      - value: p2
        label: 2 - no urgency
      - value: p1
        label: 1 - someday

  # The company. Present as a FIELD here so you can confirm it is filterable
  # but NOT available as a board column axis. The groupable copy is the
  # "lane:<slug>" entry in tags.
  - name: lane
    type: select
    options:
      - value: job-system
        label: job-system
      - value: bankruptcy
        label: bankruptcy
      - value: pai-general
        label: pai-general
      - value: servicenow
        label: servicenow
      - value: career-tooling
        label: career-tooling
      - value: learning
        label: learning

  # External identity. Issue keys are server-minted and cannot carry an
  # outside id, so the id lives in a plain field.
  - name: pai_id
    type: number

  # Why it is holding. A reason, not a stage — deliberately its own axis.
  - name: waiting_on
    type: string

  - name: held_since
    type: date

  # The handwriting. This is the field that makes a strip a state save
  # rather than a table row.
  - name: receipt
    type: text

  - name: parent
    type: relationship
    relationshipTypeKey: child-of
    inverseRelationshipTypeKey: parent-of
    inverseFieldId: children
    targetTrackerTypes:
      - strip
    multiValue: false
    allowSelfLink: false

  - name: tags
    type: array
    itemType: string
    displayInline: false

inlineTemplate: "{icon} {title} {status} {priority}"

roles:
  title: title
  workflowStatus: status
  priority: priority
  tags: tags
`;

describe('custom tracker type YAML projection', () => {
  it('projects strip.yaml into a usable model', () => {
    const model = resolveSchemaModelFromContent('strip.yaml', STRIP_YAML) as any;

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

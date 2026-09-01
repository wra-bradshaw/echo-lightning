import { describe, expect, it } from 'vitest';
import { createPlayerSession } from './session';

describe('PlayerSession', () => {
  it('owns one disposable lifecycle and ignores repeated disposal', () => {
    const events: string[] = [];
    const session = createPlayerSession({
      onStart: () => events.push('start'),
      onStop: (reason) => events.push(reason),
    });

    session.start();
    session.stop('ended');
    session.stop('stale');
    session.dispose();

    expect(events).toEqual(['start', 'ended']);
  });
});

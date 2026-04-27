export type GamePageNextHandPlan =
  | {
      kind: 'direct';
    }
  | {
      kind: 'reshuffle';
      drawAfterReshuffle: number;
      discardAfterReshuffle: number;
    };

/**
 * Resolves whether advancing to the next hand can happen directly or must pass
 * through the reshuffle presentation first.
 *
 * The returned counts are presentation targets for the reshuffle sidebar
 * animation, not a replacement for the real store transition.
 */
export function resolveNextHandPlan(params: {
  drawBefore: number;
  discardBefore: number;
  handSize: number;
  freshDeckSize: number;
  forceReshuffle: boolean;
}): GamePageNextHandPlan {
  const actualReshuffle = params.drawBefore < params.handSize;
  const reshuffleNeeded = actualReshuffle || params.forceReshuffle;

  if (!reshuffleNeeded) {
    return { kind: 'direct' };
  }

  return {
    kind: 'reshuffle',
    // A debug-forced reshuffle may still show the reshuffle presentation, but
    // it must not fake final counter values that won't exist in store state.
    drawAfterReshuffle: actualReshuffle
      ? Math.max(0, params.freshDeckSize + params.drawBefore + params.discardBefore)
      : params.drawBefore,
    discardAfterReshuffle: actualReshuffle ? 0 : params.discardBefore,
  };
}

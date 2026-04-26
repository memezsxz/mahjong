export type GamePageNextHandPlan =
  | {
      kind: 'direct';
    }
  | {
      kind: 'reshuffle';
      drawAfterReshuffle: number;
      discardAfterReshuffle: number;
    };

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
      ? Math.max(
          0,
          params.freshDeckSize + params.drawBefore + params.discardBefore,
        )
      : params.drawBefore,
    discardAfterReshuffle: actualReshuffle ? 0 : params.discardBefore,
  };
}

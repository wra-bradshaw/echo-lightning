import { useLayoutEffect } from 'react';

type MediaAudioGraph = {
  context: AudioContext;
  gain: GainNode;
  source: MediaElementAudioSourceNode;
};

type AudioContextWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const mediaAudioGraphs = new WeakMap<HTMLMediaElement, MediaAudioGraph>();
let sharedAudioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (sharedAudioContext) return sharedAudioContext;
  if (typeof window === 'undefined') return undefined;

  const audioContextWindow = window as AudioContextWindow;
  const AudioContextConstructor = audioContextWindow.AudioContext ?? audioContextWindow.webkitAudioContext;
  if (!AudioContextConstructor) return undefined;

  try {
    sharedAudioContext = new AudioContextConstructor();
    return sharedAudioContext;
  } catch {
    return undefined;
  }
}

function getMediaAudioGraph(media: HTMLMediaElement): MediaAudioGraph | undefined {
  const existingGraph = mediaAudioGraphs.get(media);
  if (existingGraph) return existingGraph;

  const context = getAudioContext();
  if (!context) return undefined;

  try {
    const source = context.createMediaElementSource(media);
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(context.destination);
    const graph = { context, gain, source };
    mediaAudioGraphs.set(media, graph);
    return graph;
  } catch {
    return undefined;
  }
}

function applyMediaVolume(media: HTMLMediaElement, volume: number): void {
  const safeVolume = Number.isFinite(volume) ? Math.max(0, volume) : 0;
  media.volume = Math.min(1, safeVolume);

  const graph = safeVolume > 1 ? getMediaAudioGraph(media) : mediaAudioGraphs.get(media);
  if (!graph) return;

  graph.gain.gain.value = safeVolume > 1 ? safeVolume : 1;
  if (safeVolume > 1 && graph.context.state === 'suspended') void graph.context.resume().catch(() => undefined);
}

function releaseMediaAudioGraph(media: HTMLMediaElement): void {
  const graph = mediaAudioGraphs.get(media);
  if (!graph) return;

  graph.source.disconnect();
  graph.gain.disconnect();
  mediaAudioGraphs.delete(media);
}

export function useMediaVolume(media: HTMLMediaElement | null, volume: number): void {
  useLayoutEffect(() => {
    return () => {
      if (media) releaseMediaAudioGraph(media);
    };
  }, [media]);

  useLayoutEffect(() => {
    if (media) applyMediaVolume(media, volume);
  }, [media, volume]);
}

import Hls from 'hls.js';

export type HlsSource = { src: string; type?: string };

export class HlsMediaController {
  private instance?: Hls;
  private media?: HTMLMediaElement;

  static isSupported(): boolean {
    return Hls.isSupported();
  }

  attach(media: HTMLMediaElement): void {
    this.destroy();
    this.media = media;
    if (Hls.isSupported()) {
      this.instance = new Hls({ enableWorker: true, lowLatencyMode: false });
      this.instance.attachMedia(media);
    }
  }

  load(source: HlsSource): void {
    if (!this.media) throw new Error('Attach a media element before loading HLS.');
    if (this.instance) this.instance.loadSource(source.src);
    else if (this.media.canPlayType(source.type ?? 'application/vnd.apple.mpegurl')) this.media.src = source.src;
  }

  destroy(): void {
    this.instance?.destroy();
    this.instance = undefined;
    this.media = undefined;
  }
}

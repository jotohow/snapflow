export class TimerService {
  private startTime?: number;
  private elapsedSeconds = 0;
  private interval?: NodeJS.Timeout;
  private isRunning = false;
  private onTick?: (elapsedSeconds: number) => void;

  constructor(onTick?: (elapsedSeconds: number) => void) {
    this.onTick = onTick;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now() - this.elapsedSeconds * 1000;

    this.interval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime!) / 1000);
      this.onTick?.(this.elapsedSeconds);
    }, 1000);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  reset(): void {
    this.stop();
    this.elapsedSeconds = 0;
    this.startTime = undefined;
  }

  getElapsedTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  destroy(): void {
    this.stop();
    this.onTick = undefined;
  }
}

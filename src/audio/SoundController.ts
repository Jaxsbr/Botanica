type SoundType = 'plant' | 'harvest' | 'build';

const SOUND_FREQUENCIES: Record<SoundType, number> = {
    plant: 540,
    harvest: 660,
    build: 420
};

const SOUND_DURATION_MS = 120;

export class SoundController {
    private audioContext: AudioContext | null = null;
    private unlocked = false;

    public async unlock(): Promise<void> {
        if (this.unlocked) {
            return;
        }

        const context = this.getContext();
        // Trigger a silent buffer to unlock audio on user interaction.
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        this.unlocked = true;
    }

    public play(type: SoundType): void {
        const context = this.getContext();

        if (!this.unlocked) {
            // Attempt to unlock with best effort; browsers may block until user gesture.
            void this.unlock();
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = SOUND_FREQUENCIES[type];

        gainNode.gain.value = 0.0001;
        gainNode.gain.setTargetAtTime(0.12, context.currentTime, 0.01);
        gainNode.gain.setTargetAtTime(0.0001, context.currentTime + SOUND_DURATION_MS / 1000, 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + 0.32);
    }

    public dispose(): void {
        if (!this.audioContext) {
            return;
        }

        this.audioContext.close();
        this.audioContext = null;
        this.unlocked = false;
    }

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        return this.audioContext;
    }
}


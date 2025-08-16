export class Spinner {
    private currentFrame: number = 0;

    private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    private intervalId?: Timer;

    private message?: string;

    private speed: number = 100;

    public done(doneMessage?: string): void {
        this.stop(doneMessage);
    }

    public doneWithWarning(doneMessage?: string): void {
        this.stop(doneMessage, 'warning');
    }

    public fail(message: string): void {
        this.stop(message, 'fail');
    }

    public setMessage(message: string): void {
        this.message = message;
    }

    public start(message: string): void {
        if (this.intervalId) {
            return;
        }

        this.message = message;

        console.write('\u001B[?25l'); // Hide cursor

        this.intervalId = setInterval(() => {
            console.write(
                `\r\u001B[36m   ${this.frames[this.currentFrame]}\u001B[0m ${
                    this.message
                }\u001B[0m`,
            );
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }, this.speed);
    }

    private stop(message?: string, status: 'fail' | 'success' | 'warning' = 'success'): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.write('\r\u001B[K'); // Clear line
            console.write('\u001B[?25h'); // Show cursor
            if (message) {
                if (status === 'fail') {
                    console.write(`\u001B[31m   ✗ ${message}\u001B[0m\n`);
                    return;
                }

                if (status === 'warning') {
                    console.write(`\u001B[33m   ⚠ ${message}\u001B[0m\n`);
                    return;
                }

                console.write(`\u001B[32m   ✓\u001B[0m ${message}\n`);
            }
        }
    }
}

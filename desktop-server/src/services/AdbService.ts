import { exec } from 'child_process';

export class AdbService {
    private retryInterval: number = 2000; // Check every 2 seconds
    private isForwarding: boolean = false;

    constructor() {}

    public setupForwarding(): void {
        console.log('Starting ADB Forwarding service...');
        this.runForwardCommand();
    }

    private runForwardCommand(): void {
        const command = 'adb forward tcp:12345 localabstract:mlbs_ipc';

        exec(command, (error, stdout, stderr) => {
            const wasForwarding = this.isForwarding;
            this.isForwarding = !error;

            if (this.isForwarding && !wasForwarding) {
                console.log('ADB forwarding is active. Waiting for device connection...');
            } else if (!this.isForwarding && wasForwarding) {
                console.error('ADB connection lost. Will keep trying to reconnect...');
            }
            
            // Always schedule the next check to handle device disconnections and reconnections.
            setTimeout(() => this.runForwardCommand(), this.retryInterval);
        });
    }
}

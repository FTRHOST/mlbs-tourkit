"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdbService = void 0;
const child_process_1 = require("child_process");
class AdbService {
    retryInterval = 2000;
    isForwarding = false;
    constructor() { }
    setupForwarding() {
        this.runForwardCommand();
    }
    runForwardCommand() {
        const command = 'adb forward tcp:12345 localabstract:mlbs_ipc';
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`ADB Forwarding failed: ${error.message}`);
                console.log(`Retrying in ${this.retryInterval / 1000} seconds...`);
                this.isForwarding = false;
                setTimeout(() => this.runForwardCommand(), this.retryInterval);
                return;
            }
            if (stderr) {
                console.error(`ADB Stderr: ${stderr}`);
                // Sometimes stderr acts as info, but often it's an error.
                // We'll treat it as a potential failure if it wasn't already caught by 'error'.
                // However, adb often prints to stderr for info.
                // Let's assume if 'error' is null, it might be fine, but we'll log it.
            }
            if (!this.isForwarding) {
                console.log('ADB Forwarding setup successful (tcp:12345 -> localabstract:mlbs_ipc)');
                this.isForwarding = true;
            }
            // Periodically check or re-apply?
            // The instruction says "If failed, try again every 2 seconds".
            // Once successful, we usually don't need to loop unless the device disconnects.
            // But to be robust against disconnects, we could verify or just catch errors elsewhere.
            // For now, let's implement a simple "Keep Alive" or just relying on the initial success.
            // However, typically if the device disconnects, the forward rule might be lost.
            // Let's verify periodically or just wait.
            // The requirement implies: "Add retry mechanism: If failed, try again every 2 seconds (useful when HP is new plugged in)."
            // To be robust, let's check periodically if the device is attached?
            // Or just try to run the forward command periodically if we want to be super persistent.
            // But let's stick to the "If failed" part.
            // Note: If adb server is killed or device unplugged, the forward might need re-applying.
            // Let's schedule a re-run every few seconds just to be safe/ensure it sticks?
            // Or better, just let it be. If the socket connection in GameListener fails, maybe we can trigger this?
            // But GameListener is separate.
            // Let's just implement the loop on failure as requested.
        });
    }
}
exports.AdbService = AdbService;
//# sourceMappingURL=AdbService.js.map
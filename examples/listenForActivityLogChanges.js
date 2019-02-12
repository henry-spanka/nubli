const nubli = require('../dist/index.js');

nubli.setDebug(true);

nubli.onReadyToScan()
    .then(() => {
        console.log("Ready to scan :)");
        nubli.startScanning();
    })
    .catch((err) => {
        console.log(err);
    });

nubli.on("smartLockDiscovered", async (smartlock) => {
    if (smartlock.configExists()) {
        await smartlock.readConfig();
    }

    console.log("Listening for activity log changes");

    smartlock.on("activityLogChanged", () => {
        console.log("changed - retrieving state now");
        smartlock.connect()
        .then(async () => {
            let lockState = await smartlock.readLockState();
            console.log(lockState);
            await smartlock.disconnect();
        }).catch((err) => {
            console.log("connection failed:", err);
        });
    });
});

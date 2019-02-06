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

    console.log("Listening for changes");

    smartlock.on("stateChanged", () => {
        smartlock.connect()
        .then(async () => {
            let lockState = await smartlock.readLockState();
            console.log(lockState);
            await smartlock.disconnect();
        });
    });
});

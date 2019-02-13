const nubli = require('../dist/index.js').default;

nubli.setDebug(true);

nubli.onReadyToScan()
    .then(() => {
        console.log("Ready to scan :)");
        nubli.startActiveScanning();
    })
    .catch((err) => {
        console.log(err);
    });

nubli.on("smartLockDiscovered", (smartlock) => {
    nubli.stopScanning();

    smartlock.on("connected", () => {
        console.log("connected");
    });

    smartlock.connect()
        .then(async () => {
            if (smartlock.configExists()) {
                await smartlock.readConfig();
            }

            if (smartlock.paired) {
                console.log("already paired");
                smartlock.disconnect();
            } else {
                smartlock.pair()
                    .then(async () => {
                        console.log("successfully paired");
                        await smartlock.saveConfig(nubli.configPath);
                        smartlock.disconnect();
                    })
                    .catch((error) => {
                        console.log("Pairing unsuccessful - error message: " + error);
                    });
                }
        });
});

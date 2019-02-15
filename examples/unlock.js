const nubli = require('../dist/index.js').default;

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
    nubli.stopScanning();

    smartlock.on("connected", () => {
        console.log("connected");
    });

    if (smartlock.configExists()) {
        await smartlock.readConfig();
    }

    smartlock.connect()
        .then(async () => {
            if (smartlock.paired) {
                console.log("Good we're paired");
                let lockState = await smartlock.unlock((response) => {
                    console.log(response);
                });
                console.log(lockState);
            } else {
                console.log("Pair first :(");
            }

            await smartlock.disconnect();
            process.exit(0);
        });
});

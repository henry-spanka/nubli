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
                console.log("Good we're paired");
                let lockState = await smartlock.readLockState();
                console.log(lockState);
                
                smartlock.disconnect();
            } else {
                console.log("Pair first :(");
                smartlock.disconnect();
            }
        });
});

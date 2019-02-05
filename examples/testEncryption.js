const Credentials = require("../dist/lib/credentials");

let smartLockPublicKey = new Buffer("2FE57DA347CD62431528DAAC5FBB290730FFF684AFC4CFC2ED90995F58CB3B74", "hex");
let publicKey = new Buffer("F88127CCF48023B5CBE9101D24BAA8A368DA94E8C2E3CDE2DED29CE96AB50C15", "hex");
let privateKey = new Buffer("8CAA54672307BFFDF5EA183FC607158D2011D008ECA6A1088614FF0853A5AA07", "hex");

let credentials = new Credentials.Credentials(publicKey, privateKey, smartLockPublicKey);

setTimeout(() => {
    credentials.generateSharedKey();

    console.log(credentials.serialize());
}, 500);

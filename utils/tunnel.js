const { connect } = require("ngrok");
const tunnel = require('localtunnel');

const createTunnel = async (port, token) => {
    try {
        const localHost = `http://localhost:${port}`;
        const host = await connect({ authtoken: token, addr: localHost })
        console.log(
            `Started tunnel from ${host} to ${localHost}`
        );
        console.log(`Using the host ${host}`);
        return host;
    } catch (err) {
        console.error(`Unable to run the tunnel, reload the server to try again`, err)
        console.warn(`You can still open the application locally: https://localhost:${port}`)
    }
};

const createTunnelV2 = async (port, name) => {
    try {
        const tun = await tunnel({port, subdomain: name});
        console.log(`Using the host ${tun.url}`);
        return tun.url;
    } catch (err) {
        console.error(`Unable to run the tunnel, reload the server to try again`, err)
        console.warn(`You can still open the application locally: https://localhost:${port}`)
    }
}

module.exports = {
    createTunnel,
    createTunnelV2
}
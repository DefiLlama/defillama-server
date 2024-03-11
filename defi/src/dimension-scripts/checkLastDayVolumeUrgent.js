const axios = require('axios');

//public api endpoint
const apiUrl = "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";

axios.get(apiUrl)
    .then(response => {
        const protocols = response.data.protocols || [];

        const problematicProtocols = protocols.filter(protocol => {
            return (
                (protocol.change_1d === null || protocol.change_1d === 0) &&
                protocol.totalVolume7d > 500000
            );
        });

        // Log the names and ids of problematic protocols
        if (problematicProtocols.length > 0) {
            problematicProtocols.forEach(protocol => {
                console.log(`Protocol ID: ${protocol.defillamaId}, Name: ${protocol.name}`);
            });
            console.log(`${problematicProtocols.length} protocols have issues.`);
        } else {
            console.log("All protocols seem to have valid 1d changes.");
        }
    })
    .catch(error => {
        console.error("Error fetching data from the API:", error);
    });
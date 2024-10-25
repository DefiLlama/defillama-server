const axios = require('axios');

//public api endpoint
const apiUrl = "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";

axios.get(apiUrl)
    .then(response => {
        const protocols = response.data.protocols || [];

        // Filter protocols where change_1d is null or 0
        const problematicProtocols = protocols.filter(protocol => {
            return protocol.change_1d === null || protocol.change_1d === 0;
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
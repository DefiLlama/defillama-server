import volumeAdapters from "../../dexAdapters";

export default () => console.log(volumeAdapters.map(va => `// '${va.volumeAdapter}'`).join(', \n'))
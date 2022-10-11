import volumeAdapters from "../../data";

export default () => console.log(volumeAdapters.map(va => `// '${va.volumeAdapter}'`).join(', \n'))
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

export async function draw(configuration:any, {
    width = 800,
    height = 400
}={}) {
    const backgroundColour = 'white'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });
    const image = await chartJSNodeCanvas.renderToBuffer(configuration, `image/png`);
    //return image
    //const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
    //fs.writeFileSync("a.png", image)
    return image
}
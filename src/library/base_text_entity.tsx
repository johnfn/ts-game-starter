import { Texture } from 'pixi.js';
import { FontDataUrl } from './font_data_url';
import { Entity } from './entity';
import { BaseGameState } from './base_state';

// 1. Encode font into dataurl
// 2. Use dataurl in SVG (otherwise you wouldnt be able to refer to the font in the SVG).
// 3. Load the SVG into an image
// 4. Render the image to a canvas
// 5. Use the canvas as a texture for a Sprite

// 6. Waste 30 minutes trying to debug your code only to realize it was because
//    there was a missing ' in font_data_url

export const PIXEL_RATIO = (() => {
  const ctx = document.createElement("canvas").getContext("2d")!,
      dpr = window.devicePixelRatio || 1,
      bsr = (ctx as any).webkitBackingStorePixelRatio ||
            (ctx as any).mozBackingStorePixelRatio ||
            (ctx as any).msBackingStorePixelRatio ||
            (ctx as any).oBackingStorePixelRatio ||
            (ctx as any).backingStorePixelRatio || 1;

  return dpr / bsr;
})();
    
export class BaseTextEntity<T extends BaseGameState> extends Entity {
  canvas        : HTMLCanvasElement;
  context       : CanvasRenderingContext2D;
  protected _html: string;

  constructor(html: string, width: number, height: number) {
    super({
      texture: Texture.WHITE,
      name   : "BaseTextEntity"
    });

    this.sprite.width  = width;
    this.sprite.height = height;

    this._html   = html;
    this.canvas  = this.createHiDPICanvas(this.width, this.height);
    this.context = this.canvas.getContext('2d')!;

    this.buildTextGraphic();
  }

  set html(value: string) {
    if (this._html !== value) {
      this._html = value;

      this.buildTextGraphic()
    }
  }

  update() {};

  // converting woff into dataurl:
  // https://gist.github.com/viljamis/c4016ff88745a0846b94

  // reference used for this insanity: 
  // https://stackoverflow.com/questions/12652769/rendering-html-elements-to-canvas

  private async renderHTMLToCanvas(html: string, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const wrappedHtml = `
      <div style="width: ${ this.width }">
        ${ html }
      </div>
    `;

    const data = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${ width }" height="${ height }">
      <foreignObject width="100%" height="100%">
        <defs>
          <style type="text/css">
            @font-face {
              font-family: FreePixel;
              src: ${ FontDataUrl }
            }
          </style>
        </defs>

        ${ this.htmlToXML(wrappedHtml) }
      
      </foreignObject>
    </svg>`;

    await new Promise(resolve => {
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.drawImage(img, x, y);

        resolve();
      };

      img.src = data;
    });
  }

  private htmlToXML(html: string): string {
    const doc = document.implementation.createHTMLDocument('');

    doc.write(html);

    // You must manually set the xmlns if you intend to immediately serialize     
    // the HTML document to a string as opposed to appending it to a
    // <foreignObject> in the DOM
    doc.documentElement.setAttribute('xmlns', doc.documentElement.namespaceURI!);

    // Get well-formed markup
    html = (new XMLSerializer()).serializeToString(doc.body);

    return html;
  }

  private createHiDPICanvas(w: number, h: number, ratio: number | undefined = undefined) {
    if (ratio === undefined) { 
      ratio = PIXEL_RATIO; 
    }
    
    const can = document.createElement("canvas");

    can.width        = w * ratio;
    can.height       = h * ratio;
    can.style.width  = w + "px";
    can.style.height = h + "px";

    can.getContext("2d")!.setTransform(ratio, 0, 0, ratio, 0, 0);

    return can;
  }

  protected async buildTextGraphic() {
    await this.renderHTMLToCanvas(this._html, this.context, 0, 0, this.width, this.height);

    this.sprite.texture = Texture.from(this.canvas);
    this.sprite.texture.update();
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);

    this.sprite.texture = Texture.from(this.canvas);
    this.sprite.texture.update();
  }
}

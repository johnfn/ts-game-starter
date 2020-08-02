import { BaseTextEntity } from "./base_text_entity";
import { BaseGameState } from "./base_state";

export type TextAlignType = "left" | "right" | "center";

export type TextEntityStyle = {
  color: string;
  fontSize: number;
  align?: TextAlignType;
}

export type TextStyles = {
  [key: string]: TextEntityStyle;
}

export type TextSegment = {
  text: string;
  style: TextEntityStyle;
}

export enum TextSegmentState {
  NormalText,
  IdText,
  StyledText,
}

export const AdvanceState = (currentState: TextSegmentState): TextSegmentState => {
  if (currentState === TextSegmentState.NormalText) {
    return TextSegmentState.IdText;
  } else if (currentState === TextSegmentState.IdText) {
    return TextSegmentState.StyledText;
  } else if (currentState === TextSegmentState.StyledText) {
    return TextSegmentState.NormalText;
  }

  return undefined as any; // stupid typechecker
}

/**
 * Format: 
 * 
 * "%1%This is some red text% normal text %2%blue text!%".
 */
export class TextEntity extends BaseTextEntity<BaseGameState> {
  customStyles: TextStyles;
  defaultStyle: TextEntityStyle;

  public static StandardStyles: TextStyles = {
    1: { color: "white", fontSize: 32, align: "left" },
    2: { color: "cyan", fontSize: 40, align: "left" },
  };

  /**
   * Format: 
   * 
   * "%1%This is some red text% normal text %2%blue text!%".
   */
  constructor({
    text,
    styles = TextEntity.StandardStyles,
    width = 500,
    height = 300,
    color = "white",
    fontSize = 32,
    align = "left",
  }: { text: string; styles?: TextStyles; width?: number; height?: number; color?: string; fontSize?: number; align?: TextAlignType }) {
    super("", width, height);

    this.defaultStyle = { color, fontSize, align };
    this.customStyles = styles;
    this.setText(text);
  }

  setText(text: string): void {
    if (text === "") {
      this.html = "";

      return;
    }
    const textSegments = this.buildTextSegments(text);

    const html = textSegments.map(segment => {
      return (
        `<span 
          style="
            color: ${ segment.style.color}; 
            font-family: FreePixel; 
            text-align: ${ segment.style.align || "left"};
            font-size: ${ segment.style.fontSize}px;"
        >${ segment.text}</span>`
      );
    }).join("").replace(/\n/g, "");

    this.html = html;
  }

  set color(color: string) {
    this.defaultStyle = { ...this.defaultStyle, color: color }
  }

  // TODO: This is a hard function to write properly.
  // This only works after the CSS has loaded 
  calculateTextWidth = (text: string) => {
    const canvas = document.getElementById("canvas2d")! as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    context.font = `${this.defaultStyle.fontSize}px FreePixel`;
    const calculatedWidth = context.measureText(text).width;

    return calculatedWidth;
  };

  buildTextSegments(text: string): TextSegment[] {
    let i = 0;
    const readChar = () => text[i++];
    let state = TextSegmentState.NormalText;

    const segments: TextSegment[] = [{
      text: "",
      style: this.defaultStyle,
    }];

    let id = "";

    while (i < text.length) {
      const ch = readChar();

      if (ch === "%") {
        if (state === TextSegmentState.NormalText) {
          id = "";
        } else if (state === TextSegmentState.IdText) {
          segments.push({
            text: "",
            style: this.customStyles[id],
          });
        } else if (state === TextSegmentState.StyledText) {
          segments.push({
            text: "",
            style: this.defaultStyle,
          });
        }

        state = AdvanceState(state);

        continue;
      } else {
        if (state === TextSegmentState.NormalText) {
          segments[segments.length - 1].text += ch;
        } else if (state === TextSegmentState.IdText) {
          id += ch;
        } else if (state === TextSegmentState.StyledText) {
          segments[segments.length - 1].text += ch;
        }
      }
    }

    return segments.filter(segment => segment.text.trim() !== "");
  }

  // public set width(value: number) {
  //   this.sprite.width = value;
  //   // this.buildTextGraphic();
  // }

  // public set height(value: number) {
  //   this.sprite.width = value;
  //   // this.buildTextGraphic();
  // }

}
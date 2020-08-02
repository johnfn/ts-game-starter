export interface TiledTileLayerChunkJSON {
  data: number[];
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface TiledTileLayerJSON {
  chunks: TiledTileLayerChunkJSON[];
  height: number;
  id: number;
  name: string;
  opacity: number;
  startx: number;
  starty: number;
  offsetx: number;
  offsety: number;
  type: "tilelayer";
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

export interface TiledGroupLayerJSON {
  id: number;
  layers: TiledLayerTypes[];
  name: string;
  opacity: string;
  type: "group";
  visible: boolean;
  x: number;
  y: number;
};

export type TiledPropertiesType = { 
  name: string; 
  type: string; 
  value: string 
}[];

export interface TiledObjectJSON {
  gid?: number;

  properties?: any;
  propertytypes?: { [key: string]: "int" | "string" };
  height: number;
  id: number;
  name: string;
  rotation: number;
  type: any;
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

export interface TiledObjectLayerJSON {
  draworder: "topdown" | "index";
  height   : number;
  name     : string;
  objects  : TiledObjectJSON[];
  opacity  : number;
  visible  : boolean;
  width    : number;
  x        : number;
  y        : number;

  type: "objectgroup";
}

export interface TilesetTilesJSON {
  id          : number;
  objectgroup?: TiledObjectLayerJSON;
  properties ?: {
    name : string;
    type : "string"; // TODO: There are probably others. And yes, the literal string "string".
    value: string;
  }[];
}

export interface TilesetJSON {
  columns    : number;
  firstgid   : number;
  image      : string;
  imageheight: number;
  imagewidth : number;
  margin     : number;
  name       : string;
  spacing    : number;
  tilecount  : number;
  tileheight : number;
  tilewidth  : number;

  tiles     ?: TilesetTilesJSON[];
}

export type TiledLayerTypes = 
  | TiledTileLayerJSON
  | TiledObjectLayerJSON
  | TiledGroupLayerJSON

export interface TiledJSON {
  height: number;
  width : number;
  nextobjectid: number;
  orientation: "orthogonal";
  renderorder: "right-down";
  tileheight: number;
  tilewidth: number;
  version: number;

  layers: TiledLayerTypes[];
  tilesets: TilesetJSON[];
}

export interface Tile {
  x             : number;
  y             : number;
  gid           : number;
  tile          : SpritesheetTile;
  isCollider    : boolean;
  tileProperties: { [key: string]: unknown; };
}

export interface Tileset {
  gidStart: number;
  gidEnd: number;

  name: string;
  imageUrlRelativeToTilemap: string;
  imageUrlRelativeToGame: string;

  imagewidth : number;
  imageheight: number;
  tilewidth  : number;
  tileheight : number;
  tiles      : TilesetTilesJSON[] | undefined;
}

export interface TiledObject {
  tile: SpritesheetTile;

  properties?: { [key: string]: string; };

  height: number;
  width: number;

  x: number;
  y: number;
}

export interface SpritesheetTile {
  imageUrlRelativeToGame: string;
  spritesheetx: number;
  spritesheety: number;
  tilewidth: number;
  tileheight: number
  tileProperties: TilesetTilesJSON[] | undefined;
}

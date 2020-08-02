import { TiledJSON, Tileset, Tile, TiledLayerTypes, TiledTileLayerJSON, TiledObjectLayerJSON, SpritesheetTile } from "./tilemap_types";
import { Grid } from "../data_structures/grid";
import { Rect } from "../geometry/rect";
import { RectGroup } from "../geometry/rect_group";
import { Vector2 } from "../geometry/vector2";
import { TiledTilemap } from "./tilemap";
import { Util } from "../util";

export type TilemapRegion = {
  rect      : Rect;
  properties: { [key: string]: string };
}

export type TilemapLayer = 
  | {
    type: "tiles";
    grid: Grid<Tile>;
    offset: Vector2;
  } | {
    type : "rects";
    rects: TilemapRegion[];
    offset: Vector2;
  }

export class TilemapData {
  private _data      : TiledJSON;
  private _tileWidth : number;
  private _tileHeight: number;
  private _layers    : { [tilesetName: string]: TilemapLayer };
  private _tilesets  : Tileset[];

  // (should be private, but cant be for organization reasons)
  _gidHasCollision: { [id: number]: boolean } = {};

  constructor(props: { 
    data         : TiledJSON;
    pathToTilemap: string;
  }) {
    const { data, pathToTilemap } = props;

    this._data = data;
    this._tileWidth       = this._data.tilewidth;
    this._tileHeight      = this._data.tileheight;
    this._gidHasCollision = this.buildCollisionInfoForTiles()
    this._tilesets        = this.loadTilesets(pathToTilemap, this._data);
    this._layers          = this.loadTileLayers();
  }

  isGidCollider(gid: number): boolean {
    return this._gidHasCollision[gid] || false;
  }

  getTileWidth(): number {
    return this._tileWidth;
  }

  getTileHeight(): number {
    return this._tileHeight;
  }

  getTilesets(): Tileset[] {
    return this._tilesets;
  }

  private loadTilesets(pathToTilemap: string, json: TiledJSON): Tileset[] {
    const tilesets: Tileset[] = [];

    for (const { image: imageUrlRelativeToTilemap, name, firstgid, imageheight, imagewidth, tileheight, tilewidth, tiles } of json.tilesets) {
      const tileCountInTileset = (imageheight * imagewidth) / (tileheight * tilewidth);
      const imageUrlRelativeToGame = 
        new URL(pathToTilemap + "/" + imageUrlRelativeToTilemap, "http://a").href.slice("http://a".length + 1); // slice off the initial / too

      tilesets.push({
        name,
        imageUrlRelativeToTilemap,
        imageUrlRelativeToGame,
        imagewidth,
        imageheight,
        tilewidth,
        tileheight,
        tiles,

        gidStart: firstgid,
        gidEnd  : firstgid + tileCountInTileset,
      });
    }

    return tilesets;
  }

  private buildCollisionInfoForTiles(): { [key: number]: boolean } {
    // Build a dumb (for now) object of collision ids by just checking if the
    // tile literally has any collision object at all and takes that to mean the
    // entire thing is covered.

    // We could improve this if we want!

    const gidHasCollision: { [id: number]: boolean } = {};

    for (const tileset of this._data.tilesets) {
      if (tileset.tiles) {
        for (const tileAndCollisionObjects of tileset.tiles) {
          if (!tileAndCollisionObjects.objectgroup) {
            continue;
          }

          if (tileAndCollisionObjects.objectgroup.objects.length > 0) {
            gidHasCollision[
              tileAndCollisionObjects.id + tileset.firstgid
            ] = true;
          }
        }
      }
    }

    return gidHasCollision;
  }

  getLayerNames(): string[] {
    return Object.keys(this._layers);
  }

  private getAllLayers(): (TiledTileLayerJSON | TiledObjectLayerJSON)[] {
    return this._getAllLayersHelper(this._data.layers);
  }

  getLayer(layerName: string) {
    return this._layers[layerName];
  }

  /**
   * Returns all layers as a flat array - most notably flattens
   * layer groups, which are nested.
   */
  private _getAllLayersHelper(root: TiledLayerTypes[]): (TiledTileLayerJSON | TiledObjectLayerJSON)[] {
    let result: (TiledTileLayerJSON | TiledObjectLayerJSON)[] = [];

    for (const layer of root) {
      if (layer.type === "group") {
        result = [...result, ...this._getAllLayersHelper(layer.layers)];
      } else {
        result.push(layer);
      }
    }

    return result;
  }

  getAllObjectLayers(): TiledObjectLayerJSON[] {
    const allLayers = this.getAllLayers();
    const objectLayers: TiledObjectLayerJSON[] = [];

    for (const layer of allLayers) {
      if (layer.type === "objectgroup") {
        objectLayers.push(layer);
      }
    }

    return objectLayers;
  }

  private loadTileLayers(): { [layerName: string]: TilemapLayer } {
    const result: { [layerName: string]: TilemapLayer } = {};
    const layers = this.getAllLayers();

    for (const layer of layers) {
      if (layer.type === "tilelayer") {
        const grid = this.loadTiles(layer);

        result[layer.name] = { 
          type: "tiles",
          grid,
          offset: new Vector2(layer.offsetx, layer.offsety),
        };
      } else if (layer.type === "objectgroup") {
        result[layer.name] = this.loadRectLayer(layer);
      }
    }

    return result;
  }

  loadRectLayer(layer: TiledObjectLayerJSON): TilemapLayer {
    const objects = layer.objects;
    const rects: TilemapRegion[] = [];

    for (const obj of objects) {
      if (!obj.gid) {
        rects.push({
          rect: new Rect({
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
          }),
          properties: TiledTilemap.ParseTiledProperties(obj.properties) || {},
        });
      }
    }

    return {
      type : "rects",
      rects: rects,
      offset: Vector2.Zero,
    };
  }

  private loadTiles(layer: TiledTileLayerJSON): Grid<Tile> {
    const result = new Grid<Tile>();
    const { chunks } = layer;

    // TODO: If the world gets very large, loading in all chunks like this might
    // not be the best idea - lazy loading could be better.

    for (const chunk of chunks) {
      for (let i = 0; i < chunk.data.length; i++) {
        const gid = chunk.data[i];

        if (gid === 0) { continue; } // empty
        if (gid > 200000) { throw new Error("???"); } // tiled bug? (TODO: does this actually happen?)

        const relTileX = (i % chunk.width);
        const relTileY = Math.floor(i / chunk.width);

        if (isNaN(layer.offsetx)) layer.offsetx = 0; // TODO this is indicative of a tmx tileset embed, which we dont support yet
        if (isNaN(layer.offsety)) layer.offsety = 0;

        const offsetX = layer.offsetx / this._tileWidth;
        const offsetY = layer.offsety / this._tileHeight;

        if (offsetX !== Math.floor(offsetX) || offsetY !== Math.floor(offsetY)) {
          throw new Error("AAAAAAAAAAAAAAAAAAAAAAAAA");
        }

        const absTileX = relTileX + chunk.x + offsetX;
        const absTileY = relTileY + chunk.y + offsetY;

        const { spritesheet, tileProperties } = this.gidInfo(gid);

        // TODO: Merge instance properties and tileset properties...

        result.set(absTileX, absTileY, {
          x             : absTileX * this._tileWidth  + layer.offsetx,
          y             : absTileY * this._tileHeight + layer.offsety,
          tile          : spritesheet,
          isCollider    : this.isGidCollider(gid),
          tileProperties: tileProperties,
          gid           : gid,
        });
      }
    }

    return result;
  }

  gidInfo(gid: number): {
    spritesheet   : SpritesheetTile;
    tileProperties: { [key: string]: unknown };
  } {
    for (const { gidStart, gidEnd, imageUrlRelativeToGame, imagewidth, tilewidth, tileheight, tiles } of this._tilesets) {
      if (gid >= gidStart && gid < gidEnd) {
        const normalizedGid = gid - gidStart;
        const tilesWide     = imagewidth / tilewidth;

        const x = (normalizedGid % tilesWide);
        const y = Math.floor(normalizedGid / tilesWide);

        const spritesheet = {
          imageUrlRelativeToGame,
          spritesheetx: x,
          spritesheety: y,
          tilewidth,
          tileheight,
          tileProperties: tiles,
        };

        let tileProperties: { [key: string]: unknown } = {};

        if (tiles) {
          const matchedTileInfo = tiles.find(tile => gid === gidStart + tile.id);

          if (matchedTileInfo && matchedTileInfo.properties) {
            for (const { name, value } of matchedTileInfo.properties) {
              tileProperties[name] = value;
            }
          }
        }

        return {
          spritesheet,
          tileProperties,
        };
      }
    }

    throw new Error("gid out of range. ask gabby what to do?!?");
  }

  public getTilesAtAbsolutePosition(x: number, y: number): Tile[] {
    return this.getLayerNames()
      .map(layerName => this.getTileAtAbsolutePositionForLayer(x, y, layerName))
      .filter(x => x) as Tile[];
  }

  public getTileAtAbsolutePositionForLayer(x: number, y: number, layerName: string): Tile | null {
    const tileWidth  = this._tileWidth;
    const tileHeight = this._tileHeight;

    const layer = this._layers[layerName];

    if (layer.type === "tiles") {
      return layer.grid.get(
        Math.floor(x / tileWidth),
        Math.floor(y / tileHeight)
      );
    }

    return null;
  }

  getCollidersInRegion(region: Rect): Rect[] {
    return Util.FlattenByOne(this.getLayerNames().map(layerName => this.getCollidersInRegionForLayer(region, layerName).getRects()));
  }

  getCollidersInRegionForLayer(region: Rect, layerName: string): RectGroup {
    const lowX = Math.floor(region.x / this._tileWidth);
    const lowY = Math.floor(region.y / this._tileHeight);

    const highX = Math.ceil(region.right  / this._tileWidth);
    const highY = Math.ceil(region.bottom / this._tileHeight);

    let colliders: Rect[] = [];

    for (let x = lowX; x <= highX; x++) {
      for (let y = lowY; y <= highY; y++) {
        const tile = this.getTileAtAbsolutePositionForLayer(
          x * this._tileWidth, 
          y * this._tileHeight,
          layerName
        );
        
        if (tile && tile.isCollider) {
          colliders.push(new Rect({
            x: x * this._tileWidth,
            y: y * this._tileHeight,
            width: this._tileWidth,
            height: this._tileHeight,
          }));
        }
      }
    }

    return new RectGroup(colliders);
  }
}
import { Sprite, Renderer, RenderTexture } from 'pixi.js'
import { Rect } from '../geometry/rect'
import { TiledJSON } from './tilemap_types';
import { TextureCache } from '../texture_cache';
import { Entity } from '../entity';
import { TiledTilemapObjects, TilemapCustomObjects, ObjectInfo } from './tilemap_objects'
import { TilemapData, TilemapRegion } from './tilemap_data';
import { Assets } from '../../game/assets';
import { TypesafeLoader } from '../typesafe_loader';

export type MapLayer = {
  layerName: string;
  entity: Entity;
  objectLayer: boolean;
};

// TODO: Handle the weird new file format where tilesets link to ANOTHER json file

export class TiledTilemap {
  private _tileWidth: number;
  private _tileHeight: number;
  private _renderer: Renderer;
  private _objects: TiledTilemapObjects;
  private _assets: TypesafeLoader<any>;

  _data: TilemapData;

  constructor({ json: data, renderer, pathToTilemap, customObjects, assets }: {
    // this is required to calculate the relative paths of the tileset images.
    json: TiledJSON;
    renderer: Renderer;
    pathToTilemap: string;
    customObjects: TilemapCustomObjects[];
    assets: TypesafeLoader<any>;
  }) {
    this._data = new TilemapData({ data, pathToTilemap });
    this._renderer = renderer;
    this._tileWidth = this._data.getTileWidth();
    this._tileHeight = this._data.getTileHeight();
    this._assets = assets;

    this._objects = new TiledTilemapObjects({
      layers: this._data.getAllObjectLayers(),
      customObjects: customObjects,
      map: this,
      assets: Assets,
    });
  }

  /**
   * Load all the regions on a specified layer.
   */
  loadRegionLayer(layerName: string): TilemapRegion[] {
    const layer = this._data.getLayer(layerName);

    if (layer.type === "rects") {
      return layer.rects;
    }

    throw new Error("Not a rect layer");
  }

  private cache: { [key: string]: MapLayer[] } = {};

  public loadLayersInRectCached(region: Rect): MapLayer[] {
    // for (const k of Object.keys(this.cache)) {
    //   const obj = this.cache[k]

    //   for (const l of obj) {
    //     if (l.entity.texture) {
    //       l.entity.texture.destroy();
    //     }

    //     l.entity.parent?.removeChild(l.entity);
    //   }
    // }

    // this.cache = {};

    const hash = region.toString();

    if (!this.cache[hash]) {
      this.cache[hash] = this.loadLayersInRect(region);
    }

    return this.cache[hash];
  }

  private loadLayersInRect(region: Rect): MapLayer[] {
    let tileLayers: MapLayer[] = [];

    // Load tile layers

    for (const layerName of this._data.getLayerNames()) {
      const layer = this._data.getLayer(layerName);
      if (layer.type !== "tiles") { continue; }

      const renderTexture = RenderTexture.create({
        width: Math.ceil(region.width),
        height: Math.ceil(region.height),
      });

      const tileWidth = this._tileWidth;
      const tileHeight = this._tileHeight;

      const iStart = region.x / tileWidth;
      const jStart = region.y / tileHeight;

      if (iStart !== Math.floor(iStart) || jStart !== Math.floor(jStart)) {
        throw new Error("x and y of passed in region aren't divisible by tileWidth/height")
      }

      for (let i = region.x / tileWidth; i < region.right / tileWidth; i++) {
        for (let j = region.y / tileHeight; j < region.bottom / tileHeight; j++) {
          const tile = layer.grid.get(i, j);

          if (!tile) { continue; }

          const tex = TextureCache.GetTextureForTile({ assets: this._assets, tile });
          const sprite = new Sprite(tex);

          // We have to offset here because we'd be drawing outside of the
          // bounds of the RenderTexture otherwise.

          sprite.x = (tile.x - region.x - layer.offset.x);
          sprite.y = (tile.y - region.y - layer.offset.y);

          this._renderer.render(sprite, renderTexture, false);
        }
      }

      const layerEntity = new Entity({
        texture: renderTexture,
        name: layerName,
      });

      layerEntity.x = region.x;
      layerEntity.y = region.y;
      layerEntity.width = region.width;
      layerEntity.height = region.height;

      tileLayers.push({
        entity: layerEntity,
        layerName,
        objectLayer: false,
      });
    }

    // Load object layers
    // TODO: only load objects in this region - not the entire layer!!!

    const objectLayers = this._objects.loadObjectLayers();

    for (const objectLayer of objectLayers) {
      objectLayer.entity.zIndex = 5; // TODO
    }

    for (const tileLayer of tileLayers) {
      tileLayer.entity.zIndex = 0;
    }

    tileLayers = [...tileLayers, ...objectLayers];

    return tileLayers;
  }

  turnOffAllObjects() {
    this._objects.turnOffAllObjects();
  }

  getAllObjects(): ObjectInfo[] {
    return this._objects.getAllObjects();
  }

  public static ParseTiledProperties(properties: { name: string; type: string; value: string }[] | undefined): { [key: string]: string } {
    const result: { [key: string]: string } = {};

    if (properties === undefined) {
      return {};
    }

    for (const obj of properties) {
      result[obj.name] = obj.value;
    }

    return result;
  }
}

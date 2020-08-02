import { Entity } from "../entity";
import { Rect } from "../geometry/rect";
import { TiledObjectLayerJSON, Tile } from "./tilemap_types";
import { TextureCache } from "../texture_cache";
import { Grid } from "../data_structures/grid";
import { Texture } from "pixi.js";
import { TiledTilemap, MapLayer } from "./tilemap";
import { TilemapRegion } from "./tilemap_data";
import { TypesafeLoader } from "../typesafe_loader";

export type GetInstanceTypeProps = {
  layerName: string; 
  x: number; 
  y: number 
}

type TilemapCustomObjectSingle = {
  type            : "single";
  name            : string;
  getInstanceType : (
    tex: Texture, 
    tileProperties: { [key: string]: unknown }, 
    props: GetInstanceTypeProps) => Entity | null;
};

type TilemapCustomObjectGroup = {
  type                 : "group";
  names                : string[];
  getInstanceType      : (tex: Texture) => Entity;
  getGroupInstanceType : (props: GetInstanceTypeProps) => Entity;
};

type TilemapCustomObjectRect = {
  type     : "rect";
  layerName: string;
  process  : (rect: TilemapRegion) => void;
};

export type TilemapCustomObjects = 
  | TilemapCustomObjectGroup
  | TilemapCustomObjectSingle
  | TilemapCustomObjectRect

export type ObjectInfo = { entity: Entity; layerName: string };

export class TiledTilemapObjects {
  private _layers: TiledObjectLayerJSON[];
  private _customObjects: TilemapCustomObjects[];
  private _map: TiledTilemap;

  /**
   * Every custom object in the game.
   */
  private _allObjects: ObjectInfo[] = [];

  private _assets: TypesafeLoader<any>;

  constructor(props: {
    assets       : TypesafeLoader<any>;
    layers       : TiledObjectLayerJSON[];
    customObjects: TilemapCustomObjects[];
    map          : TiledTilemap;
  }) {
    const { layers, customObjects, map } = props;

    this._assets        = props.assets;
    this._layers        = layers;
    this._customObjects = customObjects;
    this._map           = map;

    for (const layer of this._layers) {
      const objectsInLayer = this.loadLayer(layer);

      this._allObjects = [...this._allObjects, ...objectsInLayer];
    }

    this.turnOffAllObjects();
  }

  turnOffAllObjects() {
    for (const customObject of this._allObjects) {
      customObject.entity.stopUpdating();
    }
  }

  loadObjectLayers(): MapLayer[] {
    this.turnOffAllObjects();

    let result: MapLayer[] = [];

    for (const layer of this._layers) {
      result.push({
        entity     : new Entity({ name: layer.name }),
        layerName  : layer.name,
        objectLayer: true,
      });
    }

    for (const object of this._allObjects) {
      const associatedLayer = result.find(obj => obj.layerName === object.layerName)!;

      associatedLayer.entity.addChild(object.entity);
      object.entity.startUpdating();
    }

    return result;
  }

  private loadLayer(layer: TiledObjectLayerJSON): ObjectInfo[] {
    const results: ObjectInfo[] = [];

    type ObjectInGroup = {
      name : string;
      tile : Tile;
      gridX: number;
      gridY: number;
    };

    const objectsToGroup: ObjectInGroup[] = [];

    // Step 0: 
    // Add all single objects

    processNextObject:
    for (const obj of layer.objects) {
      if (!obj.gid) {
        // this is probably a region, so see if we have one of those.

        for (const customObject of this._customObjects) {
          if (customObject.type === "rect" && customObject.layerName === layer.name) {
            customObject.process({
              rect: new Rect({
                  x     : obj.x     ,
                  y     : obj.y     ,
                  width : obj.width ,
                  height: obj.height,
                }),
              properties: TiledTilemap.ParseTiledProperties(obj.properties),
            });

            continue processNextObject;
          }
        }

        throw new Error(`on layer ${ layer.name } at position x: ${ obj.x } and y: ${ obj.y } you have a rect region that's not being processed`);
      }

      const { spritesheet, tileProperties } = this._map._data.gidInfo(obj.gid);
      const objProperties: { [key: string]: unknown } = {};

      for (const { name, value } of (obj.properties || [])) {
        tileProperties[name] = value;
      }

      const allProperties = {
        ...tileProperties,
        ...objProperties,
      };

      let newObj: Entity | null = null;
      let x = obj.x;
      let y = obj.y - spritesheet.tileheight // Tiled pivot point is (0, 1) so we need to subtract by tile height.

      const tile = {
        x             : x,
        y             : y,
        tile          : spritesheet,
        isCollider    : this._map._data._gidHasCollision[obj.gid] || false,
        gid           : obj.gid,
        tileProperties: allProperties,
      };

      const tileName = allProperties.name as string;

      if (tileName === undefined) {
        throw new Error("Custom object needs a tile type");
      }

      const associatedObject = this._customObjects.find(obj => {
        if (obj.type === "single") {
          return obj.name === tileName;
        }

        if (obj.type === "group") {
          return obj.names.includes(tileName);
        }

        return false;
      });

      if (associatedObject === undefined) {
        throw new Error(`Unhandled tile type: ${ tileName }`);
      }

      if (associatedObject.type === "single") {
        if (associatedObject.name === tileName) {
          const spriteTex = TextureCache.GetTextureForTile({ assets: this._assets, tile }); 

          newObj = associatedObject.getInstanceType(spriteTex, allProperties, {
            layerName: layer.name,
            x: tile.x,
            y: tile.y,
          });
        }
      } else if (associatedObject.type === "group") {
        // add to the list of grouped objects, which we will process later.

        if (associatedObject.names.includes(tileName)) {
          objectsToGroup.push({
            name: tileName,
            tile: tile,
            // TODO: We're making an assumption that the size of the objects
            // are all the same. I think this is safe tho?
            gridX: tile.x / obj.width,
            gridY: tile.y / obj.height,
          });
        }
      }

      if (newObj) {
        newObj.x = tile.x;
        newObj.y = tile.y;

        results.push({
          entity   : newObj,
          layerName: layer.name,
        });
      }
    }

    // Find all groups and add them
    // Step 1: Load all objects into grid

    const grid = new Grid<{ obj: ObjectInGroup, grouped: boolean }>();

    for (const objectToGroup of objectsToGroup) {
      grid.set(objectToGroup.gridX, objectToGroup.gridY, {
        obj    : objectToGroup,
        grouped: false,
      });
    }

    // Step 2: BFS from each object to find all neighbors which are part of the
    // group.

    for (const obj of objectsToGroup) {
      const result = grid.get(obj.gridX, obj.gridY);

      if (!result) { throw new Error("Wat"); }

      const { grouped } = result;

      if (grouped) {
        continue;
      }

      // Step 2a: Find all names of objects in that group

      let customObject: TilemapCustomObjectGroup | null = null;

      for (const candidate of this._customObjects) {
        if (candidate.type === "group") {
          if (candidate.names.includes(obj.name)) {
            customObject = candidate;

            break;
          }
        }
      }

      if (customObject === null) {
        throw new Error("HUH!?!?");
      }

      // Step 2: Actually run BFS

      const group: ObjectInGroup[] = [obj];
      const groupEdge: ObjectInGroup[] = [obj];

      while (groupEdge.length > 0) {
        const current = groupEdge.pop()!;
        const dxdy = [
          [ 1,  0],
          [-1,  0],
          [ 0 , 1],
          [ 0 ,-1],
        ];

        for (const [dx, dy] of dxdy) {
          const result = grid.get(current.gridX + dx, current.gridY + dy);

          if (!result) { continue; }

          const { obj: neighbor, grouped } = result;

          if (grouped) { continue; }
          if (group.includes(neighbor)) { continue; }
          if (customObject.names.includes(neighbor.name)) {
            group.push(neighbor);
            groupEdge.push(neighbor);
          }
        }
      }

      // BFS complete; `group` contains entire group.

      for (const obj of group) {
        grid.get(obj.gridX, obj.gridY)!.grouped = true;
      }

      // Find (x, y) of group

      let minTileX = Number.POSITIVE_INFINITY;
      let minTileY = Number.POSITIVE_INFINITY;

      for (const obj of group) {
        minTileX = Math.min(minTileX, obj.tile.x);
        minTileY = Math.min(minTileY, obj.tile.y);
      }

      const groupEntity = customObject.getGroupInstanceType({
        layerName: layer.name,
        x        : minTileX,
        y        : minTileY,
      });

      groupEntity.x = minTileX;
      groupEntity.y = minTileY;

      for (const obj of group) {
        const spriteTex = TextureCache.GetTextureForTile({ assets: this._assets, tile: obj.tile });
        const objEntity = customObject.getInstanceType(spriteTex);

        groupEntity.addChild(objEntity);

        objEntity.x = obj.tile.x - groupEntity.x;
        objEntity.y = obj.tile.y - groupEntity.y;
      }

      results.push({
        entity   : groupEntity,
        layerName: layer.name,
      });
    }

    return results;
  }

  getAllObjects(): ObjectInfo[] {
    return this._allObjects;
  }
}
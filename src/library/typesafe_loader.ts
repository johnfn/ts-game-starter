import { Loader, Texture } from 'pixi.js'
import { AssetsToLoad } from '../game/assets';
import { TilemapData } from './tilemap/tilemap_data';
import { TiledJSON } from './tilemap/tilemap_types';

type AnimationResource = {
  type : "Animation";
  paths: string[];
};

type NormalResource = {
  type: "Image" | "Audio" | "TileMap" | "TileWorld" | "Spritesheet";
  path: string;
};

type IndividualResourceObj = AnimationResource | NormalResource;

type ResourceReturn<T extends string> =
  T extends "Image"       ? Texture :
  T extends "Audio"       ? HTMLAudioElement :
  T extends "TileMap"     ? TiledJSON :
  T extends "TileWorld"   ? object :
  T extends "Spritesheet" ? unknown :
  T extends "Animation"   ? Texture[] :
  never

export type AllResourcesType = { [key: string]: IndividualResourceObj; };

/** 
 * TypeSafe loader is intended to be a wrapper around PIXI.Loader which gives a
 * type-checked getResource() check.
 */
export class TypesafeLoader<Resources extends AllResourcesType> {
  loader: Loader;
  loadComplete: boolean;
  loadCompleteCallbacks: (() => void)[];

  constructor(resourceNames: Resources) {
    this.loadCompleteCallbacks = [];
    this.loader = new Loader();
    this.loadComplete = false;

    this.startStageOneLoading(resourceNames);
  }

  // Stage 1: Load all assets in resources.ts
  private startStageOneLoading = (resources: Resources) => {
    for (const key of Object.keys(resources)) {
      const resource = resources[key];

      if (resource.type === "Animation") {
        for (const path of resource.paths) {
          this.loader.add(path);
        }
      } else {
        this.loader.add(resource.path);
      }
    }

    this.loader.load(this.startStageTwoLoading);
  }

  // Stage 2: Load all assets required by tilemaps - mostly tilesets, I hope!.
  private startStageTwoLoading = () => {
    let allTilemapDependencyPaths: string[] = [];

    for (const resource of Object.keys(AssetsToLoad)) {
      const castedResource = resource as keyof typeof AssetsToLoad;
      const pathToTilemap = resource.substring(0, resource.lastIndexOf("/"))

      if (AssetsToLoad[castedResource].type === "TileMap") {
        const tilemapData = new TilemapData({ 
          data: this.getResource(castedResource) as TiledJSON, 
          pathToTilemap, 
        });

        allTilemapDependencyPaths = allTilemapDependencyPaths.concat(
          tilemapData.getTilesets().map(tileset => tileset.imageUrlRelativeToGame)
        );
      }
    }

    for (const tilemapDependencyPath of allTilemapDependencyPaths) {
      if (!this.loader.resources[tilemapDependencyPath]) {
        this.loader.add(tilemapDependencyPath);
      }
    }

    this.loader.load(this.finishLoading);
  }

  getResource<T extends keyof typeof AssetsToLoad>(resourceName: T): ResourceReturn<(typeof AssetsToLoad)[T]['type']> {
    const resource = AssetsToLoad[resourceName] as IndividualResourceObj;

    if (resource.type === "Audio") {
      return new Audio(resource.path) as any;
    } else if (resource.type === "Animation") {
      return resource.paths.map(path => this.loader.resources[path].texture) as any;
    } else if (resource.type === "Image") {
      return this.loader.resources[resource.path].texture as any;
    } else if (resource.type === "Spritesheet") {
      throw new Error("Unhandled");
    } else if (resource.type === "TileMap") {
      return this.loader.resources[resource.path].data;
    } else if (resource.type === "TileWorld") {
      return this.loader.resources[resource.path].data;
    }

    throw new Error("AAAAAA");
  }

  private finishLoading = () => {
    this.loadComplete = true;

    for (const callback of this.loadCompleteCallbacks) {
      callback();
    }

    this.loadCompleteCallbacks = [];
  }

  onLoadComplete(callback: () => void) {
    if (this.loadComplete) {
      setTimeout(() => {
        callback();
      }, 0);
    } else {
      this.loadCompleteCallbacks.push(callback);
    }
  }
}
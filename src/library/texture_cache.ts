import { Rectangle, Texture } from 'pixi.js'
import { AssetName } from '../game/assets';
import { Tile } from './tilemap/tilemap_types';
import { TypesafeLoader } from './typesafe_loader';
import { C } from '../game/constants';

export class TextureCache {
  static Cache: { [key: string]: Texture } = {};

  public static GetTextureFromSpritesheet({ resourceName: textureName, x, y, tilewidth, tileheight, assets }: { 
    resourceName: AssetName; 
    x          : number;
    y          : number;
    tilewidth  : number;
    tileheight : number;
    assets     : TypesafeLoader<{}>;
  }): Texture {
    const key = `${ textureName }-${ x }-${ y }`;

    if (!TextureCache.Cache[key]) {
      const texture = (assets.getResource(textureName) as Texture).clone();

      texture.frame = new Rectangle(x * tilewidth, y * tileheight, tilewidth, tileheight);

      this.Cache[key] = texture;
    }

    return this.Cache[key];
  }

  public static GetTextureForTile({ assets, tile }: { assets: TypesafeLoader<{}>; tile: Tile; }): Texture {
    const {
      tile: {
        imageUrlRelativeToGame,
        spritesheetx,
        spritesheety,
      },
    } = tile;

    return TextureCache.GetTextureFromSpritesheet({ 
      // TODO: Is there any way to improve this cast?
      // Once I add a loader for tilemaps, probably yes!
      resourceName: imageUrlRelativeToGame.slice(0, imageUrlRelativeToGame.lastIndexOf(".")) as AssetName,
      x          : spritesheetx, 
      y          : spritesheety, 
      tilewidth  : tile.tile.tilewidth ,
      tileheight : tile.tile.tileheight,
      assets     : assets,
    });
  }
}
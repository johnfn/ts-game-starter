import React from 'react';

import { Container, Graphics } from 'pixi.js';
import { Entity } from '../entity';
import { Debug } from '../debug';
import { IGameState } from 'Library';
import { DebugFlags } from '../../game/debug';

type HierarchyProps = {
  root: Entity | Container;
  setSelected: (obj: Entity | Container) => void;
  setMoused: (obj: Entity | Container | null) => void;
  gameState: IGameState;
  selectedEntity: Entity | Container | null;
};

export class Hierarchy extends React.Component<HierarchyProps, {
  hover: boolean;
  collapsed: boolean;
}> {
  constructor(props: HierarchyProps) {
    super(props);

    this.state = {
      hover: false,
      collapsed: true,
    };

    setInterval(() => {
      this.updateDebugGraphics();
    }, 200);
  }

  oldTint: { [key: number]: number } = {};

  hoverGraphics: Graphics[] = [];
  hoverTarget: Entity | Container | null = null;

  updateDebugGraphics = () => {
    // clear debug graphics

    for (const graphic of this.hoverGraphics) {
      graphic.parent.removeChild(graphic);
      graphic.destroy();
    }

    this.hoverGraphics = [];

    if (this.hoverTarget !== null) {
      this.hoverGraphics = [...Debug.DrawBounds(this.props.root, 0xff0000, true, "stage")];

      if (this.props.root instanceof Entity) {
        const point = Debug.DrawPoint(this.props.root.position, 0xff0000, true);

        this.hoverGraphics = [
          ...this.hoverGraphics,
          point,
        ];
      }
    }

    if (this.props.selectedEntity === this.props.root) {
      this.hoverGraphics = [...this.hoverGraphics, ...Debug.DrawBounds(this.props.selectedEntity, 0xff0000, true, "stage")];

      if (this.props.root instanceof Entity) {
        const point = Debug.DrawPoint(this.props.selectedEntity.position, 0xff0000, true);

        this.hoverGraphics = [
          ...this.hoverGraphics,
          point,
        ];
      }
    }
  };

  mouseOver = () => {
    this.setState({ hover: true })

    if (this.props.root instanceof Entity) {
      this.oldTint[this.props.root.id] = this.props.root.sprite.tint;

      this.props.root.sprite.tint = 0x000099;
    }

    this.hoverTarget = this.props.root;
    this.props.setMoused(this.props.root);
  };

  mouseOut = () => {
    this.setState({ hover: false })

    if (this.props.root instanceof Entity) {
      this.props.root.sprite.tint = this.oldTint[this.props.root.id];
    }

    this.hoverTarget = null;
    this.props.setMoused(null);
  };

  click = () => {
    this.props.setSelected(this.props.root);

    console.log(this.props.root);
  };

  renderLeaf(root: any) {
    return (<div>
      {this.props.selectedEntity === this.props.root ? <strong>{root.name}</strong> : root.name} (depth: { root.zIndex}) { root instanceof Entity && (
        root.activeModes.includes(this.props.gameState.mode) ? "Active" : "Inactive"
      )}
    </div>)
  }

  render() {
    const root = this.props.root;
    let allChildren = (
      root instanceof Entity ? root.children() : []
    );
    let children = allChildren;

    let canCollapse = children.length > 20;
    let didCollapse = false;

    if (canCollapse) {
      if (this.state.collapsed) {
        children = children.slice(0, 20);
        didCollapse = true;
      }
    }

    if (children)
      return (
        <div
          style={{
            paddingLeft: "10px",
            fontFamily: 'Arial',
            fontSize: '14px',
            backgroundColor: this.state.hover ? "darkgray" : "black"
          }}
        >
          <div
            onMouseEnter={this.mouseOver}
            onMouseLeave={this.mouseOut}
            onClick={this.click}
          >
            {this.renderLeaf(root)}
          </div>
          {
            canCollapse
              ? <div onClick={() => this.setState({ collapsed: !this.state.collapsed })} style={{ padding: "8px 0" }}>
                {
                  didCollapse
                    ? <span>[see {allChildren.length - 20} more]</span>
                    : <span>[collapse]</span>
                }
              </div>
              : null

          }

          {
            children.map(child => {
              return <Hierarchy selectedEntity={this.props.selectedEntity} setMoused={this.props.setMoused} setSelected={this.props.setSelected} root={child} gameState={this.props.gameState} />
            })
          }
        </div>
      )
  };
}

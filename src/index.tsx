import ReactDOM from 'react-dom';
import React from 'react';
import { Game } from './game/game';
import { IS_DEBUG } from './library/environment';

function initialize() {
  new Game();
}

document.addEventListener("DOMContentLoaded", () => {
  let ref: HTMLDivElement | null;

  if (IS_DEBUG) {
    initialize();
  } else {
    ReactDOM.render(
      <div
      ref={r => ref=r}
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          left: 0,
          top: 0,
          textAlign: "center",
          backgroundColor: "black",
          paddingTop: "200px",
          fontSize: "80px",
          fontFamily: "FreePixel",
        }}
        onClick={() => {
          if (ref) ref.remove();

          initialize();
        }}
      >Click to play.</div>,
      document.getElementById('click-to-play')
    );
  }
});

import React from 'react';
import { IS_DEBUG } from '../environment';

export type DebugFlagsType = {
  [key: string]: boolean;
};

const LOCAL_STORAGE_KEY = "debug flags";

export const ReadDebugFlagsFromLocalStorage = <T extends DebugFlagsType>(defaultFlags: T): T => {
  if (IS_DEBUG) {
    const prevStoredFlags = JSON.parse((window.localStorage.getItem(LOCAL_STORAGE_KEY) || "{}")) as DebugFlagsType;

    // delete flags that don't exist

    for (const flagName of Object.keys(prevStoredFlags)) {
      if (!defaultFlags.hasOwnProperty(flagName)) {
        delete prevStoredFlags[flagName];
      }
    }

    return {
      ...defaultFlags,
      ...prevStoredFlags,
    };
  } else {
    return defaultFlags;
  }
}

const SaveDebugFlagsToLocalStorage = (flags: DebugFlagsType) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
};

type DebugFlagButtonsProps = {
  flags: DebugFlagsType;
};

export class DebugFlagButtons extends React.Component<DebugFlagButtonsProps, {}> {
  render() {
    const flagNames = Object.keys(this.props.flags);

    return (
      <div>
        {
          flagNames.map(flagName => {
            const flag = this.props.flags[flagName];

            return (
              <div
                key={flagName}
              >
                <input 
                  type="checkbox" 
                  checked={ flag } 
                  onChange={ () => { 
                    // NOTE: This is TERRIBLE React code. DO NOT LEARN FROM
                    // THIS. DO NOT IMITATE THIS. IN FACT, RUN FAR AWAY FROM
                    // THIS!!!

                    // The reason this works at all is because GameReactWrapper
                    // does a forceUpdate() on a setInterval to keep everything
                    // in sync. DebugFlagButtons will be captured in the
                    // setInterval and forced to update.

                    // The point being that the value gets synced back into the
                    // game with no one being the wiser. MAGIC!
                    this.props.flags[flagName] = !this.props.flags[flagName];

                    SaveDebugFlagsToLocalStorage(this.props.flags);
                  }}
                /> { flagName }
              </div>
            );
          })
        }
      </div>
    )
  }
}
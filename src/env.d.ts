/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The build number shown on the title screen (M3.7): the commit's first 8 hex digits, the
   * same as the end of the production release id. Set by the npm build scripts; the only
   * VITE_ variable the game uses.
   */
  readonly VITE_BUILD?: string;
}

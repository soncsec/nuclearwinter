import Phaser from 'phaser';
import type { Point } from '../logic/geometry';

/** A sprite-sheet explosion the pool can play. */
export interface EffectKind {
  /** Texture and animation key (both use the sprite sheet's key). */
  key: string;
  frames: number;
  frameRate: number;
  /** Vertical anchor: 0.5 centres the sprite on the point, 1 stands it on the point. */
  originY: number;
}

/**
 * Reuses a fixed number of explosion sprites, so effects never allocate during play.
 * When every sprite is busy, the new explosion is skipped rather than growing the pool.
 */
export class EffectPool {
  private readonly sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, kinds: readonly EffectKind[], size: number) {
    for (const k of kinds) {
      if (scene.anims.exists(k.key)) continue;
      scene.anims.create({
        key: k.key,
        frames: scene.anims.generateFrameNumbers(k.key, { start: 0, end: k.frames - 1 }),
        frameRate: k.frameRate,
      });
    }
    for (let i = 0; i < size; i++) {
      const s = scene.add
        .sprite(0, 0, kinds[0]?.key ?? '')
        .setVisible(false)
        .setActive(false);
      // Additive blending gives the fire its glow (ADR-NW04).
      s.setBlendMode(Phaser.BlendModes.ADD);
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.setVisible(false).setActive(false));
      this.sprites.push(s);
    }
  }

  /** Plays `kind` at `at`. Returns false when the pool is full. */
  play(kind: EffectKind, at: Point): boolean {
    const s = this.sprites.find((sprite) => !sprite.active);
    if (!s) return false;
    s.setActive(true)
      .setVisible(true)
      .setOrigin(0.5, kind.originY)
      .setPosition(Math.round(at.x), Math.round(at.y));
    s.play(kind.key);
    return true;
  }

  /** Explosions playing right now. */
  get activeCount(): number {
    return this.sprites.filter((s) => s.active).length;
  }

  /** Stops every explosion (used on restart). */
  clear(): void {
    for (const s of this.sprites) {
      s.stop();
      s.setVisible(false).setActive(false);
    }
  }
}

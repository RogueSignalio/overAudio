/*===========================================================================
Authors: BlackRogue01
Copyright: RogueSignal.io, wwww.roguesignal.io, 2023
License: MIT
===========================================================================*/
class OverSound extends extends Phaser.Scene {
  constructor (config,overmaster) {
    super(config.key);
    this.overmaster = overmaster
    this.key = 'over_sound'
    this.config = {
      ...config
    }
  }

  init() {
    
  }
}
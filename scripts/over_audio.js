/*===========================================================================
OverAudio - a javascript audio playback library with lots of features
and based on the PhaserJS game engine.

OverAudio can be used to centralize audio for all RogueSignal "Over" JS
libraries or your own.

Authors: BlackRogue01
Copyright: RogueSignal.io, wwww.roguesignal.io, 2023
License: MIT
---------------------------------------------------------------------------
See README
===========================================================================*/
// TODO:
//
var version = '0.1.2'
class OverAudio extends OverPhBase {
  constructor (config={},ph_config={},engine=null) {
    let temp_config = {
      audio_on: true,
      volume: 0.5,
      preload: {},
      pause_on_blur: true,
      scene_name: 'oaudio_scene',
      audio_path: 'assets/audio/',
      after_init: ()=>{},
      ...config
    }
    super(temp_config); //,overmaster);
    this.audio_engine = this
    this.sound = this.engine.sound
    this.sound.pauseOnBlur = this.config.pause_on_blur;
    this.oa_audio_scene = null
    this.oa_banks = {}
    this.oa_sounds = {}
    this.oa_volume_offset = {}
    this.oa_volume_reset_fade_duration = 2000
    this.oa_jukebox_position = -1
    this.oa_jukebox_master_list = []
    this.oa_jukebox_play_list = []
    this.oa_jukebox_playing = false
    this.oa_jukebox_shuffle = false
    this.oa_jukebox_timer = null   
    this.oa_jukebox_playing_key = null
    this.oa_jukebox_fade_duration = 3000
    this.oa_volume_master = this.config.volume
    this.oa_volume_current = this.config.volume
    this.oa_audio_muted = false
    this.oa_counter = 0
    this.audio_scene()
  }

  delayedCall(delay,callback,args,scope) {
    this.audio_scene().time.delayedCall(delay, callback, args, scope);
  }
  delayedClear(timer) {
    timer.remove();
    scene.time.removeEvent(timer);
  }

  audio_scene() {
    if (!this.oa_audio_scene) {
      this.oa_audio_scene = new Phaser.Scene()
      this.oa_audio_scene.preload = ()=> { 
        Object.entries(this.config.preload).forEach(([key, value]) => { 
          if (Array.isArray(value)) {
            this.sound_load(key, value[0], value[1], value[2], false)
          } else {
            this.sound_load(key, value, 'main', null, false)
          }
        })         
      }
      this.oa_audio_scene.create = ()=> {
        this.config.after_init.call(this)
      } 
      this.engine.scene.add(this.config.scene_name, this.oa_audio_scene, true, {} );
    }
    return this.oa_audio_scene
  }

  audio_pause_on_blur(pause=true) {
    this.sound.pauseOnBlur = pause
  }

  // Set volume from 0 to 1
  audio_volume(vol=0.5,percent=true) {
    let old_vol = this.oa_volume_current
    // A very imperfect way of catching 0-100 vol values.
    // if ( (!percent) || (Number.isInteger(vol) && (vol != 1) && (vol != 0)) ) { 
    if (!percent) { //|| (Number.isInteger(vol) && (vol != 1) && (vol != 0)) ) { 
      console.log('volume from %: ' + old_vol + ' => '+ vol)
      vol = vol / 100; 
    }
    if (vol > 1) { vol = 1 }
    if (vol < 0) { vol = 0 }
    vol = Math.round((vol + Number.EPSILON)*100)/100
    console.log('volume: ' + old_vol + ' => '+ vol)
    this.engine.sound.volume = this.oa_volume_current = vol
    // for (var key in this.videos){
    //   this.videos[key].setVolume(vol)
    // };
    this.audio_restore_fix()
    return this.engine.sound.volume;
  }

  audio_volume_inc(inc=0) {
    if ((inc > 1) || (inc < 1)) { inc = inc / 100}
    inc = Math.round((inc + Number.EPSILON)*100)/100
    this.audio_volume(this.oa_volume_current + inc)
  }

  audio_restore_fix() {
    Object.keys(this.oa_sounds).forEach((k) => {
      let snd = this.oa_sounds[k].sound
      // console.log(k,snd)
      if (snd.fading == 1) { 
        if (snd.fader) { snd.fader.stop(); }
        snd.fading = 0
        snd.fader = null
        this.sound_fadein(k,this.oa_volume_reset_fade_duration,0,snd.volume)
      }
    })    
  }

  audio_muted() {
    return this.sound.mute
  }

  audio_mute_toggle() {
    if (this.audio_muted()) {
      this.audio_unmute()
    } else {
      this.audio_mute()
    }
  }

  audio_mute() { this.sound.setMute(true); }
  audio_unmute() { 
    this.sound.setMute(false); 
    this.audio_restore_fix();
  }
  audio_pause() { ob.sound.pauseAll() }
  audio_resume() { ob.sound.resumeAll() }

  // Stop all FX & audio
  // A lil issue with timers firing etc do best to be safe
  audio_stop() {
    // this._stop_pass()
    // this._stop_pass()
    // this._stop_pass()
    // this.to_back()
    // this._stop_pass()
    // this.scenes = []
    // this.videos = []
    this.sound.stopAll();
    this.jukebox_stop();
  }

  //===============================================
  // Sound Methods
  //===============================================
  sound_queue(key,file,bank='main',options={}) {
    this.sound_load(key,file,bank,options,false)
  }

  sound_queue_load(callback=()=>{}) {
    this.audio_scene().load.start();
    this.audio_scene().load.once('complete',callback.bind(this))
  }

  sound_ready(key) {
    return (this.oa_sounds[key] != undefined) ? true : false
  }

  sound_load(key,file,bank='main',options={},start=true) {
    if (this.oa_sounds[key]) { return }
    var as = this.audio_scene()
    as.load.audio(key, this.config.audio_path + file); 
    as.load.once('complete', function (e) {
      console.log(key + ' loaded.');
      this.sound_add(key,bank,options)
    }.bind(this));
    if (start == true) { as.load.start(); }
  }

  sound_add(key,bank='main',options={}) {
    if (!this.bank_object(bank)) { this.bank_create(bank) }
    let sound = this.sound.add(key)
    sound.options = options
    sound.fading = 0
    sound.fader = null
// console.log(sound)
    this.oa_sounds[key] = { key: key, sound: sound }
    this.bank_add(bank,this.sound_data(key))
  }

  sound_object(key) {
    return this.oa_sounds[key].sound
  }
  sound_data(key) {
    return this.oa_sounds[key]
  }

  sound_options(key,options=null) {
    let as = sound_object(key)
    if (options != null) { this.oa_sounds[key].options = options }
    return this.oa_sounds[key].options
  }

  sound_position(key) {
    return this.oa_sounds[key].sound.seek
  }
  sound_length(key) {
    return this.oa_sounds[key].sound.seek
  }
  sound_seek(key,time) {
    this.oa_sounds[key].sound.setSeek(time)
  }
  sound_marker_add(key,marker={}) {
    this.oa_sounds[key].sound.addMarker(marker)    
  }
  sound_on(key,event,func=()=>{}) {
    this.oa_sounds[key].sound.once(event, func.bind(this));
  }

  sound_fadein(key,duration=500,delay=10,from=0) {
    let as = this.sound_object(key)
    if (!as) { return null }
    as.setVolume(from)
    as.isPaused ? this.sound_resume(as.key) : this.sound_play(as.key)
    as.fading = 1
    as.fader = this.audio_scene().tweens.add({
        targets:  as,
        delay: delay,
        volume:   this.sound.volume,
        duration: duration,
        onComplete: function (tw,targets){
          targets[0].fading = 0
          targets[0].fader = null
        }
    });
  }

  sound_fadeout(key,duration=500,delay=0,pause=false) {
    let as = this.sound_object(key)
    if (!as) { return null }
    as.fading = -1
    as.fader = this.audio_scene().tweens.add({
        targets:  as,
        volume:   0,
        delay: delay,
        duration: duration,
        callbackScope: this,
        onComplete: function (tw,targets){
          let k = targets[0].key
          document.title = Date();
          // console.log('Pause: ' + pause) 
          if (pause == true) { this.sound_pause(k) }
          else { this.sound_stop(k) }
          targets[0].fading = 0
          targets[0].fader = null
        },
    });
  }

  // Fix clone...
  sound_play(key,options={}) {
    let as = this.sound_object(key)
    if (!as) { return null }
    let c_options = {
      ...options,
      ...as.options
    }
    if (c_options.clone || (c_options.retrigger == 'clone')) { 
      as = this.audio_scene().sound.add(key) 
    } else if ((c_options.retrigger == 'stop') && (as.isPlaying)) {
      this.sound_stop(key)
      return
    } else if ((c_options.retrigger == 'seek') && (as.isPlaying)) {
      as.setSeek(c_options.seek_to)
      return
    } else if (c_options.marker) {
      as.play(c_options.marker)
      return
    }

    if (c_options.detune != null) {
      as.setDetune(c_options.detune)
    }
    if (c_options.volume != null) {
      as.setVolume(c_options.volume)
    }
    if (c_options.variance != null) {
      as.setDetune(this.random_integer(-1 * c_options.variance,c_options.variance))
    }
    if (c_options.rate != null) {
      as.setRate(rate)
    }

    if (c_options.loop != null) {
      as.setLoop(c_options.loop)
    }
    else if (c_options.count != null) {
      as.setLoop(false)
      if (!c_options.counter) {
        c_options.counter = 1
      }
      if (c_options.counter < c_options.count) {
        as.once("complete", function (a) { 
          c_options.counter += 1
          this.sound_play(a.key,c_options); 
        }.bind(this));
      }
    }
    as.on('complete', function() { document.title = performance.now()  })
    as.play();
  }

  sound_stop(key) {
    let as = this.sound_object(key)
    if (!as) { return null }
    as.removeAllListeners();
    as.stop()
  }

  sound_pause(key) {
    let as = this.sound_object(key)
    if (!as) { return null }
    as.pause()
  }

  sound_resume(key) {
    let as = this.sound_object(key)
    if (!as) { return null }
    as.resume()
  }

  sound_play_for(key) { }

  sound_mute(key) { }

  //===============================================
  // Bank Methods
  //===============================================
  bank_object(key) {
    return this.oa_banks[key]
  }

  bank_create(key) {
    this.oa_banks[key] = { sounds: {}, _counter: null, _count: null }
  }

  bank_add(key,sound) {
    this.oa_banks[key].sounds[sound.key] = sound
  }

  bank_remove(key,sound_key) {
    delete this.oa_banks[key].sounds[sound.key]
  }

  bank_stop(key) {
    let bs = this.bank_object(key)
    if (!bs) { return {} }
    Object.entries(bs.sounds).forEach(([k, v]) => { 
      this.sound_stop(k)
    })
  }

  bank_sounds(key) {
    let bs = this.bank_object(key)
    if (!bs) { return {} }
    return bs.sounds
  }

  bank_sound_list(key) {
    let bs = this.bank_object(key)
    if (!bs) { return {} }
    let bss = []
    Object.entries(bs.sounds).forEach(([k, v]) => { 
      bss << k
    })
    return bss
  }

  bank_random_sound(key,not_key=null) {
    let item = null
    while(key != not_key) {
      item = this.random_item(bs.sounds).key
    }
  }

  bank_random_sound_object(key,not_key=null) {
    let item = null
    while(key != not_key) {
      item = this.random_item(bs.sounds)
    }
  }

  bank_random(key,count=1,delay_min=200,delay_max=null,continues=false) {
    let bs = this.bank_object(key)
    if (!bs) { return {} }

    if ((count == 'loop') && (continues == false) && (bs._forever == true)) {
      bs._forever = false
      this.bank_stop(key)
      return null
    } else if (count == 'loop') {
      bs._forever = true
    } else if ((count > 1) && (continues == false)) {
      this.bank_stop(key)
      bs._counter = 0
      bs._count = count
      bs._forever = false
    } else if ((count > 1) && (continues == true)) {
      this.bank_stop(key)
    }

    let delay = (delay_max != null) ? this.random_integer(delay_min,delay_max) : delay_min
    let item = this.random_item(bs.sounds)

    item.sound.once("complete", function (a) { 
      bs._counter += 1
      let counter_left = bs._count - bs._counter
      // console.log('complete!',Date())
      document.title = performance.now()
      if (bs._forever == true) {
        setTimeout(function() {
        // console.log('timeout complete!',Date())
          this.bank_random(key,'loop',delay_min,delay_max,true);
        }.bind(this),delay)
      } else if ((bs._counter < bs._count) && (counter_left >= 0)) {
        setTimeout(function() {
          this.bank_random(key,counter_left,delay_min,delay_max,true);
        }.bind(this),delay)
      } else {
        this.sound_stop(a.key)
        bs._counter = null
        bs._count = null
        bs._forever = false
      }
    }.bind(this));
    this.sound_play(item.key) //,{ retrigger: 'clone' })
  }

  bank_jukebox_load(key) {
    this.jukebox_bank_add(key)
  }

  bank_jukebox_load(key) {
    this.jukebox_bank_remove(key)
  }

  //===============================================
  // Jukebox Methods
  //===============================================    
  jukebox_sound_add(key) {
    if (this.oa_jukebox_master_list.includes(k)) { break; }    
    this.oa_jukebox_master_list.push(key)
  }

  jukebox_sound_remove(key) {
    this.oa_jukebox_master_list.filter((i)=>{ return (i == key) ? false: true }) 
  }

  jukebox_sounds() {
    return this.oa_jukebox_master_list
  }

  jukebox_playlist() {
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    return this.oa_jukebox_play_list
  }

  jukebox_stop() {
    if (this.oa_jukebox_timer) { clearTimeout(this.oa_jukebox_timer); this.oa_jukebox_timer = null }
    this.oa_jukebox_playing = false
  }

  jukebox_play(shuffle=false) {
    if (this.oa_jukebox_playing = true) { return true; }

    if (this.oa_jukebox_timer) { clearTimeout(this.oa_jukebox_timer); this.oa_jukebox_timer = null }
    this.oa_jukebox_shuffle = shuffle
    if (shuffle == true) { this.jukebox_shuffle(); }
    this.jukebox_play_next()
    this.oa_jukebox_playing = true
  }

  jukebox_overplay(key,duration=this.oa_jukebox_fade_duration) {
    if (this.oa_jukebox_timer) { clearTimeout(this.oa_jukebox_timer); this.oa_jukebox_timer = null }
//    this.jukebox_pause()
    this.jukebox_play_key(key,duration,false,true)
    this.oa_jukebox_timer = setTimeout(function(){ 
      this.jukebox_resume([duration,this.oa_jukebox_fade_duration])
    }.bind(this), (this.sound_object(key).duration * 1000) - duration)
  }

  jukebox_pause(duration=this.oa_jukebox_fade_duration) {
    if (this.oa_jukebox_playing == true) {
      this.sound_fadeout(this.jukebox_current().key,duration,true)
      this.oa_jukebox_playing = false
    }
  }

  jukebox_resume(duration=this.oa_jukebox_fade_duration) {
    if (this.oa_jukebox_playing != true) {
      this.jukebox_play_key(this.jukebox_current().key,duration)
      this.oa_jukebox_playing = true
    }
  }

  jukebox_update_play() {
    this.oa_jukebox_play_list = this.oa_jukebox_master_list
  }

  jukebox_current() {
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    if (this.oa_jukebox_position < 0) { return this.oa_jukebox_play_list[0] }
    return this.sound_object(this.oa_jukebox_play_list[this.oa_jukebox_position])
  }

  jukebox_next() {
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    let pos = this.oa_jukebox_position + 1
    if (this.oa_jukebox_play_list.length < pos + 1) { pos = -1 }
    return this.sound_object(this.oa_jukebox_play_list[pos])
  }

  jukebox_previous() {
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    let pos = this.oa_jukebox_position - 1
    if (pos < 0) { pos = 0 }
    return this.sound_object(this.oa_jukebox_play_list[pos])
  }

  jukebox_shuffle() {
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    let array = this.oa_jukebox_play_list
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }    
  }

  jukebox_fade_duration(duration=null) {
    if (duration > 0) {
      this.oa_jukebox_fade_duration = duration
    }
    return this.oa_jukebox_fade_duration
  }

  jukebox_play_key(key,duration=this.oa_jukebox_fade_duration,advance=true,pause=false) {
    let n_duration = null
    let adv_duration = null

    if (Array.isArray(duration)) {
      n_duration = duration[0]
      adv_duration = duration[1]
    } else {
      n_duration = duration
      adv_duration = duration
    }

    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    if ((this.oa_jukebox_playing == true) && (this.oa_jukebox_playing_key != null) && (key != this.oa_jukebox_playing_key)) {
      if (this.oa_jukebox_timer) { 
        clearTimeout(this.oa_jukebox_timer)
        // this.delayedClear(this.oa_jukebox_timer) 
      }
      console.log('fade out: '+ this.oa_jukebox_playing_key)
      this.sound_fadeout(this.oa_jukebox_playing_key,n_duration,0,pause)
    }
    console.log('fade in: '+ key)
    this.sound_fadein(key,n_duration,n_duration/4)

    this.oa_jukebox_playing_key = key
    if (advance == true) {
      let snd = this.sound_object(key)
      let adv_delay = ((snd.duration - snd.seek) * 1000) - adv_duration
      console.log('advance: '+ [snd.duration,snd.seek,adv_duration,adv_delay].join(' , '))
      // this.oa_jukebox_timer = this.delayedCall(adv_delay,function(){ 
      //     console.log('go!'); 
      //     this.jukebox_play_next()
      //   },[],this)
      this.oa_jukebox_timer = setTimeout(function(){ 
        this.jukebox_play_next()
      }.bind(this), adv_delay)
    }
  }

  jukebox_play_next() {
    if (this.oa_jukebox_timer) { 
      // this.delayedClear(this.oa_jukebox_timer) 
      clearTimeout(this.oa_jukebox_timer)
    }
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    let pos = this.oa_jukebox_position + 1
    if (this.oa_jukebox_play_list.length < pos + 1) { pos = 0 }
    this.jukebox_play_key(this.oa_jukebox_play_list[pos])
    this.oa_jukebox_position = pos
  }

  jukebox_play_previous() {
    if (this.oa_jukebox_timer) { 
      // this.delayedClear(this.oa_jukebox_timer)
      clearTimeout(this.oa_jukebox_timer)
    }
    if (this.oa_jukebox_play_list.length == 0) { this.jukebox_update_play() }
    let pos = this.oa_jukebox_position - 1
    if (this.oa_jukebox_play_list.length < pos + 1) { pos = this.oa_jukebox_play_list.length - 1 }
    this.jukebox_play_key(this.oa_jukebox_play_list[pos])
    this.oa_jukebox_position = pos
  }

  jukebox_bank_add(key) {
    console.log(key)
    Object.entries(this.bank_sounds(key)).forEach(([k, v]) => { 
      this.jukebox_sound_add(k)
    })
  }

  jukebox_bank_remove(key) {
    Object.entries(this.bank_sounds(key)).forEach(([k, v]) => { 
      this.jukebox_sound_remove(k)
    })
  }

}
